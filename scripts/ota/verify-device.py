#!/usr/bin/env python3
"""Bounded, opt-in real BLE OTA evidence capture. Default: discovery only.

Never discovers a target and flashes it automatically. Writing requires all of:
--address <exact BLE address/UUID> --package <verified directory> --scenario ...
Use the project's Qt virtualenv if Bleak is not installed globally:
  .tmp/qt-venv/bin/python scripts/ota/verify-device.py --help
No hardware result is emitted until that scenario was actually observed.
"""
import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
SCENARIOS = ('success', 'cancel', 'hash', 'size', 'disconnect')


def bounded_number(value):
    try:
        number = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError('must be a finite number') from exc
    if not 1 <= number <= 1800:
        raise argparse.ArgumentTypeError('must be between 1 and 1800 seconds')
    return number


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument('--address', help='exact target address; never selected automatically')
    result.add_argument('--package', type=Path, help='directory containing firmware.bin and manifest.json')
    result.add_argument('--scenario', choices=SCENARIOS)
    result.add_argument('--scan-seconds', type=bounded_number, default=5)
    result.add_argument('--timeout', type=bounded_number, default=900, help='whole scenario deadline, including transfer; maximum 1800s')
    result.add_argument('--output', type=Path, help='new JSON evidence file; existing files are never overwritten')
    return result


