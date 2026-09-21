"""Q-WIN BLE 服务：bleak（WinRT）扫描 + GATT 客户端封装。

扫描：工作线程内独立 asyncio loop 跑一次 5s 扫描（bleak 官方推荐模式），
结果经 Qt 信号回 UI 线程；与 E/T/V/F/G 各壳的 5s 扫描超时口径一致。

GATT：GattWorker 线程常驻一个 asyncio loop，UI 线程经 submit() 投递协程
（connect/disconnect/read/write/notify），结果与事件（通知、断连）经 Qt
信号回 UI 线程。写操作恒带响应（PARITY-007：writeNoResponse 在 Windows
栈上字节腐败）。bleak 3.x：connect() 自动服务发现，services 属性取树。

铁律（SHID-FW-LOCK-001）：永不向 9f1d1003（INPUT）特征写真实数据；
写能力仅在非 SHID INPUT 特征上使用。
"""

from __future__ import annotations

import asyncio
import threading
from concurrent.futures import Future
from dataclasses import dataclass, field

from PySide6.QtCore import QObject, QThread, Signal

# ── UUID 展示名（与 G-WIN app.go 的 serviceNamesCN/charNamesCN 同源移植）──

SERVICE_NAMES_CN = {
    "1800": "通用访问", "1801": "通用属性", "180A": "设备信息", "180F": "电池服务",
    "1812": "人机界面(HID)", "180D": "心率服务", "1809": "健康温度计", "181C": "用户数据",
    # Smart HID 配网家族（正典 bundle：1002 info / 1003 input / 1004 status）
    "9F1D1001-E73B-4C8F-9D2A-6F0B5E8A1C04": "Smart HID 配网服务",
    "4FAFC201-CFB0-11E5-A3B4-0001A340D001": "OTA 升级服务",
}

CHAR_NAMES_CN = {
    "2A00": "设备名称", "2A01": "外观", "2A02": "隐私标志", "2A03": "重连地址",
    "2A04": "连接参数", "2A05": "服务变更", "2A19": "电池电量", "2A23": "系统标识符",
    "2A24": "型号", "2A25": "序列号", "2A26": "固件版本", "2A27": "硬件版本",
    "2A28": "软件版本", "2A29": "制造商", "2A37": "心率测量", "2A38": "身体传感器位置",
    "BEB5483E-36E1-4688-B7F5-EA07361B26A8": "OTA 控制",
    "9F1D1002-E73B-4C8F-9D2A-6F0B5E8A1C04": "设备信息 (INFO)",
    "9F1D1003-E73B-4C8F-9D2A-6F0B5E8A1C04": "配网数据写入 (INPUT)",
    "9F1D1004-E73B-4C8F-9D2A-6F0B5E8A1C04": "设备状态 (STATUS)",
}

# SHID-FW-LOCK-001：INPUT 特征写禁（UI 层双重保险，运营规则之外的代码护栏）
INPUT_CHAR_UUID = "9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04"


def service_display_name(uuid: str) -> str:
    key = uuid.replace("-", "").upper()
    short = key[4:8] if len(key) == 32 and key.startswith("0000") else key
    return SERVICE_NAMES_CN.get(short, SERVICE_NAMES_CN.get(uuid.upper(), ""))


def char_display_name(uuid: str) -> str:
    key = uuid.replace("-", "").upper()
    short = key[4:8] if len(key) == 32 and key.startswith("0000") else key
    return CHAR_NAMES_CN.get(short, CHAR_NAMES_CN.get(uuid.upper(), ""))


def hex_spaced(data: bytes) -> str:
    return " ".join(f"{b:02X}" for b in data)


def try_utf8(data: bytes) -> str:
    """可打印 ASCII/UTF-8 则返回解码文本，否则空串（INFO 身份读展示用）。"""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return ""
    return text if text and all(ch >= " " or ch in "\t\n\r" for ch in text) else ""


@dataclass
class ScanHit:
    """一次扫描命中的设备（C1 设备卡字段子集）。"""

    address: str
    name: str
    rssi: int = -100
    manufacturer_id: int | None = None
    manufacturer_data: bytes = b""
    service_uuids: list[str] = field(default_factory=list)


