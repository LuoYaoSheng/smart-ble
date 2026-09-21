"""Q-WIN 主题：对齐 docs/specs prototype tokens 的 QSS 近似（亮色线）。"""

PRIMARY = "#1B6DFF"
PRIMARY_DEEP = "#0E4FC4"
DANGER = "#F2555F"
BG = "#F5F7FA"
CARD = "#FFFFFF"
BORDER = "#E3E9F2"
TEXT = "#17223B"
TEXT_SUB = "#5A6B87"
TEXT_MUT = "#60758D"  # 正典 --c-mut（UIALIGN 20260921：原 #93A1B8 圈外值）
FILL = "#EEF2F8"

QSS = f"""
QWidget {{
    background: {BG};
    color: {TEXT};
    font-family: "Microsoft YaHei UI", "Segoe UI", sans-serif;
    font-size: 14px;
}}
QLabel#Kicker {{
    color: {PRIMARY};
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 2px;
}}
QLabel#PageTitle {{
    font-size: 22px;
    font-weight: 800;
}}
QLabel#Status {{
    color: {TEXT_SUB};
    font-size: 12px;
}}
QLabel#CardTitle {{
    font-size: 15px;
    font-weight: 700;
}}
QLabel#Dim {{
    color: {TEXT_MUT};
    font-size: 12px;
}}
QFrame#Card {{
    background: {CARD};
    border: 1px solid {BORDER};
    border-radius: 12px;
}}
QPushButton#Primary {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {PRIMARY}, stop:1 {PRIMARY_DEEP});
    color: white;
    border: none;
    border-radius: 10px;
    padding: 9px 22px;
    font-weight: 600;
}}
QPushButton#Primary:hover {{ opacity: 0.95; }}
QPushButton#Soft {{
    background: {FILL};
    color: {TEXT};
    border: 1px solid {BORDER};
    border-radius: 10px;
    padding: 8px 18px;
}}
QListWidget#DeviceList {{
    background: {CARD};
    border: 1px solid {BORDER};
    border-radius: 12px;
    padding: 6px;
}}
QListWidget#DeviceList::item {{
    border-radius: 10px;
    padding: 10px 12px;
    margin: 3px 2px;
}}
QListWidget#DeviceList::item:selected {{
    background: {FILL};
    color: {TEXT};
}}
QTreeWidget#GattTree {{
    background: {CARD};
    border: 1px solid {BORDER};
    border-radius: 12px;
    padding: 6px;
}}
QTreeWidget#GattTree::item {{
    padding: 6px 4px;
}}
QPlainTextEdit#OpLog {{
    background: {CARD};
    border: 1px solid {BORDER};
    border-radius: 12px;
    padding: 8px;
    font-family: "Cascadia Mono", "Consolas", monospace;
    font-size: 12px;
    color: {TEXT_SUB};
}}
QTabWidget::pane {{ border: none; }}
"""
