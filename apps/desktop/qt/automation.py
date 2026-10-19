"""Q-WIN 自动化 seam（测试基建，与 G-WIN automation seam 同思路）。

SMARTBLE_AUTOMATION_PORT 环境变量存在时，在 127.0.0.1 起一个 TCP 行 JSON
服务：请求 {id, cmd, args} → 经 Qt 信号投递到 UI 线程执行 → 响应
{id, ok, v} 或 {id, ok: false, err}。截图用 QWidget.grab()（Qt 原生
离屏渲染，无需 Win32）。不设该环境变量时零副作用、零监听。

模态期间（退出确认 QMessageBox.exec、写弹窗 open）嵌套事件循环仍处理
排队的信号投递，故 confirm_exit / write_dialog 可驱动模态内交互。
"""

from __future__ import annotations

import base64
import json
import os
import socket
import threading

from PySide6.QtCore import QObject, Qt, Signal
from PySide6.QtWidgets import QApplication, QComboBox, QLineEdit, QPushButton

ENV_PORT = "SMARTBLE_AUTOMATION_PORT"
EVAL_TIMEOUT = 90.0


class AutomationBridge(QObject):
    """TCP 线程 → UI 线程的请求投递桥（AutoConnection 跨线程自动 Queued）。

    Signal(object)：按 Python 引用传递（Signal(dict) 会被转 QVariantMap
    拷贝，结果写回不到原 dict——坑位账）。
    """

    req = Signal(object)

    def __init__(self, window, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._win = window
        self.req.connect(self._dispatch)

    # ── UI 线程命令分发 ──

    def _dispatch(self, request: dict) -> None:
        cmd = str(request.get("cmd", ""))
        args = request.get("args") or {}
        try:
            v = self._exec(cmd, args)
            request["__result__"] = {"ok": True, "v": v}
        except Exception as exc:  # noqa: BLE001 - 单命令失败回 err，不断链
            request["__result__"] = {"ok": False, "err": f"{type(exc).__name__}: {exc}"}
        ev = request.get("__event__")
        if ev is not None:
            ev.set()

    def _exec(self, cmd: str, args: dict):
        win = self._win
        ble = win._ble
        stack = win._stack
        detail = win._detail_page
        scan = win._scan_page

        if cmd == "ping":
            return "pong"

        if cmd == "state":
            d = {
                "tab": "detail" if stack.currentIndex() == win.IDX_DETAIL else stack.currentIndex(),
                "tabsVisible": win._tabs.isVisible(),
                "scanStatus": scan._status.text(),
                "scanBtn": scan._scan_btn.text(),
                "devices": [
                    {"name": h.name, "rssi": h.rssi, "address": h.address}
                    for h in scan._hits
                ],
                "scanSelected": scan._list.currentRow(),
                "connectedCount": len(ble.connected),
                "connectedList": [f"{i['name']}   {a}" for a, i in ble.connected.items()],
                "detail": {
                    "visible": stack.currentIndex() == win.IDX_DETAIL,
                    "title": detail._title.text(),
                    "status": detail._status.text(),
                    "services": detail._tree_data.get("services", []),
                    "charCount": len(detail._char_rows),
                    "selectedChar": self._selected_char_index(detail),
                    "actions": {
                        "read": detail._act_read.isEnabled(),
                        "notifyLabel": detail._act_notify.text(),
                        "notify": detail._act_notify.isEnabled(),
                        "write": detail._act_write.isEnabled(),
                    },
                    "log": detail._log.toPlainText()[-1500:],
                    "writeDialogVisible": detail._write_dlg is not None and detail._write_dlg.isVisible(),
                },
                "about": win._about_page.row_values,
                "version": win._about_page.row_values.get("版本", ""),
                "broadcastTip": win._broadcast_page.tip_label.text(),
                "exitModal": self._exit_modal_state(),
            }
            return d

        if cmd == "tab":
            win._tabs.setCurrentIndex(int(args["index"]))

        elif cmd == "filter_toggle":
            # UIALIGN-PAGE：驱动 P001 筛选面板开关（增量命令，原契约不变）
            scan._toggle_filter()
            return {"open": not scan._filter_panel.isHidden()}

        elif cmd == "filter_set":
            # UIALIGN-PAGE：设置筛选（rssi/prefix/hide 任选），回读当前筛选值
            panel = scan._filter_panel
            if "rssi" in args:
                panel._set_rssi(int(args["rssi"]))
            if "prefix" in args:
                panel._prefix.setText(str(args["prefix"]))
            if "hide" in args:
                panel._hide.set_on(bool(args["hide"]))
            return panel.filters()

        elif cmd == "scan":
            scan._toggle()

        elif cmd == "select_scan_row":
            scan._list.setCurrentRow(int(args["row"]))

        elif cmd == "connect_selected":
            scan._connect_selected()

        elif cmd == "open_detail_row":
            win._connected_page._list.setCurrentRow(int(args["row"]))
            win._connected_page._open_selected()

        elif cmd == "back":
            detail.back_requested and detail.back_requested()

        elif cmd == "select_char_row":
            idx = int(args["row"])
            self._select_char(detail, idx)
            return self._selected_char_index(detail)

        elif cmd == "char_read":
            detail._read()

        elif cmd == "char_notify":
            detail._toggle_notify()

        elif cmd == "char_write":
            detail._write()

        elif cmd == "write_dialog":
            return self._drive_write_dialog(detail, args)

        elif cmd == "disconnect_row":
            win._connected_page._list.setCurrentRow(int(args["row"]))
            win._connected_page._disconnect_selected()

        elif cmd == "disconnect_all":
            ble.disconnect_all()

        elif cmd == "close_win":
            win.close()

        elif cmd == "confirm_exit":
            return self._click_modal_button(str(args.get("btn", "退出")))

        elif cmd == "snap":
            return self._snapshot(bool(args.get("modal")))

        else:
            raise ValueError(f"unknown cmd: {cmd}")
        return None

    # ── 命令实现 ──

    @staticmethod
    def _exit_modal_state() -> dict | None:
        from PySide6.QtWidgets import QMessageBox

        modal = QApplication.activeModalWidget()
        if isinstance(modal, QMessageBox):
            return {"title": modal.windowTitle(), "text": modal.text()}
        return None

    @staticmethod
    def _selected_char_index(detail) -> int:
        item = detail._tree.currentItem()
        if item is None or item.data(0, Qt.UserRole) is None:
            return -1
        return int(item.data(0, Qt.UserRole))

    @staticmethod
    def _select_char(detail, idx: int) -> None:
        """按特征展平索引选中树行（跳过服务行）。"""
        pos = 0
        for i in range(detail._tree.topLevelItemCount()):
            top = detail._tree.topLevelItem(i)
            for j in range(top.childCount()):
                if pos == idx:
                    detail._tree.setCurrentItem(top.child(j))
                    return
                pos += 1
        raise IndexError(f"char row {idx} out of range")

    def _drive_write_dialog(self, detail, args: dict) -> dict:
        dlg = detail._write_dlg
        if dlg is None or not dlg.isVisible():
            raise RuntimeError("write dialog not open")
        mode = str(args.get("mode", "text"))
        combo = dlg.findChild(QComboBox)
        line = dlg.findChild(QLineEdit)
        if combo is not None and mode in ("text", "hex"):
            combo.setCurrentIndex(0 if mode == "text" else 1)
        if line is not None and "value" in args:
            line.setText(str(args["value"]))
        action = str(args.get("action", "send"))
        btn_text = "发送" if action == "send" else "取消"
        for b in dlg.findChildren(QPushButton):
            if b.text().strip() == btn_text:
                b.click()
                break
        else:
            raise RuntimeError(f"write dialog button not found: {btn_text}")
        return {"clicked": btn_text}

    @staticmethod
    def _click_modal_button(text: str) -> dict:
        modal = QApplication.activeModalWidget()
        if modal is None:
            raise RuntimeError("no active modal widget")
        for b in modal.findChildren(QPushButton):
            if b.text().strip() == text:
                b.click()
                return {"clicked": text, "modal": modal.windowTitle()}
        raise RuntimeError(f"modal button not found: {text}")

    def _snapshot(self, modal: bool = False) -> str:
        """窗口 grab() → PNG base64（Qt 离屏渲染，不依赖窗口可见性/焦点）。"""
        from PySide6.QtCore import QBuffer, QIODevice

        target = QApplication.activeModalWidget() if modal else self._win
        if target is None:
            raise RuntimeError("no modal widget to grab")
        pix = target.grab()
        buf = QBuffer()
        buf.open(QIODevice.WriteOnly)
        if not pix.save(buf, "PNG"):
            raise RuntimeError("grab().save failed")
        return base64.b64encode(bytes(buf.data())).decode("ascii")


class _AutomationServer:
    """后台 TCP 线程：行 JSON 请求 → 桥 → 行 JSON 响应。"""

    def __init__(self, bridge: AutomationBridge, port: int) -> None:
        self._bridge = bridge
        self._port = port

    def serve(self) -> None:
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(("127.0.0.1", self._port))
        srv.listen(8)
        while True:
            try:
                conn, _ = srv.accept()
            except OSError:
                return
            with conn:
                self._serve_conn(conn)

    def _serve_conn(self, conn: socket.socket) -> None:
        f = conn.makefile("rb")
        while True:
            line = f.readline()
            if not line:
                return
            line = line.strip()
            if not line:
                continue
            try:
                request = json.loads(line.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                self._send(conn, {"id": None, "ok": False, "err": f"bad json: {exc}"})
                continue
            # 每请求一线程：模态驱动命令（close_win）在 UI 线程挂起等待期间，
            # 后续命令（confirm_exit/write_dialog）仍能读入并投递解模态；
            # 响应可能乱序，调用方按 id 对账。
            threading.Thread(target=self._handle_one, args=(conn, request),
                             daemon=True).start()

    def _handle_one(self, conn: socket.socket, request: dict) -> None:
        ev = threading.Event()
        request["__event__"] = ev
        self._bridge.req.emit(request)   # 跨线程 → Queued → UI 线程
        if not ev.wait(EVAL_TIMEOUT):
            self._send(conn, {"id": request.get("id"), "ok": False,
                              "err": "ui thread timeout"})
            return
        result = request.pop("__result__", {"ok": False, "err": "no result"})
        self._send(conn, {"id": request.get("id"), **result})

    @staticmethod
    def _send(conn: socket.socket, payload: dict) -> None:
        try:
            conn.sendall((json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8"))
        except OSError:
            pass


def start_automation_if_requested(window) -> None:
    port_raw = os.environ.get(ENV_PORT, "").strip()
    if not port_raw:
        return
    port = int(port_raw)
    bridge = AutomationBridge(window)
    threading.Thread(target=_AutomationServer(bridge, port).serve,
                     daemon=True, name="qwin-automation").start()
