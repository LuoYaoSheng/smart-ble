package main

import (
	"context"
	"log"
	"sort"
	"sync"
	"time"

	"tinygo.org/x/bluetooth"
)

// App struct
type App struct {
	ctx context.Context
}

// ScanHit 一次扫描命中的设备（C1 设备卡字段子集）。
type ScanHit struct {
	Address string `json:"address"`
	Name    string `json:"name"`
	Rssi    int16  `json:"rssi"`
}

var (
	adapterOnce sync.Once
	adapter     *bluetooth.Adapter
	adapterErr  error
)

func getAdapter() (*bluetooth.Adapter, error) {
	adapterOnce.Do(func() {
		adapter = bluetooth.DefaultAdapter
		if adapter == nil {
			adapterErr = context.DeadlineExceeded
			return
		}
		adapterErr = adapter.Enable()
	})
	return adapter, adapterErr
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ScanBLE 跑一次 5s 扫描（与 E/T/V/F/Q 各壳超时口径一致），
// 返回按 RSSI 降序的设备列表。tinygo.org/x/bluetooth 的 Windows
// 后端走 WinRT（与 E-WIN noble-winrt / Q-WIN bleak 同栈）。
func (a *App) ScanBLE() ([]ScanHit, error) {
	ad, err := getAdapter()
	if err != nil {
		return nil, err
	}
	var mu sync.Mutex
	found := map[string]ScanHit{}
	stop := make(chan error, 1)
	go func() {
		err := ad.Scan(func(a *bluetooth.Adapter, d bluetooth.ScanResult) {
			name := d.LocalName()
			mu.Lock()
			defer mu.Unlock()
			// RSSI 降序去重合并（同址取最新）
			found[d.Address.String()] = ScanHit{
				Address: d.Address.String(),
				Name:    name,
				Rssi:    d.RSSI,
			}
		})
		stop <- err
	}()
	select {
	case err := <-stop:
		if err != nil {
			return nil, err
		}
	case <-time.After(5 * time.Second):
		if err := ad.StopScan(); err != nil {
			log.Printf("[GWIN] stop scan: %v", err)
		}
	}
	mu.Lock()
	defer mu.Unlock()
	hits := make([]ScanHit, 0, len(found))
	for _, h := range found {
		hits = append(hits, h)
	}
	sort.Slice(hits, func(i, j int) bool { return hits[i].Rssi > hits[j].Rssi })
	return hits, nil
}

// AppVersion 与 E-WIN 同源：仓库根 VERSION（由构建脚本嵌入则更佳，v1 直读）。
func (a *App) AppVersion() string {
	return "dev"
}
