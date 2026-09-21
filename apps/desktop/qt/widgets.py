"""Q-WIN 正典页面组件原语（UIALIGN-PAGE 20260921）。

逐条对齐 apps/desktop/electron/public/prototype.css：
  NavBar(.navbar)/BtChip(.bt-chip + .bt-dot)/Chip(.chip)/SecTitle(.sec-t)
  SigBars(.sig 四档)/Ava(.dev .ava 44 渐变+在线角标)/DeviceCard(.dev 两变体)
  FilterPanel(.filter 四行：四档 pre + 阈值滑杆 + 名称前缀 + 隐藏无名)
  SumCard(.sumcard)/EmptyState(.empty + 雷达插画)/Switch(.switch)/NoteCard(.note)
图标与 tabbar.py 同源（E-WIN index.html SVG sprite 子集，stroke currentColor）。
"""

from __future__ import annotations

from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtGui import QColor, QFont, QLinearGradient, QPainter, QPen, QPixmap
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QSlider,
    QVBoxLayout,
    QWidget,
)

from tabbar import FONT_FAMILY, render_icon
from theme import (
    CARD,
    DANGER,
    DANGER_WEAK,
    FILL,
    LINE,
    LINE_SOFT,
    MUT,
    NOTE_INFO_TEXT,
    PH,
    PRIMARY,
    PRIMARY_WEAK,
    SUB,
    SUCCESS,
    SUCCESS_WEAK,
    WARNING,
)

# ── 扩展 sprite（tabbar 四枚之外；路径逐字节取自 E-WIN index.html） ──
EXTRA_SPRITES = {
    "chip": (
        '<rect x="6" y="6" width="12" height="12" rx="2.5"/>'
        '<rect x="10" y="10" width="4" height="4" rx="1"/>'
        '<path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>'
    ),
    "x": '<path d="M6 6l12 12M18 6L6 18"/>',
    "chev-r": '<path d="M9 6l6 6-6 6"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7"/>',
    "bt": '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.6" fill="currentColor"/>',
    "warn": '<path d="M12 3.5L2.5 19.5h19z"/><path d="M12 10v4"/><circle cx="12" cy="16.8" r="0.6" fill="currentColor"/>',
}
from tabbar import _SPRITES  # noqa: E402（补充注册后供 render_icon 使用）

_SPRITES.update(EXTRA_SPRITES)

ICON_SIZES = {"xs": 13, "sm": 17, "md": 18, "lg": 22}


def icon_label(sprite: str, color_hex: str, size: int = 18) -> QLabel:
    lab = QLabel()
    lab.setFixedSize(size, size)
    lab.setAlignment(Qt.AlignCenter)
    lab.setPixmap(render_icon(sprite, color_hex, logical=size))
    lab.setAttribute(Qt.WA_TranslucentBackground)
    return lab


def qfont(px_size: int, weight: QFont.Weight) -> QFont:
    font = QFont(FONT_FAMILY)
    font.setPixelSize(px_size)
    font.setWeight(weight)
    return font


# ── .chip（r-round 999 · padding 2 9 · 11px/600） ──
CHIP_KINDS = {
    "neutral": (FILL, SUB),
    "primary": (PRIMARY_WEAK, PRIMARY),
    "success": (SUCCESS_WEAK, "#0E9A80"),
    "warning": ("#FFF3E4", "#C77E14"),
    "danger": (DANGER_WEAK, DANGER),
}


