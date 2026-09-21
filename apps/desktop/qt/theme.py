"""Q-WIN 主题：正典 prototype.css tokens 全量对齐（UIALIGN-PAGE 20260921）。

色值/字号/圆角逐条取自 apps/desktop/electron/public/prototype.css :root
（原 QSS 为近似值，圈外色已清剿：BG #F5F7FA→#F8FBFF、BORDER #E3E9F2→#E3EAF3、
TEXT #17223B→#18222E、SUB #5A6B87→#42536A、FILL #EEF2F8→#F1F5FB）。
"""

PRIMARY = "#1B6DFF"
PRIMARY_DEEP = "#0E4FC4"
PRIMARY_WEAK = "#E8F1FF"
SUCCESS = "#17C7A8"
SUCCESS_WEAK = "#E2F8F4"
SUCCESS_DEEP = "#0E9A80"
DANGER = "#F2555F"
DANGER_WEAK = "#FDEBEC"
DANGER_LIGHT = "#FF6B74"
WARNING = "#FF9F43"
WARNING_WEAK = "#FFF3E4"
WARNING_DEEP = "#C77E14"
TEXT = "#18222E"
SUB = "#42536A"
MUT = "#60758D"
TEXT_MUT = MUT  # 兼容别名（tabbar.py UIALIGN-TABBAR 轮已引用）
PH = "#9AA8B6"
LINE = "#E3EAF3"
LINE_SOFT = "#EDF2F9"
FILL = "#F1F5FB"
BG = "#F8FBFF"
CARD = "#FFFFFF"
NOTE_INFO_TEXT = "#2E5290"

MONO = '"Cascadia Mono", "SF Mono", Consolas, monospace'

QSS = f"""
QWidget {{
    background: {BG};
    color: {TEXT};
    font-family: "Microsoft YaHei UI", "PingFang SC", "Segoe UI", sans-serif;
    font-size: 13px;
}}
QLabel#Kicker {{
    background: transparent;
    color: {PRIMARY};
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 2px;
}}
QLabel#PageTitle {{
    background: transparent;
    font-size: 20px;
    font-weight: 800;
}}
QLabel#SecTitle {{
    background: transparent;
    font-size: 17px;
    font-weight: 700;
}}
QLabel#CardHead {{
    background: transparent;
    font-size: 12px;
    font-weight: 700;
    color: {SUB};
}}
QLabel#Dim {{
    background: transparent;
    color: {MUT};
    font-size: 12px;
}}
QLabel#BtWord {{
    background: transparent;
    color: {MUT};
    font-size: 11px;
    font-weight: 600;
}}
/* ── 导航（.navbar：白→底渐变 + 1px 底线） ── */
QFrame#NavBar {{
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 {CARD}, stop:1 {BG});
    border-bottom: 1px solid {LINE_SOFT};
}}
QFrame#SubNav {{
    background: {CARD};
    border-bottom: 1px solid {LINE_SOFT};
}}
/* ── 卡片（.card/.dev：r-lg 16 + 1px 线 + 白底） ── */
QFrame#Card, QFrame#DevCard, QFrame#SumCard, QFrame#FilterCard {{
    background: {CARD};
    border: 1px solid {LINE};
    border-radius: 16px;
}}
QFrame#DevCard[sel="true"] {{
    background: {BG};
    border: 1px solid {PRIMARY};
}}
QFrame#NoteInfo {{
    background: {PRIMARY_WEAK};
    border: none;
    border-radius: 12px;
}}
/* ── 按钮（B1 btn：默认 40px/r-md 12；sm 32px/r-sm 8） ── */
QPushButton {{
    background: {FILL};
    color: {TEXT};
    border: 1px solid {LINE};
    border-radius: 12px;
    padding: 0 18px;
    height: 40px;
    font-size: 15px;
    font-weight: 600;
}}
QPushButton#Sm {{
    border-radius: 8px;
    padding: 0 13px;
    height: 32px;
    font-size: 13px;
}}
QPushButton#Primary {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {PRIMARY}, stop:1 {PRIMARY_DEEP});
    color: white;
    border: none;
    border-radius: 12px;
    padding: 0 18px;
    height: 40px;
    font-size: 15px;
    font-weight: 600;
}}
QPushButton#PrimarySm {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {PRIMARY}, stop:1 {PRIMARY_DEEP});
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 13px;
    height: 32px;
    font-size: 13px;
    font-weight: 600;
}}
QPushButton#DangerSm {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {DANGER_LIGHT}, stop:1 {DANGER});
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 13px;
    height: 32px;
    font-size: 13px;
    font-weight: 600;
}}
QPushButton#SoftDangerSm {{
    background: {DANGER_WEAK};
    color: {DANGER};
    border: none;
    border-radius: 8px;
    padding: 0 13px;
    height: 32px;
    font-size: 13px;
    font-weight: 600;
}}
QPushButton#Soft {{
    background: {FILL};
    color: {TEXT};
    border: 1px solid {LINE};
    border-radius: 8px;
    padding: 0 13px;
    height: 32px;
    font-size: 13px;
    font-weight: 600;
}}
QPushButton#TxtLink {{
    background: transparent;
    color: {PRIMARY};
    border: none;
    padding: 4px 2px;
    font-size: 12px;
    font-weight: 600;
}}
QPushButton#Pre {{
    background: {FILL};
    color: {SUB};
    border: none;
    border-radius: 999px;
    padding: 4px 11px;
    font-size: 11px;
    font-weight: 600;
}}
QPushButton#PreOn {{
    background: {PRIMARY};
    color: white;
    border: none;
    border-radius: 999px;
    padding: 4px 11px;
    font-size: 11px;
    font-weight: 600;
}}
QPushButton#BackBtn {{
    background: {FILL};
    color: {TEXT};
    border: none;
    border-radius: 9px;
    padding: 0;
    min-width: 30px;
    max-width: 30px;
    min-height: 30px;
    max-height: 30px;
    font-size: 15px;
    font-weight: 700;
}}
/* ── 筛选输入（.filter 行内 input：fill 底 r-sm 8） ── */
QLineEdit#FilterInput {{
    background: {FILL};
    border: none;
    border-radius: 8px;
    padding: 0 10px;
    height: 34px;
    font-size: 13px;
}}
/* ── 滑杆（.slider：4px 轨 + 18px 主色圆钮） ── */
QSlider#FilterSlider::groove:horizontal {{
    height: 4px;
    border-radius: 2px;
    background: {LINE};
}}
QSlider#FilterSlider::handle:horizontal {{
    width: 18px;
    height: 18px;
    margin: -7px 0;
    border-radius: 9px;
    background: {PRIMARY};
}}
/* ── GATT 树 / 日志（保留走查过的形态，圆角对正典 r-lg） ── */
QTreeWidget#GattTree {{
    background: {CARD};
    border: 1px solid {LINE};
    border-radius: 12px;
    padding: 6px;
}}
QTreeWidget#GattTree::item {{
    padding: 6px 4px;
}}
QPlainTextEdit#OpLog {{
    background: {CARD};
    border: 1px solid {LINE};
    border-radius: 12px;
    padding: 8px;
    font-family: {MONO};
    font-size: 12px;
    color: {SUB};
}}
/* ── 滚动区（pagehost：内容滚动底色即页面底色） ── */
QScrollArea {{ border: none; background: transparent; }}
QScrollArea > QWidget > QWidget {{ background: transparent; }}
QScrollBar:vertical {{
    background: transparent; width: 8px; margin: 0;
}}
QScrollBar::handle:vertical {{
    background: {LINE}; border-radius: 4px; min-height: 32px;
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
"""
