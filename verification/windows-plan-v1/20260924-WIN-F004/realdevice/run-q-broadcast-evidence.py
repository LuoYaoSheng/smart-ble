# Q-WIN P008 广播页真机取证：真实 UI 页 _on_start → WIN-BRIDGE 边车 → WinRT
# publisher Started 全链 + 广播中/停止双态截图。
# 用法: python run-q-broadcast-evidence.py（设备无关，纯本机发射链）
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, r"E:\project\xf\smart-ble\apps\desktop\qt")

from PySide6.QtWidgets import QApplication  # noqa: E402

import main as qmain  # noqa: E402

OUT = Path(__file__).parent


def main() -> int:
    app = QApplication([])
    app.setStyleSheet(qmain.QSS)
    ble = qmain.BleService()
    page = qmain.BroadcastPage(ble)
    page.resize(880, 720)
    page.show()
    app.processEvents()

    # 启动（阻塞等待边车事件，含 csc 首编译冷启动）
    page._f_mfg_id.setText("4C42")
    page._f_mfg_data.setText("BLE")
    page._on_start()
    app.processEvents()
    chip_on = page._status_chip.text()
    log_after_start = page._log.toPlainText()
    print(f"CHIP_ON=[{chip_on}] advertising={ble.advertising}")
    print("LOG_START:", log_after_start.replace("\n", " | "))
    ok_start = chip_on == "广播中" and ble.advertising
    page.grab().save(str(OUT / "q-p008-broadcast-on.png"))

    # 停止
    page._on_stop()
    app.processEvents()
    chip_off = page._status_chip.text()
    log_all = page._log.toPlainText()
    print(f"CHIP_OFF=[{chip_off}] advertising={ble.advertising}")
    print("LOG_ALL:", log_all.replace("\n", " | "))
    page.grab().save(str(OUT / "q-p008-broadcast-off.png"))

    # 超限拦截（预算 >31B）
    page._f_mfg_data.setText("X" * 40)
    page._refresh_budget()
    total_text = page._b_total.text()
    print(f"BUDGET_OVER=[{total_text}] start_enabled={page._start_btn.isEnabled()}")
    ok_budget = "超限" in total_text and not page._start_btn.isEnabled()
    page.grab().save(str(OUT / "q-p008-budget-over.png"))

    ble.shutdown()
    print(f"RESULT start={'PASS' if ok_start else 'FAIL'} budget={'PASS' if ok_budget else 'FAIL'}")
    return 0 if (ok_start and ok_budget) else 1


if __name__ == "__main__":
    sys.exit(main())
