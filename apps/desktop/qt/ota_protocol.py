"""Frozen target OTA contract: ota-package.schema.json and firmware ota_server.cpp."""
import asyncio
import hashlib
import json
import re
from gatt_routing import resolve_characteristic

SERVICE = '4fafc201-1fb5-459e-8fcc-c5c9c331914d'
CTRL = 'beb5483e-36e1-4688-b7f5-ea07361b26c0'
DATA = 'beb5483e-36e1-4688-b7f5-ea07361b26c1'
STATUS = 'beb5483e-36e1-4688-b7f5-ea07361b26c2'


class OtaError(ValueError):
    pass


def validate_package(firmware, manifest):
    if not firmware:
        raise OtaError('固件包为空')
    if isinstance(manifest, str):
        try: manifest = json.loads(manifest)
        except ValueError: raise OtaError('manifest JSON 非法') from None
    required = {'format_version', 'target', 'hardware', 'firmware_version', 'size', 'sha256'}
    if not isinstance(manifest, dict) or set(manifest) != required:
        raise OtaError('manifest 必须包含契约六字段，且不能含未知字段')
    if type(manifest['format_version']) is not int or manifest['format_version'] != 1:
        raise OtaError('manifest 格式版本必须为 1')
    if manifest['target'] not in ('lightble-peripheral', 'lightble-observer'):
        raise OtaError('manifest target 非法')
    if not isinstance(manifest['hardware'], str) or not manifest['hardware'].strip():
        raise OtaError('manifest hardware 不能为空')
    version = manifest['firmware_version']
    if not isinstance(version, str) or not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?', version):
        raise OtaError('manifest firmware_version 非 SemVer')
    if type(manifest['size']) is not int or manifest['size'] != len(firmware):
        raise OtaError('固件 size 与 manifest 不符')
    digest = hashlib.sha256(firmware).hexdigest()
    if manifest['sha256'] != digest:
        raise OtaError('固件 SHA256 与 manifest 不符')
    return manifest.copy()


def status_frame(data):
    try:
        text = bytes(data).decode('utf-8')
        frame = json.loads(text)
        if not isinstance(frame, dict) or frame.get('type') != 'ota': return None
        value = str(frame.get('status') or '').lower()
        if value in ('error', 'failed', 'aborted'): kind = 'error'
        elif value == 'ready': kind = 'ready'
        elif value == 'success': kind = 'success'
        else: kind = None
        return {**frame, 'kind': kind}
    except (ValueError, UnicodeError, TypeError):
        return None


async def update(client, firmware, manifest, progress, timeout=30, delay=asyncio.sleep):
    manifest = validate_package(firmware, manifest)  # no BLE side effects before validation
    control_char = resolve_characteristic(client, SERVICE, CTRL)
    data_char = resolve_characteristic(client, SERVICE, DATA)
    status_char = resolve_characteristic(client, SERVICE, STATUS)
    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    phase = 'starting'
    def notify(_char, data):
        frame = status_frame(data)
        if frame and (frame['kind'] == 'error' or frame['kind'] == 'ready' and phase == 'waiting_ready' or frame['kind'] == 'success' and phase == 'committing'):
            loop.call_soon_threadsafe(queue.put_nowait, frame)
    # Bleak's disconnected callback remains owned by BleService; its is_connected
    # flag plus bounded polling detects loss without stealing that callback.
    async def wait(kind):
        deadline = loop.time() + timeout
        while loop.time() < deadline:
            if not queue.empty(): frame = queue.get_nowait()
            else:
                if not client.is_connected: raise OtaError('OTA 连接已断开；未收到成功回执，需重连核对状态')
                try: frame = await asyncio.wait_for(queue.get(), min(.25, max(.001, deadline - loop.time())))
                except asyncio.TimeoutError: continue
            if frame['kind'] == 'error': raise OtaError('设备拒绝 OTA：' + str(frame.get('detail') or frame.get('code') or frame.get('status')))
            if frame['kind'] == kind: return frame
        raise TimeoutError('等待 OTA ' + kind + ' 回执超时，未确认升级完成')
    subscribed, started, success = False, False, False
    try:
        await asyncio.wait_for(client.start_notify(status_char, notify), timeout=15)
        subscribed = True
        # Let queued initial snapshots settle before the new start transaction.
        await delay(0)
        while not queue.empty(): queue.get_nowait()
        chunk = min(180, max(20, int(getattr(client, 'mtu_size', 23)) - 3))
        payload = {'op': 'start', 'target': manifest['target'], 'target_version': manifest['firmware_version'], 'size': len(firmware), 'chunk_size': chunk, 'sha256': manifest['sha256']}
        phase = 'waiting_ready'
        started = True
        await asyncio.wait_for(client.write_gatt_char(control_char, json.dumps(payload, separators=(',', ':')).encode(), response=True), timeout=15)
        ready = await wait('ready')
        limit = ready.get('max_chunk', chunk)
        if type(limit) is not int or limit < 1: raise OtaError('设备返回非法 max_chunk')
        chunk = min(chunk, limit)
        phase = 'transferring'
        properties = list(data_char.properties)
        data_response = 'write' in properties if properties else True
        if properties and not set(properties) & {'write', 'write-without-response'}:
            raise OtaError('OTA DATA 特征不支持写入')
        last_percent = -1
        for offset in range(0, len(firmware), chunk):
            if not client.is_connected: raise OtaError('OTA 传输期间断连，未确认升级完成')
            while not queue.empty():
                frame = queue.get_nowait()
                if frame['kind'] == 'error': raise OtaError('设备拒绝 OTA：' + str(frame.get('detail') or frame.get('status')))
            # Respect the discovered characteristic mode; final device SHA256/success
            # is authoritative even when DATA exposes only write-without-response.
            await asyncio.wait_for(client.write_gatt_char(data_char, firmware[offset:offset + chunk], response=data_response), timeout=15)
            percent = min(99, (min(offset + chunk, len(firmware)) * 100) // len(firmware))
            if percent != last_percent: progress(percent); last_percent = percent
            await delay(.02)
        while not queue.empty():
            frame = queue.get_nowait()
            if frame['kind'] == 'error': raise OtaError('设备拒绝 OTA：' + str(frame.get('detail') or frame.get('status')))
        phase = 'committing'
        await asyncio.wait_for(client.write_gatt_char(control_char, b'{"op":"commit"}', response=True), timeout=15)
        await delay(0)
        await wait('success')
        success = True
        progress(100)
        return {'version': manifest['firmware_version'], 'reboot_pending': True}
    finally:
        if started and not success and client.is_connected:
            try: await asyncio.wait_for(client.write_gatt_char(control_char, b'{"op":"abort"}', response=True), timeout=3)
            except Exception: pass
        if subscribed:
            try: await asyncio.wait_for(client.stop_notify(status_char), timeout=3)
            except Exception: pass
