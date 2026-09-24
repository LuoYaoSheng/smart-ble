package main

import (
	"context"
	"encoding/hex"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"tinygo.org/x/bluetooth"
)

// App G-WIN 应用主体：E-WIN 主进程契约（apps/desktop/electron/src/main/index.js）
// 的 Go/t 小型镜像——方法返回 {success,...} 不 reject，事件名与负载逐一对齐。
type App struct {
	ctx    context.Context
	assets embed.FS

	// 测试自动化缝（SMARTBLE_AUTOMATION_PORT 门控；nil = 未启用，生产零差异）
	automation *automationServer

	mu            sync.Mutex
	adapter       *bluetooth.Adapter
	adapterFailed string // 非空 = 适配器不可用原因
	scanning      bool
	scanEntries   map[string]*scanEntry      // id -> 合并后的广播状态（ADV+RSP）
	scanHits      map[string]bluetooth.Address // id -> 地址（Connect 用）
	conns         map[string]*gattConn
	wbridge       *winBridge // Win32 广播边车（WIN-BRIDGE 同构，winbridge*.go）
	exitConfirmed bool
}

// scanEntry 按设备合并的广播状态（WinRT ADV/SCAN_RSP 双事件语义下对齐 noble 单事件）。
type scanEntry struct {
	rssi   int16
	name   string
	svcSet map[string]bool
}

// gattConn 一条已连接链路：特征值句柄表 + 服务发现缓存（断开失效）。
type gattConn struct {
	id         string
	device     bluetooth.Device
	mu         sync.Mutex
	chars      map[string]bluetooth.DeviceCharacteristic // key: 归一化完整 UUID
	services   []serviceData
	discovered bool
}

func (c *gattConn) lookupChar(serviceUUID, charUUID string) (bluetooth.DeviceCharacteristic, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	ch, ok := c.chars[charKey(charUUID)]
	return ch, ok
}

// ─── IPC 负载结构（JSON 字段名与 E-WIN 渲染层契约一致）───

type plainResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

type initResult struct {
	Success  bool   `json:"success"`
	Platform string `json:"platform"`
}

type hostInfo struct {
	Platform string `json:"platform"`
	Arch     string `json:"arch"`
}

type advPayload struct {
	ServiceUuids     []string `json:"serviceUuids"`
	ManufacturerData *string  `json:"manufacturerData"`
	Connectable      bool     `json:"connectable"`
	Scannable        bool     `json:"scannable"`
}

type discoveredDevice struct {
	ID              string      `json:"id"`
	Name            string      `json:"name"`
	LocalName       string      `json:"localName"`
	Rssi            int16       `json:"rssi"`
	Address         string      `json:"address"`
	ConnectionState string      `json:"connectionState"`
	Advertisement   *advPayload `json:"advertisement"`
}

type charData struct {
	UUID       string   `json:"uuid"`
	Name       string   `json:"name"`
	Properties []string `json:"properties"`
}

type serviceData struct {
	UUID            string     `json:"uuid"`
	Name            string     `json:"name"`
	Characteristics []charData `json:"characteristics"`
}

type servicesResult struct {
	Success  bool         `json:"success"`
	Error    string       `json:"error,omitempty"`
	Services []serviceData `json:"services"`
}

type servicesEvent struct {
	DeviceID string        `json:"deviceId"`
	Services []serviceData `json:"services"`
}

type valueResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	Value   string `json:"value,omitempty"`
}

type charValueChangedEvent struct {
	DeviceID          string `json:"deviceId"`
	ServiceUUID       string `json:"serviceUuid"`
	CharacteristicUUID string `json:"characteristicUuid"`
	Value             string `json:"value"`
}

// ─── UUID 工具：tinygo 全量 128 位小写 -> noble 展示口径（16 位短格式）───

const uuidBaseSuffix = "-0000-1000-8000-00805f9b34fb"

// uuidDisplay 16 位基础 UUID 投影为 4 位短格式（180a），其余保留完整小写。
func uuidDisplay(u bluetooth.UUID) string {
	s := u.String()
	if strings.HasPrefix(s, "0000") && strings.HasSuffix(s, uuidBaseSuffix) {
		return s[4:8]
	}
	return s
}

func uuidNorm(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "-", "")
	s = strings.ReplaceAll(s, ":", "")
	if strings.HasPrefix(s, "0x") {
		s = s[2:]
	}
	return s
}

