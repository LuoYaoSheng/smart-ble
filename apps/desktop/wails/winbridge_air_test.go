//go:build windows

package main

// G-WIN 空口取证驱动（20260924-AIR-GQT）：env 门控，默认 SKIP 不伤常规门禁。
// AIR_TAG=4 字节载荷标签（如 GWIN）；AIR_LOG=事件 jsonl 路径；AIR_HOLD=保持秒数（默认 9）。
// 走 NewApp+StartAdvertising 全路径（含厂商 ID hex 解析与边车 IPC），
// 事件即时落盘供编排器轮询（绕开 go test 输出缓冲）。

import (
	"embed"
	"encoding/json"
	"os"
	"strconv"
	"testing"
	"time"
)

func airEmit(shell, event, detail string) {
	path := os.Getenv("AIR_LOG")
	rec, _ := json.Marshal(map[string]any{
		"ts": time.Now().UnixMilli(), "shell": shell, "event": event, "detail": detail,
	})
	if path == "" {
		return
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = f.Write(append(rec, '\n'))
}

func TestWinBridgeAirCapture(t *testing.T) {
	tag := os.Getenv("AIR_TAG")
	if tag == "" {
		t.Skip("AIR_TAG not set — 空口门控驱动（20260924-AIR-GQT），编排器经 env 驱动")
	}
	hold := 9
	if v := os.Getenv("AIR_HOLD"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			hold = n
		}
	}
	airEmit("G", "driver-started", tag)
	a := NewApp(embed.FS{})
	res := a.StartAdvertising(tag, nil, "0x0001", tag, false)
	airEmit("G", "start-result", res.Error)
	if !res.Success {
		t.Fatalf("StartAdvertising failed: %s", res.Error)
	}
	airEmit("G", "started", tag)
	time.Sleep(time.Duration(hold) * time.Second)
	res2 := a.StopAdvertising()
	airEmit("G", "stop-result", res2.Error)
	if !res2.Success {
		t.Fatalf("StopAdvertising failed: %s", res2.Error)
	}
	airEmit("G", "stopped", tag)
	a.killWinBridge()
	airEmit("G", "exited", "")
}
