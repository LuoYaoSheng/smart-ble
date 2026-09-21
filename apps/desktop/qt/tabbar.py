"""Q-WIN 正典 TabBar（prototype.css .tabbar 的 Qt 自绘实现，UIALIGN 2026-09-21）。

弃 QTabBar（documentMode 纯文字 + 内容自适应宽 + 下划线选态，三不合正典）：
- border-box 64px 含 1px 顶线（--c-line-soft #EDF2F9）、底 rgba(255,255,255,.96)
- 四枚等宽（.tb flex:1 → QHBoxLayout 等拉伸）
- 图标 23px（QtSvg 渲染 E-WIN public/index.html SVG sprite 同源路径，stroke 1.8）
  + 文字 10px（10/600，选中 700），gap 3px
- 纯色彩选中态（--c-primary / --c-mut），无下划线
- 已连接 tab 角标 .n 口径：top 2px / right calc(50% - 21px)，min-w 16 h 16 r 8
  危险底白字 9px bold
"""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QColor, QFont, QFontMetrics, QPainter, QPixmap
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtWidgets import QApplication, QHBoxLayout, QLabel, QVBoxLayout, QWidget

from theme import DANGER, PRIMARY, TEXT_MUT

FONT_FAMILY = "Microsoft YaHei UI"
LINE_SOFT = "#EDF2F9"  # 正典 --c-line-soft（.tabbar border-top 专用，勿混 theme 近似值）

# E-WIN public/index.html SVG sprite 同源子集（24×24 视窗 · stroke 1.8 · currentColor）
_SPRITES = {
    "scan": '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21M11 8v6M8 11h6"/>',
    "link": (
        '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>'
        '<path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.72-1.71"/>'
    ),
    "cast": (
        '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>'
        '<path d="M8.2 15.8a5.4 5.4 0 010-7.6M15.8 8.2a5.4 5.4 0 010 7.6'
        'M5.3 18.7a9.5 9.5 0 010-13.4M18.7 5.3a9.5 9.5 0 010 13.4"/>'
    ),
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.6" fill="currentColor"/>',
}


def render_icon(sprite: str, color_hex: str, logical: int = 23) -> QPixmap:
    """按正典 sprite 渲染 23px 图标（高 DPI 取整放大避免糊边）。"""
    body = _SPRITES[sprite].replace("currentColor", color_hex)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
        f'<g fill="none" stroke="{color_hex}" stroke-width="1.8" '
        f'stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>'
    )
    dpr = QApplication.primaryScreen().devicePixelRatio() if QApplication.primaryScreen() else 1.0
    px = max(1, int(round(logical * dpr)))
    pm = QPixmap(px, px)
    pm.fill(Qt.transparent)
    painter = QPainter(pm)
    QSvgRenderer(svg.encode("utf-8")).render(painter)
    painter.end()
    pm.setDevicePixelRatio(dpr)
    return pm