func uuidExpand(norm string) string {
	switch len(norm) {
	case 4:
		return "0000" + norm + uuidBaseSuffix
	case 32:
		return norm[0:8] + "-" + norm[8:12] + "-" + norm[12:16] + "-" + norm[16:20] + "-" + norm[20:32]
	default:
		return norm
	}
}

// charKey 特征值查表键：任意输入（短/长/大小写/带横线）归一为完整小写带横线。
func charKey(s string) string {
	return uuidExpand(uuidNorm(s))
}

func splitPairs(s string) []string {
	out := make([]string, 0, len(s)/2)
	for i := 0; i+1 < len(s); i += 2 {
		out = append(out, s[i:i+2])
	}
	return out
}

// ─── 服务/特征中文名（E-WIN T07 映射表原样移植）───

var serviceNamesCN = map[string]string{
	"1800": "通用访问", "1801": "通用属性", "180A": "设备信息", "180F": "电池服务",
	"1812": "人机界面(HID)", "180D": "心率服务", "1809": "健康温度计", "181C": "用户数据",
}

var charNamesCN = map[string]string{
	"2A00": "设备名称", "2A01": "外观", "2A02": "隐私标志", "2A03": "重连地址",
	"2A04": "连接参数", "2A05": "服务变更", "2A19": "电池电量", "2A23": "系统标识符",
	"2A24": "型号", "2A25": "序列号", "2A26": "固件版本", "2A27": "硬件版本",
	"2A28": "软件版本", "2A29": "制造商", "2A37": "心率测量", "2A38": "身体传感器位置",
}

func uuidShortUpper(display string) string {
	up := strings.ToUpper(display)
	if len(up) == 4 {
		return up
	}
	if len(up) >= 8 {
		return up[4:8]
	}
	return up
}

func serviceDisplayName(u bluetooth.UUID) string {
	up := strings.ToUpper(uuidDisplay(u))
	if strings.HasPrefix(up, "4FAFC201") {
		return "OTA 升级服务"
	}
	if n, ok := serviceNamesCN[uuidShortUpper(up)]; ok {
		return n
	}
	return "未知服务"
}

func charDisplayName(u bluetooth.UUID) string {
	up := strings.ToUpper(uuidDisplay(u))
	if strings.HasPrefix(up, "BEB5") {
		return "OTA 控制"
	}
	if n, ok := charNamesCN[uuidShortUpper(up)]; ok {
		return n
	}
	return "未知特征值"
}

// WinRT GattCharacteristicProperties 位（蓝牙核心规范 3.3.3.1）
const (
	propWriteWithoutResponse = 0x04
	propWrite                = 0x08
	propNotify               = 0x10
	propIndicate             = 0x20
	propRead                 = 0x02
)

func propertyNames(bits uint32) []string {
	var out []string
	if bits&propRead != 0 {
		out = append(out, "read")
	}
	if bits&propWrite != 0 {
		out = append(out, "write")
	}
	if bits&propWriteWithoutResponse != 0 {
		out = append(out, "writeWithoutResponse")
	}
	if bits&propNotify != 0 {
		out = append(out, "notify")
	}
	if bits&propIndicate != 0 {
		out = append(out, "indicate")
	}
	return out
}

// ─── 应用生命周期 ───

