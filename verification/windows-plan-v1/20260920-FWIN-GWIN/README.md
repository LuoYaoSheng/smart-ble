# 20260920 · F-WIN / G-WIN / Q-WIN 三壳立项 + 图标统一 + 流程韧性（WIN-012~016）

## 证据清单

### flutter/（F-WIN）
- `fwin-01-scan-debug.png` — Debug 首屏（扫描页正典渲染，1200×900/SmartBLE）
- `fwin-02-scan-realdevice.png` — **真机扫描**：附近设备 3 台 =
  SHID-00000001(-45dBm) / REDMI NOTE 12(-67) / HUAWEI FREEBUDS 4(-73)；
  winrt 0.0.20 + FBP 1.36.8 + interface 9.0.3(override) 端到端工作
- `fwin-03-exit-confirm.png` — 关窗拦截 → 退出确认模态（dwin-quit 正典文案）
- `fwin_drive.py` — 取证驱动（PID 定窗 + TOPMOST + 真实鼠标 + 色簇找钮）

### qt/（Q-WIN）
- `qwin-01-initial.png` — 首屏（PySide6 正典扫描页 + 底部四 Tab）
- `qwin-02-exit-confirm.png` — WM_CLOSE 后窗口存活（closeEvent 拦截实证）
  + 退出确认对话框（正典文案，busy/非 busy 两态文案同 E/T/V/F）

### wails/（G-WIN）
- `gwin-01-initial.png` — WebView2 就绪后首屏（正典 kicker/标题/状态/钮）
- `gwin-02-scan.png` — 扫描触发后（UI diff=270880，tinygo bluetooth WinRT 扫描）

### 图标（WIN-015）
- 正典源：`apps/desktop/electron/public/brand/icon.png`（512×512）
- 分发脚本：`tools/unify_icons.py`（幂等，六壳 .ico 字节级一致
  sha256=421397669117d945…，终检失败即退出码 1）

## 坑位账（本日 UI 自动化血泪，后续窗口必读）

1. **僵尸窗口**：多轮驱动漏杀旧 smart_ble.exe，`FindWindowW("SmartBLE")`
   按标题抓到旧实例 → 一切点击/截图对象错误。**必须按「本进程 PID +
   EnumWindows」定窗**（fwin_drive.py v6 口径）。
2. **前台被抢**：后台任务通知会把 ZCode 客户端弹到前台盖住 app；全屏
   搜狗浮窗也会吃输入。**自家窗口 SetWindowPos(HWND_TOPMOST) 后再操作**；
   置顶前抓到的图一律作废。
3. **PrintWindow 对 Flutter GPU 内容输出垃圾帧**（色带）——不可用于
   Flutter 壳取证，回到 TOPMOST + ImageGrab。
4. **DPI**：本机 2560×1600@150%；DPI-unaware python 里 GetWindowRect/
   ImageGrab/SetCursorPos 全在逻辑坐标系内自洽，真实鼠标注入无需手工
   换算（PostMessage 直投才需 ×scale 物理坐标）。
5. **Read 工具 CDN 缓存串图**：同名/相似文件二次上传可能返回旧 URL
   内容——截图结论以像素探针为准，视觉仅作旁证。
6. **多实例 BLE 适配器污染**：多个壳实例并存时 WinRT 适配器被抢占，
   新实例 `adapterState` 初始化失败 → 扫描钮 disabled（灰）。排障前先
   `taskkill //IM smart_ble.exe //F` 清场（本次 v6 假故障根因）。
7. **暗/亮主题随系统切换**：色簇找钮必须双谓词（暗色=浅蓝图标药丸，
   亮色=蓝渐变实心），或按「效果验证」（点击后全页 diff）闭环。
8. **Wails 首帧未渲染 CSS**：窗口创建后立即抓图得到无样式白页，需等
   WebView2 Environment 就绪（日志 `Environment created successfully`）。
9. **go install 到 `C:\Program Files\Go\bin` 需提权会静默失败**：
   `GOBIN="$(go env GOPATH)/bin" go install …`；且 `cmd | tail; echo $?`
   拿到的是 tail 的退出码，不是 cmd 的。

## 环境不变量确认

- ESP32-S3 SHID-00000001（fw 1.2.0）持续广播中，未触碰固件/NVS（WIN-007 环境保留）。
- 未写 INPUT 特征（SHID-FW-LOCK-001 红线）；本日全部操作只读广播。
