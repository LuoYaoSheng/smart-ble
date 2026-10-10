"""A selected device session; background results cannot cross into another device."""
import asyncio
import re
from concurrent.futures import CancelledError

from PySide6.QtCore import QObject, Signal
from gatt_routing import resolve_characteristic
from hid_protocol import C, SERVICE, INFO, STATUS, ProtocolError, parse_info, parse_status, provision


class HidSession(QObject):
    changed = Signal(object)
    busy_changed = Signal(bool)
    failed = Signal(str)
    finished = Signal(object)

    def __init__(self, ble, parent=None):
        super().__init__(parent)
        self.ble = ble
        self.address = ''
        self.name = ''
        self.info = {}
        self.status = {}
        self._generation = 0
        self._future = None
        ble.device_disconnected.connect(self.disconnected)

    @property
    def busy(self):
        return self._future is not None and not self._future.done()

    def bind(self, address, name):
        self.cancel()
        self.address, self.name = address, name
        self.info, self.status = {}, {}
        self.changed.emit({'info': {}, 'status': {}})
        self.refresh()

    def cancel(self):
        self._generation += 1
        if self._future is not None:
            self._future.cancel()
        self._future = None
        self.busy_changed.emit(False)

    def disconnected(self, address, _expected):
        if address != self.address:
            return
        self.cancel()
        self.info, self.status = {}, {}
        self.changed.emit({'info': {}, 'status': {}})
        self.failed.emit('设备已断开；重连后可读取状态，不会自动重复下发配置')

    async def _client(self, address, generation):
        from bleak import BleakClient
        if self.ble.scanning:
            worker = self.ble._worker
            self.ble.stop_scan()
            if worker is not None and not await asyncio.to_thread(worker.wait, 6500):
                raise ProtocolError('扫描尚未停止，请重试连接')
        client = self.ble._clients.get(address)
        if client is not None and client.is_connected:
            return client
        def disconnected(_client):
            if self.ble._clients.get(address) is not _client: return
            self.ble._clients.pop(address, None)
            self.ble.connected.pop(address, None)
            self.ble._notifying.pop(address, None)
            self.ble.device_disconnected.emit(address, False)
        client = BleakClient(address, timeout=10, disconnected_callback=disconnected)
        await client.connect()
        if generation != self._generation or address != self.address:
            await client.disconnect()
            raise asyncio.CancelledError
        self.ble._clients[address] = client
        self.ble.connected[address] = {'name': self.name or address, 'tree': self.ble._build_tree(client)}
        return client

    def _submit(self, operation):
        if self.busy:
            self.failed.emit('已有任务进行中，请等待或停止当前跟踪')
            return
        address, generation = self.address, self._generation
        if not address:
            self.failed.emit('请先选择设备')
            return
        self.busy_changed.emit(True)

        async def execute():
            client = await self._client(address, generation)
            return await operation(client)

        future = self.ble._gatt.submit(execute())
        self._future = future

        def done(result):
            if generation != self._generation or address != self.address:
                return
            self._future = None
            self.busy_changed.emit(False)
            try:
                value = result.result()
            except CancelledError:
                return
            except (TimeoutError, asyncio.TimeoutError):
                self.failed.emit('等待设备状态超时；可重连读取状态，不能据此判断设备配置已撤销')
            except ProtocolError as error:
                self.failed.emit(str(error))
            except Exception:
                self.failed.emit('蓝牙操作失败，请重连后读取设备状态')
            else:
                self.info = value.get('info') or self.info
                self.status = value.get('status') or self.status
                self.changed.emit({'info': self.info, 'status': self.status})
                if 'ok' in value:
                    self.finished.emit(value)
        future.add_done_callback(done)

    def refresh(self):
        async def read(client):
            info = parse_info(bytes(await client.read_gatt_char(resolve_characteristic(client, SERVICE, INFO))).decode('utf-8'))
            if not info or info['product'] != 'smart-hid' or info['protocol'] != C['protocolVersion'] or not re.fullmatch(C['deviceIdPattern'], info['device_id']):
                raise ProtocolError('设备身份或协议不匹配')
            status = parse_status(bytes(await client.read_gatt_char(resolve_characteristic(client, SERVICE, STATUS))).decode('utf-8'))
            if status is None:
                raise ProtocolError('设备未返回有效状态')
            return {'info': info, 'status': status}
        self._submit(read)

    def start(self, candidate):
        address, generation = self.address, self._generation
        def status_changed(status):
            if generation == self._generation and address == self.address:
                self.changed.emit({'info': self.info, 'status': status})
        self._submit(lambda client: provision(client, candidate, status_changed))