func NewApp(assets embed.FS) *App {
	return &App{
		assets:      assets,
		scanEntries: map[string]*scanEntry{},
		scanHits:    map[string]bluetooth.Address{},
		conns:       map[string]*gattConn{},
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	startAutomationIfRequested(a)
}

// ensureAdapter 惰性取适配器，注册断连监听（仅一次）。
// WinRT 后端：ConnectionStatusChanged -> SetConnectHandler(connected=false)。
func (a *App) ensureAdapter() (*bluetooth.Adapter, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.adapter != nil {
		return a.adapter, nil
	}
	if a.adapterFailed != "" {
		return nil, fmt.Errorf("%s", a.adapterFailed)
	}
	ad := bluetooth.DefaultAdapter
	if ad == nil {
		a.adapterFailed = "no default bluetooth adapter"
		return nil, errors.New(a.adapterFailed)
	}
	if err := ad.Enable(); err != nil {
		a.adapterFailed = err.Error()
		return nil, err
	}
	ad.SetConnectHandler(func(dev bluetooth.Device, connected bool) {
		if connected {
			return
		}
		// 意外断链：清表 + 发事件（仅当链路仍在册，避免与主动断开重复发）
		id := dev.Address.String()
		a.mu.Lock()
		_, inMap := a.conns[id]
		delete(a.conns, id)
		a.mu.Unlock()
		if !inMap {
			return
		}
		log.Printf("[GWIN] unexpected disconnect: %s", id)
		wruntime.EventsEmit(a.ctx, "ble:deviceDisconnected", map[string]string{"id": id})
	})
	a.adapter = ad
	return ad, nil
}

func (a *App) getConn(deviceID string) *gattConn {
	a.mu.Lock()
	defer a.mu.Unlock()
	if c, ok := a.conns[deviceID]; ok {
		return c
	}
	// E-WIN 口径：无 id 时回退第一条已连接设备
	for _, c := range a.conns {
		return c
	}
	return nil
}

// shutdownBLE E-WIN before-quit 口径：停广播（边车）→ 停扫描 → 断开全部链路。
func (a *App) shutdownBLE() {
	a.killWinBridge()
	if a.adapter == nil {
		return
	}
	_ = a.adapter.StopScan()
	a.mu.Lock()
	conns := make([]*gattConn, 0, len(a.conns))
	for _, c := range a.conns {
		conns = append(conns, c)
	}
	a.conns = map[string]*gattConn{}
	a.mu.Unlock()
	for _, c := range conns {
		_ = c.device.Disconnect()
	}
}

// ─── IPC：平台与版本 ───

// HostPlatform E-WIN preload 暴露的 window.platform 同源（win32 口径）。
func (a *App) HostPlatform() hostInfo {
	p := runtime.GOOS
	if p == "windows" {
		p = "win32"
	}
	return hostInfo{Platform: p, Arch: runtime.GOARCH}
}

// GetAppVersion F027 版本单源：仓库根 VERSION 由前端构建拷入 dist 后 embed 回读。
func (a *App) GetAppVersion() string {
	if b, err := fs.ReadFile(a.assets, "frontend/dist/VERSION"); err == nil {
		return strings.TrimSpace(string(b))
	}
	return "dev"
}

// ─── IPC：初始化与扫描 ───

func (a *App) Init() initResult {
	r := initResult{Platform: a.HostPlatform().Platform}
	if _, err := a.ensureAdapter(); err != nil {
		log.Printf("[GWIN] init failed: %v", err)
		return r
	}
	r.Success = true
	// E-WIN：init 后主动发当前态，渲染层重载后二次 init 也补发（防状态芯片卡「初始化中…」）
	wruntime.EventsEmit(a.ctx, "ble:stateChanged", map[string]string{"state": "poweredOn"})
	return r
}

func (a *App) StartScan() plainResult {
	ad, err := a.ensureAdapter()
	if err != nil {
		return plainResult{Error: "BLE module not loaded: " + err.Error()}
	}
	// 已在扫描：先停再重扫（E-WIN noble 重启扫描口径）
	if a.stopScanInternal(ad) {
		// 等待扫描 goroutine 收尾
		time.Sleep(100 * time.Millisecond)
	}
	a.mu.Lock()
	a.scanEntries = map[string]*scanEntry{}
	a.scanHits = map[string]bluetooth.Address{}
	a.scanning = true
	a.mu.Unlock()

	go func() {
		err := ad.Scan(func(_ *bluetooth.Adapter, d bluetooth.ScanResult) {
			id := d.Address.String()
			a.mu.Lock()
			// WinRT 把 ADV 与 SCAN_RSP 作为两个独立事件投递（noble 是合并单事件）：
			// 按设备合并广播状态——RSSI 变化、名字补齐、服务 UUID 增集任一命中才重发，
			// 否则扫描响应里的名字/服务会被「同 id 同 RSSI」去重吞掉。
			e, ok := a.scanEntries[id]
			if !ok {
				e = &scanEntry{svcSet: map[string]bool{}}
				a.scanEntries[id] = e
			}
			changed := false
			if d.RSSI != e.rssi {
				e.rssi = d.RSSI
				changed = true
			}
			if ln := d.LocalName(); ln != "" && ln != e.name {
				e.name = ln
				changed = true
			}
			for _, u := range d.ServiceUUIDs() {
				k := charKey(u.String())
				if !e.svcSet[k] {
					e.svcSet[k] = true
					changed = true
				}
			}
			if !changed {
				a.mu.Unlock()
				return
			}
			a.scanHits[id] = d.Address
			name := e.name
			svcs := make([]string, 0, len(e.svcSet))
			for k := range e.svcSet {
				svcs = append(svcs, uuidDisplayFromKey(k))
			}
			a.mu.Unlock()

			payload := &discoveredDevice{
				ID:              id,
				Name:            name,
				LocalName:       name,
				Rssi:            e.rssi,
				Address:         id,
				ConnectionState: "disconnected",
				Advertisement: &advPayload{
					ServiceUuids: svcs,
					Connectable:  true,
					Scannable:    true,
				},
			}
			if els := d.ManufacturerData(); len(els) > 0 {
				h := hex.EncodeToString(els[0].Data)
				payload.Advertisement.ManufacturerData = &h
			}
			wruntime.EventsEmit(a.ctx, "ble:deviceDiscovered", payload)
		})
		a.mu.Lock()
		a.scanning = false
		a.mu.Unlock()
		if err != nil {
			log.Printf("[GWIN] scan loop ended: %v", err)
			wruntime.EventsEmit(a.ctx, "ble:warning", map[string]string{"message": err.Error()})
		}
	}()
	return plainResult{Success: true}
}

// uuidDisplayFromKey 归一化完整键 -> 展示短格式（16 位基础 UUID 压回 4 位）。
func uuidDisplayFromKey(key string) string {
	if strings.HasPrefix(key, "0000") && strings.HasSuffix(key, uuidBaseSuffix) {
		return key[4:8]
	}
	return key
}

// stopScanInternal 返回是否确实发生了停止。
func (a *App) stopScanInternal(ad *bluetooth.Adapter) bool {
	a.mu.Lock()
	was := a.scanning
	a.mu.Unlock()
	if !was {
		return false
	}
	if err := ad.StopScan(); err != nil {
		log.Printf("[GWIN] stop scan: %v", err)
	}
	return true
}

func (a *App) StopScan() plainResult {
	if a.adapter == nil {
		return plainResult{Success: false}
	}
	a.stopScanInternal(a.adapter)
	return plainResult{Success: true}
}

// ─── IPC：连接 ───

func (a *App) Connect(deviceID string) plainResult {
	ad, err := a.ensureAdapter()
	if err != nil {
		return plainResult{Error: "BLE module not loaded: " + err.Error()}
	}
	a.mu.Lock()
	addr, ok := a.scanHits[deviceID]
	if _, dup := a.conns[deviceID]; dup {
		a.mu.Unlock()
		return plainResult{Success: true}
	}
	a.mu.Unlock()
	if !ok {
		return plainResult{Error: "Device not found"}
	}
	// E-WIN：连接前先停扫描（WinRT 中心态互斥）
	a.StopScan()

	type connectOutcome struct {
		dev bluetooth.Device
		err error
	}
	ch := make(chan connectOutcome, 1)
	go func() {
		dev, err := ad.Connect(addr, bluetooth.ConnectionParams{})
		ch <- connectOutcome{dev, err}
	}()
	select {
	case o := <-ch:
		if o.err != nil {
			log.Printf("[GWIN] connect %s failed: %v", deviceID, o.err)
			return plainResult{Error: o.err.Error()}
		}
		a.mu.Lock()
		a.conns[deviceID] = &gattConn{id: deviceID, device: o.dev, chars: map[string]bluetooth.DeviceCharacteristic{}}
		a.mu.Unlock()
		wruntime.EventsEmit(a.ctx, "ble:deviceConnected", map[string]string{"id": deviceID})
		return plainResult{Success: true}
	case <-time.After(15 * time.Second):
		// WinRT 迟到连接兜底：完成后立即断开，不留幽灵链路
		go func() {
			if o := <-ch; o.err == nil {
				_ = o.dev.Disconnect()
			}
		}()
		return plainResult{Error: "Connection timeout (15s)"}
	}
}

func (a *App) Disconnect(deviceID string) plainResult {
	c := a.getConn(deviceID)
	if c == nil {
		return plainResult{Success: true} // E-WIN：不在册视为成功
	}
	// 先出册再断开：断连监听不会再补发事件（单次事件口径）
	a.mu.Lock()
	delete(a.conns, c.id)
	a.mu.Unlock()
	if err := c.device.Disconnect(); err != nil {
		return plainResult{Error: err.Error()}
	}
	wruntime.EventsEmit(a.ctx, "ble:deviceDisconnected", map[string]string{"id": c.id})
	return plainResult{Success: true}
}

// ─── IPC：服务发现 ───

func (a *App) DiscoverServices(deviceID string) servicesResult {
	empty := []serviceData{}
	c := a.getConn(deviceID)
	if c == nil {
		return servicesResult{Error: "No device connected", Services: empty}
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.discovered {
		// 缓存命中：重发快照让渲染端状态自愈（E-WIN 同口径，不重走 GATT 发现）
		wruntime.EventsEmit(a.ctx, "ble:servicesDiscovered", servicesEvent{DeviceID: c.id, Services: c.services})
		return servicesResult{Success: true, Services: c.services}
	}

	svcs, err := c.device.DiscoverServices(nil)
	if err != nil {
		return servicesResult{Error: err.Error(), Services: empty}
	}
	c.services = make([]serviceData, 0, len(svcs))
	for _, svc := range svcs {
		c.services = append(c.services, serviceData{
			UUID:            uuidDisplay(svc.UUID()),
			Name:            serviceDisplayName(svc.UUID()),
			Characteristics: []charData{},
		})
	}
	// 先发骨架（特征值到达前出结构，E-WIN 渐进口径）
	wruntime.EventsEmit(a.ctx, "ble:servicesDiscovered", servicesEvent{DeviceID: c.id, Services: c.services})

	for i, svc := range svcs {
		chars, err := svc.DiscoverCharacteristics(nil)
		if err != nil {
			log.Printf("[GWIN] characteristic discovery error for %s: %v", uuidDisplay(svc.UUID()), err)
			continue
		}
		for _, ch := range chars {
			cu := ch.UUID()
			c.chars[charKey(cu.String())] = ch
			c.services[i].Characteristics = append(c.services[i].Characteristics, charData{
				UUID:       uuidDisplay(cu),
				Name:       charDisplayName(cu),
				Properties: propertyNames(ch.Properties()),
			})
		}
		wruntime.EventsEmit(a.ctx, "ble:servicesDiscovered", servicesEvent{DeviceID: c.id, Services: c.services})
	}
	c.discovered = true
	return servicesResult{Success: true, Services: c.services}
}

// ─── IPC：特征值读写与通知 ───

func (a *App) ReadCharacteristic(deviceID, serviceUUID, charUUID string) valueResult {
	c := a.getConn(deviceID)
	if c == nil {
		return valueResult{Error: "No device connected"}
	}
	ch, ok := c.lookupChar(serviceUUID, charUUID)
	if !ok {
		return valueResult{Error: "Characteristic not found"}
	}
	buf := make([]byte, 512)
	n, err := ch.Read(buf)
	if err != nil {
		return valueResult{Error: err.Error()}
	}
	hexv := strings.Join(splitPairs(hex.EncodeToString(buf[:n])), " ")
	wruntime.EventsEmit(a.ctx, "ble:characteristicValueChanged", charValueChangedEvent{
		DeviceID: c.id, ServiceUUID: serviceUUID, CharacteristicUUID: charUUID, Value: hexv,
	})
	return valueResult{Success: true, Value: hexv}
}

// WriteCharacteristic 写弹窗主路径：带响应写（PARITY-007 铁口径——
// Windows 栈 writeNoResponse 字节腐败，E/T 1.0.2 起固定带响应）。
func (a *App) WriteCharacteristic(deviceID, serviceUUID, charUUID, data, format string) plainResult {
	c := a.getConn(deviceID)
	if c == nil {
		return plainResult{Error: "No device connected"}
	}
	ch, ok := c.lookupChar(serviceUUID, charUUID)
	if !ok {
		return plainResult{Error: "Characteristic not found"}
	}
	var payload []byte
	switch format {
	case "utf8":
		payload = []byte(data)
	default: // 'hex'（WriteDialog 契约默认）
		b, err := hex.DecodeString(strings.ReplaceAll(strings.ReplaceAll(data, " ", ""), "\t", ""))
		if err != nil {
			return plainResult{Error: "invalid hex: " + err.Error()}
		}
		payload = b
	}
	if _, err := ch.Write(payload); err != nil {
		return plainResult{Error: err.Error()}
	}
	return plainResult{Success: true}
}

// WriteRaw OTA 分块等原始字节写（data 为 base64，桥接层从字节数组转换）。
func (a *App) WriteRaw(deviceID, serviceUUID, charUUID string, data []byte, withoutResponse bool) plainResult {
	c := a.getConn(deviceID)
	if c == nil {
		return plainResult{Error: "No device connected"}
	}
	ch, ok := c.lookupChar(serviceUUID, charUUID)
	if !ok {
		return plainResult{Error: "Characteristic not found"}
	}
	var err error
	if withoutResponse {
		_, err = ch.WriteWithoutResponse(data)
	} else {
		_, err = ch.Write(data)
	}
	if err != nil {
		return plainResult{Error: err.Error()}
	}
	return plainResult{Success: true}
}

func (a *App) NotifyCharacteristic(deviceID, serviceUUID, charUUID string, notify bool) plainResult {
	c := a.getConn(deviceID)
	if c == nil {
		return plainResult{Error: "No device connected"}
	}
	ch, ok := c.lookupChar(serviceUUID, charUUID)
	if !ok {
		return plainResult{Error: "Characteristic not found"}
	}
	if notify {
		err := ch.EnableNotifications(func(buf []byte) {
			wruntime.EventsEmit(a.ctx, "ble:characteristicValueChanged", charValueChangedEvent{
				DeviceID: c.id, ServiceUUID: serviceUUID, CharacteristicUUID: charUUID,
				Value: strings.Join(splitPairs(hex.EncodeToString(buf)), " "),
			})
		})
		if err != nil {
			return plainResult{Error: err.Error()}
		}
		return plainResult{Success: true}
	}
	// 退订：NotificationModeDisable 会移除 ValueChanged 处理器（E-WIN unsubscribe 口径）
	if err := ch.EnableNotificationsWithMode(bluetooth.NotificationModeDisable, nil); err != nil {
		return plainResult{Error: err.Error()}
	}
	return plainResult{Success: true}
}

// ─── IPC：广播（win32=WIN-BRIDGE 边车真发射；其他平台正典降级，文案对齐 E-WIN）───

func (a *App) StartAdvertising(name string, serviceUuids []string, manufacturerId string, manufacturerData string, includeName bool) plainResult {
	if runtime.GOOS == "windows" {
		// WIN-BRIDGE：WinRT 仅厂商块可发（LocalName/ServiceUuids 被平台拒绝，
		// 见 20260921-XDEV-BROADCAST 平台事实）——name/uuid 参数在此路径忽略。
		b, err := a.ensureWinBridge()
		if err != nil {
			return plainResult{Error: err.Error()}
		}
		idStr := strings.TrimPrefix(manufacturerId, "0x")
		if idStr == "" {
			idStr = "0001"
		}
		v, err := strconv.ParseUint(idStr, 16, 16)
		if err != nil || v == 0 {
			v = 1
		}
		data := []byte(manufacturerData)
		if len(data) == 0 {
			data = []byte("BLE")
		}
		nums := make([]int, len(data))
		for i, c := range data {
			nums[i] = int(c)
		}
		if err := b.command("start", map[string]any{"companyId": v, "data": nums}); err != nil {
			return plainResult{Error: err.Error()}
		}
		// 首次调用含边车冷启动（PS 起 + csc 首编译 ~3s），超时余量放宽
		return b.waitEvent("started", 8*time.Second)
	}
	p := a.HostPlatform().Platform
	return plainResult{Error: fmt.Sprintf("Advertising is not supported on %s. True peripheral mode requires native apps (e.g., macOS SmartBLE) or Linux with bleno.", p)}
}

func (a *App) StopAdvertising() plainResult {
	if runtime.GOOS == "windows" {
		b, err := a.ensureWinBridge()
		if err != nil {
			return plainResult{Error: err.Error()}
		}
		if err := b.command("stop", nil); err != nil {
			return plainResult{Error: err.Error()}
		}
		return b.waitEvent("stopped", 5*time.Second)
	}
	p := a.HostPlatform().Platform
	return plainResult{Error: fmt.Sprintf("Advertising is not supported on %s", p)}
}

// ─── IPC：退出确认（10_platform §4）───

// ConfirmExit 渲染层模态「退出」回执：置旗放行 + 清理 BLE + 退出。
func (a *App) ConfirmExit(quit bool) bool {
	if !quit {
		return true // 「继续使用」：渲染层直接关模态，不回执（E-WIN 同口径）
	}
	a.exitConfirmed = true
	a.shutdownBLE()
	wruntime.Quit(a.ctx)
	return true
}

// beforeClose Wails OnBeforeClose：未确认时拦截原生 X/Alt+F4，
// 发 app:confirm-exit 让渲染层弹正典模态。
func (a *App) beforeClose(ctx context.Context) bool {
	if a.exitConfirmed {
		return false // 放行关闭
	}
	a.mu.Lock()
	connected := len(a.conns)
	a.mu.Unlock()
	log.Printf("[GWIN] close requested -> exit confirm (connected=%d)", connected)
	wruntime.EventsEmit(ctx, "app:confirm-exit", map[string]int{"connected": connected})
	return true // 拦截，等渲染层回执
}

func (a *App) onShutdown(ctx context.Context) {
	a.shutdownBLE()
}
