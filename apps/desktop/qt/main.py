"""Q-WIN · SmartBLE 桌面壳（Qt/PySide6 + bleak）。

第 5 个 Windows 桌面壳：P001 扫描（真 bleak）/ P007 已连接（降级）/
P008 广播（降级）/ P009 关于（正典环境口径）。
生命周期正典（win016，dwin-quit 同口径）：关窗拦截 → 应用内退出确认
（busy = 连接 OR 广播）→ 确认后先停广播再断连再退出。
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QStackedWidget,
    QTabBar,
    QVBoxLayout,
    QWidget,
)

from ble_service import BleService
from theme import QSS

HERE = Path(__file__).resolve().parent


def app_version() -> str:
    """与 E-WIN 同源：仓库根 VERSION（package.json 版本单源同步）。"""
    for cand in (HERE.parents[2] / "VERSION",):
        try:
            return cand.read_text(encoding="utf-8").strip() or "dev"
        except OSError:
            pass
    return "dev"


class ScanPage(QWidget):
    """P001 扫描：kicker/标题/状态 + 扫描钮 + 附近设备列表。"""

    def __init__(self, ble: BleService, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._ble = ble
        self._hits: list = []

        root = QVBoxLayout(self)
        root.setContentsMargins(24, 20, 24, 16)
        root.setSpacing(12)

        header = QHBoxLayout()
        titles = QVBoxLayout()
        titles.setSpacing(2)
        kicker = QLabel("BLE TOOLKIT+")
        kicker.setObjectName("Kicker")
        self._title = QLabel("扫描")
        self._title.setObjectName("PageTitle")
        self._status = QLabel("待开始扫描")
        self._status.setObjectName("Status")
        titles.addWidget(kicker)
        titles.addWidget(self._title)
        titles.addWidget(self._status)
        header.addLayout(titles)
        header.addStretch(1)
        self._scan_btn = QPushButton("开始扫描")
        self._scan_btn.setObjectName("Primary")
        self._scan_btn.setFixedHeight(40)
        self._scan_btn.clicked.connect(self._toggle)
        header.addWidget(self._scan_btn, 0, Qt.AlignTop)
        root.addLayout(header)

        card = QFrame()
        card.setObjectName("Card")
        cv = QVBoxLayout(card)
        cv.setContentsMargins(14, 12, 14, 12)
        head = QLabel("附近设备")
        head.setObjectName("CardTitle")
        cv.addWidget(head)
        self._list = QListWidget()
        self._list.setObjectName("DeviceList")
        cv.addWidget(self._list)
        empty = QLabel("点击「开始扫描」搜索附近 BLE 设备")
        empty.setObjectName("Dim")
        cv.addWidget(empty)
        root.addWidget(card, 1)

        ble.scan_done.connect(self._on_done)
        ble.scan_failed.connect(self._on_failed)

    def _toggle(self) -> None:
        if self._ble.scanning:
            self._ble.stop_scan()
            self._status.setText("已停止")
            self._scan_btn.setText("开始扫描")
            return
        self._status.setText("正在扫描…")
        self._scan_btn.setText("停止扫描")
        self._ble.start_scan(5.0)

    def _on_done(self, hits: list) -> None:
        # P001 正典状态词：扫描完成 · 发现 N 台
        self._hits = hits
        self._status.setText(f"扫描完成 · 发现 {len(hits)} 台")
        self._scan_btn.setText("开始扫描")
        self._list.clear()
        for h in hits:
            name = h.name or "(未命名)"
            item = QListWidgetItem(f"{name}   {h.rssi} dBm   {h.address}")
            self._list.addItem(item)

    def _on_failed(self, msg: str) -> None:
        self._status.setText(f"扫描失败：{msg}")
        self._scan_btn.setText("开始扫描")


class ConnectedPage(QWidget):
    """P007 已连接（v1 降级：连接管理未接，GATT 客户端后续窗口）。"""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        lay = QVBoxLayout(self)
        lay.setContentsMargins(24, 20, 24, 16)
        tip = QLabel("已连接 · v1 降级（GATT 连接管理未接入，见计划文档 WIN-014）")
        tip.setObjectName("Status")
        tip.setWordWrap(True)
        lay.addWidget(tip)
        lay.addStretch(1)


class BroadcastPage(QWidget):
    """P008 广播（Windows 无外设栈，与 V-WIN 同口径降级）。"""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        lay = QVBoxLayout(self)
        lay.setContentsMargins(24, 20, 24, 16)
        tip = QLabel("Windows 平台暂不支持外设模式（降级口径同 V-WIN；N4 待决）")
        tip.setObjectName("Status")
        tip.setWordWrap(True)
        lay.addWidget(tip)
        lay.addStretch(1)


class AboutPage(QWidget):
    """P009 关于：正典桌面环境口径（Desktop · Windows / PC · X64）。"""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        lay = QVBoxLayout(self)
        lay.setContentsMargins(24, 20, 24, 16)
        kicker = QLabel("BLE TOOLKIT+")
        kicker.setObjectName("Kicker")
        title = QLabel("关于")
        title.setObjectName("PageTitle")
        lay.addWidget(kicker)
        lay.addWidget(title)
        lay.addSpacing(10)
        card = QFrame()
        card.setObjectName("Card")
        cv = QVBoxLayout(card)
        cv.setContentsMargins(16, 8, 16, 8)
        arch = os.environ.get("PROCESSOR_ARCHITECTURE", "")
        rows = [
            ("当前环境", "Desktop · Windows"),
            ("设备型号", f"PC · {'X64' if arch == 'AMD64' else arch}"),
            ("版本", f"v{app_version()}"),
        ]
        for i, (k, v) in enumerate(rows):
            row = QHBoxLayout()
            key = QLabel(k)
            key.setObjectName("Dim")
            key.setFixedWidth(90)
            val = QLabel(v)
            row.addWidget(key)
            row.addWidget(val, 1)
            cv.addLayout(row)
            if i < len(rows) - 1:
                sep = QFrame()
                sep.setFrameShape(QFrame.HLine)
                cv.addWidget(sep)
        lay.addWidget(card)
        lay.addStretch(1)


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        # 壳家族口径：E/V/F 同为 1200x900，标题 SmartBLE
        self.setWindowTitle("SmartBLE")
        self.resize(1200, 900)
        self.setMinimumWidth(940)
        self._ble = BleService(self)
        self._exit_confirmed = False

        central = QWidget()
        self.setCentralWidget(central)
        outer = QVBoxLayout(central)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        self._stack = QStackedWidget()
        pages = [
            ("扫描", ScanPage(self._ble)),
            ("已连接", ConnectedPage()),
            ("广播", BroadcastPage()),
            ("关于", AboutPage()),
        ]
        for _, page in pages:
            self._stack.addWidget(page)

        self._tabs = QTabBar()
        self._tabs.setExpanding(False)
        self._tabs.setDocumentMode(True)
        for i, (label, _) in enumerate(pages):
            self._tabs.addTab(label)
        self._tabs.currentChanged.connect(self._on_tab)
        outer.addWidget(self._stack, 1)
        outer.addWidget(self._tabs)

    def _on_tab(self, index: int) -> None:
        # win016 正典：切入广播页先停扫描；切出广播页即停广播（本壳广播降级恒 false）
        leaving_broadcast = self._stack.currentIndex() == 2
        if index == 2 and self._ble.scanning:
            self._ble.stop_scan()
        if leaving_broadcast and index != 2 and self._ble.advertising:
            self._ble.advertising = False
        self._stack.setCurrentIndex(index)

    def closeEvent(self, event) -> None:  # noqa: N802 - Qt 命名
        """关窗拦截 → 退出确认（10_platform §4；dwin-quit 文案）。"""
        if self._exit_confirmed:
            event.accept()
            return
        event.ignore()
        if self.isVisible() is False:
            event.accept()
            return
        connected = len(self._ble.connected)
        busy = connected > 0 or self._ble.advertising
        box = QMessageBox(self)
        box.setWindowTitle("退出确认")
        box.setText(
            "有 BLE 会话正在运行（连接/广播）。\n确认退出将断开会话并停止监听。"
            if busy
            else "桌面端为常驻运行。确认退出？\n（10_platform §4 生命周期：常驻，退出确认）"
        )
        box.addButton("继续使用", QMessageBox.RejectRole)
        quit_btn = box.addButton("退出", QMessageBox.AcceptRole)
        box.exec()
        if box.clickedButton() is quit_btn:
            # dwin-quit 正典顺序：先停广播（本壳降级恒无）→ 停扫描 → 退出
            if self._ble.scanning:
                self._ble.stop_scan()
            self._exit_confirmed = True
            self.close()
        # 「继续使用」：不退出，保持常驻


def main() -> int:
    app = QApplication(sys.argv)
    app.setStyleSheet(QSS)
    icon_path = HERE / "assets" / "app.ico"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))
    win = MainWindow()
    win.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