class Chip(QWidget):
    """正典 chip 胶囊。QLabel QSS padding 不进 sizeHint（坑位账），用 margins 实现。"""

    def __init__(self, text: str, kind: str = "neutral", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        bg, fg = CHIP_KINDS[kind]
        self._bg = QColor(bg)
        lay = QHBoxLayout(self)
        lay.setContentsMargins(9, 2, 9, 2)
        lay.setSpacing(0)
        self._label = QLabel(text)
        self._label.setFont(qfont(11, QFont.Weight.DemiBold))
        self._label.setStyleSheet(f"color:{fg};background:transparent;")
        lay.addWidget(self._label)
        self.adjustSize()

    def setText(self, text: str) -> None:
        self._label.setText(text)
        self.adjustSize()

    def set_mono(self) -> None:
        """正典 verchip 口径：等宽字体（about-verchip）。"""
        font = QFont("Consolas")
        font.setStyleHint(QFont.Monospace)
        font.setPixelSize(11)
        font.setWeight(QFont.Weight.DemiBold)
        self._label.setFont(font)

    def text(self) -> str:
        return self._label.text()

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setPen(Qt.NoPen)
        painter.setBrush(self._bg)
        painter.drawRoundedRect(self.rect(), self.height() / 2, self.height() / 2)
        painter.end()


# ── .bt-chip（dot 8×8 三态 + 状态词 11/600 mut） ──
class BtDot(QWidget):
    """蓝牙状态点：init #9aa8b6 / on 成功色 / off 危险色。"""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(8, 8)
        self._state = "init"

    def set_state(self, state: str) -> None:
        self._state = state
        self.update()

    def paintEvent(self, event) -> None:  # noqa: N802
        color = {"init": PH, "on": SUCCESS, "off": DANGER}[self._state]
        painter = QPainter(self)
        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(color))
        painter.drawEllipse(self.rect())
        painter.end()