class _TabButton(QWidget):
    """单枚 tab：图标 23 + gap 3 + 文字 10，色彩态，整格可点（.tb flex:1）。"""

    clicked = Signal()

    def __init__(self, sprite: str, label: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._sprite = sprite
        self._active = False
        self._badge_n = 0

        self._icon = QLabel()
        self._icon.setAlignment(Qt.AlignCenter)
        self._icon.setFixedSize(23, 23)
        self._text = QLabel(label)
        self._text.setAlignment(Qt.AlignCenter)
        font = QFont(FONT_FAMILY)
        font.setPixelSize(10)
        font.setWeight(QFont.Weight.DemiBold)  # --fw-med:600
        self._text.setFont(font)

        self._badge = QLabel(self)
        self._badge.setAlignment(Qt.AlignCenter)
        badge_font = QFont(FONT_FAMILY)
        badge_font.setPixelSize(9)
        badge_font.setWeight(QFont.Weight.Bold)
        self._badge.setFont(badge_font)
        self._badge.setStyleSheet(
            f"background:{DANGER};color:#FFFFFF;border-radius:8px;padding:0 4px;"
        )
        self._badge.hide()

        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(3)
        lay.addStretch(1)
        lay.addWidget(self._icon, 0, Qt.AlignHCenter)
        lay.addWidget(self._text, 0, Qt.AlignHCenter)
        lay.addStretch(1)

        self.setCursor(Qt.PointingHandCursor)
        self._apply()

    def set_active(self, on: bool) -> None:
        if self._active != on:
            self._active = on
            self._apply()

    def set_badge(self, n: int) -> None:
        if self._badge_n == n:
            return
        self._badge_n = n
        if n <= 0:
            self._badge.hide()
            return
        text = "99+" if n > 99 else str(n)
        self._badge.setText(text)
        fm = QFontMetrics(self._badge.font())
        width = max(16, fm.horizontalAdvance(text) + 8)  # .n min-width:16 + 左右 padding
        self._badge.setFixedSize(width, 16)
        self._reposition_badge()
        self._badge.show()
        self._badge.raise_()

    def _reposition_badge(self) -> None:
        if self.width() <= 0:
            return
        # 正典 .n：top:2px / right:calc(50% - 21px)（相对整枚 tab）
        x = self.width() // 2 + 21 - self._badge.width()
        self._badge.move(x, 2)

    def resizeEvent(self, event) -> None:  # noqa: N802（Qt 命名）
        super().resizeEvent(event)
        self._reposition_badge()

    def mouseReleaseEvent(self, event) -> None:  # noqa: N802
        super().mouseReleaseEvent(event)
        if event.button() == Qt.LeftButton and self.rect().contains(event.position().toPoint()):
            self.clicked.emit()

    def _apply(self) -> None:
        color = PRIMARY if self._active else TEXT_MUT
        self._icon.setPixmap(render_icon(self._sprite, color))
        weight = 700 if self._active else 600  # --fw-bold / --fw-med
        self._text.setStyleSheet(f"color:{color};font-weight:{weight};background:transparent;")


class CanonTabBar(QWidget):
    """正典底栏：64px border-box + 顶线 + 四枚等宽。setCurrentIndex 兼容自动化缝。"""

    currentChanged = Signal(int)

    def __init__(self, items: list[tuple[str, str]], parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedHeight(64)  # border-box：含 1px 顶线
        self._current = -1
        self._buttons: list[_TabButton] = []

        lay = QHBoxLayout(self)
        lay.setContentsMargins(8, 4, 8, 16)  # .tabbar padding:4px 8px 16px
        lay.setSpacing(0)
        for label, sprite in items:
            btn = _TabButton(sprite, label)
            btn.clicked.connect(lambda x=btn: self._on_click(x))
            self._buttons.append(btn)
            lay.addWidget(btn, 1)  # .tb flex:1 等宽

        self._line = QColor(LINE_SOFT)  # 正典 --c-line-soft #EDF2F9

    def _on_click(self, btn: _TabButton) -> None:
        idx = self._buttons.index(btn)
        if idx != self._current:
            self.setCurrentIndex(idx)

    def setCurrentIndex(self, index: int) -> None:
        """QTabBar 同语义：变更即发 currentChanged（自动化缝/win016 生命周期依赖）。"""
        if not 0 <= index < len(self._buttons) or index == self._current:
            return
        self._current = index
        for i, btn in enumerate(self._buttons):
            btn.set_active(i == index)
        self.currentChanged.emit(index)

    def currentIndex(self) -> int:
        return self._current

    def set_badge(self, index: int, n: int) -> None:
        if 0 <= index < len(self._buttons):
            self._buttons[index].set_badge(n)

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor(255, 255, 255, 245))  # rgba(255,255,255,.96)
        painter.fillRect(0, 0, self.width(), 1, self._line)  # border-top:1px
        painter.end()
