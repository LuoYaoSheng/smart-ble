# -*- coding: utf-8 -*-
"""Q-WIN TabBar 正典几何探针（TCP seam 版，UIALIGN 20260921）。

走 SMARTBLE_AUTOMATION_PORT：snap=grab() 离屏渲染（免疫遮挡/多屏/DPI 截屏坑），
state 读 UI 侧真值。量测口径同 probe_tabbar.analyze。
"""
import base64
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image
from io import BytesIO

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from probe_tabbar import analyze  # noqa: E402

PORT = 9471
QT_DIR = "E:/project/xf/smart-ble/apps/desktop/qt"


def rpc(cmd, args=None, port=PORT):
    s = socket.create_connection(("127.0.0.1", port), timeout=10)
    try:
        s.sendall((json.dumps({"id": int(time.time() * 1000) % 10**9, "cmd": cmd,
                               "args": args or {}}, ensure_ascii=False) + "\n").encode("utf-8"))
        f = s.makefile("rb")
        line = f.readline()
        return json.loads(line.decode("utf-8"))
    finally:
        s.close()


def wait_port(port=PORT, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            rpc("ping", port=port)
            return True
        except OSError:
            time.sleep(0.5)
    return False


def snap_png(port=PORT):
    r = rpc("snap", port=port)
    if not r.get("ok"):
        raise RuntimeError(r.get("err"))
    return Image.open(BytesIO(base64.b64decode(r["v"])))


def main():
    qt_dir = sys.argv[1] if len(sys.argv) > 1 else QT_DIR
    env = dict(os.environ)
    env["SMARTBLE_AUTOMATION_PORT"] = str(PORT)
    err = open(HERE / "qwin-seam-stderr.txt", "wb")
    proc = subprocess.Popen([f"{qt_dir}/.venv-pkg/Scripts/python.exe", "main.py"],
                            cwd=qt_dir, env=env, stdout=err, stderr=err,
                            creationflags=0x08000000)
    try:
        if not wait_port():
            print("FAIL: seam not up")
            return 2
        time.sleep(1.5)
        st = rpc("state")["v"]
        print(f"state tab={st['tab']} tabsVisible={st['tabsVisible']} version={st['version']}")
        all_ok = True

        for tab_index, expect_label in ((0, "scan"), (3, "info")):
            rpc("tab", {"index": tab_index})
            time.sleep(0.6)
            im = snap_png()
            im.save(HERE / f"qwin-tab{tab_index}-grab.png")
            dpr = im.size[0] / 1200.0  # 壳家族 1200x900 逻辑
            log = [f"tab{tab_index} size={im.size} dpr={dpr:.2f}"]
            ok = analyze(im, log, dpr, active_index=tab_index)
            for line in log:
                print(line)
            print(f"tab{tab_index}", "GREEN" if ok else "RED")
            all_ok = all_ok and ok

        # 切回 scan 收尾
        rpc("tab", {"index": 0})
        print("PROBE", "GREEN" if all_ok else "RED")
        return 0 if all_ok else 1
    finally:
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)
        err.close()


if __name__ == "__main__":
    sys.exit(main())