class _ScanWorker(QThread):
    """在自有线程里跑一次 bleak 扫描（timeout 秒）。"""

    finished_ok = Signal(list)  # list[ScanHit]
    failed = Signal(str)

    def __init__(self, timeout: float = 5.0, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._timeout = timeout

    def run(self) -> None:  # pragma: no cover - 线程体
        async def _scan() -> list[ScanHit]:
            from bleak import BleakScanner

            found = await BleakScanner.discover(timeout=self._timeout, return_adv=True)
            hits: list[ScanHit] = []
            for dev, adv in found.values():
                mfr_id = None
                mfr_data = b""
                if adv.manufacturer_data:
                    mfr_id = next(iter(adv.manufacturer_data))
                    mfr_data = bytes(adv.manufacturer_data[mfr_id])
                hits.append(
                    ScanHit(
                        address=str(dev.address),
                        name=dev.name or "",
                        rssi=adv.rssi if adv.rssi else -100,
                        manufacturer_id=mfr_id,
                        manufacturer_data=mfr_data,
                        service_uuids=[str(u) for u in adv.service_uuids],
                    )
                )
            # 信号强度降序（与各壳设备列表排序一致）
            hits.sort(key=lambda h: h.rssi, reverse=True)
            return hits

        try:
            hits = asyncio.run(_scan())
            self.finished_ok.emit(hits)
        except Exception as exc:  # noqa: BLE001 - 扫描失败要落到 UI 状态词
            self.failed.emit(str(exc))


class GattWorker(QThread):
    """常驻 asyncio loop 的 GATT 工作线程。

    UI 线程 submit(coro_factory) 投递协程；notify 回调与 disconnected
    回调都发生在 loop 线程内，经 Qt 信号（自动 Queued）回 UI 线程。
    """

    def __init__(self, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._loop: asyncio.AbstractEventLoop | None = None
        self._ready = threading.Event()

    def run(self) -> None:  # pragma: no cover - 线程体
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._ready.set()
        try:
            self._loop.run_forever()
        finally:
            self._loop.close()

    def submit(self, coro):
        """线程安全投递协程，返回 concurrent.futures.Future。"""
        self._ready.wait(10.0)
        assert self._loop is not None
        return asyncio.run_coroutine_threadsafe(coro, self._loop)

    def stop(self) -> None:
        if self._loop is not None and self._loop.is_running():
            self._loop.call_soon_threadsafe(self._loop.stop)
        self.wait(5000)


class BleService(QObject):
    """UI 线程侧门面：扫描 + 连接管理 + GATT 原语，结果全部经 Qt 信号。"""

    scan_done = Signal(list)          # list[ScanHit]
    scan_failed = Signal(str)
    device_connected = Signal(str, str, object)   # address, name, gatt_tree(dict)
    device_disconnected = Signal(str, bool)       # address, expected(手动断开)
    char_read = Signal(str, str, str, str)        # address, uuid, hex, text
    char_notified = Signal(str, str, str)         # address, uuid, hex
    notify_changed = Signal(str, str, bool)       # address, uuid, on
    write_done = Signal(str, str, int)            # address, uuid, nbytes
    op_failed = Signal(str, str, str)             # op, address, msg

    CONNECT_TIMEOUT = 15.0

    def __init__(self, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._worker: _ScanWorker | None = None
        self._gatt = GattWorker()
        self._gatt.start()
        # Windows 无外设（广播）栈：与 V-WIN 同口径降级，保留字段供生命周期判断
        self.advertising = False
        self.connected: dict[str, dict] = {}   # address -> {name, tree}
        self._clients: dict[str, object] = {}  # address -> BleakClient
        self._notifying: dict[str, set] = {}   # address -> {uuid}

    # ── 扫描 ──

    @property
    def scanning(self) -> bool:
        return self._worker is not None and self._worker.isRunning()

    def start_scan(self, timeout: float = 5.0) -> None:
        if self.scanning:
            return
        self._worker = _ScanWorker(timeout)
        self._worker.finished_ok.connect(self.scan_done)
        self._worker.failed.connect(self.scan_failed)
        self._worker.start()

    def stop_scan(self) -> None:
        # bleak discover() 无优雅取消（一次性调用），等待自然超时；
        # 与 F-WIN 5s 超时口径一致，不强制中断
        if self._worker is not None:
            self._worker.wait(6500)

    # ── 连接管理 ──

    def connect_device(self, hit: ScanHit) -> None:
        """连接扫描命中的设备；成功发 device_connected（含 GATT 树）。"""
        if hit.address in self.connected:
            self.device_connected.emit(hit.address, self.connected[hit.address]["name"],
                                       self.connected[hit.address]["tree"])
            return

        def on_disconnect(client) -> None:
            # 单次事件语义：手动断开路径已自行出表并发射；此处仅处理意外断链
            info = self.connected.pop(hit.address, None)
            self._clients.pop(hit.address, None)
            self._notifying.pop(hit.address, None)
            if info is not None:
                self.device_disconnected.emit(hit.address, False)

        async def _connect():
            from bleak import BleakClient

            client = BleakClient(
                hit.address, disconnected_callback=on_disconnect,
                timeout=self.CONNECT_TIMEOUT,
            )
            await client.connect()
            tree = self._build_tree(client)
            self._clients[hit.address] = client
            self.connected[hit.address] = {"name": hit.name or hit.address, "tree": tree}
            return tree

        fut = self._gatt.submit(_connect())
        def _done(f: Future) -> None:
            try:
                tree = f.result()
            except Exception as exc:  # noqa: BLE001 - 连接失败落状态词
                self.op_failed.emit("connect", hit.address, str(exc))
            else:
                self.device_connected.emit(hit.address, hit.name or hit.address, tree)
        fut.add_done_callback(_done)

    def disconnect_device(self, address: str) -> None:
        client = self._clients.pop(address, None)
        self.connected.pop(address, None)
        self._notifying.pop(address, None)
        if client is None:
            self.device_disconnected.emit(address, True)
            return

        async def _disc():
            try:
                await client.disconnect()
            except Exception:  # noqa: BLE001 - 已断链时 disconnect 报错属正常
                pass
        self._gatt.submit(_disc())
        self.device_disconnected.emit(address, True)

    def disconnect_all(self) -> None:
        for address in list(self._clients):
            self.disconnect_device(address)

    def shutdown(self) -> None:
        """退出前收尾：断全部连接，停 GATT 线程。"""
        for address in list(self._clients):
            client = self._clients.get(address)
            if client is not None:
                try:
                    self._gatt.submit(client.disconnect()).result(timeout=8.0)
                except Exception:  # noqa: BLE001
                    pass
        self._clients.clear()
        self.connected.clear()
        self._gatt.stop()

    def _build_tree(self, client) -> dict:
        """bleak services → 展示树（服务/特征中文名 + props 徽章）。"""
        services = []
        for svc in client.services:
            chars = []
            for ch in svc.characteristics:
                chars.append({
                    "uuid": str(ch.uuid),
                    "name": char_display_name(str(ch.uuid)),
                    "props": sorted(set(ch.properties or [])),
                })
            services.append({
                "uuid": str(svc.uuid),
                "name": service_display_name(str(svc.uuid)),
                "chars": chars,
            })
        return {"services": services}

    # ── GATT 原语 ──

    def read_char(self, address: str, uuid: str) -> None:
        client = self._clients.get(address)
        if client is None:
            self.op_failed.emit("read", address, "未连接")
            return

        async def _read():
            data = bytes(await client.read_gatt_char(uuid))
            return data
        self._submit_op("read", address, uuid, _read(),
                        lambda v: self.char_read.emit(address, uuid, hex_spaced(v), try_utf8(v)))

    def write_char(self, address: str, uuid: str, data: bytes) -> None:
        if uuid.replace("-", "").lower() == INPUT_CHAR_UUID.replace("-", ""):
            self.op_failed.emit("write", address,
                                "INPUT 特征写入已被禁用（SHID-FW-LOCK-001 设备保护）")
            return
        client = self._clients.get(address)
        if client is None:
            self.op_failed.emit("write", address, "未连接")
            return

        async def _write():
            # PARITY-007：恒带响应写（writeNoResponse 在 Windows 栈字节腐败）
            await client.write_gatt_char(uuid, data, response=True)
            return len(data)
        self._submit_op("write", address, uuid, _write(),
                        lambda n: self.write_done.emit(address, uuid, n))

    def set_notify(self, address: str, uuid: str, on: bool) -> None:
        client = self._clients.get(address)
        if client is None:
            self.op_failed.emit("notify", address, "未连接")
            return

        def _on_notify(_char, data: bytearray, _a=address, _u=uuid) -> None:
            self.char_notified.emit(_a, _u, hex_spaced(bytes(data)))

        async def _start():
            await client.start_notify(uuid, _on_notify)
        async def _stop():
            await client.stop_notify(uuid)

        if on:
            def _ok_start(_v) -> None:
                self._mark_notify(address, uuid, True)
                self.notify_changed.emit(address, uuid, True)
            self._submit_op("notify", address, uuid, _start(), _ok_start)
        else:
            def _ok_stop(_v) -> None:
                self._mark_notify(address, uuid, False)
                self.notify_changed.emit(address, uuid, False)
            self._submit_op("notify", address, uuid, _stop(), _ok_stop)

    def notifying(self, address: str, uuid: str) -> bool:
        return uuid in self._notifying.get(address, set())

    def _mark_notify(self, address: str, uuid: str, on: bool) -> None:
        tab = self._notifying.setdefault(address, set())
        if on:
            tab.add(uuid)
        else:
            tab.discard(uuid)

    def _submit_op(self, op: str, address: str, uuid: str, aw, on_ok) -> None:
        fut = self._gatt.submit(aw)

        def _done(f: Future) -> None:
            try:
                v = f.result()
            except Exception as exc:  # noqa: BLE001 - GATT 失败落日志
                self.op_failed.emit(op, address, f"{uuid}: {exc}")
            else:
                on_ok(v)
        fut.add_done_callback(_done)
