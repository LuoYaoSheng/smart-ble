"""Q-WIN 无头冒烟（UIALIGN-PAGE 20260921）：automation 契约回归 + 五页可达。

offscreen 起 SMARTBLE_AUTOMATION_PORT TCP 缝，逐项断言 state 字段
（契约保持：scanStatus/scanBtn/devices/row_values/broadcastTip 等），
并驱动 filter_toggle/filter_set 增量命令验证筛选语义。
"""

from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time

PORT = 9475
# evidence/ → 20260921-UIALIGN-PAGE/ → windows-plan-v1/ → verification/ → 仓库根
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))))
QT_DIR = os.path.join(REPO, "apps", "desktop", "qt")
APP = os.path.join(QT_DIR, "main.py")
PY = os.path.join(QT_DIR, ".venv-pkg", "Scripts", "python.exe")

FAILS: list[str] = []


def rpc(sock: socket.socket, cmd: str, args: dict | None = None, rid: int = 0) -> dict:
    req = {"id": rid, "cmd": cmd, "args": args or {}}
    sock.sendall((json.dumps(req, ensure_ascii=False) + "\n").encode("utf-8"))
    f = sock.makefile("rb")
    while True:
        line = f.readline()
        if not line:
            raise RuntimeError("automation seam closed")
        resp = json.loads(line.decode("utf-8"))
        if resp.get("id") == rid:
            if not resp.get("ok"):
                raise RuntimeError(f"{cmd}: {resp.get('err')}")
            return resp.get("v")
        # 乱序响应按 id 对账（每请求一线程），跳过他行


def check(name: str, cond: bool, detail: str = "") -> None:
    mark = "PASS" if cond else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        FAILS.append(name)


def main() -> int:
    env = dict(os.environ)
    env["QT_QPA_PLATFORM"] = "offscreen"
    env["SMARTBLE_AUTOMATION_PORT"] = str(PORT)
    proc = subprocess.Popen([PY, APP], cwd=QT_DIR, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    sock = socket.create_connection(("127.0.0.1", PORT), timeout=15)
    try:
        for _ in range(50):
            try:
                rpc(sock, "ping", rid=1)
                break
            except Exception:
                time.sleep(0.2)
        check("ping", True)

        st = rpc(sock, "state", rid=2)
        check("tab0 scanStatus=待开始扫描", st["scanStatus"] == "待开始扫描", st["scanStatus"])
        check("tab0 scanBtn=开始扫描", st["scanBtn"] == "开始扫描", st["scanBtn"])
        check("tab0 devices empty", st["devices"] == [])
        check("tabsVisible", st["tabsVisible"] is True)
        check("connectedCount=0", st["connectedCount"] == 0)
        check("broadcastTip 保持降级口径",
              st["broadcastTip"] == "Windows 平台暂不支持外设模式（降级口径同 V-WIN；N4 待决）",
              st["broadcastTip"])
        ver = st["version"]
        check("about 版本非空", ver.startswith("v") and len(ver) > 1, ver)
        about = st["about"]
        check("about rows 三键齐",
              set(about) == {"当前环境", "设备型号", "版本"},
              str(sorted(about)))
        check("about 当前环境口径", about.get("当前环境") == "Desktop · Windows",
              str(about.get("当前环境")))

        for tab in (1, 2, 3):
            rpc(sock, "tab", {"index": tab}, rid=10 + tab)
            st = rpc(sock, "state", rid=20 + tab)
            check(f"tab{tab} reachable", st["tab"] == tab, str(st["tab"]))
        rpc(sock, "tab", {"index": 0}, rid=30)

        # 增量命令：筛选面板开关 + 语义（假数据走不了设备列表，先验回读）
        v = rpc(sock, "filter_toggle", rid=31)
        check("filter_toggle open", v.get("open") is True, str(v))
        v = rpc(sock, "filter_set", {"rssi": -60, "prefix": "SHID", "hide": True}, rid=32)
        check("filter_set 回读", v == {"rssi": -60, "namePrefix": "SHID", "hideUnnamed": True},
              str(v))
        v = rpc(sock, "filter_toggle", rid=33)
        check("filter_toggle close", v.get("open") is False, str(v))
        v = rpc(sock, "filter_set", {"rssi": -100, "prefix": "", "hide": False}, rid=34)
        check("filter 复位", v["rssi"] == -100 and v["hideUnnamed"] is False, str(v))
    finally:
        sock.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()

    print(f"\n{'ALL GREEN' if not FAILS else 'FAILURES: ' + ', '.join(FAILS)}")
    return 0 if not FAILS else 1


if __name__ == "__main__":
    sys.exit(main())
