"""Q-WIN · SmartBLE 桌面壳（Qt/PySide6 + bleak）。

第 5 个 Windows 桌面壳。P001 扫描（真 bleak）/ P006 设备详情 GATT
（连接/发现/读/带响应写=PARITY-007/订阅）/ P007 已连接（连接管理）/
P008 广播（降级）/ P009 关于（正典环境口径）。
生命周期正典（win016，dwin-quit 同口径）：关窗拦截 → 应用内退出确认
（busy = 连接 OR 广播）→ 确认后先停广播再断连再退出。

UIALIGN-PAGE（20260921）：五页页面级对齐 E-WIN 正典——navbar 渐变+底线、
.page 16/0/24 边距、设备卡（ava/nm/id/sig 四档）、筛选四档面板、bt-chip
蓝牙状态胶囊、P007 汇总卡、P009 身份卡+kv、P008 note 提示。
automation seam 契约保持：_hits/_status/_scan_btn/_list.currentRow/
row_values/tip_label 等属性名不变。
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QColor, QFont, QIcon, QPainter, QLinearGradient, QTransform
from PySide6.QtWidgets import (
    QApplication,
    QComboBox,
    QDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QScrollArea,
    QStackedWidget,
    QTreeWidget,
    QTreeWidgetItem,
    QVBoxLayout,
    QWidget,
)

from automation import start_automation_if_requested
from ble_service import BleService, ScanHit, char_display_name
from tabbar import CanonTabBar, render_icon
from theme import LINE_SOFT, MUT, PRIMARY, PRIMARY_DEEP, QSS, SUB
from widgets import (
    BtChip,
    Chip,
    DevList,
    DeviceCardWidget,
    EmptyState,
    FilterPanelWidget,
    LiveDot,
    NavBar,
    NoteInfo,
    SumCard,
    icon_label,
    qfont,
)

HERE = Path(__file__).resolve().parent


def app_version() -> str:
    """与 E-WIN 同源：仓库根 VERSION（package.json 版本单源同步）。"""
    for cand in (HERE.parents[2] / "VERSION",):
        try:
            return cand.read_text(encoding="utf-8").strip() or "dev"
        except OSError:
            pass
    return "dev"


def page_scroll() -> tuple[QScrollArea, QVBoxLayout]:
    """正典 .page：QScrollArea 内容滚动 + (16, 0, 16, 24) 边距（pagehost 口径）。"""
    scroll = QScrollArea()
    scroll.setWidgetResizable(True)
    body = QWidget()
    lay = QVBoxLayout(body)
    lay.setContentsMargins(16, 0, 16, 24)
    lay.setSpacing(0)
    scroll.setWidget(body)
    return scroll, lay


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


def build_ad_segments(hit: ScanHit) -> list[tuple[str, str, bytes]]:
    """由平台解析字段重建 AD 结构段（F004 · 与 uniapp/Flutter buildAdSegments 同口径）：
    平台 API 不提供原始广播帧字节时，逐段按 AD 类型号重组并标注来源。
    返回 [(type, name, frame)]，frame 首字节为段长（含类型字节）。"""
    import struct

    segs: list[tuple[str, str, bytes]] = []

    def add(type_: int, label: str, payload: bytes) -> None:
        segs.append((f"0x{type_:02X}", label, bytes([len(payload) + 1, type_]) + payload))

    if hit.name:
        add(0x09, "完整本地名称", hit.name.encode("utf-8"))

    shorts: list[int] = []
    fulls: list[str] = []
    for u in hit.service_uuids or []:
        v = u.replace("-", "").lower()
        if len(v) == 4:
            shorts.append(int(v, 16))
        elif len(v) == 32:
            fulls.append(v)
    if shorts:
        # 16 位 UUID 列表按小端序拼负载
        add(0x03, "16 位 Service UUID 列表", b"".join(struct.pack("<H", s) for s in shorts))
    if fulls:
        # 128 位 UUID 列表每 UUID 按小端字节序
        add(0x07, "128 位 Service UUID 列表", b"".join(bytes.fromhex(v)[::-1] for v in fulls))

    if hit.manufacturer_id is not None:
        add(0xFF, "厂商数据", struct.pack("<H", hit.manufacturer_id) + hit.manufacturer_data)

    for uuid, data in hit.service_data or []:
        v = uuid.replace("-", "").lower()
        if len(v) != 4:
            continue
        add(0x16, "Service Data", struct.pack("<H", int(v, 16)) + data)

    return segs


class AdvDialog(QDialog):
    """P001 广播数据弹窗（F004 · R04 口径）：点击扫描卡本体弹出。
    kv 四行（设备 ID/名称/RSSI/profileMatch）+ 深色分段（Service UUIDs /
    AD 结构逐段（平台解析字段重建）/ 厂商 ID / Service Data），
    单字段缺失逐项标注「本轮平台 API 未提供此字段」，支持一键复制。"""

    MISS = "本轮平台 API 未提供此字段"
    INK = "#17223B"       # 正典 var(--c-ink) 同值
    INK_TEXT = "#D7E3F4"  # 正典 .ad-sec .hex 前景同族
    INK_SUB = "#8FA3C0"   # 正典 .ad-sec .hd 前景同值

    def __init__(self, hit: ScanHit, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._hit = hit
        title_name = hit.name or hit.address[-6:]
        self.setWindowTitle(f"广播数据 · {title_name}")
        lay = QVBoxLayout(self)
        lay.setContentsMargins(18, 16, 18, 14)
        lay.setSpacing(8)

        for label, value in self._kv_rows():
            row = QHBoxLayout()
            k = QLabel(label)
            k.setFixedWidth(150)
            k.setStyleSheet(f"color:{MUT};font-size:12px;background:transparent;")
            v = QLabel(value)
            v.setTextInteractionFlags(Qt.TextSelectableByMouse)
            v.setWordWrap(True)
            v.setStyleSheet("color:#17223B;background:transparent;")
            row.addWidget(k)
            row.addWidget(v, 1)
            lay.addLayout(row)

        for head, lines in self._sections():
            lay.addWidget(self._dark_section(head, lines))

        btns = QHBoxLayout()
        btns.addStretch(1)
        close = QPushButton("关闭")
        close.clicked.connect(self.reject)
        btns.addWidget(close)
        copy_btn = QPushButton("复制数据")
        copy_btn.setObjectName("Primary")
        copy_btn.clicked.connect(lambda: self._copy(copy_btn))
        btns.addWidget(copy_btn)
        lay.addLayout(btns)

    def _kv_rows(self) -> list[tuple[str, str]]:
        hit = self._hit
        return [
            ("设备 ID", hit.address),
            ("名称", hit.name or "（未命名）"),
            ("RSSI", f"{hit.rssi} dBm"),
            ("profileMatch", "—"),  # Q-WIN ScanHit 无 Profile 匹配字段，如实标注
        ]

    def _sections(self) -> list[tuple[str, list[tuple[str, str]]]]:
        hit = self._hit
        sections: list[tuple[str, list[tuple[str, str]]]] = []

        uuids = hit.service_uuids or []
        sections.append((
            f"Service UUIDs · {len(uuids)} 项" if uuids else "Service UUIDs",
            [(u, "") for u in uuids] if uuids else [("", self.MISS)],
        ))

        segs = build_ad_segments(hit)
        lines = [(f"{t} · {n} · {len(f)} B", f.hex().upper()) for t, n, f in segs]
        lines.append(("整包 hex", self.MISS))  # bleak 不提供原始整包帧
        sections.append((
            f"AD 结构 · 逐段（平台解析字段重建）· {len(segs)} 段" if segs
            else "AD 结构 · 逐段（平台解析字段重建）",
            lines if lines else [("", self.MISS)],
        ))

        if hit.manufacturer_id is not None:
            sections.append((
                f"Manufacturer Data · 0x{hit.manufacturer_id:04X}",
                [(hit.manufacturer_data.hex().upper() or "（长度 0）", "")],
            ))
        else:
            sections.append(("Manufacturer Data", [("", self.MISS)]))

        sd = hit.service_data or []
        sections.append((
            f"Service Data · {len(sd)} 项" if sd else "Service Data",
            [(u, d.hex().upper()) for u, d in sd] if sd else [("", self.MISS)],
        ))
        return sections

    def _dark_section(self, head: str, lines: list[tuple[str, str]]) -> QFrame:
        frame = QFrame()
        frame.setStyleSheet(
            f"QFrame {{ background:{self.INK}; border-radius:8px; }}"
            f"QLabel {{ background:transparent; }}"
        )
        box = QVBoxLayout(frame)
        box.setContentsMargins(12, 10, 12, 10)
        box.setSpacing(4)
        hd = QLabel(head)
        hd.setStyleSheet(f"color:{self.INK_SUB};font-size:11px;background:transparent;")
        box.addWidget(hd)
        for text, hex_ in lines:
            if text:
                sub = QLabel(text)
                sub.setStyleSheet(f"color:{self.INK_SUB};font-size:11px;background:transparent;")
                box.addWidget(sub)
            if hex_:
                body = QLabel(hex_)
                body.setTextInteractionFlags(Qt.TextSelectableByMouse)
                body.setWordWrap(True)
                body.setStyleSheet(
                    f"color:{self.INK_TEXT};font-family:Consolas,monospace;"
                    "font-size:11px;background:transparent;"
                )
                box.addWidget(body)
            if not text and not hex_:
                miss = QLabel(self.MISS)
                miss.setStyleSheet(f"color:{self.INK_SUB};font-size:11px;background:transparent;")
                box.addWidget(miss)
        return frame

    def _copy_text(self) -> str:
        hit = self._hit
        lines = [f"设备 ID: {hit.address}", f"名称: {hit.name or '（未命名）'}",
                 f"RSSI: {hit.rssi} dBm", "profileMatch: —"]
        if hit.service_uuids:
            lines.append("Service UUIDs:")
            lines.extend(hit.service_uuids)
        segs = build_ad_segments(hit)
        if segs:
            lines.append("AD 结构（平台解析字段重建）:")
            for t, n, f in segs:
                lines.append(f"{t} · {n} ({len(f)} B): {f.hex()}")
        if hit.manufacturer_id is not None:
            lines.append(f"厂商 ID: 0x{hit.manufacturer_id:04X}")
        for u, d in hit.service_data or []:
            lines.append(f"Service Data {u}: {d.hex()}")
        return "\n".join(lines)

    def _copy(self, btn: QPushButton) -> None:
        QApplication.clipboard().setText(self._copy_text())
        btn.setText("已复制")
        QTimer.singleShot(900, lambda: btn.setText("复制数据"))


class ScanPage(QWidget):
    """P001 扫描（正典页面结构）：navbar+bt-chip / scantool / sec-t+筛选 / 设备卡列表。"""

    def __init__(self, ble: BleService, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._ble = ble
        self._hits: list[ScanHit] = []
        self._view: list[ScanHit] = []  # 筛选视图（E getFilteredDevices 同口径）

        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        navbar = NavBar("BLE TOOLKIT+", "扫描")
        self._bt_chip = BtChip("初始化中…")
        navbar.add_right(self._bt_chip)
        root.addWidget(navbar)

        scroll, page = page_scroll()

        # scantool：状态 lb（+扫描中 live 点） | 扫描钮 btn primary
        scantool = QHBoxLayout()
        scantool.setSpacing(6)
        scantool.setContentsMargins(2, 14, 2, 10)  # .scantool margin:14 0 10 10
        self._live = LiveDot()
        scantool.addWidget(self._live)
        self._status = QLabel("待开始扫描")
        self._status.setFont(qfont(12, QFont.Weight.Normal))
        self._status.setStyleSheet(f"color:{MUT};background:transparent;")
        scantool.addWidget(self._status)
        scantool.addStretch(1)
        self._scan_btn = QPushButton("开始扫描")
        self._scan_btn.setObjectName("Primary")
        self._scan_btn.setIcon(QIcon(render_icon("scan", "#FFFFFF", 17)))
        self._scan_btn.clicked.connect(self._toggle)
        scantool.addWidget(self._scan_btn)
        page.addLayout(scantool)

        # sec-t：芯片图标 + 附近设备 + 数量 chip | 筛选 txtlink
        sect = QHBoxLayout()
        sect.setSpacing(7)
        sect.setContentsMargins(2, 2, 2, 10)  # .sec-t margin:2 2 10
        sect.addWidget(icon_label("chip", PRIMARY, 18))
        t = QLabel("附近设备")
        t.setFont(qfont(17, QFont.Weight.Bold))
        sect.addWidget(t)
        self._count_chip = Chip("0", "neutral")
        self._count_chip.hide()
        sect.addWidget(self._count_chip)
        sect.addStretch(1)
        self._filter_toggle = QPushButton("筛选")
        self._filter_toggle.setObjectName("TxtLink")
        self._filter_toggle.setCursor(Qt.PointingHandCursor)
        self._filter_toggle.clicked.connect(self._toggle_filter)
        sect.addWidget(self._filter_toggle)
        page.addLayout(sect)

        self._filter_panel = FilterPanelWidget()
        self._filter_panel.filter_changed.connect(self._on_filters)
        page.addWidget(self._filter_panel)

        body = QVBoxLayout()
        self._empty_all = EmptyState("还没有扫描结果", "点上方按钮开始扫描附近 BLE 设备")
        self._empty_filtered = EmptyState("当前没有匹配设备", "调整筛选条件试试")
        self._empty_filtered.hide()
        self._list = DevList()
        self._list.row_activated.connect(lambda _r: self._show_adv())
        body.addWidget(self._empty_all)
        body.addWidget(self._empty_filtered)
        body.addWidget(self._list, 1)
        page.addLayout(body, 1)

        root.addWidget(scroll, 1)

        ble.scan_done.connect(self._on_done)
        ble.scan_failed.connect(self._on_failed)
        ble.op_failed.connect(self._on_op_failed)
        # bt-chip 初始态：bleak 后端可用即就绪（无线电关由扫描失败词映射 off）
        QTimer.singleShot(0, lambda: self._bt_chip.set_state("on", "蓝牙就绪"))

    # ── 筛选（E getFilteredDevices 同语义） ──

    def _toggle_filter(self) -> None:
        open_ = self._filter_panel.isHidden()
        self._filter_panel.setVisible(open_)
        self._filter_toggle.setText("收起筛选" if open_ else "筛选")

    def _on_filters(self, filters: dict) -> None:
        self._rebuild()

    def _filtered(self) -> list[ScanHit]:
        f = self._filter_panel.filters() if self._filter_panel else {
            "rssi": -100, "namePrefix": "", "hideUnnamed": False}
        out = []
        for h in self._hits:
            if f["rssi"] > -100 and (h.rssi is None or h.rssi < f["rssi"]):
                continue
            prefix = f["namePrefix"].strip()
            if prefix and not (h.name or "").startswith(prefix):
                continue
            if f["hideUnnamed"] and not h.name:
                continue
            out.append(h)
        return out

    # ── 扫描 ──

    def _toggle(self) -> None:
        if self._ble.scanning:
            self._ble.stop_scan()
            self._status.setText("已停止")
            self._scan_btn.setText("开始扫描")
            self._live.stop()
            return
        self._status.setText("正在扫描…")
        self._scan_btn.setText("停止扫描")
        self._live.start()
        self._ble.start_scan(5.0)

    def _connect_selected(self) -> None:
        row = self._list.currentRow()
        if row < 0 or row >= len(self._view):
            return
        hit = self._view[row]
        if hit.address in self._ble.connected:
            # 已连接：直接回放连接信号走「打开详情」路径
            info = self._ble.connected[hit.address]
            self._ble.device_connected.emit(hit.address, info["name"], info["tree"])
            return
        self._status.setText(f"正在连接 {hit.name or hit.address} …")
        self._ble.connect_device(hit)

    def _show_adv(self) -> None:
        """F004 广播数据弹窗：点击扫描卡本体（正典 p001-advdlg / R04 口径）。"""
        row = self._list.currentRow()
        if 0 <= row < len(self._view):
            AdvDialog(self._view[row], self).exec()

    def _on_done(self, hits: list) -> None:
        # P001 正典状态词：扫描完成 · 发现 N 台
        self._hits = hits
        self._status.setText(f"扫描完成 · 发现 {len(hits)} 台")
        self._scan_btn.setText("开始扫描")
        self._live.stop()
        self._rebuild()

    def _rebuild(self) -> None:
        self._view = self._filtered()
        n = len(self._view)
        self._count_chip.setText(str(n))
        self._count_chip.setVisible(n > 0)
        cards = []
        for h in self._view:
            card = DeviceCardWidget(
                h.name or "", h.address, h.rssi,
                connected=h.address in self._ble.connected,
                unnamed=not h.name,
            )
            card.connect_clicked.connect(self._connect_selected)
            cards.append(card)
        self._list.set_cards(cards)
        self._empty_all.setVisible(not self._hits)
        self._empty_filtered.setVisible(bool(self._hits) and not self._view)

    def _on_failed(self, msg: str) -> None:
        self._status.setText(f"扫描失败：{msg}")
        self._scan_btn.setText("开始扫描")
        self._live.stop()
        low = str(msg).lower()
        if any(k in low for k in ("off", "radio", "turn", "enabled", "power")):
            self._bt_chip.set_state("off", "蓝牙未开启")

    def _on_op_failed(self, op: str, address: str, msg: str) -> None:
        if op == "connect":
            self._status.setText(f"连接失败：{msg}")
            self._scan_btn.setText("开始扫描")


class DeviceDetailPage(QWidget):
    """P006 设备详情（GATT）：subnav + devhead + 服务/特征树 + 操作日志。"""

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
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # .subnav：返回钮（30×30 fill r9）+ GATT 调试 + 底线
        subnav = QFrame()
        subnav.setObjectName("SubNav")
        sv = QHBoxLayout(subnav)
        sv.setContentsMargins(14, 8, 16, 10)
        sv.setSpacing(10)
        back = QPushButton()
        back.setObjectName("BackBtn")
        back.setIcon(QIcon(render_icon("chev-r", "#18222E", 15).transformed(
            QTransform().scale(-1, 1))))  # chev-r 镜像为返回左箭头
        back.clicked.connect(lambda: self.back_requested and self.back_requested())
        back.setCursor(Qt.PointingHandCursor)
        sv.addWidget(back)
        sub_t = QLabel("GATT 调试")
        sub_t.setFont(qfont(17, QFont.Weight.Bold))
        sv.addWidget(sub_t)
        sv.addStretch(1)
        root.addWidget(subnav)

        scroll, page = page_scroll()

        # .devhead：状态点 + 设备名 17 bold + ID/状态行 mono 10
        devhead = QFrame()
        devhead.setObjectName("Card")
        dv = QHBoxLayout(devhead)
        dv.setContentsMargins(16, 16, 16, 16)
        dv.setSpacing(11)
        self._st = _StDot()
        dv.addWidget(self._st, 0, Qt.AlignTop)
        titles = QVBoxLayout()
        titles.setSpacing(2)
        self._title = QLabel("设备详情")
        self._title.setFont(qfont(17, QFont.Weight.Bold))
        self._status = QLabel("")
        self._status.setFont(qfont(10, QFont.Weight.Normal))
        self._status.setStyleSheet(f"color:{MUT};font-family:Consolas,monospace;background:transparent;")
        titles.addWidget(self._title)
        titles.addWidget(self._status)
        dv.addLayout(titles, 1)
        page.addWidget(devhead)

        card = QFrame()
        card.setObjectName("Card")
        cv = QVBoxLayout(card)
        cv.setContentsMargins(16, 16, 16, 16)
        cv.setSpacing(8)
        head = QLabel("GATT 服务与特征")
        head.setObjectName("CardHead")
        cv.addWidget(head)
        self._tree = QTreeWidget()
        self._tree.setObjectName("GattTree")
        self._tree.setHeaderLabels(["项目", "属性"])
        self._tree.setRootIsDecorated(True)
        self._tree.setMinimumHeight(320)
        self._tree.currentItemChanged.connect(self._on_char_changed)
        cv.addWidget(self._tree, 1)

        actions = QHBoxLayout()
        actions.setSpacing(8)
        self._act_read = QPushButton("读取")
        self._act_read.clicked.connect(self._read)
        self._act_notify = QPushButton("订阅通知")
        self._act_notify.clicked.connect(self._toggle_notify)
        self._act_write = QPushButton("写入…")
        self._act_write.clicked.connect(self._write)
        for b in (self._act_read, self._act_notify, self._act_write):
            b.setEnabled(False)
            b.setObjectName("Sm")
            actions.addWidget(b)
        actions.addStretch(1)
        cv.addLayout(actions)
        page.addWidget(card)

        log_card = QFrame()
        log_card.setObjectName("Card")
        lv = QVBoxLayout(log_card)
        lv.setContentsMargins(16, 16, 16, 16)
        lv.setSpacing(6)
        log_head = QLabel("操作日志")
        log_head.setObjectName("CardHead")
        lv.addWidget(log_head)
        self._log = QPlainTextEdit()
        self._log.setReadOnly(True)
        self._log.setObjectName("OpLog")
        self._log.setMinimumHeight(160)
        lv.addWidget(self._log)
        page.addWidget(log_card)
        page.addStretch(1)

        root.addWidget(scroll, 1)

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
        self._st.set_on(True)
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
            self._st.set_on(False)
            self._log.appendPlainText("连接已断开" + ("" if expected else "（意外断链）"))


class _StDot(QWidget):
    """.devhead 状态点（.st：未连接灰 / 已连接成功色）。"""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(10, 10)
        self._on = False

    def set_on(self, on: bool) -> None:
        self._on = on
        self.update()

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor("#17C7A8" if self._on else "#9AA8B6"))
        painter.drawEllipse(self.rect())
        painter.end()


class ConnectedPage(QWidget):
    """P007 已连接（正典页面结构）：navbar + 汇总卡 + conn 设备卡列表。"""

    open_detail = None  # 由 MainWindow 注入 callable(address)

    def __init__(self, ble: BleService, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._ble = ble
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        navbar = NavBar("SESSIONS", "已连接")
        navbar.add_right(Chip("通用调试会话", "neutral"))
        root.addWidget(navbar)

        scroll, page = page_scroll()

        self._sum = SumCard()
        self._sum.disconnect_all.connect(ble.disconnect_all)
        self._sum.hide()
        page.addWidget(self._sum)

        self._empty = EmptyState("还没有会话", "连接设备后在此管理调试会话")
        self._list = DevList()
        page.addWidget(self._empty)
        page.addWidget(self._list, 1)

        root.addWidget(scroll, 1)

        self._list.row_activated.connect(lambda _r: self._open_selected())
        ble.device_connected.connect(lambda *_a: self.refresh())
        ble.device_disconnected.connect(lambda *_a: self.refresh())

    def refresh(self) -> None:
        entries = list(self._ble.connected.items())
        self._sum.set_count(len(entries))
        self._sum.setVisible(bool(entries))
        self._empty.setVisible(not entries)
        cards = []
        for address, info in entries:
            card = DeviceCardWidget(
                info["name"] or "", address, None,
                conn_variant=True, unnamed=not info["name"],
            )
            card.disconnect_clicked.connect(self._disconnect_selected)
            cards.append(card)
        self._list.set_cards(cards)

    def _current_address(self) -> str | None:
        row = self._list.currentRow()
        if row < 0:
            return None
        entries = list(self._ble.connected.items())
        return entries[row][0] if row < len(entries) else None

    def _open_selected(self) -> None:
        address = self._current_address()
        if address and self.open_detail:
            self.open_detail(address)

    def _disconnect_selected(self) -> None:
        address = self._current_address()
        if address:
            self._ble.disconnect_device(address)


class BroadcastPage(QWidget):
    """P008 广播（Windows 无外设栈，与 V-WIN 同口径降级；正典 chrome）。"""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        navbar = NavBar("PERIPHERAL", "广播")
        navbar.add_right(Chip("平台：Desktop", "neutral"))
        root.addWidget(navbar)

        scroll, page = page_scroll()
        note = NoteInfo(
            "Windows 平台暂不支持外设模式（降级口径同 V-WIN；N4 待决）", sprite="warn"
        )
        self.tip_label = note.tip_label  # automation seam 契约（state.broadcastTip）
        page.addWidget(note)
        page.addStretch(1)
        root.addWidget(scroll, 1)


class _AboutLogo(QWidget):
    """about-logo：38×38 r11 渐变（primary-deep→primary）+ 白色 bt 图标。"""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(38, 38)
        self._icon = render_icon("bt", "#FFFFFF", 20)

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        grad = QLinearGradient(0, 0, 38, 38)
        grad.setColorAt(0, QColor(PRIMARY_DEEP))
        grad.setColorAt(1, QColor(PRIMARY))
        painter.setPen(Qt.NoPen)
        painter.setBrush(grad)
        painter.drawRoundedRect(self.rect(), 11, 11)
        x = (38 - self._icon.width()) // 2
        y = (38 - self._icon.height()) // 2
        painter.drawPixmap(x, y, self._icon)
        painter.end()


class AboutPage(QWidget):
    """P009 关于（正典窄列 768 结构）：身份卡 + 应用信息 kv（真实宿主口径）。"""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        version = f"v{app_version()}"
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        navbar = NavBar("ABOUT", "关于")
        verchip = Chip(version, "neutral")
        verchip.set_mono()
        navbar.add_right(verchip)
        root.addWidget(navbar)

        scroll, page = page_scroll()

        # about-shell：max-width 768 居中
        col = QVBoxLayout()
        col.setContentsMargins(0, 8, 0, 0)
        identity = QFrame()
        identity.setObjectName("Card")
        iv = QHBoxLayout(identity)
        iv.setContentsMargins(16, 16, 16, 16)
        iv.setSpacing(11)
        iv.addWidget(_AboutLogo())
        brand = QVBoxLayout()
        brand.setSpacing(2)
        app_name = QLabel("BLE Toolkit+")
        app_name.setFont(qfont(15, QFont.Weight.Bold))
        brand.addWidget(app_name)
        verline = QLabel(f"{version} · preview · 零后端 · 零本地持久化")
        verline.setFont(qfont(10, QFont.Weight.Normal))
        verline.setStyleSheet(f"color:{MUT};background:transparent;")
        brand.addWidget(verline)
        iv.addLayout(brand, 1)
        col.addWidget(identity)

        sec = QHBoxLayout()
        sec.setSpacing(7)
        sec.setContentsMargins(2, 4, 2, 10)
        sec.addWidget(icon_label("info", PRIMARY, 18))
        st = QLabel("应用信息")
        st.setFont(qfont(17, QFont.Weight.Bold))
        sec.addWidget(st)
        sec.addStretch(1)
        col.addLayout(sec)

        info = QFrame()
        info.setObjectName("Card")
        info_v = QVBoxLayout(info)
        info_v.setContentsMargins(16, 7, 16, 7)  # kv 行 padding 9 上下
        info_v.setSpacing(0)
        arch = os.environ.get("PROCESSOR_ARCHITECTURE", "")
        rows = [
            ("当前环境", "Desktop · Windows"),
            ("设备型号", f"PC · {'X64' if arch == 'AMD64' else arch}"),
            ("版本", version),
        ]
        self.row_values: dict[str, str] = {}
        for i, (k, v) in enumerate(rows):
            row = QHBoxLayout()
            key = QLabel(k)
            key.setFont(qfont(12, QFont.Weight.DemiBold))
            key.setStyleSheet(f"color:{MUT};background:transparent;")
            key.setFixedWidth(96)
            val = QLabel(v)
            val.setFont(qfont(13, QFont.Weight.Normal))
            self.row_values[k] = v
            row.addWidget(key)
            row.addWidget(val, 1)
            info_v.addLayout(row)
            if i < len(rows) - 1:
                sep = QFrame()
                sep.setFixedHeight(1)
                sep.setStyleSheet(f"background:{LINE_SOFT};border:none;")
                info_v.addWidget(sep)
        col.addWidget(info)
        col.addStretch(1)

        center = QHBoxLayout()
        page.addLayout(center)
        col_holder = QWidget()
        # about-shell 正典：max-width 768 居中（窗口宽时列宽恰 768）
        col_holder.setFixedWidth(768)
        col_holder.setLayout(col)
        center.addStretch(1)
        center.addWidget(col_holder)
        center.addStretch(1)

        root.addWidget(scroll, 1)


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
