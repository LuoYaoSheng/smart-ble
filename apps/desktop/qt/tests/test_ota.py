import asyncio
import json
import sys
import unittest
from types import SimpleNamespace
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ota_protocol import SERVICE, CTRL, DATA, STATUS, OtaError, status_frame, update, validate_package
from ota_dialog import capable
from att_client import AttClient

FIXTURE = json.loads((Path(__file__).resolve().parents[1] / 'ota-fixtures.json').read_text())
FIRMWARE = bytes.fromhex(FIXTURE['firmwareHex'])

class ContractTests(unittest.TestCase):
    def test_shared_firmware_status_fixtures(self):
        for case in FIXTURE['statuses']:
            with self.subTest(text=case['text']):
                frame = status_frame(case['text'].encode())
                self.assertEqual(frame['kind'] if frame else None, case['kind'])
    def test_manifest_checks_actual_bytes_and_required_contract(self):
        self.assertEqual(validate_package(FIRMWARE, FIXTURE['manifest'])['target'], 'lightble-peripheral')
        for key, value in [('target', '1.2.3'), ('size', 4), ('sha256', 'a' * 64), ('format_version', 2), ('hardware', ''), ('firmware_version', 'v1.2')]:
            with self.subTest(key=key):
                manifest = {**FIXTURE['manifest'], key: value}
                with self.assertRaises(OtaError): validate_package(FIRMWARE, manifest)
        with self.assertRaises(OtaError): validate_package(FIRMWARE, {'version': '1.2.3'})
    def test_ota_button_requires_all_real_capabilities(self):
        from ota_protocol import SERVICE
        self.assertFalse(capable({'services': [{'uuid': SERVICE, 'chars': []}]}))
        self.assertTrue(capable({'services': [{'uuid': SERVICE, 'chars': [
            {'uuid': CTRL, 'props': ['write']}, {'uuid': DATA, 'props': ['write-without-response']}, {'uuid': STATUS, 'props': ['notify']}]}]}))

class Client:
    mtu_size = 23
    is_connected = True
    def __init__(self, ready=True, success=True):
        self.ready, self.success = ready, success
        self.writes, self.stops = [], 0
        self.data_effect = None
        self.services = [SimpleNamespace(uuid=SERVICE, characteristics=[
            SimpleNamespace(uuid=CTRL, service_uuid=SERVICE, properties=['write']),
            SimpleNamespace(uuid=DATA, service_uuid=SERVICE, properties=['write']),
            SimpleNamespace(uuid=STATUS, service_uuid=SERVICE, properties=['notify'])])]
    async def start_notify(self, uuid, callback): self.callback = callback
    async def stop_notify(self, uuid): self.stops += 1
    def emit(self, frame): self.callback(None, json.dumps(frame).encode())
    async def write_gatt_char(self, uuid, data, response):
        uuid = uuid.uuid
        self.writes.append((uuid, bytes(data), response))
        if uuid == DATA:
            if self.data_effect: self.data_effect()
            return
        message = json.loads(data)
        if message['op'] == 'start' and self.ready: self.emit({'type': 'ota', 'status': 'ready', 'max_chunk': 20})
        if message['op'] == 'commit' and self.success: self.emit({'type': 'ota', 'status': 'success', 'rebooting': True})
    def operations(self): return [json.loads(data)['op'] for uuid, data, _ in self.writes if uuid == CTRL]

