package main

// G-WIN 应用内自动化缝（测试基建，非产品功能）：
// wails v2.16 的 Go 版 WebView2 loader 主动清零 WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
// （env_create.go preventEnvAndRegistryOverrides，防注册表/env 覆盖），外部 CDP 端口
// 无路可入。故走应用内缝：SMARTBLE_AUTOMATION_PORT 设置时在 127.0.0.1 起 TCP 行协议，
// eval 经 wails 事件转发页面 shim 执行并回执，screenshot 走 Win32 PrintWindow 抓本进程窗口。
// 生产/走查常规启动不设该 env → 服务器不启动，零行为差异。

import (
	"bufio"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"log"
	"net"
	"os"
	"strings"
	"sync"
	"time"
	"unsafe"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/sys/windows"
)

type automationCommand struct {
	ID   int64  `json:"id"`
	Kind string `json:"kind"`
	Expr string `json:"expr,omitempty"`
}

type automationReply struct {
	ID     int64       `json:"id"`
	OK     bool        `json:"ok"`
	Result interface{} `json:"result,omitempty"`
	Error  string      `json:"error,omitempty"`
}

type automationServer struct {
	app     *App
	mu      sync.Mutex
	pending map[int64]chan automationReply
}

func startAutomationIfRequested(a *App) {
	port := os.Getenv("SMARTBLE_AUTOMATION_PORT")
	if port == "" {
		return
	}
	s := &automationServer{app: a, pending: map[int64]chan automationReply{}}
	a.automation = s
	ln, err := net.Listen("tcp", "127.0.0.1:"+port)
	if err != nil {
		log.Printf("[GWIN] automation listen failed: %v", err)
		return
	}
	log.Printf("[GWIN] automation server on 127.0.0.1:%s", port)
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go s.serve(conn)
		}
	}()
}

func (s *automationServer) serve(conn net.Conn) {
	defer conn.Close()
	sc := bufio.NewScanner(conn)
	sc.Buffer(make([]byte, 0, 4*1024*1024), 4*1024*1024)
	enc := json.NewEncoder(conn)
	for sc.Scan() {
		var cmd automationCommand
		if err := json.Unmarshal(sc.Bytes(), &cmd); err != nil {
			_ = enc.Encode(automationReply{ID: cmd.ID, Error: "bad command: " + err.Error()})
			continue
		}
		switch cmd.Kind {
		case "ping":
			_ = enc.Encode(automationReply{ID: cmd.ID, OK: true, Result: "pong"})
		case "eval":
			ch := make(chan automationReply, 1)
			s.mu.Lock()
			s.pending[cmd.ID] = ch
			s.mu.Unlock()
			wruntime.EventsEmit(s.app.ctx, "automation:eval", map[string]interface{}{"id": cmd.ID, "expr": cmd.Expr})
			select {
			case r := <-ch:
				_ = enc.Encode(r)
			case <-time.After(90 * time.Second):
				s.mu.Lock()
				delete(s.pending, cmd.ID)
				s.mu.Unlock()
				_ = enc.Encode(automationReply{ID: cmd.ID, Error: "eval timeout (90s)"})
			}
		case "screenshot":
			b64, err := captureWindowPNG()
			if err != nil {
				_ = enc.Encode(automationReply{ID: cmd.ID, Error: err.Error()})
			} else {
				_ = enc.Encode(automationReply{ID: cmd.ID, OK: true, Result: b64})
			}
		default:
			_ = enc.Encode(automationReply{ID: cmd.ID, Error: "unknown kind: " + cmd.Kind})
		}
	}
}

// AutomationEnabled 页面 shim 探针：自动化服务器是否在跑。
func (a *App) AutomationEnabled() bool { return a.automation != nil }

