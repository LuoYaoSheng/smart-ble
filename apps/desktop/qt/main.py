"""Q-WIN · SmartBLE 桌面壳（Qt/PySide6 + bleak）。

第 5 个 Windows 桌面壳。P001 扫描（真 bleak）/ P006 设备详情 GATT
（连接/发现/读/带响应写=PARITY-007/订阅）/ P007 已连接（连接管理）/
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
    QComboBox,
    QDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QStackedWidget,
    QTreeWidget,
    QTreeWidgetItem,
    QVBoxLayout,
    QWidget,
)

from automation import start_automation_if_requested
from ble_service import BleService, ScanHit, char_display_name, service_display_name
from tabbar import CanonTabBar
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


class WriteDialog(QDialog):
    """P005 写入弹窗：UTF-8 / HEX 两模式，恒带响应写（PARITY-007）。"""

    def __init__(self, char_name: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("写入特征")
        lay = QVBoxLayout(self)
        lay.setContentsMargins(18, 16, 18, 14)
        lay.setSpacing(10)
        tip = QLabel(f"目标特征：{char_name}")
        tip.setObjectName("Dim")
        lay.addWidget(tip)
        self._mode = QComboBox()
        self._mode.addItem("UTF-8 文本")
        self._mode.addItem("HEX 十六进制")
        lay.addWidget(self._mode)
        self._input = QLineEdit()
        self._input.setPlaceholderText("HEX 模式示例：01 A2 FF")
        lay.addWidget(self._input)
        btns = QHBoxLayout()
        cancel = QPushButton("取消")
        cancel.clicked.connect(self.reject)
        self._send = QPushButton("发送")
        self._send.setObjectName("Primary")
        self._send.clicked.connect(self.accept)
        btns.addStretch(1)
        btns.addWidget(cancel)
        btns.addWidget(self._send)
        lay.addLayout(btns)

    def payload(self) -> bytes | None:
        """按模式解析；HEX 非法返回 None（调用方提示）。"""
        text = self._input.text().strip()
        if not text:
            return b""
        if self._mode.currentIndex() == 0:
            return text.encode("utf-8")
        cleaned = text.replace(" ", "").replace("0x", "").replace("0X", "")
        if len(cleaned) % 2:
            return None
        try:
            return bytes.fromhex(cleaned)
        except ValueError:
            return None


class ScanPage(QWidget):
    """P001 扫描：kicker/标题/状态 + 扫描钮 + 附近设备列表 + 连接动作。"""

    def __init__(self, ble: BleService, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._ble = ble
        self._hits: list[ScanHit] = []

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
        self._list.itemDoubleClicked.connect(lambda _i: self._connect_selected())
        cv.addWidget(self._list)
        foot = QHBoxLayout()
        self._empty = QLabel("点击「开始扫描」搜索附近 BLE 设备")
        self._empty.setObjectName("Dim")
        foot.addWidget(self._empty, 1)
        self._connect_btn = QPushButton("连接所选设备")
        self._connect_btn.setEnabled(False)
        self._connect_btn.clicked.connect(self._connect_selected)
        foot.addWidget(self._connect_btn)
        cv.addLayout(foot)
        root.addWidget(card, 1)

        self._list.currentRowChanged.connect(
            lambda row: self._connect_btn.setEnabled(row >= 0)
        )
        ble.scan_done.connect(self._on_done)
        ble.scan_failed.connect(self._on_failed)
        ble.op_failed.connect(self._on_op_failed)

    def _toggle(self) -> None:
        if self._ble.scanning:
            self._ble.stop_scan()
            self._status.setText("已停止")
            self._scan_btn.setText("开始扫描")
            return
        self._status.setText("正在扫描…")
        self._scan_btn.setText("停止扫描")
        self._ble.start_scan(5.0)

    def _connect_selected(self) -> None:
        row = self._list.currentRow()
        if row < 0 or row >= len(self._hits):
            return
        hit = self._hits[row]
        if hit.address in self._ble.connected:
            # 已连接：直接回放连接信号走「打开详情」路径
            info = self._ble.connected[hit.address]
            self._ble.device_connected.emit(hit.address, info["name"], info["tree"])
            return
        self._status.setText(f"正在连接 {hit.name or hit.address} …")
        self._ble.connect_device(hit)

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

    def _on_op_failed(self, op: str, address: str, msg: str) -> None:
        if op == "connect":
            self._status.setText(f"连接失败：{msg}")
            self._scan_btn.setText("开始扫描")


class DeviceDetailPage(QWidget):
    """P006 设备详情（GATT）：服务/特征树 + 特征操作 + 操作日志。"""

    back_requested = None  # 由 MainWindow 注入 callable

    def __init__(self, ble: BleService, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._ble = ble
        self._address = ""
        self._name = ""
        self._tree_data: dict = {"services": []}
        self._char_rows: list[dict] = []  # 展平的特征行 [{svc, uuid, props}]
        self._write_dlg: WriteDialog | None = None

        root = QVBoxLayout(self)
        root.setContentsMargins(24, 20, 24, 16)
        root.setSpacing(12)

        header = QHBoxLayout()
        back = QPushButton("← 返回")
        back.clicked.connect(lambda: self.back_requested and self.back_requested())
        header.addWidget(back, 0, Qt.AlignTop)
        titles = QVBoxLayout()
        titles.setSpacing(2)
        kicker = QLabel("BLE TOOLKIT+")
        kicker.setObjectName("Kicker")
        self._title = QLabel("设备详情")
        self._title.setObjectName("PageTitle")
        self._status = QLabel("")
        self._status.setObjectName("Status")
        titles.addWidget(kicker)
        titles.addWidget(self._title)
        titles.addWidget(self._status)
        header.addLayout(titles)
        header.addStretch(1)
        root.addLayout(header)

        card = QFrame()
        card.setObjectName("Card")
        cv = QVBoxLayout(card)
        cv.setContentsMargins(14, 12, 14, 12)
        cv.setSpacing(8)
        head = QLabel("GATT 服务与特征")
        head.setObjectName("CardTitle")
        cv.addWidget(head)
        self._tree = QTreeWidget()
        self._tree.setObjectName("GattTree")
        self._tree.setHeaderLabels(["项目", "属性"])
        self._tree.setRootIsDecorated(True)
        self._tree.currentItemChanged.connect(self._on_char_changed)
        cv.addWidget(self._tree, 1)

        actions = QHBoxLayout()
        self._act_read = QPushButton("读取")
        self._act_read.clicked.connect(self._read)
        self._act_notify = QPushButton("订阅通知")
        self._act_notify.clicked.connect(self._toggle_notify)
        self._act_write = QPushButton("写入…")
        self._act_write.clicked.connect(self._write)
        for b in (self._act_read, self._act_notify, self._act_write):
            b.setEnabled(False)
            actions.addWidget(b)
        actions.addStretch(1)
        cv.addLayout(actions)
        root.addWidget(card, 3)

        log_card = QFrame()
        log_card.setObjectName("Card")
        lv = QVBoxLayout(log_card)
        lv.setContentsMargins(14, 12, 14, 12)
        lv.setSpacing(6)
        log_head = QLabel("操作日志")
        log_head.setObjectName("CardTitle")
        lv.addWidget(log_head)
        self._log = QPlainTextEdit()
        self._log.setReadOnly(True)
        self._log.setObjectName("OpLog")
        lv.addWidget(self._log)
        root.addWidget(log_card, 2)

        ble.char_read.connect(self._on_read)
        ble.char_notified.connect(self._on_notified)
        ble.notify_changed.connect(self._on_notify_changed)
        ble.write_done.connect(self._on_write_done)
        ble.op_failed.connect(self._on_op_failed)
        ble.device_disconnected.connect(self._on_disconnected)

    # ── 会话绑定 ──

    def bind(self, address: str, name: str, tree: dict) -> None:
        self._address = address
        self._name = name
        self._tree_data = tree
        self._title.setText(name or address)
        self._status.setText(f"{address} · 已连接")
        self._log.clear()
        self._rebuild_tree()
        self._log.appendPlainText(f"已连接 {name or ''} ({address})")

    def _rebuild_tree(self) -> None:
        self._tree.clear()
        self._char_rows = []
        for svc in self._tree_data.get("services", []):
            s_label = svc.get("name") or svc["uuid"]
            s_item = QTreeWidgetItem([f"▸ {s_label}", "服务"])
            for ch in svc.get("chars", []):
                c_label = ch.get("name") or ch["uuid"]
                props = ch.get("props", [])
                c_item = QTreeWidgetItem([f"  {c_label}", " ".join(props)])
                c_item.setData(0, Qt.UserRole, len(self._char_rows))
                self._char_rows.append(
                    {"svc": svc["uuid"], "uuid": ch["uuid"], "props": props}
                )
                s_item.addChild(c_item)
            self._tree.addTopLevelItem(s_item)
        self._tree.expandAll()

    def _current_char(self) -> dict | None:
        item = self._tree.currentItem()
        if item is None or item.data(0, Qt.UserRole) is None:
            return None
        return self._char_rows[item.data(0, Qt.UserRole)]

    def _on_char_changed(self, *_a) -> None:
        ch = self._current_char()
        if ch is None:
            for b in (self._act_read, self._act_notify, self._act_write):
                b.setEnabled(False)
            return
        props = set(ch["props"])
        self._act_read.setEnabled("read" in props)
        can_notify = "notify" in props or "indicate" in props
        self._act_notify.setEnabled(can_notify)
        self._refresh_notify_label()
        self._act_write.setEnabled("write" in props or "write-without-response" in props)

    def _refresh_notify_label(self) -> None:
        ch = self._current_char()
        if ch is None:
            return
        if self._ble.notifying(self._address, ch["uuid"]):
            self._act_notify.setText("取消订阅")
        else:
            self._act_notify.setText("订阅通知")

    # ── 操作 ──

    def _read(self) -> None:
        ch = self._current_char()
        if ch:
            self._log.appendPlainText(f"读取 {char_display_name(ch['uuid']) or ch['uuid']} …")
            self._ble.read_char(self._address, ch["uuid"])

    def _toggle_notify(self) -> None:
        ch = self._current_char()
        if ch is None:
            return
        on = not self._ble.notifying(self._address, ch["uuid"])
        self._log.appendPlainText(
            f"{'订阅' if on else '取消订阅'} {char_display_name(ch['uuid']) or ch['uuid']} …"
        )
        self._ble.set_notify(self._address, ch["uuid"], on)

    def _write(self) -> None:
        ch = self._current_char()
        if ch is None:
            return
        # open() 而非 exec()：窗口模态但不阻塞调用方（自动化 seam 串行协议可继续驱动）
        dlg = WriteDialog(char_display_name(ch["uuid"]) or ch["uuid"], self)
        self._write_dlg = dlg

        def _finished(result: int, uuid: str = ch["uuid"]) -> None:
            self._on_write_finished(uuid, result)

        dlg.finished.connect(_finished)
        dlg.open()

    def _on_write_finished(self, uuid: str, result: int) -> None:
        dlg = self._write_dlg
        self._write_dlg = None
        if dlg is None or result != QDialog.Accepted:
            self._log.appendPlainText("写入已取消")
            return
        payload = dlg.payload()
        if payload is None:
            self._log.appendPlainText("写入失败：HEX 格式非法（需偶数位十六进制）")
            return
        if not payload:
            self._log.appendPlainText("写入失败：内容为空")
            return
        self._ble.write_char(self._address, uuid, payload)

    # ── 信号落日志 ──

    def _mine(self, address: str) -> bool:
        return address == self._address

    def _on_read(self, address: str, uuid: str, hexs: str, text: str) -> None:
        if not self._mine(address):
            return
        shown = f"读取成功 · {char_display_name(uuid) or uuid} · {hexs}"
        if text:
            shown += f" · 「{text}」"
        self._log.appendPlainText(shown)

    def _on_notified(self, address: str, uuid: str, hexs: str) -> None:
        if not self._mine(address):
            return
        self._log.appendPlainText(f"收到通知 · {char_display_name(uuid) or uuid} · {hexs}")

    def _on_notify_changed(self, address: str, uuid: str, on: bool) -> None:
        if not self._mine(address):
            return
        self._log.appendPlainText(
            f"{'订阅成功' if on else '已取消订阅'} · {char_display_name(uuid) or uuid}"
        )
        self._refresh_notify_label()

    def _on_write_done(self, address: str, uuid: str, nbytes: int) -> None:
        if not self._mine(address):
            return
        self._log.appendPlainText(
            f"写入成功 · {char_display_name(uuid) or uuid} · {nbytes} 字节（带响应）"
        )

    def _on_op_failed(self, op: str, address: str, msg: str) -> None:
        if not self._mine(address):
            return
        self._log.appendPlainText(f"{op} 失败 · {msg}")

    def _on_disconnected(self, address: str, expected: bool) -> None:
        if self._mine(address):
            self._status.setText(f"{address} · 已断开")
            self._log.appendPlainText("连接已断开" + ("" if expected else "（意外断链）"))


class ConnectedPage(QWidget):
    """P007 已连接：连接管理（列表 / 单断 / 全断 / 进详情）。"""

    open_detail = None  # 由 MainWindow 注入 callable(address)

    def __init__(self, ble: BleService, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._ble = ble
        root = QVBoxLayout(self)
        root.setContentsMargins(24, 20, 24, 16)
        root.setSpacing(12)
        kicker = QLabel("BLE TOOLKIT+")
        kicker.setObjectName("Kicker")
        self._title = QLabel("已连接")
        self._title.setObjectName("PageTitle")
        self._status = QLabel("已连接 0 台")
        self._status.setObjectName("Status")
        root.addWidget(kicker)
        root.addWidget(self._title)
        root.addWidget(self._status)

        card = QFrame()
        card.setObjectName("Card")
        cv = QVBoxLayout(card)
        cv.setContentsMargins(14, 12, 14, 12)
        cv.setSpacing(8)
        head = QLabel("会话设备")
        head.setObjectName("CardTitle")
        cv.addWidget(head)
        self._list = QListWidget()
        self._list.setObjectName("DeviceList")
        self._list.itemDoubleClicked.connect(lambda _i: self._open_selected())
        cv.addWidget(self._list, 1)
        foot = QHBoxLayout()
        self._open_btn = QPushButton("查看详情")
        self._open_btn.setEnabled(False)
        self._open_btn.clicked.connect(self._open_selected)
        self._disc_btn = QPushButton("断开所选")
        self._disc_btn.setEnabled(False)
        self._disc_btn.clicked.connect(self._disconnect_selected)
        self._all_btn = QPushButton("断开全部")
        self._all_btn.setObjectName("Primary")
        self._all_btn.clicked.connect(self._disconnect_all)
        foot.addWidget(self._open_btn)
        foot.addWidget(self._disc_btn)
        foot.addStretch(1)
        foot.addWidget(self._all_btn)
        cv.addLayout(foot)
        root.addWidget(card, 1)

        self._list.currentRowChanged.connect(self._on_row)
        ble.device_connected.connect(lambda *_a: self.refresh())
        ble.device_disconnected.connect(lambda *_a: self.refresh())

    def refresh(self) -> None:
        entries = list(self._ble.connected.items())
        self._status.setText(f"已连接 {len(entries)} 台")
        self._list.clear()
        for address, info in entries:
            self._list.addItem(QListWidgetItem(f"{info['name']}   {address}"))
        has = bool(entries)
        self._all_btn.setEnabled(has)
        if not has:
            self._open_btn.setEnabled(False)
            self._disc_btn.setEnabled(False)

    def _current_address(self) -> str | None:
        row = self._list.currentRow()
        if row < 0:
            return None
        entries = list(self._ble.connected.items())
        return entries[row][0] if row < len(entries) else None

    def _on_row(self, row: int) -> None:
        self._open_btn.setEnabled(row >= 0)
        self._disc_btn.setEnabled(row >= 0)

    def _open_selected(self) -> None:
        address = self._current_address()
        if address and self.open_detail:
            self.open_detail(address)

    def _disconnect_selected(self) -> None:
        address = self._current_address()
        if address:
            self._ble.disconnect_device(address)

    def _disconnect_all(self) -> None:
        self._ble.disconnect_all()


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
        self.tip_label = tip


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
        self.row_values: dict[str, str] = {}
        for i, (k, v) in enumerate(rows):
            row = QHBoxLayout()
            key = QLabel(k)
            key.setObjectName("Dim")
            key.setFixedWidth(90)
            val = QLabel(v)
            self.row_values[k] = v
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
    IDX_SCAN, IDX_CONNECTED, IDX_BROADCAST, IDX_ABOUT, IDX_DETAIL = range(5)

    def __init__(self) -> None:
        super().__init__()
        # 壳家族口径：E/V/F/G 同为 1200x900，标题 SmartBLE
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

        self._scan_page = ScanPage(self._ble)
        self._detail_page = DeviceDetailPage(self._ble)
        self._connected_page = ConnectedPage(self._ble)
        self._about_page = AboutPage()
        self._broadcast_page = BroadcastPage()
        self._detail_page.back_requested = self._back_from_detail
        self._connected_page.open_detail = self._open_detail

        self._stack = QStackedWidget()
        pages = [
            ("扫描", self._scan_page),
            ("已连接", self._connected_page),
            ("广播", self._broadcast_page),
            ("关于", self._about_page),
            ("", self._detail_page),  # 详情页无 Tab（隐藏时占位）
        ]
        for _, page in pages:
            self._stack.addWidget(page)

        # 正典底栏（tabbar.py）：64px 图标+等宽+色彩态，替代 QTabBar 文字下划线形态
        self._tabs = CanonTabBar(
            [("扫描", "scan"), ("已连接", "link"), ("广播", "cast"), ("关于", "info")]
        )
        self._tabs.currentChanged.connect(self._on_tab)
        self._tabs.setCurrentIndex(0)
        outer.addWidget(self._stack, 1)
        outer.addWidget(self._tabs)

        self._ble.device_connected.connect(self._on_connected)
        # 已连接角标 .n 口径：通用连接计数（正典 connectedBadge）
        self._ble.device_connected.connect(lambda *_: self._refresh_badge())
        self._ble.device_disconnected.connect(lambda *_: self._refresh_badge())

    # ── 导航 ──

    def _on_tab(self, index: int) -> None:
        # win016 正典：切入广播页先停扫描；切出广播页即停广播（本壳广播降级恒 false）
        leaving_broadcast = self._stack.currentIndex() == self.IDX_BROADCAST
        if index == self.IDX_BROADCAST and self._ble.scanning:
            self._ble.stop_scan()
        if leaving_broadcast and index != self.IDX_BROADCAST and self._ble.advertising:
            self._ble.advertising = False
        self._stack.setCurrentIndex(index)

    def _refresh_badge(self) -> None:
        self._tabs.set_badge(1, len(self._ble.connected))

    def _open_detail(self, address: str) -> None:
        info = self._ble.connected.get(address)
        if info is None:
            return
        self._detail_page.bind(address, info["name"], info["tree"])
        self._tabs.setVisible(False)
        self._stack.setCurrentIndex(self.IDX_DETAIL)

    def _on_connected(self, address: str, name: str, tree: dict) -> None:
        self._connected_page.refresh()
        self._open_detail(address)

    def _back_from_detail(self) -> None:
        # P006 返回：连接常驻（正典），回已连接列表
        self._tabs.setVisible(True)
        self._stack.setCurrentIndex(self.IDX_CONNECTED)

    # ── 生命周期 ──

    def closeEvent(self, event) -> None:  # noqa: N802 - Qt 命名
        """关窗拦截 → 退出确认（10_platform §4；dwin-quit 文案）。"""
        if self._exit_confirmed:
            self._ble.shutdown()
            event.accept()
            return
        event.ignore()
        if self.isVisible() is False:
            self._ble.shutdown()
            event.accept()
            return
        connected = len(self._ble.connected)
        busy = connected > 0 or self._ble.advertising
        box = QMessageBox(self)
        box.setWindowTitle("退出确认")
        box.setText(
            f"有 BLE 会话正在运行（当前连接设备：{connected} 台）。\n"
            "确认退出将断开会话并停止监听。"
            if busy
            else "桌面端为常驻运行。确认退出？\n（10_platform §4 生命周期：常驻，退出确认）"
        )
        box.addButton("继续使用", QMessageBox.RejectRole)
        quit_btn = box.addButton("退出", QMessageBox.AcceptRole)
        box.exec()
        if box.clickedButton() is quit_btn:
            # dwin-quit 正典顺序：先停广播（本壳降级恒无）→ 停扫描 → 断连 → 退出
            if self._ble.scanning:
                self._ble.stop_scan()
            self._exit_confirmed = True
            # 直接 accept 本次关闭事件（closeEvent 内嵌套 close() 会被 Qt
            # 重入保护吞掉——坑位账），shutdown 在首个分支统一执行
            self._ble.shutdown()
            event.accept()
        # 「继续使用」：事件已 ignore，不退出，保持常驻


def main() -> int:
    app = QApplication(sys.argv)
    app.setStyleSheet(QSS)
    icon_path = HERE / "assets" / "app.ico"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))
    win = MainWindow()
    win.show()
    start_automation_if_requested(win)
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
