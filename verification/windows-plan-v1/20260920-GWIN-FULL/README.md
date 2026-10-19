# 20260920-GWIN-FULL：WIN-013 G-WIN 续建收口——E-WIN 前端全页镜像 + 生命周期正典 + 全页走查

## 结论

**23/23 全绿，flavor=real（真机全程）**，渲染层 console 错误 0，最终经正典退出路径
（模态确认 → `confirmExit(true)` → 停扫描/断链路 → 进程干净退出）。

- 驱动：`gwin-fullui-walk.mjs`（automation seam 版，nvm v23.8.0 node 运行）
- 结果：`gwin-fullui-walk.json`（steps 逐条断言 + 原始返回）
- 截图：`01-boot.png` … `13-exit-final.png`（Win32 PrintWindow 实窗捕获，1800×1350 物理）
- 缝冒烟：`seam-smoke.png`（automation seam 首次截图验证）

## 走查清单（E-WIN 16/16 正典步骤镜像 + G-WIN 专有断言）

| 步骤 | 结果 | 关键证据 |
|---|---|---|
| boot/标题/TabBar | ✓ | 4 Tab，广播隐藏（案A，与 E-WIN 一致） |
| 桥接契约+embed 版本 | ✓ | `getAppVersion()`=1.0.5（仓库根 VERSION 经 dist embed 回读）；platform=win32/amd64 |
| P008 win32 广播降级 | ✓ | `startAdvertising` 按正典口径返回 "not supported on win32…" |
| P001 真机扫描 | ✓ | 「扫描完成 · 发现 N 台」；SHID-00000001 卡「疑似 Smart HID · 弱匹配」（真机 10:B4:1D:CD:23:8E） |
| P002 向导表单态 | ✓ | 真机自动连接 + 身份读取（HID-00000001 fw=1.2.0）+ 步骤条 + 下发按钮令牌门（无 token 禁用） |
| P002 二维码弹层 | ✓ | 摄像头取景中（WebView2 getUserMedia 实取景，5s 竞速超时兜底在位） |
| P002 粘贴兜底 | ✓ | 非法码拒绝（错误行）；合法 `shid://pair` 回填 hub=192.168.1.8:17892 + 令牌门点亮 |
| P002 返回清会话 | ✓ | 未下发返回直接回列表、无离开模态（DESKTOP-LEAVE-001 同款修复经镜像继承） |
| P006 GATT 树 | ✓ | 服务/特征/属性 chips + 动作 [read,notify,write,read,notify]（与 E-WIN 真机一致） |
| P006 特征读（真机） | ✓ | INFO 读取成功，identity JSON 解析 `state=unprovisioned` |
| P006 监听往返 | ✓ | 开始监听 → 停止监听（STATUS notify） |
| P007 已连接页 | ✓ | 计数 1 / 断开全部 |
| 退出确认（busy） | ✓ | WM_CLOSE 拦截 → 模态「有 BLE 会话正在运行… 当前连接设备：1 台」→ 继续使用存活 |
| 断开全部 | ✓ | 计数归零 |
| mock 全 UI（写入弹窗等） | ✓ | `?mock=true` 桥旁路；注入设备卡/筛选面板重置/写弹窗三模式/广播页/关于/版本页 |
| 最终退出（常驻文案） | ✓ | 非 busy「桌面端为常驻运行。确认退出？」→ 退出 → 进程退出 |

P003/P005 详情/诊断页需 ControlHub 配网会话，不可达=预期（与 WIN-007 BLOCKED 同源，同 E/T 口径）。

## 本轮实现（apps/desktop/wails）

- **前端全页镜像**：`frontend/src/` = E-WIN `public/` 字节级镜像（diff 验证 IDENTICAL）
  + 两处新增：`wails-bridge.js`（E-WIN preload 的 `window.bleAPI` 契约 → Wails Go 绑定；
  `?mock=true` 时旁路让 app.js 自带 E2E polyfill 生效）与 `automation-shim.js`（测试缝）。
  构建改纯静态复制（`build.mjs`：src → dist + 仓库根 VERSION 单源注入），不经打包器转换。
- **Go 后端**（`app.go`）：E-WIN 主进程契约镜像——流式扫描事件/连接/服务发现（骨架+渐进）/
  读/带响应写（PARITY-007 铁口径）/writeRaw/notify 订退订/广播 win32 正典降级/中文服务名映射/
  UUID noble 短格式投影（16 位压 4 位）+ 任意写法归一化查表。
