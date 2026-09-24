# -*- coding: utf-8 -*-
"""Q-WIN 空口取证驱动（20260924-AIR-GQT）。

复用 Q 壳正式模块 win_broadcast.WinBroadcastBridge（与 UI P008 页面同一发射路径）：
发厂商块（CID 0x0001 + 4 字节标签）→ 保持 HOLD 秒供手机空口捕获 → 停播 → 退边车。
事件 jsonl 即时落盘（AIR_LOG）供编排器轮询；stdout 同步打印便于人工盯跑。

用法: python driver_q.py [TAG=QWIN] [HOLD=9]
环境: AIR_LOG=事件jsonl路径（可缺省，仅打 stdout）
"""
import json
import os
import sys
import time

sys.path.insert(0, r"E:\project\xf\smart-ble\apps\desktop\qt")
from win_broadcast import WinBroadcastBridge  # noqa: E402

TAG = (sys.argv[1] if len(sys.argv) > 1 else "QWIN").encode("ascii")
HOLD = float(sys.argv[2]) if len(sys.argv) > 2 else 9.0
LOG = os.environ.get("AIR_LOG", "")


def emit(event: str, detail: str = "") -> None:
    rec = {"ts": int(time.time() * 1000), "shell": "Q", "event": event, "detail": detail}
    line = json.dumps(rec, ensure_ascii=False)
    print(line, flush=True)
    if LOG:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def main() -> int:
    bridge = WinBroadcastBridge()
    emit("driver-started", TAG.decode())
    r = bridge.start(company_id=0x0001, data=TAG)
    emit("start-result", json.dumps(r, ensure_ascii=False))
    if not r.get("success"):
        emit("fatal", json.dumps(r, ensure_ascii=False))
        return 2
    emit("started", TAG.decode())
    time.sleep(HOLD)
    r2 = bridge.stop()
    emit("stop-result", json.dumps(r2, ensure_ascii=False))
    if not r2.get("success"):
        emit("fatal", json.dumps(r2, ensure_ascii=False))
        bridge.shutdown()
        return 3
    emit("stopped", TAG.decode())
    bridge.shutdown()
    emit("exited")
    return 0


if __name__ == "__main__":
    sys.exit(main())