// AutomationResult 页面 shim 的 eval 回执。
func (a *App) AutomationResult(id string, resultJSON string) bool {
	if a.automation == nil {
		return false
	}
	var key int64
	if _, err := fmt.Sscan(id, &key); err != nil {
		return false
	}
	a.automation.mu.Lock()
	ch, ok := a.automation.pending[key]
	delete(a.automation.pending, key)
	a.automation.mu.Unlock()
	if !ok {
		return false
	}
	var parsed struct {
		OK  bool        `json:"ok"`
		V   interface{} `json:"v"`
		Err string      `json:"err"`
	}
	if err := json.Unmarshal([]byte(resultJSON), &parsed); err != nil {
		parsed.OK = false
		parsed.Err = "bad result json: " + err.Error()
	}
	reply := automationReply{ID: key, OK: parsed.OK, Result: parsed.V, Error: parsed.Err}
	ch <- reply
	return true
}

// ─── Win32 抓窗（PrintWindow PW_RENDERFULLCONTENT，失败回退 BitBlt 屏拷）───

var (
	user32                  = windows.NewLazySystemDLL("user32.dll")
	procFindWindowW         = user32.NewProc("FindWindowW")
	procGetWindowThreadProc = user32.NewProc("GetWindowThreadProcessId")
	procGetWindowRect       = user32.NewProc("GetWindowRect")
	procPrintWindow         = user32.NewProc("PrintWindow")
	procGetWindowDC         = user32.NewProc("GetWindowDC")
	procSetWindowPos        = user32.NewProc("SetWindowPos")
	procSetForegroundWindow = user32.NewProc("SetForegroundWindow")
	procGetDC               = user32.NewProc("GetDC")
	procReleaseDC           = user32.NewProc("ReleaseDC")
	gdi32                   = windows.NewLazySystemDLL("gdi32.dll")
	procCreateCompatDC      = gdi32.NewProc("CreateCompatibleDC")
	procCreateCompatBitmap  = gdi32.NewProc("CreateCompatibleBitmap")
	procCreateDIBSection    = gdi32.NewProc("CreateDIBSection")
	procSelectObject        = gdi32.NewProc("SelectObject")
	procDeleteObject        = gdi32.NewProc("DeleteObject")
	procDeleteDC            = gdi32.NewProc("DeleteDC")
	procGetDIBits           = gdi32.NewProc("GetDIBits")
	procBitBlt              = gdi32.NewProc("BitBlt")
)

type winRect struct{ L, T, R, B int32 }

func captureWindowPNG() (string, error) {
	var lastErr error
	for i := 0; i < 3; i++ {
		b64, err := captureWindowPNGOnce()
		if err == nil {
			return b64, nil
		}
		lastErr = err
		time.Sleep(250 * time.Millisecond)
	}
	return "", lastErr
}

