#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""E13 P002 真机测试 · 系统弹窗守护

App 内 UI 由 integration_test 语义驱动；本守护负责 App 之外、uiautomator
可见的系统弹窗：
  - BLE 配对弹窗（真固件连上即 ble_gap_security_initiate）：自动点「配对」
  - 运行时权限弹窗（兜底；正常流程已被 pm grant 预授权避开）

可选 --lost-watch：后台 tail `adb logcat -s flutter`，命中
'P002[E2E]: LOST_ARMED' 标记后立即 `esptool --port PORT run` 复位芯片，
向 App 注入 GATT 断连（T5b）。

用法：
  python e13-pairing-daemon.py --serial R5CR1284Y7H --minutes 8
  python e13-pairing-daemon.py --serial R5CR1284Y7H --minutes 8 \
      --lost-watch --esp-port COM13
"""
import argparse
import re
import subprocess
import threading
import time
import xml.etree.ElementTree as ET
from datetime import datetime

ADB = "adb"
ESPTOOL = r"C:/Users/11066/.platformio/penv/Scripts/esptool.exe"
DUMP = "/sdcard/e13_ui.xml"


def sh(args, timeout=8):
    """跑 adb 命令；编码未知（GBK/UTF-8 混布），replace 兜底。"""
    try:
        out = subprocess.run(
            args, capture_output=True, timeout=timeout
        )
        return out.stdout.decode("utf-8", errors="replace")
    except subprocess.TimeoutExpired:
        return ""


def focus_window(serial):
    out = sh([ADB, "-s", serial, "shell",
              "dumpsys window | grep -E 'mCurrentFocus|mFocusedWindow'"], timeout=6)
    return out


# 否定词优先排除：'不允许'/'拒绝'包含'允许'子串，首跑曾因此误中单选行
NEG_TEXTS = ("不允许", "拒绝", "不配对", "禁止", "取消")


def dump_nodes(serial):
    """uiautomator dump → [(text, clickable, center)]，失败返回 None。"""
    if not sh([ADB, "-s", serial, "shell", "uiautomator", "dump", DUMP], timeout=8):
        return None
    xml = sh([ADB, "-s", serial, "shell", "cat", DUMP], timeout=6)
    if not xml.strip().startswith("<?xml"):
        return None
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return None
    nodes = []
    for node in root.iter("node"):
        t = node.get("text", "")
        m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
        if t and m:
            x1, y1, x2, y2 = map(int, m.groups())
            nodes.append({
                "text": t,
                "clickable": node.get("clickable") == "true",
                "center": ((x1 + x2) // 2, (y1 + y2) // 2),
            })
    return nodes


def pick_positive(nodes, exact_texts):
    """正向按钮三层优先：精确文本可点按钮 → 已知单选行 → 短'允许'兜底。
    绝不返回含否定词的节点。"""
    if not nodes:
        return None, None
    for n in nodes:
        if n["clickable"] and n["text"] in exact_texts:
            return n["center"], n["text"]
    rows = ("仅在使用中允许", "仅此一次", "While using the app", "Only this time")
    for n in nodes:
        if n["clickable"] and n["text"] in rows:
            return n["center"], n["text"]
    for n in nodes:
        if (n["clickable"] and "允许" in n["text"] and len(n["text"]) <= 8
                and not any(x in n["text"] for x in NEG_TEXTS)):
            return n["center"], n["text"]
    return None, None


def tap(serial, x, y):
    sh([ADB, "-s", serial, "shell", "input", "tap", str(x), str(y)], timeout=6)


def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)


def lost_watchdog(serial, esp_port, fired, mode):
    """后台监视 logcat，LOST_ARMED 一次性触发断连注入。

    mode=esptool：复位芯片（需串口；E13 实测 USB 漂移后不可用时的原设计）
    mode=bt：手机侧关蓝牙（svc bluetooth disable）拆链，20s 后自动重开——
             产物等效（App 收到 onDisconnected → 断开横幅），无需 USB。
    """
    proc = subprocess.Popen(
        [ADB, "-s", serial, "logcat", "-s", "flutter"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    log(f"lost-watch 就绪：等待 LOST_ARMED（mode={mode}）")
    for raw in proc.stdout:
        line = raw.decode("utf-8", errors="replace")
        if "LOST_ARMED" in line and not fired.is_set():
            fired.set()
            if mode == "bt":
                log("lost-watch 命中 LOST_ARMED → 手机侧关蓝牙注入断连")
                sh([ADB, "-s", serial, "shell", "svc", "bluetooth", "disable"],
                   timeout=10)
                time.sleep(20)
                sh([ADB, "-s", serial, "shell", "svc", "bluetooth", "enable"],
                   timeout=10)
                log("蓝牙已重新开启")
            else:
                log("lost-watch 命中 LOST_ARMED → esptool run 注入断连")
                subprocess.run(
                    [ESPTOOL, "--port", esp_port,
                     "--before", "default_reset", "--after", "hard_reset", "run"],
                    capture_output=True, timeout=30,
                )
                log("esptool run 完成（芯片已复位，BLE 应断开）")
    proc.stdout.close()
    proc.terminate()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serial", required=True)
    ap.add_argument("--minutes", type=float, default=8)
    ap.add_argument("--lost-watch", action="store_true")
    ap.add_argument("--esp-port", default=None)
    ap.add_argument("--lost-mode", choices=("esptool", "bt"), default="esptool")
    args = ap.parse_args()

    fired = threading.Event()
    if args.lost_watch:
        if args.lost_mode == "esptool" and not args.esp_port:
            ap.error("--lost-mode esptool 需要 --esp-port")
        threading.Thread(
            target=lost_watchdog,
            args=(args.serial, args.esp_port, fired, args.lost_mode),
            daemon=True,
        ).start()

    deadline = time.time() + args.minutes * 60
    log(f"守护启动 serial={args.serial} minutes={args.minutes} "
        f"lost_watch={args.lost_watch}")
    while time.time() < deadline:
        focus = focus_window(args.serial)
        low = focus.lower()
        if "pairing" in low or "bluetooth" in low:
            pos, label = pick_positive(
                dump_nodes(args.serial),
                ("配对", "PAIR", "确定", "允许", "PAIR AND CONNECT"))
            if pos:
                log(f"配对弹窗 → 点「{label}」@{pos}")
                tap(args.serial, *pos)
            else:
                # 找不到按钮：落盘 dump 供事后定位真实按钮 bounds，
                # 再用既测坐标（S21 OneUI 正向按钮区，x≈810 为右按钮中心）
                sh([ADB, "-s", args.serial, "shell",
                    "cp -f /sdcard/e13_ui.xml /sdcard/e13_pair_dump.xml"], timeout=4)
                log("疑似配对弹窗但未定位到按钮，dump 已存 /sdcard/e13_pair_dump.xml，"
                    "用既测坐标 (810,2112)")
                tap(args.serial, 810, 2112)
            time.sleep(1.5)
        elif "permissioncontroller" in low or "grant" in low:
            pos, label = pick_positive(
                dump_nodes(args.serial), ("允许", "ALLOW", "确定", "OK"))
            if pos:
                log(f"权限弹窗 → 点「{label}」@{pos}")
                tap(args.serial, *pos)
                time.sleep(1.0)
        time.sleep(0.4)
    log("守护退出（时限到达）")


if __name__ == "__main__":
    main()