def parse_args(argv=None):
    cli = parser()
    args = cli.parse_args(argv)
    choices = [args.address is not None, args.package is not None, args.scenario is not None]
    if any(choices) and not all(choices):
        cli.error('device writes require --address, --package and --scenario together; otherwise use discovery only')
    if args.address is not None and not args.address.strip():
        cli.error('--address cannot be empty')
    if args.scan_seconds > 30:
        cli.error('--scan-seconds cannot exceed 30')
    args.write_enabled = all(choices)
    return args


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def package_module():
    spec = importlib.util.spec_from_file_location('ota_package_tool', Path(__file__).with_name('package-firmware.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def qt_protocol():
    sys.path.insert(0, str(ROOT / 'apps/desktop/qt'))
    import ota_protocol
    return ota_protocol


class Evidence:
    def __init__(self, args):
        self.started = time.monotonic()
        self.value = {'started_at': timestamp(), 'mode': 'EXPLICIT_DEVICE_SCENARIO' if args.write_enabled else 'SCAN_ONLY',
                      'scenario': args.scenario, 'address': args.address, 'hardware_result': 'NOT_RUN', 'events': []}

    def event(self, kind, **fields):
        if len(self.value['events']) < 20000:
            self.value['events'].append({'elapsed_seconds': round(time.monotonic() - self.started, 3), 'kind': kind, **fields})
        else:
            self.value['dropped_events'] = self.value.get('dropped_events', 0) + 1


class RecordingClient:
    """Adapter around the actual Bleak client, shared with production Qt update()."""
    def __init__(self, native, owner):
        from att_client import AttClient
        self.native, self.owner = native, owner
        self.att = AttClient(native)
        self.bytes_written, self.chunks = 0, 0

    def __getattr__(self, name):
        return getattr(self.att, name)

    async def read_gatt_char(self, characteristic):
        data = await self.att.read_gatt_char(characteristic)
        if str(characteristic.uuid).lower() in (self.owner.protocol.INFO, self.owner.protocol.CTRL):
            try:
                decoded = json.loads(bytes(data).decode('utf-8'))
            except (ValueError, UnicodeError):
                decoded = {'unparsed_hex': bytes(data).hex()}
            self.owner.evidence.event('read', characteristic=str(characteristic.uuid), value=decoded)
        return data

    async def start_notify(self, characteristic, callback):
        def receive(sender, value):
            frame = self.owner.protocol.status_frame(value)
            self.owner.evidence.event('device_status', frame=frame, raw_hex=bytes(value).hex() if frame is None else None)
            if frame and frame.get('code') and len(self.owner.errors) < 20:
                self.owner.errors.append(frame)
            callback(sender, value)
        return await self.att.start_notify(characteristic, receive)

    async def stop_notify(self, characteristic):
        return await self.att.stop_notify(characteristic)

    async def write_gatt_char(self, characteristic, value, response=None):
        if str(characteristic.uuid).lower() == self.owner.protocol.CTRL:
            payload = json.loads(bytes(value).decode('utf-8'))
            if payload.get('op') == 'start':
                if self.owner.scenario == 'hash':
                    payload['sha256'] = ('0' if payload['sha256'][0] != '0' else '1') + payload['sha256'][1:]
                elif self.owner.scenario == 'size':
                    payload['size'] += 1
                self.owner.start_mutated = self.owner.scenario in ('hash', 'size')
                value = json.dumps(payload, separators=(',', ':')).encode()
            self.owner.evidence.event('control_write_attempt', payload=payload)
        result = await self.att.write_gatt_char(characteristic, value, response=response)
        if str(characteristic.uuid).lower() == self.owner.protocol.CTRL:
            self.owner.evidence.event('control_write_ack', op=payload.get('op'))
            if payload.get('op') == 'commit':
                self.owner.committed = True
        if str(characteristic.uuid).lower() == self.owner.protocol.DATA:
            self.bytes_written += len(value)
            self.chunks += 1
            self.owner.evidence.value['transferred_bytes'] = self.bytes_written
            self.owner.evidence.value['data_chunks'] = self.chunks
            if self.chunks == 1 and self.owner.scenario == 'cancel':
                self.owner.injected = True
                self.owner.evidence.event('inject_client_cancel_after_first_data')
                raise asyncio.CancelledError()
            if self.chunks == 1 and self.owner.scenario == 'disconnect':
                self.owner.injected = True
                self.owner.evidence.event('inject_disconnect_after_first_data')
                await asyncio.wait_for(self.native.disconnect(), timeout=5)
        return result


class DeviceOwner:
    def __init__(self, address, scenario, evidence, protocol):
        self.address, self.scenario, self.evidence, self.protocol = address, scenario, evidence, protocol
        self.current = None
        self.recovery = None
        self.closing = False
        self.injected = False
        self.errors = []
        self.start_mutated = False
        self.committed = False
        self.disconnections = 0

    async def connect(self):
        from bleak import BleakClient
        loop = asyncio.get_running_loop()
        def disconnected(native):
            loop.call_soon_threadsafe(self.disconnected, native)
        native = BleakClient(self.address, disconnected_callback=disconnected, timeout=15)
        client = RecordingClient(native, self)
        try:
            await asyncio.wait_for(native.connect(), timeout=17)
        except BaseException:
            try:
                await asyncio.wait_for(native.disconnect(), timeout=3)
            except Exception:
                pass
            raise
        self.current = client
        self.evidence.event('connected')
        return client

    def disconnected(self, native):
        if self.current is None or self.current.native is not native:
            return
        self.current.att.retire('device disconnected', notify=False, disconnect=False)
        self.disconnections += 1
        self.evidence.event('disconnected', closing=self.closing)
        if not self.closing and (self.recovery is None or self.recovery.done()):
            self.recovery = asyncio.create_task(self.reconnect())

    async def reconnect(self):
        for attempt in range(3):
            if self.closing:
                return
            await asyncio.sleep(attempt + 1)
            try:
                await self.connect()
                return
            except Exception as exc:
                self.evidence.event('reconnect_failed', attempt=attempt + 1, error=str(exc))
        self.evidence.event('reconnect_exhausted')

    async def connected(self):
        deadline = asyncio.get_running_loop().time() + 35
        while asyncio.get_running_loop().time() < deadline:
            if self.current is not None and self.current.is_connected:
                return self.current
            await asyncio.sleep(.1)
        raise TimeoutError('device did not reconnect for post-scenario identity read')

    async def close(self):
        self.closing = True
        if self.recovery and not self.recovery.done():
            self.recovery.cancel()
            try:
                await asyncio.wait_for(self.recovery, timeout=3)
            except (Exception, asyncio.CancelledError):
                pass
        if self.current:
            self.current.att.retire('validation complete', notify=False, disconnect=False)
            try:
                await asyncio.wait_for(self.current.native.disconnect(), timeout=3)
            except Exception as exc:
                self.evidence.event('cleanup_disconnect_error', error=str(exc))


async def read_frame(client, protocol, control=False):
    from gatt_routing import resolve_characteristic
    service, characteristic = (protocol.SERVICE, protocol.CTRL) if control else (protocol.INFO_SERVICE, protocol.INFO)
    handle = resolve_characteristic(client, service, characteristic)
    return json.loads(bytes(await asyncio.wait_for(client.read_gatt_char(handle), timeout=10)).decode('utf-8'))


def scenario_passed(scenario, expected_version, observed):
    """Pure evidence gate: an expected client exception alone never proves a pass."""
    unchanged = observed['before_version'] == observed['after_version']
    if scenario == 'success':
        return (observed['verified_result'] is True and observed['error'] is None
                and observed['disconnections'] > 0 and observed['after_version'] == expected_version)
    if scenario in ('hash', 'size'):
        code = 'OTA_HASH_MISMATCH' if scenario == 'hash' else 'OTA_SIZE_MISMATCH'
        return (observed['error'] is not None and unchanged and observed['start_mutated'] is True
                and observed['commit_ack'] is True and observed['transferred_bytes'] == observed['firmware_size']
                and observed['control_status'] in ('failed', 'aborted', 'idle')
                and code in observed['device_error_codes'])
    if scenario == 'cancel':
        return (observed['injected'] is True and observed['error'] is not None and unchanged
                and observed['control_status'] == 'aborted')
    if scenario == 'disconnect':
        return (observed['injected'] is True and observed['error'] is not None and unchanged
                and observed['disconnections'] > 0 and observed['control_status'] == 'failed')
    return False


async def run_device(args, evidence, manifest, firmware):
    protocol = qt_protocol()
    owner = DeviceOwner(args.address, args.scenario, evidence, protocol)
    try:
        evidence.value['device_attempted'] = True
        evidence.event('connection_attempt')
        client = await owner.connect()
        before = await read_frame(client, protocol)
        if await protocol.read_identity(client, manifest, 10) != before.get('firmware_version'):
            raise ValueError('inconsistent pre-upgrade identity reads')
        evidence.value['before_info'] = before
        failure = None
        result = None
        try:
            result = await protocol.update(client, firmware, manifest,
                lambda percent: evidence.event('client_progress', percent=percent), timeout=30,
                get_client=lambda: owner.current)
        except asyncio.CancelledError:
            if not (args.scenario == 'cancel' and owner.injected):
                raise
            failure = 'injected client cancellation'
        except Exception as exc:
            failure = f'{type(exc).__name__}: {exc}'
        evidence.value['transaction_result'] = result
        evidence.value['transaction_error'] = failure
        restored = await owner.connected()
        after = await read_frame(restored, protocol)
        if await protocol.read_identity(restored, manifest, 10) != after.get('firmware_version'):
            raise ValueError('inconsistent post-upgrade identity reads')
        evidence.value['after_info'] = after
        # Abort is asynchronous in firmware loop. Poll the actual CTRL snapshot.
        control = None
        for _ in range(30):
            control = await read_frame(restored, protocol, control=True)
            if control.get('status') not in ('starting', 'receiving', 'committing'):
                break
            await asyncio.sleep(.1)
        evidence.value['after_control'] = control
        evidence.value['observed_disconnections'] = owner.disconnections
        proof = {'before_version': before.get('firmware_version'), 'after_version': after.get('firmware_version'),
                 'control_status': control.get('status'), 'verified_result': result.get('verified') if result else False,
                 'error': failure, 'disconnections': owner.disconnections, 'injected': owner.injected,
                 'start_mutated': owner.start_mutated, 'commit_ack': owner.committed,
                 'transferred_bytes': client.bytes_written, 'firmware_size': len(firmware),
                 'device_error_codes': [frame.get('code') for frame in owner.errors]}
        evidence.value['proof_checks'] = proof
        passed = scenario_passed(args.scenario, manifest['firmware_version'], proof)
        evidence.value['hardware_result'] = 'PASS_OBSERVED_REAL_BLE_SCENARIO' if passed else 'FAIL_SCENARIO_NOT_PROVEN'
        return passed
    finally:
        await owner.close()


async def scan(args, evidence):
    from bleak import BleakScanner
    hits = await asyncio.wait_for(BleakScanner.discover(timeout=args.scan_seconds, return_adv=True), timeout=args.scan_seconds + 5)
    evidence.value['devices'] = [{'address': device.address, 'name': device.name, 'rssi': advertisement.rssi,
                                 'service_uuids': advertisement.service_uuids}
                                for device, advertisement in hits.values()]
    evidence.value['hardware_result'] = 'NOT_RUN_SCAN_ONLY'


async def execute(args, evidence, manifest=None, firmware=None):
    if not args.write_enabled:
        await scan(args, evidence)
        return True
    return await asyncio.wait_for(run_device(args, evidence, manifest, firmware), timeout=args.timeout)


def main(argv=None):
    args = parse_args(argv)
    evidence = Evidence(args)
    output = args.output or ROOT / '.tmp/ota-device-validation' / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8] + '.json')
    if output.exists():
        parser().error('--output already exists; evidence files are never overwritten')
    manifest = firmware = None
    try:
        if args.write_enabled:
            manifest = package_module().verify_package(args.package)
            firmware = (args.package / 'firmware.bin').read_bytes()
            if args.scenario == 'size' and len(firmware) >= package_module().PARTITION_SIZE:
                raise ValueError('size scenario requires an image smaller than the OTA slot')
            evidence.value.update({'manifest': manifest, 'firmware_sha256': hashlib.sha256(firmware).hexdigest(),
                                   'package_path': str(args.package.resolve()), 'software_transport': 'production Qt ota_protocol.update / AttClient + actual Bleak'})
        passed = asyncio.run(execute(args, evidence, manifest, firmware))
    except (Exception, KeyboardInterrupt, asyncio.CancelledError) as exc:
        passed = False
        evidence.value['error'] = f'{type(exc).__name__}: {exc}'
        if args.write_enabled:
            evidence.value['hardware_result'] = 'FAIL_OR_INTERRUPTED_UNPROVEN' if evidence.value.get('device_attempted') else 'NOT_RUN_LOCAL_VALIDATION_FAILED'
        else:
            evidence.value['hardware_result'] = 'NOT_RUN_SCAN_FAILED'
    evidence.value['finished_at'] = timestamp()
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as handle:
        json.dump(evidence.value, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    print(json.dumps({'hardware_result': evidence.value['hardware_result'], 'evidence': str(output)}, ensure_ascii=False))
    return 0 if passed else 1


if __name__ == '__main__':
    sys.exit(main())
