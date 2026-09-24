package main

// ─── Win32 广播边车协议层（WIN-BRIDGE 同构移植，2026-09-24 广播模板复制轮）───
// 与 E-WIN（apps/desktop/electron/src/main/index.js）同协议复用同一份
// win-broadcast-bridge.ps1：PowerShell 直呼 WinRT BluetoothLEAdvertisementPublisher，
// 行协议 stdin/stdout 单行 JSON（start/stop/exit ↔ started/stopped/error）。
// 平台事实（20260921-XDEV-BROADCAST 二分实证）：WinRT 桌面进程仅厂商块 0xFF 可发，
// LocalName/ServiceUuids 一律 Start() 拒绝——name/uuid 参数在此路径忽略。

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"
)

//go:embed win-broadcast-bridge.ps1
var winBridgePs1 []byte

// winBridge 一条常驻边车会话：等待者按事件名挂队（E-WIN waiters Map 同构）。
// 进程拉起在 winbridge_windows.go（HideWindow 是 Windows 专属字段）。
type winBridge struct {
	mu      sync.Mutex
	stdin   io.Writer
	alive   bool
	waiters map[string][]chan plainResult
}

type winBridgeLine struct {
	Event   string `json:"event"`
	Message string `json:"message"`
}

// feed 边车 stdout 一行（读循环调用）：error 事件同时惊醒 started/stopped 等待者。
func (b *winBridge) feed(line string) {
	var msg winBridgeLine
	if err := json.Unmarshal([]byte(line), &msg); err != nil || msg.Event == "" {
		return
	}
	if msg.Event == "error" {
		res := plainResult{Error: msg.Message}
		b.dispatch("started", res)
		b.dispatch("stopped", res)
		return
	}
	b.dispatch(msg.Event, plainResult{Success: true})
}

func (b *winBridge) dispatch(event string, res plainResult) {
	b.mu.Lock()
	chans := b.waiters[event]
	b.waiters[event] = nil
	b.mu.Unlock()
	for _, ch := range chans {
		select {
		case ch <- res:
		default:
		}
	}
}

// died 进程退出时由拉起层调用：惊醒全部等待者并标记失活。
func (b *winBridge) died(reason string) {
	b.mu.Lock()
	waiters := b.waiters
	b.waiters = map[string][]chan plainResult{}
	b.alive = false
	b.mu.Unlock()
	for _, chans := range waiters {
		for _, ch := range chans {
			select {
			case ch <- plainResult{Error: reason}:
			default:
			}
		}
	}
}

func (b *winBridge) waitEvent(event string, timeout time.Duration) plainResult {
	ch := make(chan plainResult, 1)
	b.mu.Lock()
	if !b.alive {
		b.mu.Unlock()
		return plainResult{Error: "broadcast sidecar not running"}
	}
	b.waiters[event] = append(b.waiters[event], ch)
	b.mu.Unlock()

	select {
	case res := <-ch:
		return res
	case <-time.After(timeout):
		b.mu.Lock()
		waiters := b.waiters[event]
		for i, w := range waiters {
			if w == ch {
				b.waiters[event] = append(waiters[:i], waiters[i+1:]...)
				break
			}
		}
		b.mu.Unlock()
		return plainResult{Error: fmt.Sprintf("bridge %s timeout (%dms)", event, timeout.Milliseconds())}
	}
}

func (b *winBridge) command(cmd string, extra map[string]any) error {
	payload := map[string]any{"cmd": cmd}
	for k, v := range extra {
		payload[k] = v
	}
	line, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if !b.alive {
		return fmt.Errorf("broadcast sidecar not running")
	}
	_, err = io.WriteString(b.stdin, string(line)+"\n")
	return err
}
