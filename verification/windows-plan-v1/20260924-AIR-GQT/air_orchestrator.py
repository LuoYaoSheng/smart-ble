# -*- coding: utf-8 -*-
"""20260924-AIR-GQT 空口编排器：G/Q/T 三壳广播外部空口闭环。

每壳三窗（手机 A-AND logcat 旁证，BleManager onScanResult 原始 adv hex）：
  baseline（未广播，应 0 命中）→ started 后 on 窗（应 ≥1 命中）→ stopped 后 off 窗（应 0 命中）。
载荷判据：厂商块 CID 0x0001 + 4 字节壳标签（GWIN/QWIN/TWIN）→ adv hex 前缀 ff0100+taghex。
驱动事件经 AIR_LOG jsonl 文件轮询（绕 go test/cargo 输出缓冲）。

用法: python air_orchestrator.py [G Q T 中的若干，默认全三]
前置: 手机 50143338 已装 A-AND 并授 SCAN/CONNECT/ADVERTISE/FINE_LOCATION；
      go/cargo 已预编译（--no-run），app 在前台。
"""
import json
import os
import subprocess
import sys
import time

SERIAL = "50143338"
TAP = (870, 370)  # ScanTool 右侧主按钮（盲 tap+logcat 验证命中过）
ROOT = r"E:\project\xf\smart-ble"
HERE = os.path.join(ROOT, r"verification\windows-plan-v1\20260924-AIR-GQT")
EVID = os.path.join(HERE, "evidence")
EVENTS = os.path.join(EVID, "driver-events.jsonl")
SCAN_SECONDS = 5.8  # app 扫描自动停 5s，留 0.8s 收尾

DRIVERS = {
    "G": {
        "tag": "GWIN",
        "cwd": os.path.join(ROOT, r"apps\desktop\wails"),
        "cmd": ["go", "test", "-run", "^TestWinBridgeAirCapture$", "-count=1", "-v"],
    },
    "Q": {
        "tag": "QWIN",
        "cwd": HERE,
        "cmd": [sys.executable, "driver_q.py", "QWIN", "9"],
    },
    "T": {
        "tag": "TWIN",
        "cwd": os.path.join(ROOT, r"apps\desktop\tauri\src-tauri"),
        "cmd": ["cargo", "test", "--lib", "bridge_air_capture", "--", "--nocapture"],
    },
}


def adb(*args, timeout=30):
    r = subprocess.run(
        ["adb", "-s", SERIAL, *args], capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=timeout,
    )
    return r.stdout


def ensure_foreground():
    focus = adb("shell", "dumpsys window | grep mCurrentFocus")
    if "com.smartble.android" not in focus:
        adb("shell", "am", "start", "-n", "com.smartble.android/com.smartble.ui.MainActivity")
        time.sleep(2.5)


def tap_scan():
    adb("shell", "input", "keyevent", "KEYCODE_WAKEUP")
    adb("shell", "input", "keyevent", "82")
    adb("shell", "input", "tap", str(TAP[0]), str(TAP[1]))


def scan_window(name):
    adb("logcat", "-c")
    tap_scan()
    time.sleep(SCAN_SECONDS)
    out = adb("logcat", "-d", "-s", "BleManager")
    path = os.path.join(EVID, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    lines = [l for l in out.splitlines() if "onScanResult" in l]
    return len(lines), path


def count_hits(path, tag):
    key = "ff0100" + tag.encode("ascii").hex()
    hits = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "onScanResult" in line and key in line:
                hits.append(line.strip())
    return hits


def wait_event(shell, event, timeout):
    """轮询 EVENTS jsonl 等待指定壳事件；返回事件 dict 或 None（超时）。"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if os.path.exists(EVENTS):
            try:
                with open(EVENTS, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            rec = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if rec.get("shell") == shell and rec.get("event") == event:
                            return rec
            except OSError:
                pass
        time.sleep(0.25)
    return None


def run_shell(shell):
    d = DRIVERS[shell]
    tag = d["tag"]
    print(f"=== {shell}-WIN air check (tag={tag}) ===", flush=True)
    result = {"shell": shell, "tag": tag}

    ensure_foreground()
    base_lines, base_path = scan_window(f"{shell}-baseline.log")
    base_hits = count_hits(base_path, tag)
    result["baseline"] = {"scan_lines": base_lines, "hits": len(base_hits)}
    print(f"  baseline: {base_lines} lines, {len(base_hits)} hits (expect 0)", flush=True)

    open(EVENTS, "a", encoding="utf-8").close()  # 确保存在
    env = dict(os.environ, AIR_TAG=tag, AIR_HOLD="9", AIR_LOG=EVENTS)
    log_path = os.path.join(EVID, f"{shell}-driver.log")
    with open(log_path, "w", encoding="utf-8") as lf:
        proc = subprocess.Popen(d["cmd"], cwd=d["cwd"], env=env,
                                stdout=lf, stderr=subprocess.STDOUT)
    started = wait_event(shell, "started", 40)
    result["started_ok"] = started is not None
    print(f"  driver started: {started}", flush=True)
    if not started:
        proc.kill()
        result["verdict"] = "FAIL(no-start)"
        return result

    on_lines, on_path = scan_window(f"{shell}-on.log")
    on_hits = count_hits(on_path, tag)
    result["on"] = {"scan_lines": on_lines, "hits": len(on_hits),
                    "first": on_hits[0] if on_hits else None}
    print(f"  on-window: {on_lines} lines, {len(on_hits)} hits (expect >=1)", flush=True)

    stopped = wait_event(shell, "stopped", 20)
    result["stopped_ok"] = stopped is not None
    print(f"  driver stopped: {stopped}", flush=True)
    try:
        proc.wait(timeout=25)
    except subprocess.TimeoutExpired:
        proc.kill()
        result["driver_exit"] = "timeout-killed"
    else:
        result["driver_exit"] = "clean"

    time.sleep(1.2)
    off_lines, off_path = scan_window(f"{shell}-off.log")
    off_hits = count_hits(off_path, tag)
    result["off"] = {"scan_lines": off_lines, "hits": len(off_hits)}
    print(f"  off-window: {off_lines} lines, {len(off_hits)} hits (expect 0)", flush=True)

    ok = (len(base_hits) == 0 and len(on_hits) >= 1 and len(off_hits) == 0
          and result["started_ok"] and result["stopped_ok"])
    result["verdict"] = "PASS" if ok else "FAIL"
    print(f"  VERDICT: {result['verdict']}", flush=True)
    return result


def main():
    shells = sys.argv[1:] or ["G", "Q", "T"]
    if os.path.exists(EVENTS):
        os.remove(EVENTS)
    summary = [run_shell(s) for s in shells]
    out = os.path.join(EVID, "air-summary.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\nsummary -> {out}")
    for r in summary:
        print(f"  {r['shell']}: {r['verdict']}")
    return 0 if all(r["verdict"] == "PASS" for r in summary) else 1


if __name__ == "__main__":
    sys.exit(main())
