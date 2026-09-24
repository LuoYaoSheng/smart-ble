//go:build windows

package main

// WIN-BRIDGE 空口真验证：拉起边车 → 发厂商块（0x4C42 / "BLE"）→ 保持 8s 供
// 外部 bleak 扫描器空口捕获 → 停播 → 退出边车。配合 run-g-aircheck.py 使用。

import (
	"testing"
	"time"
)

func TestWinBridgeStartStopAir(t *testing.T) {
	a := &App{}
	b, err := a.ensureWinBridge()
	if err != nil {
		t.Fatalf("ensureWinBridge: %v", err)
	}
	if err := b.command("start", map[string]any{"companyId": 0x4C42, "data": []int{66, 76, 69}}); err != nil {
		t.Fatalf("send start: %v", err)
	}
	res := b.waitEvent("started", 12*time.Second) // 含 csc 首编译冷启动
	if !res.Success {
		t.Fatalf("start failed: %s", res.Error)
	}
	t.Log("started, holding 8s for air capture")
	time.Sleep(8 * time.Second)
	if err := b.command("stop", nil); err != nil {
		t.Fatalf("send stop: %v", err)
	}
	res2 := b.waitEvent("stopped", 5*time.Second)
	if !res2.Success {
		t.Fatalf("stop failed: %s", res2.Error)
	}
	a.killWinBridge()
}
