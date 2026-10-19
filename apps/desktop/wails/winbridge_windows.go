//go:build windows

package main

// Windows 侧边车拉起：powershell.exe + HideWindow（防控制台闪窗，E-WIN windowsHide 同口径）。

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func (a *App) ensureWinBridge() (*winBridge, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	// 死亡路径（died 协程）会把 a.wbridge 置 nil——非 nil 即视为存活
	if b := a.wbridge; b != nil {
		return b, nil
	}
	ps1 := filepath.Join(os.TempDir(), "gwin-win-broadcast-bridge.ps1")
	if err := os.WriteFile(ps1, winBridgePs1, 0o644); err != nil {
		return nil, fmt.Errorf("write sidecar: %w", err)
	}
	cmd := exec.Command("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("spawn sidecar: %w", err)
	}
	b := &winBridge{stdin: stdin, alive: true, waiters: map[string][]chan plainResult{}}
	a.wbridge = b

	go func() {
		s := bufio.NewScanner(stdout)
		s.Buffer(make([]byte, 0, 4096), 65536)
		for s.Scan() {
			b.feed(s.Text())
		}
	}()
	go func() {
		err := cmd.Wait()
		b.died(fmt.Sprintf("broadcast sidecar exited: %v", err))
		a.mu.Lock()
		if a.wbridge == b {
			a.wbridge = nil
		}
		a.mu.Unlock()
	}()
	return b, nil
}

// killWinBridge 退出前停播并回收边车（E-WIN killWinBridge 同口径）。
func (a *App) killWinBridge() {
	a.mu.Lock()
	b := a.wbridge
	a.wbridge = nil
	a.mu.Unlock()
	if b == nil {
		return
	}
	_ = b.command("exit", nil)
	if c, ok := b.stdin.(io.Closer); ok {
		_ = c.Close()
	}
	b.died("bridge killed")
}
