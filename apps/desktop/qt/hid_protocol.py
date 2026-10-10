"""Smart HID V1: shared vectors, memory-only candidate, framed writes and real receipts."""
import asyncio
import json
import math
import re
from pathlib import Path
from urllib.parse import unquote

HERE = Path(__file__).resolve().parent
VECTOR_PATH = HERE / 'smart-hid-v1-vectors.json'
if not VECTOR_PATH.is_file():
    VECTOR_PATH = HERE.parents[2] / 'core/protocols/smart-hid-v1-vectors.json'
VECTORS = json.loads(VECTOR_PATH.read_text(encoding='utf-8'))
C = VECTORS['constants']
SERVICE = C['serviceUuid']
INFO, INPUT, STATUS = (C['characteristicUuids'][key] for key in ('info', 'input', 'status'))


class ProtocolError(ValueError):
    pass


def profile_match(name, uuids):
    canonical = SERVICE.replace('-', '').lower()
    if any(str(uuid).replace('-', '').lower() == canonical for uuid in uuids or []):
        return 'STRONG'
    return 'WEAK' if str(name or '').upper().startswith(C['namePrefix']) else None


def parse_pairing_qr(text):
    text = str(text or '').strip()
    if not text.lower().startswith(C['qrScheme']):
        return None
    query = text[len(C['qrScheme']):]
    if query and query[0] not in '?&':
        return None
    params = {}
    try:
        for part in query.lstrip('?&').split('&'):
            if '=' not in part:
                continue
            key, value = part.split('=', 1)
            if not key:
                continue
            if re.search(r'%(?![0-9a-fA-F]{2})', key + value):
                return None
            key = unquote(key, errors='strict').lower()
            if key in params:
                return None
            params[key] = unquote(value, errors='strict')
        token = params.get('token', '').lower()
        host = params.get('host', '').strip()
        port = float(params.get('port') or C['defaultPairingPort'])
        if not re.fullmatch(C['tokenPattern'], token) or not host or re.search(r'[\s/]', host):
            return None
        if not port.is_integer() or not 1 <= port <= 65535:
            return None
        return {'token': token, 'host': host, 'port': int(port)}
    except (ValueError, UnicodeError):
        return None


def candidate_json(data):
    ssid = str(data.get('wifi_ssid') or '').strip()
    password = str(data.get('wifi_password') or '')
    host = str(data.get('hub_host') or '').strip()
    token = str(data.get('token') or '').strip()
    try:
        port = float(data.get('hub_port') if data.get('hub_port') is not None else C['defaultPairingPort'])
    except (ValueError, TypeError):
        raise ProtocolError('ControlHub 端口非法') from None
    length = lambda value: len(value.encode('utf-16-le')) // 2
    if not ssid or length(ssid) > 32:
        raise ProtocolError('SSID 必须为 1–32 字符')
    if length(password) > 64:
        raise ProtocolError('Wi-Fi 密码超长')
    if not host or not port.is_integer() or not 1 <= port <= 65535:
        raise ProtocolError('ControlHub 地址或端口非法')
    if not re.fullmatch(C['tokenPattern'], token):
        raise ProtocolError('配对码须为 32 位十六进制')
    return json.dumps({'v': C['candidateVersion'], 'wifi_ssid': ssid, 'wifi_password': password, 'hub_host': host, 'hub_port': int(port), 'token': token}, ensure_ascii=False, separators=(',', ':'))


def chunk_size(mtu):
    if not isinstance(mtu, (int, float)) or not math.isfinite(mtu) or mtu < 23:
        mtu = 23
    return max(1, min(C['frame']['maxChunkBytes'], int(mtu) - 6))


def build_frames(payload, chunk):
    chunk = max(1, min(C['frame']['maxChunkBytes'], int(chunk)))
    total = math.ceil(len(payload) / chunk)
    if not payload or len(payload) > C['frame']['maxAssembledBytes'] or total > C['frame']['maxFrames']:
        raise ProtocolError('配置大小超出协议范围')
    return [bytes([seq, total, len(payload[seq * chunk:(seq + 1) * chunk])]) + payload[seq * chunk:(seq + 1) * chunk] for seq in range(total)]


def parse_info(text):
    try:
        data = json.loads(text)
        if not isinstance(data, dict) or not isinstance(data.get('device_id'), str) or not data['device_id']:
            return None
        return {**{key: str(data.get(key) or '') for key in ('product', 'protocol', 'device_id', 'firmware', 'state')}, 'provisioned': bool(data.get('provisioned'))}
    except (ValueError, TypeError):
        return None


def parse_status(text):
    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            return None
        return {'state': str(data.get('state') or ''), 'step': str(data.get('step') or ''), 'error': None if data.get('error') is None else str(data['error'])}
    except (ValueError, TypeError):
        return None


def recovery_action(error):
    if error in ('wifi_failed', 'invalid_payload'):
        return 'form'
    if error in ('pairing_invalid', 'pairing_expired', 'pairing_used', 'controlhub_unreachable'):
        return 'pairing'
    return 'diagnostics' if error == 'mqtt_invalid' else 'retry'


def status_text(status):
    error = status.get('error')
    if error:
        return C['errorHints'].get(error, '设备报告未知错误，请进入诊断')
    return {'received': '配置已接收', 'connecting_wifi': '连接 Wi-Fi', 'wifi_connected': 'Wi-Fi 已连接', 'pairing': '连接 ControlHub', 'pairing_success': '配对成功', 'mqtt_connecting': '连接 MQTT', 'ready': '设备已就绪'}.get(status.get('step') or status.get('state'), '正在等待设备状态')


async def provision(client, candidate, on_status, timeout=60):
    # Validate before any device write; INFO identity must match the selected Profile.
    payload = candidate_json(candidate).encode('utf-8')
    info = parse_info(bytes(await client.read_gatt_char(INFO)).decode('utf-8'))
    if not info or info['product'] != 'smart-hid' or info['protocol'] != C['protocolVersion'] or not re.fullmatch(C['deviceIdPattern'], info['device_id']):
        raise ProtocolError('设备身份或协议不匹配，未下发配置')
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()

    def notify(_characteristic, data):
        try:
            status = parse_status(bytes(data).decode('utf-8'))
            if status:
                loop.call_soon_threadsafe(queue.put_nowait, status)
        except UnicodeError:
            pass

    subscribed = False
    try:
        await client.start_notify(STATUS, notify)
        subscribed = True
        while not queue.empty():
            queue.get_nowait()
        frames = build_frames(payload, chunk_size(getattr(client, 'mtu_size', 23)))
        for index, frame in enumerate(frames):
            await client.write_gatt_char(INPUT, frame, response=True)
            if index + 1 < len(frames):
                await asyncio.sleep(0.03)
        deadline = loop.time() + timeout
        observed_attempt = False
        while loop.time() < deadline:
            status = await asyncio.wait_for(queue.get(), timeout=max(0.001, deadline - loop.time()))
            on_status(status)
            observed_attempt |= status['step'] == 'received' or status['state'] in ('provisioning', 'connecting_wifi', 'pairing', 'mqtt_connecting')
            if status['error'] or status['state'] in ('error', 'recovery'):
                return {'ok': False, 'status': status, 'info': info}
            if status['state'] == 'ready' and observed_attempt:
                final_info = parse_info(bytes(await client.read_gatt_char(INFO)).decode('utf-8'))
                return {'ok': True, 'status': status, 'info': final_info or info}
        raise TimeoutError('等待设备配网状态超时')
    finally:
        if subscribed:
            try:
                await client.stop_notify(STATUS)
            except Exception:
                pass