func captureWindowPNGOnce() (string, error) {
	hwnd, err := findOurWindow()
	if err != nil {
		return "", err
	}
	// 坑位账 #2：后台通知/其他窗口抢前后，未置顶抓图一律作废——抓前强制 TOPMOST
	_, _, _ = procSetWindowPos.Call(uintptr(hwnd), uintptr(^uintptr(0)), 0, 0, 0, 0, 0x0003) // HWND_TOPMOST, SWP_NOMOVE|SWP_NOSIZE
	_, _, _ = procSetForegroundWindow.Call(uintptr(hwnd))
	defer procSetWindowPos.Call(uintptr(hwnd), uintptr(^uintptr(1)), 0, 0, 0, 0, 0x0003) // HWND_NOTOPMOST
	time.Sleep(120 * time.Millisecond)
	var r winRect
	_, _, _ = procGetWindowRect.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&r)))
	w, h := int(r.R-r.L), int(r.B-r.T)
	if w <= 0 || h <= 0 {
		return "", errScreenshot("empty window rect")
	}

	screenDC, _, _ := procGetDC.Call(0)
	defer procReleaseDC.Call(0, screenDC)
	memDC, _, _ := procCreateCompatDC.Call(screenDC)
	defer procDeleteDC.Call(memDC)

	// CreateDIBSection（32bpp top-down）直接拿位图内存；GetDIBits 对
	// PrintWindow(PW_RENDERFULLCONTENT) 写入的合成内容在本机返回 0，不可依赖。
	type bmiHeader struct {
		Size          uint32
		Width         int32
		Height        int32
		Planes        uint16
		BitCount      uint16
		Compression   uint32
		SizeImage     uint32
		XPelsPerMeter int32
		YPelsPerMeter int32
		ClrUsed       uint32
		ClrImportant  uint32
	}
	var hdr bmiHeader
	hdr.Size = uint32(unsafe.Sizeof(hdr))
	hdr.Width = int32(w)
	hdr.Height = int32(-h) // 负高 = top-down
	hdr.Planes = 1
	hdr.BitCount = 32
	hdr.Compression = 0 // BI_RGB
	var bitsPtr unsafe.Pointer
	hbmRaw, _, dibErr := procCreateDIBSection.Call(memDC, uintptr(unsafe.Pointer(&hdr)), 0,
		uintptr(unsafe.Pointer(&bitsPtr)), 0, 0)
	if hbmRaw == 0 {
		return "", errScreenshot("CreateDIBSection failed: " + dibErr.Error())
	}
	defer procDeleteObject.Call(hbmRaw)
	_, _, _ = procSelectObject.Call(memDC, hbmRaw)

	// PrintWindow(…, PW_RENDERFULLCONTENT=2) 对 DirectComposition 内容可用
	pwOK, _, _ := procPrintWindow.Call(uintptr(hwnd), memDC, 2)
	if pwOK == 0 {
		// 回退：窗口 DC BitBlt（要求窗口未被遮挡）
		windowDC, _, _ := procGetWindowDC.Call(uintptr(hwnd))
		defer procReleaseDC.Call(uintptr(hwnd), windowDC)
		_, _, _ = procBitBlt.Call(memDC, 0, 0, uintptr(w), uintptr(h), windowDC, 0, 0, 0x00CC0020) // SRCCOPY
	}

	buf := unsafe.Slice((*byte)(bitsPtr), w*h*4)
	nonBlank := false
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		row := buf[y*w*4 : (y+1)*w*4]
		for x := 0; x < w; x++ {
			b, g, rr, a := row[x*4], row[x*4+1], row[x*4+2], row[x*4+3]
			if a == 0 {
				a = 255
			}
			if rr != 0 || g != 0 || b != 0 {
				nonBlank = true
			}
			img.SetRGBA(x, y, color.RGBA{R: rr, G: g, B: b, A: a})
		}
	}
	if !nonBlank {
		head := make([]string, 8)
		for i := 0; i < 8 && i < len(buf); i++ {
			head[i] = fmt.Sprintf("%02x", buf[i])
		}
		return "", errScreenshot(fmt.Sprintf("capture blank: pwOK=%v rect=%dx%d head=%s", pwOK != 0, w, h, strings.Join(head, " ")))
	}
	var pngBuf []byte
	wr := &sliceWriter{buf: &pngBuf}
	if err := png.Encode(wr, img); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(pngBuf), nil
}

type sliceWriter struct{ buf *[]byte }

func (w *sliceWriter) Write(p []byte) (int, error) {
	*w.buf = append(*w.buf, p...)
	return len(p), nil
}

type screenshotErr string

func (e screenshotErr) Error() string { return string(e) }
func errScreenshot(s string) error    { return screenshotErr(s) }

// findOurWindow 按标题找 SmartBLE 主窗并校验属主为本进程（坑位账 #1：僵尸窗口）。
func findOurWindow() (windows.HWND, error) {
	title, _ := windows.UTF16PtrFromString("SmartBLE")
	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(title)))
	if hwnd == 0 {
		return 0, errScreenshot("window 'SmartBLE' not found")
	}
	var pid uint32
	_, _, _ = procGetWindowThreadProc.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
	if uint32(os.Getpid()) != pid {
		return 0, errScreenshot("window belongs to another process (zombie?)")
	}
	return windows.HWND(hwnd), nil
}