class BtChip(QWidget):
    def __init__(self, word: str = "初始化中…", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(6)
        self.dot = BtDot()
        self.word = QLabel(word)
        self.word.setObjectName("BtWord")
        lay.addWidget(self.dot)
        lay.addWidget(self.word)

    def set_state(self, state: str, word: str) -> None:
        self.dot.set_state(state)
        self.word.setText(word)


# ── .navbar（白→底渐变 · 底线 1px LINE_SOFT · padding 8 18 12） ──
class NavBar(QFrame):
    def __init__(self, kicker: str, title: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("NavBar")
        lay = QVBoxLayout(self)
        lay.setContentsMargins(18, 8, 18, 12)
        lay.setSpacing(2)
        self._kicker = QLabel(kicker)
        self._kicker.setObjectName("Kicker")
        lay.addWidget(self._kicker)
        row = QHBoxLayout()
        row.setSpacing(8)
        self._title = QLabel(title)
        self._title.setObjectName("PageTitle")
        row.addWidget(self._title)
        row.addStretch(1)
        lay.addLayout(row)
        self._row = row

    def add_right(self, w: QWidget) -> None:
        self._row.addWidget(w)

    @property
    def title_label(self) -> QLabel:
        return self._title


# ── .scantool 状态行 live 点（6px 主色脉冲） ──
class LiveDot(QWidget):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(6, 6)
        self._opacity = 1.0
        self._timer = QTimer(self)
        self._timer.setInterval(500)  # pulse 1s 一个周期
        self._timer.timeout.connect(self._tick)
        self.hide()

    def start(self) -> None:
        self._opacity = 1.0
        self.show()
        self._timer.start()

    def stop(self) -> None:
        self._timer.stop()
        self.hide()

    def _tick(self) -> None:
        self._opacity = 0.25 if self._opacity == 1.0 else 1.0
        self.update()

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setOpacity(self._opacity)
        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(PRIMARY))
        painter.drawEllipse(self.rect())
        painter.end()


# ── .sig 信号四档（4 条 3px 柱：4/7/10/12 高，档位着色） ──
class SigBars(QWidget):
    HEIGHTS = (4, 7, 10, 12)

    def __init__(self, rssi: int | None, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(18, 12)  # 4×3 + 3×2 gap
        self._quality = self._q(rssi)

    @staticmethod
    def _q(rssi: int | None) -> int:
        if rssi is None:
            return 1
        return 4 if rssi >= -60 else 3 if rssi >= -70 else 2 if rssi >= -80 else 1

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        on_color = {4: SUCCESS, 3: SUCCESS, 2: WARNING, 1: DANGER}[self._quality]
        lit = {4: 4, 3: 3, 2: 2, 1: 1}[self._quality]
        x = 0
        for i, h in enumerate(self.HEIGHTS):
            color = on_color if i < lit else LINE
            painter.setPen(Qt.NoPen)
            painter.setBrush(QColor(color))
            painter.drawRoundedRect(x, 12 - h, 3, h, 1, 1)
            x += 5
        painter.end()


# ── .dev .ava（44×44 r12 渐变 + 首字母；conn 变体右下 15×15 在线角标） ──
class Ava(QWidget):
    def __init__(self, initial: str, shid: bool = False, online: bool = False,
                 parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(44, 44)
        self._initial = (initial or "?").strip()[:1].upper()
        self._shid = shid
        self._online = online

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        grad = QLinearGradient(0, 0, 44, 44)  # 135deg
        if self._shid:
            grad.setColorAt(0, QColor("#D9F6F0"))
            grad.setColorAt(1, QColor("#E2F8F4"))
            text_color = QColor("#0E9A80")
        else:
            grad.setColorAt(0, QColor(PRIMARY_WEAK))
            grad.setColorAt(1, QColor("#DCE9FF"))
            text_color = QColor(PRIMARY)
        painter.setPen(Qt.NoPen)
        painter.setBrush(grad)
        painter.drawRoundedRect(self.rect(), 12, 12)
        painter.setFont(qfont(17, QFont.Weight.Black))
        painter.setPen(text_color)
        painter.drawText(self.rect(), Qt.AlignCenter, self._initial)
        if self._online:
            painter.setPen(QPen(QColor(CARD), 2))
            painter.setBrush(QColor(SUCCESS))
            painter.drawEllipse(44 - 11, 44 - 11, 15, 15)  # right/bottom -4
        painter.end()


# ── .dev 设备卡（scan/conn 两变体，结构同 DeviceCard.js） ──
class DeviceCardWidget(QFrame):
    clicked = Signal()
    connect_clicked = Signal()
    disconnect_clicked = Signal()

    def __init__(self, name: str, address: str, rssi: int | None, *,
                 connected: bool = False, conn_variant: bool = False,
                 unnamed: bool = False, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("DevCard")
        self._selected = False
        self.setCursor(Qt.PointingHandCursor)

        root = QVBoxLayout(self)
        root.setContentsMargins(16, 16, 16, 16)  # .dev padding: sp-4
        root.setSpacing(0)

        top = QHBoxLayout()
        top.setSpacing(12)  # .dev .top gap:12
        self._ava = Ava(name or "?", shid=False, online=conn_variant)
        top.addWidget(self._ava, 0, Qt.AlignTop)
        mid = QVBoxLayout()
        mid.setSpacing(0)
        nm_row = QHBoxLayout()
        nm_row.setSpacing(6)
        self._nm = QLabel(name if name else "未命名 BLE 设备")
        self._nm.setFont(qfont(15, QFont.Weight.Bold))
        nm_row.addWidget(self._nm)
        nm_row.addStretch(1)
        mid.addLayout(nm_row)
        self._id = QLabel(f"{address}（未命名）" if unnamed else address)
        self._id.setFont(qfont(10, QFont.Weight.Normal))
        self._id.setStyleSheet(f"color:{MUT};font-family:Consolas,monospace;background:transparent;")
        mid.addWidget(self._id)
        meta = QHBoxLayout()
        meta.setSpacing(8)
        meta.setContentsMargins(0, 5, 0, 0)  # .dev .meta margin-top:5
        if rssi is not None:  # conn 会话无 RSSI 时整组不画（正典 sigHtml null → ''）
            meta.addWidget(SigBars(rssi))
            dbm = QLabel(f"{rssi} dBm")
            dbm.setFont(qfont(10, QFont.Weight.DemiBold))
            dbm.setStyleSheet(f"color:{MUT};font-family:Consolas,monospace;background:transparent;")
            meta.addWidget(dbm)
        if conn_variant:
            state = QLabel("已连接 · 可进行 GATT 调试")
            state.setFont(qfont(11, QFont.Weight.Normal))
            state.setStyleSheet(f"color:{MUT};background:transparent;")
            meta.addWidget(state)
        meta.addStretch(1)
        mid.addLayout(meta)
        top.addLayout(mid, 1)
        if conn_variant:
            disc = QPushButton("断开")
            disc.setObjectName("SoftDangerSm")
            disc.clicked.connect(self.disconnect_clicked)
            disc.setCursor(Qt.ArrowCursor)
            top.addWidget(disc, 0, Qt.AlignTop)
        root.addLayout(top)

        if not conn_variant:
            acts = QHBoxLayout()
            acts.setSpacing(8)
            acts.setContentsMargins(0, 12, 0, 0)  # .dev .acts margin-top:12
            if connected:
                btn = QPushButton("已连接")
                btn.setObjectName("Soft")
                btn.setEnabled(False)
            else:
                btn = QPushButton("连接")
                btn.setObjectName("PrimarySm")
                btn.clicked.connect(self.connect_clicked)
                btn.setCursor(Qt.ArrowCursor)
            acts.addWidget(btn, 1)  # .acts .btn flex:1
            root.addLayout(acts)

    def set_selected(self, on: bool) -> None:
        if on != self._selected:
            self._selected = on
            self.setProperty("sel", on)
            self.style().unpolish(self)
            self.style().polish(self)

    def mouseReleaseEvent(self, event) -> None:  # noqa: N802
        super().mouseReleaseEvent(event)
        if event.button() == Qt.LeftButton and self.rect().contains(event.position().toPoint()):
            self.clicked.emit()


# ── 设备列表（.devlist：卡片纵排 spacing 12；currentRow 口径兼容自动化缝） ──
class DevList(QWidget):
    currentRowChanged = Signal(int)
    row_activated = Signal(int)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._lay = QVBoxLayout(self)
        self._lay.setContentsMargins(0, 0, 0, 0)
        self._lay.setSpacing(12)  # .dev margin-bottom: sp-3
        self._lay.addStretch(1)
        self._cards: list[DeviceCardWidget] = []
        self._current = -1

    def set_cards(self, cards: list[DeviceCardWidget]) -> None:
        for card in self._cards:
            self._lay.removeWidget(card)
            card.deleteLater()
        self._cards = list(cards)
        for card in self._cards:
            self._lay.insertWidget(self._lay.count() - 1, card)
            card.clicked.connect(lambda c=card: self._select(self._cards.index(c), activate=True))
            card.connect_clicked.connect(lambda c=card: self._select(self._cards.index(c), activate=False))
            card.disconnect_clicked.connect(lambda c=card: self._select(self._cards.index(c), activate=False))
        self._current = -1
        for card in self._cards:
            card.set_selected(False)

    def currentRow(self) -> int:
        return self._current

    def setCurrentRow(self, row: int) -> None:
        self._select(row, activate=False)

    def _select(self, row: int, activate: bool) -> None:
        if row == self._current:
            if activate and 0 <= row < len(self._cards):
                self.row_activated.emit(row)
            return
        if not 0 <= row < len(self._cards):
            return
        old = self._current
        self._current = row
        for i, card in enumerate(self._cards):
            card.set_selected(i == row)
        if old != row:
            self.currentRowChanged.emit(row)
        if activate:
            self.row_activated.emit(row)


# ── .empty 空态（38/24 内边 + 雷达插画 + 17 标题 + 13 描述） ──
class RadarIll(QWidget):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(96, 96)

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setPen(QPen(QColor(LINE), 2))
        for r in (14, 28, 42):
            painter.drawEllipse(48 - r, 48 - r, r * 2, r * 2)
        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(255, 255, 255, 200))
        painter.drawPie(48 - 42, 48 - 42, 84, 84, 90 * 16, 60 * 16)
        painter.setBrush(QColor(PRIMARY))
        painter.drawEllipse(45, 45, 6, 6)
        painter.setPen(QPen(QColor(PRIMARY), 2))
        painter.drawLine(48, 48, 76, 28)
        painter.end()


class EmptyState(QWidget):
    def __init__(self, title: str, desc: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        lay = QVBoxLayout(self)
        lay.setContentsMargins(24, 38, 24, 38)
        lay.setSpacing(0)
        lay.addWidget(RadarIll(), 0, Qt.AlignHCenter)
        spacer = QWidget()
        spacer.setFixedHeight(16)  # .empty .ill margin-bottom: sp-4
        spacer.setAttribute(Qt.WA_TranslucentBackground)
        lay.addWidget(spacer)
        t = QLabel(title)
        t.setFont(qfont(17, QFont.Weight.Bold))
        t.setAlignment(Qt.AlignHCenter)
        lay.addWidget(t)
        d = QLabel(desc)
        d.setFont(qfont(13, QFont.Weight.Normal))
        d.setStyleSheet(f"color:{MUT};background:transparent;")
        d.setAlignment(Qt.AlignHCenter)
        d.setWordWrap(True)
        d.setMaximumWidth(250)
        lay.addWidget(d, 0, Qt.AlignHCenter)


# ── .switch（44×26 圆轨 + 20 白钮） ──
class Switch(QWidget):
    toggled = Signal(bool)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(44, 26)
        self.setCursor(Qt.PointingHandCursor)
        self._on = False

    def is_on(self) -> bool:
        return self._on

    def set_on(self, on: bool) -> None:
        if on != self._on:
            self._on = on
            self.update()
            self.toggled.emit(on)

    def mouseReleaseEvent(self, event) -> None:  # noqa: N802
        super().mouseReleaseEvent(event)
        if event.button() == Qt.LeftButton and self.rect().contains(event.position().toPoint()):
            self.set_on(not self._on)

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(SUCCESS if self._on else PH))
        painter.drawRoundedRect(self.rect(), 13, 13)
        painter.setBrush(QColor(CARD))
        painter.drawEllipse(21 if self._on else 3, 3, 20, 20)
        painter.end()


# ── .filter 筛选面板（四行：四档 pre / 阈值滑杆 / 名称前缀 / 隐藏无名+重置） ──
PRESETS = [(-40, "强 [-40]"), (-60, "较好 [-60]"), (-70, "一般 [-70]"), (-85, "弱 [-85]")]


class FilterPanelWidget(QFrame):
    filter_changed = Signal(dict)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("FilterCard")
        self._filters = {"rssi": -100, "namePrefix": "", "hideUnnamed": False}

        lay = QVBoxLayout(self)
        lay.setContentsMargins(16, 16, 16, 16)  # .filter padding: sp-4
        lay.setSpacing(10)  # .filter .row margin-bottom:10

        # 行 1：最弱信号四档
        row1 = QHBoxLayout()
        row1.setSpacing(10)
        row1.addWidget(self._lb("最弱信号"))
        self._pre_btns: list[QPushButton] = []
        for value, label in PRESETS:
            btn = QPushButton(label)
            btn.setCursor(Qt.PointingHandCursor)
            btn.clicked.connect(lambda _c, v=value: self._set_rssi(v))
            self._pre_btns.append(btn)
            row1.addWidget(btn)
        row1.addStretch(1)
        lay.addLayout(row1)

        # 行 2：阈值滑杆
        row2 = QHBoxLayout()
        row2.setSpacing(10)
        self._rssi_lb = self._lb(f"阈值 {self._filters['rssi']} dBm")
        row2.addWidget(self._rssi_lb)
        self._slider = QSlider(Qt.Horizontal)
        self._slider.setObjectName("FilterSlider")
        self._slider.setRange(-100, -40)
        self._slider.setSingleStep(5)
        self._slider.setPageStep(5)
        self._slider.setValue(-100)
        self._slider.valueChanged.connect(self._on_slider)
        row2.addWidget(self._slider, 1)
        lay.addLayout(row2)

        # 行 3：名称前缀
        row3 = QHBoxLayout()
        row3.setSpacing(10)
        row3.addWidget(self._lb("名称前缀"))
        self._prefix = QLineEdit()
        self._prefix.setObjectName("FilterInput")
        self._prefix.setPlaceholderText("如 SHID / LightBLE")
        self._prefix.textChanged.connect(lambda t: self._emit(namePrefix=t))
        row3.addWidget(self._prefix, 1)
        lay.addLayout(row3)

        # 行 4：隐藏无名 + 重置
        row4 = QHBoxLayout()
        row4.setSpacing(10)
        row4.addWidget(self._lb("隐藏无名"))
        self._hide = Switch()
        self._hide.toggled.connect(lambda on: self._emit(hideUnnamed=on))
        row4.addWidget(self._hide)
        row4.addStretch(1)
        reset = QPushButton("重置过滤")
        reset.setObjectName("Soft")
        reset.setCursor(Qt.PointingHandCursor)
        reset.clicked.connect(self.reset)
        row4.addWidget(reset)
        lay.addLayout(row4)

        self._apply_pre()
        self.hide()

    @staticmethod
    def _lb(text: str) -> QLabel:
        lab = QLabel(text)
        lab.setFont(qfont(12, QFont.Weight.DemiBold))
        lab.setStyleSheet(f"color:{MUT};background:transparent;")
        lab.setFixedWidth(88)  # .filter .lb width:64 + 滑杆行双标签余量
        return lab

    def _set_rssi(self, value: int) -> None:
        self._slider.setValue(value)
        self._apply_pre()
        self._emit(rssi=value)

    def _on_slider(self, value: int) -> None:
        # step 5 对齐正典 range；slider 只到 5 的倍数
        stepped = round(value / 5) * 5
        if stepped != value:
            self._slider.setValue(stepped)
            return
        self._rssi_lb.setText(f"阈值 {value} dBm")
        self._apply_pre()
        self._emit(rssi=value)

    def _apply_pre(self) -> None:
        for (value, _label), btn in zip(PRESETS, self._pre_btns):
            on = value == self._filters.get("rssi") or value == self._slider.value()
            btn.setObjectName("PreOn" if on else "Pre")
            self._sync_style(btn)

    @staticmethod
    def _sync_style(w: QWidget) -> None:
        w.style().unpolish(w)
        w.style().polish(w)

    def _emit(self, **kw) -> None:
        self._filters.update(kw)
        self.filter_changed.emit(dict(self._filters))

    def reset(self) -> None:
        self._filters = {"rssi": -100, "namePrefix": "", "hideUnnamed": False}
        self._rssi_lb.setText("阈值 -100 dBm")
        self._slider.setValue(-100)
        self._prefix.clear()
        self._hide.set_on(False)
        self._apply_pre()
        self.filter_changed.emit(dict(self._filters))

    def filters(self) -> dict:
        return dict(self._filters)


# ── .sumcard（P007 汇总：num 24 主色 + lb 12 mut + 全部断开 danger sm） ──
class SumCard(QFrame):
    disconnect_all = Signal()

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("SumCard")
        lay = QHBoxLayout(self)
        lay.setContentsMargins(16, 16, 16, 16)
        lay.setSpacing(12)
        col = QVBoxLayout()
        col.setSpacing(0)
        self.num = QLabel("0")
        self.num.setFont(qfont(24, QFont.Weight.Black))
        self.num.setStyleSheet(f"color:{PRIMARY};background:transparent;")
        col.addWidget(self.num)
        self.lb = QLabel("台在线 · 全部为内存会话")
        self.lb.setFont(qfont(12, QFont.Weight.Normal))
        self.lb.setStyleSheet(f"color:{MUT};background:transparent;")
        col.addWidget(self.lb)
        lay.addLayout(col)
        lay.addStretch(1)
        btn = QPushButton("全部断开")
        btn.setObjectName("DangerSm")
        btn.setCursor(Qt.PointingHandCursor)
        btn.clicked.connect(self.disconnect_all)
        lay.addWidget(btn)

    def set_count(self, n: int) -> None:
        self.num.setText(str(n))


# ── .note 提示条（info：primary-weak 底 + #2E5290 文） ──
class NoteInfo(QFrame):
    def __init__(self, text: str, sprite: str = "info", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("NoteInfo")
        lay = QHBoxLayout(self)
        lay.setContentsMargins(12, 10, 12, 10)  # .note padding:10 12
        lay.setSpacing(9)
        lay.addWidget(icon_label(sprite, NOTE_INFO_TEXT, 17))
        self.tip_label = QLabel(text)
        self.tip_label.setFont(qfont(12, QFont.Weight.Normal))
        self.tip_label.setStyleSheet(f"color:{NOTE_INFO_TEXT};background:transparent;")
        self.tip_label.setWordWrap(True)
        lay.addWidget(self.tip_label, 1)
