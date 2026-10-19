"""Q-WIN Win32 广播边车（WIN-BRIDGE 同构移植，2026-09-24 广播模板复制轮）。

与 E-WIN/G-WIN 同协议复用同一份 win-broadcast-bridge.ps1：PowerShell 直呼
WinRT BluetoothLEAdvertisementPublisher，行协议 stdin/stdout 单行 JSON
（start/stop/exit ↔ started/stopped/error）。平台事实（20260921-XDEV-BROADCAST
二分实证）：WinRT 桌面进程仅厂商块 0xFF 可发，LocalName/ServiceUuids 一律
Start() 拒绝；空负载被拒。本机无线电不自环（20260924 判别实证：广播中
bleak 可见 SHID 116 帧、自身厂商块 0 帧），空口收包需外部接收端。
"""

from __future__ import annotations

import json
import pathlib
import queue
import subprocess
import threading

_PS1 = pathlib.Path(__file__).parent / "win-broadcast-bridge.ps1"


class WinBroadcastBridge:
    """常驻边车会话：按事件名排队等待（E-WIN waiters Map 同构；调用为 UI 线程序列使用）。"""

    def __init__(self) -> None:
        self._proc: subprocess.Popen | None = None
        self._events: dict[str, queue.Queue] = {}

    # ── 进程与读循环 ──

    def _ensure(self) -> subprocess.Popen:
        if self._proc is not None and self._proc.poll() is None:
            return self._proc
        self._proc = subprocess.Popen(
            [
                "powershell.exe",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(_PS1),
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        threading.Thread(target=self._read_loop, daemon=True).start()
        return self._proc

    def _read_loop(self) -> None:
        proc = self._proc
        assert proc.stdout is not None
        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            event = msg.get("event")
            if event == "error":
                # 边车把失败统一报 error：同时惊醒 started/stopped 等待者（E 同口径）
                for name in ("started", "stopped"):
                    q = self._events.get(name)
                    if q:
                        q.put({"success": False, "error": str(msg.get("message", ""))})
            else:
                q = self._events.get(event)
                if q:
                    q.put({"success": True, "detail": msg})
        # stdout 关闭 = 边车死亡：惊醒全部等待者
        for q in self._events.values():
            q.put({"success": False, "error": "broadcast sidecar exited"})

    def _wait(self, event: str, timeout: float) -> dict:
        q = self._events.setdefault(event, queue.Queue())
        with q.mutex:  # type: ignore[attr-defined]
            q.queue.clear()
        try:
            return q.get(timeout=timeout)
        except queue.Empty:
            return {"success": False, "error": f"bridge {event} timeout ({timeout:g}s)"}

    # ── 对外接口 ──

    def start(self, company_id: int, data: bytes, timeout: float = 12.0) -> dict:
        """发厂商块广播。首次调用含边车冷启动（PS 起 + csc 首编译 ~3s），超时放宽。"""
        proc = self._ensure()
        assert proc.stdin is not None
        proc.stdin.write(
            json.dumps({"cmd": "start", "companyId": company_id, "data": list(data)}) + "\n"
        )
        proc.stdin.flush()
        return self._wait("started", timeout)

    def stop(self, timeout: float = 5.0) -> dict:
        if self._proc is None or self._proc.poll() is not None:
            return {"success": False, "error": "bridge not running"}
        assert self._proc.stdin is not None
        self._proc.stdin.write(json.dumps({"cmd": "stop"}) + "\n")
        self._proc.stdin.flush()
        return self._wait("stopped", timeout)

    def shutdown(self) -> None:
        """退出收尾：stop + exit + 兜底 kill（E-WIN killWinBridge 同口径）。"""
        if self._proc is not None and self._proc.poll() is None:
            try:
                assert self._proc.stdin is not None
                self._proc.stdin.write(json.dumps({"cmd": "exit"}) + "\n")
                self._proc.stdin.flush()
                self._proc.wait(timeout=3)
            except Exception:  # noqa: BLE001 - 收尾兜底不抛
                self._proc.kill()
        self._proc = None