class TransactionTests(unittest.IsolatedAsyncioTestCase):
    async def test_success_requires_both_real_receipts_and_contract_start(self):
        client = Client(); progress = []
        result = await update(client, FIRMWARE, FIXTURE['manifest'], progress.append, timeout=5)
        self.assertEqual(client.operations(), ['start', 'commit'])
        start = json.loads(client.writes[0][1])
        self.assertEqual(set(start), {'op', 'target', 'target_version', 'size', 'chunk_size', 'sha256'})
        self.assertEqual(b''.join(data for uuid, data, _ in client.writes if uuid == DATA), FIRMWARE)
        self.assertEqual(progress[-1], 100)
        self.assertTrue(result['reboot_pending']); self.assertEqual(client.stops, 1)
    async def test_data_mode_respects_the_discovered_write_without_response_capability(self):
        client = Client()
        client.services[0].characteristics[1].properties = ['write-without-response']
        await update(client, FIRMWARE, FIXTURE['manifest'], lambda _: None, timeout=5)
        self.assertTrue(all(not response for uuid, _, response in client.writes if uuid == DATA))

    async def test_ota_uses_transparent_shared_executor(self):
        native = Client()
        client = AttClient(native)
        result = await update(client, FIRMWARE, FIXTURE['manifest'], lambda _: None, timeout=5)
        self.assertTrue(result['reboot_pending'])
        self.assertEqual(native.operations(), ['start', 'commit'])
        self.assertEqual(client.depth, 0)
        client.retire(notify=False, disconnect=False)

    async def test_bad_package_has_no_ble_side_effect(self):
        client = Client()
        with self.assertRaises(OtaError): await update(client, b'bad', FIXTURE['manifest'], lambda _: None)
        self.assertEqual(client.writes, [])
    async def test_ready_timeout_aborts_and_unsubscribes(self):
        client = Client(ready=False)
        with self.assertRaises(TimeoutError): await update(client, FIRMWARE, FIXTURE['manifest'], lambda _: None, timeout=.01)
        self.assertEqual(client.operations(), ['start', 'abort']); self.assertEqual(client.stops, 1)
    async def test_premature_success_cannot_complete_commit(self):
        client = Client(success=False)
        client.data_effect = lambda: client.emit({'type': 'ota', 'status': 'success'})
        progress = []
        with self.assertRaises(TimeoutError): await update(client, FIRMWARE, FIXTURE['manifest'], progress.append, timeout=.01)
        self.assertNotIn(100, progress); self.assertEqual(client.operations()[-1], 'abort')
    async def test_error_during_data_never_sends_commit(self):
        client = Client()
        client.data_effect = lambda: client.emit({'type': 'ota', 'status': 'error', 'detail': 'hash_mismatch'})
        with self.assertRaises(OtaError): await update(client, FIRMWARE, FIXTURE['manifest'], lambda _: None, timeout=5)
        self.assertNotIn('commit', client.operations()); self.assertEqual(client.operations()[-1], 'abort')
    async def test_cancel_attempts_abort_and_waits_for_cleanup(self):
        client = Client(ready=False)
        task = asyncio.create_task(update(client, FIRMWARE, FIXTURE['manifest'], lambda _: None))
        await asyncio.sleep(.005); task.cancel()
        with self.assertRaises(asyncio.CancelledError): await task
        self.assertEqual(client.operations(), ['start', 'abort']); self.assertEqual(client.stops, 1)
    async def test_disconnect_without_success_is_not_reboot_success(self):
        client = Client(success=False)
        client.data_effect = lambda: setattr(client, 'is_connected', False)
        with self.assertRaises(OtaError): await update(client, FIRMWARE, FIXTURE['manifest'], lambda _: None, timeout=5)
        self.assertEqual(client.stops, 1)
    async def test_queued_success_before_reboot_disconnect_is_retained(self):
        order = []
        class RebootClient(Client):
            def emit(self, frame):
                order.append(frame['status'])
                super().emit(frame)
            async def write_gatt_char(self, uuid, data, response):
                if uuid.uuid == CTRL: order.append(json.loads(data)['op'])
                await super().write_gatt_char(uuid, data, response)
                if uuid.uuid == CTRL and json.loads(data)['op'] == 'commit':
                    # The notification callback has delivered success. Yield once
                    # so its scheduled queue.put runs before the simulated reboot.
                    await asyncio.sleep(0)
                    self.is_connected = False
                    order.append('disconnect')
        client = RebootClient()
        progress = []
        result = await update(client, FIRMWARE, FIXTURE['manifest'], progress.append, timeout=5)
        self.assertTrue(result['reboot_pending'])
        self.assertEqual(order, ['start', 'ready', 'commit', 'success', 'disconnect'])
        self.assertEqual(client.operations(), ['start', 'commit'])
        self.assertEqual(progress[-1], 100)
        self.assertEqual(client.stops, 1)
