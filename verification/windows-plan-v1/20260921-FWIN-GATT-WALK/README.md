# 20260921-FWIN-GATT-WALK · F-WIN Windows 侧 GATT 真机走查补证

> 触发：用户指令「继续」→ 终报 §7 新登记缺口（F-WIN 无 Windows 侧 GATT 连接链真机取证，FBP winrt 为独立原生路径）。
> 基线：`5737759`。exe = `apps/flutter/build/windows/x64/runner/Release/smart_ble.exe`。
> **铁律遵守：全程零写入**（不触碰任何「写入」按钮；INPUT 特征 SHID-FW-LOCK-001）。走查后 bleak 只读探针复核设备无恙。

## 1. 新鲜度

- 源码最新 `lib/main.dart` 11:32:03（a1215a8 内容）< `data/app.so` 11:33:56（Dart AOT）→ 构建树含全部源改动。
- 坑：`smart_ble.exe` 桩 mtime 09:54 **不代表** Dart 层新鲜度（Dart 改动只重编 `data/app.so`）——新鲜度判定必须看整个 Release 目录。
- 产物 `FWIN-…-win64.zip`（d37d736c，P4 打包自此树）未重建、哈希不变。

## 2. 走查链（对设备 SHID-00000001，fw 1.2.0，未配对态）

| 步骤 | 结果 | 证据 |
|---|---|---|
| 启动/认窗/置顶 | dpr 1.50，frame 1780x1340 | 00-initial |
| 扫描 | SHID 卡恒居首（弱匹配双 chip：蓝「配置」+灰「连接」） | 01-scan-results |
| 尝试 1：扫描进行中点「连接」 | **已连接 ✓ 但 `发现 0 个服务`**（空态警示条） | 02/03/04 |
| 断开→**停扫**→重连（尝试 2） | 已连接 ✓ `发现 1 个服务`（9F1D1001 / 3 特征值） | 05/06 |
| 展开服务 tile | 3 特征行，动作图标 = 1002[读+通知] / 1003[写，未触碰] / 1004[读+通知] | 07 + crop-icons-3x |
| 读 INFO（1002） | **130B 完整身份 JSON**（smart-hid/protocol 1.0/HID-00000001/fw 1.2.0/unprovisioned），与 Q 探针逐字节同构 | 08 |
| 订阅 STATUS（1004） | 「通知已启用」，行图标转绿 + Notifying chip；未配对 0 推送=已知口径 | 09/10 |
| 导出（剪贴板） | 858 字符全量文本（设备信息+服务摘要+操作日志，两次尝试同卷） | clipboard-export.txt |
| 退订 STATUS | 行图标转灰；**随后页面弹回扫描列表**（见观察项 O-2） | 11/12/13 |
| WM_CLOSE | 非 busy ⇒ 不弹退出确认模态，直接退出；进程核销（OpenProcess err 87） | 14 |
| 走查后 bleak 复核 | 扫描 -32dBm、连接 MTU 256、1svc/3char、INFO 130B 同构、订阅/退订正常 ⇒ **设备无恙** | bleak-postcheck.txt |

驱动：`fwin_gatt_walk.py`（子命令式：launch/shot/wclick/clip/close；机制沿用 `probe_f_pages.py` 坑位账：SetProcessDPIAware+GetDpiForWindow 真实 dpr、DWM EXTENDED_FRAME_BOUNDS、all_screens、CREATE_NO_WINDOW、PID 树认窗、TOPMOST 防浮窗吃点击）。全程操作留痕 `evidence/driver-console.txt`。

## 3. 核心发现（新平台事实，已入终报 §4-8）

**F-WIN（FBP 1.36.8 + winrt 0.0.20）在扫描未停止时发起连接，服务枚举返回 0**：

- 尝试 1（扫描进行中连接）：`发现 0 个服务`，页面空态「该设备未暴露任何 GATT 服务（或权限受限）」。
- 尝试 2（先停扫再连接）：`发现 1 个服务`，链路全通。
- 两次尝试同卷于 `clipboard-export.txt`（[14:16:56] 发现 0 个服务 / [14:24:41] 发现 1 个服务），排除设备态漂移（走查后 bleak 复核同口径 1svc/3char）。
- 与 G-WIN tinygo「Uncached 才见 9f1d」同族但机制不同：FBP 路径在**射线被扫描占用**时枚举为空。⇒ 正典口径：**连接前停扫**（Windows 桌面通用守则，交 Mac 入正典）。

## 4. 观察项（不阻断，挂 WIN-012）

- **O-1 扫描并发枚举 0**（上节，终报 §4-8）。
- **O-2 退订 STATUS 后页面弹回扫描列表**：退订生效（图标转灰）但 3 秒内页面 pop；退出时非 busy（无模态直退）佐证连接已断。F-WIN 无自动化缝/Release 无 console，根因未插桩——候选=FBP 退订释放 GATT 会话触发断链+页面响应。挂后续真机窗口复验。
- **O-3 9f1d 家族显示名未映射**：F 显示「未知服务 (9F1D1001) / 未知特征值」，E/Q 有中文名映射——UI 对齐小项。
- **O-4 写路径未真机取证**：INPUT 特征写按钮全程未触碰（FW-LOCK 铁律 + F-WIN 无 Q 式代码级护栏）；写逻辑本身与移动端同源（✔ᵐ 口径）。**建议**：F 补 INPUT 护栏后并入下轮真机走查（与 O-2 一并）。

## 5. 坑位账（本轮新增）

1. **剪贴板 64 位句柄截断**：ctypes 默认 restype=c_int（32 位 signed），`GetClipboardData/GlobalLock` 必失败返回 None——须显式 `c_void_p` + argtypes（CLIPTEST 往返定位）。
2. **读值插入致行下移**：INFO 读出的绿色值 chip 插入后下方特征行整体下移 ~60px，按旧坐标点通知钮会落空——每次结构变化后必须重扫图标位。
3. **exe mtime ≠ Dart 新鲜度**：见 §1。
4. 视觉分析 API 偶发 400（图片输入格式/解析错误）——重试或换缩小图；其坐标不可靠，**坐标一律以像素簇扫描为准**，视觉只做语义/文案转录。
5. `tasklist` 输出 GBK 崩解码——判活用 `OpenProcess`（进程死=err 87）。
6. SHID 卡动作 chip 配色：`_isShid` 时「配置」=蓝渐变主色、「连接」=灰底；非 SHID 卡「连接」=整宽蓝——定位须按卡型分谓词。

## 6. 证据清单（evidence/）

`00…14` 编号截图（关键：01 扫描/02 连接后空态/06 服务发现/08 读值/10 订阅绿态/12 弹回列表/14 退出收尾）、`clipboard-export.txt`（858B 文本主证）、`bleak-postcheck.txt`（设备健康复核）、`driver-console.txt`（操作留痕）、`crop-icons-3x.png`（图标映射定位证）。
