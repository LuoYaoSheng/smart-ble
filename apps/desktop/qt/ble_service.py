"""Q-WIN BLE 服务：bleak（WinRT）扫描封装。

工作线程内独立 asyncio loop 跑一次 5s 扫描（bleak 官方推荐模式），
结果经 Qt 信号回 UI 线程；与 E/T/V/F 各壳的 5s 扫描超时口径一致。
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

from PySide6.QtCore import QObject, QThread, Signal


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


class BleService(QObject):
    """UI 线程侧门面：start_scan() 非阻塞，结束发 Qt 信号。"""

    scan_done = Signal(list)  # list[ScanHit]
    scan_failed = Signal(str)

    def __init__(self, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._worker: _ScanWorker | None = None
        # Windows 无外设（广播）栈：与 V-WIN 同口径降级，保留字段供生命周期判断
        self.advertising = False
        self.connected: set[str] = set()

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