- **生命周期正典**：`OnBeforeClose` 拦截 X/Alt+F4 → `app:confirm-exit` 事件 → 渲染层正典模态 →
  `ConfirmExit(true)` → 停扫描+断全部 → `runtime.Quit`。busy=连接‖广播（win32 广播恒否，计数=连接）。
- **断连事件**：`Adapter.SetConnectHandler`（WinRT ConnectionStatusChanged）→ `ble:deviceDisconnected`
  单次事件口径（先出册再断开，防主动/意外双发）。
- **automation.go 测试基建**（env 门控 `SMARTBLE_AUTOMATION_PORT`，生产零差异）：
  127.0.0.1 TCP 行协议（eval/screenshot/ping），eval 经 wails 事件到页面 shim，
  截图 Win32 PrintWindow(PW_RENDERFULLCONTENT)+CreateDIBSection，抓前强制 TOPMOST。

## 本轮发现（真缺陷 1 + 环境事实 2）

### GWIN-DEF-001（P1，已修）：扫描响应里的设备名/服务被去重吞掉
- 现象：SHID 卡多数轮次显示「未命名 BLE · 238E」，E-WIN（noble-winrt）同机稳定出
  SHID-00000001——弱匹配失败 → 配网入口消失。
- 根因：WinRT 把 ADV 与 SCAN_RSP 作为**两个独立事件**投递；noble 合并为单事件。Go 侧
  「同 id 同 RSSI 不重发」去重把扫描响应事件（带名字/服务 UUID）原样吞掉。
- 修复：按设备合并广播状态（RSSI 变化 ∨ 名字补齐 ∨ 服务 UUID 增集才重发）。
  修复后稳定复现 E-WIN 卡形态（名字+弱匹配）。

### OBS-1：tinygo WinRT Uncached 服务枚举（未配对会话）仅回 1 个服务
- 独立探针复现（延迟 1.5s + 重试不变）：仅 9f1d1001（配网服务，INFO/INPUT/STATUS 三特征）。
  E-WIN noble-winrt（缓存枚举）可见 2+（含 180A）。疑未配对会话下需加密句柄截断
  Uncached 发现。**动作面恰好对齐**（read/notify/write×5 与 E-WIN 真机一致，本行走查
  即在此服务面完成），留后续配对窗口回验。

### OBS-2：SHID LocalName 在 WinRT 双事件下靠合并修复（见 DEF-001），产品语义无损

## 坑位账（本日新增，后续 G-WIN 窗口必读）

1. **wails v2.16 封死外部 CDP**：Go 版 WebView2 loader 主动清零
   `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`（env_create.go `preventEnvAndRegistryOverrides`），
   `-tags native_webview2loader` 同样被封——外部 CDP 端口无路可入，走查走应用内
   automation seam（`SMARTBLE_AUTOMATION_PORT`）。
2. **spawn windowsHide:true 会让 wails 主窗全程不显示**：DOM 全活、断言全过，但
   PrintWindow 全黑——截图缝的 blank 探针 + 「bash 直启正常/驱动 spawn 全黑」二分定位。
3. **PrintWindow 抓 WebView2 需 TOPMOST**（坑位账 #2 延伸）：SetForegroundWindow 后仍有
   偶发首拍空白，capture 已带 3×250ms 重试。GetDIBits 对 PrintWindow 写入的合成内容
   返回 0（lasterr=成功），必须用 CreateDIBSection 直读位图内存。
4. **`wails build` && 后台链竞态**：`build && launch &` 把整链后台化，进程迟到启动占口
   → 下轮 ECONNREFUSED/僵尸——launch 永远单独一步。
5. **mock 导航用 pushState+reload**：直接 `location.href` 同页带参被 WebView2 拒绝。
6. **mock 多态缺 `onConfirmExit/confirmExit`**（polyfill 不含）：退出确认类断言须在
   真实桥态下做（驱动末段先 pushState('/')+reload 切回）。
7. **automation eval 回执字段**：shim 发 `{ok,v,err}`，Go 侧要按这三个键解，别复用
   应答结构体（首版 v 键丢失即此）。

## 环境不变量

- ESP32-S3 SHID-00000001（fw 1.2.0，10:B4:1D:CD:23:8E）全程在广播，未触碰固件/NVS。
- 未写 INPUT 特征（SHID-FW-LOCK-001 红线）：P006 仅读 + notify；写入弹窗仅在 mock 相验证。
- P002 向导走到令牌门为止，未下发配网载荷。
