# 20260924-WIN-F004 —— 六壳扫描卡「广播数据弹窗」补齐（F004 · R04 正典对齐）

## 背景

用户走查发现：Windows 五壳（E/T/G/Q/V）扫描列表点击设备卡**直接进入 GATT 详情页**（或无响应），
未对齐正典 F004 口径（P0 级特性）：

- PRD §8 R04：Given 列表中任一设备 When 点击设备卡本体 Then 弹窗完整展示设备 ID/名称/RSSI/
  Service UUIDs/原始广播数据/Manufacturer Data/Service Data，平台未提供字段标注
  「本轮平台 API 未提供此字段」，点「复制数据」写入剪贴板并 toast「已复制」。
- USER_FLOW：点设备卡本体 → 广播数据弹窗，可复制（F004）。
- 正典桌面原型 `docs/specs/prototype/platform/desktop/high-fi/app.js` `p001-advdlg`（sheet 底部弹层）。
- uniapp `components/scan/advertisement-dialog.vue`（kv 四行 + 深色 ad-sec 段 + 复制）。

盘点结论：uniapp/Flutter(F-WIN)/桌面正典原型/统一发现交互稿四者**有**该功能；
E-WIN/T-WIN/G-WIN/Q-WIN/V-WIN 五壳**缺失**（本日补齐）。HTML 原型侧无需改动。

## 改动

| 壳 | 改动 |
|---|---|
| E-WIN Electron | 新组件 `components/AdvertisementSheet.js`（正典 sheet 结构 + buildAdSegments 镜像移植）；DeviceCard scan 变体整卡点击 `show-detail`→`show-advertisement`（conn 变体保持 p007-open 进详情）；app.js `openAdvertisement` + copy 接线（toast「已复制」）；index.html 挂载 |
| T-WIN Tauri | DeviceCard/AdvertisementSheet 同步；app.js `showAdvertisement`（Rust DeviceInfo 形状投影：service_uuids/advData 大端厂商 hex → {id, hex}）；index.html 挂载。旧简陋 `showDeviceInfoDialog` 调用点移除（DOM 保留） |
| G-WIN Wails | frontend/src 与 E-WIN 字节级镜像（CRLF）：app.js/DeviceCard.js/AdvertisementSheet.js cp 同步 + index.html 同款改动（尾部 automation-shim/wails-bridge 保留） |
| Q-WIN Qt | `AdvDialog`（kv + 深色段 + 复制，Python 版 buildAd_segments 同口径）；`ScanHit` 增 `service_data` 字段（bleak adv.service_data 填充）；扫描页 `row_activated` 由 `_open_connected` 改为 `_show_adv`；已连接页 `p007-open` 行为不变 |
| V-WIN Avalonia | `BleAdvSnapshot`（WinRT DataSections **原始 AD 段真实字节**，非重建）+ BleService 投影；VM `OpenAdvertisementCommand`/`CopyAdvDataAsync`/`BuildAdvSheet`（含整包 hex=原始段拼接、Service Data 从 0x16 段提取）；axaml 弹层（mask/modal 模式，ZIndex 92）+ `OnScanCardTapped`（conn 卡保持 `OnDeviceCardTapped` 进详情） |

## 平台差异口径

- E（noble）：manufacturerData 整段 hex（前 2 字节小端厂商 ID）；AD 段 = 平台解析字段**重建**（0x09/0x03/0x07/0xFF/0x16）。
- T（btleplug/Rust）：仅厂商数据首条（大端 4 hex 厂商 ID + 数据）+ 服务 UUID；AD 段重建；Service Data 平台未提供 → miss。
- G：同 E（桥接层同契约）。
- Q（bleak）：厂商 ID/数据 + 服务 UUID + Service Data；AD 段重建；整包 hex 未提供 → miss。
- V（WinRT）：**DataSections 原始段真实字节**（含整包 hex 拼接）——六壳中唯一非重建口径。

## 验证

- `node --check`：E/T/G 全部改动 JS 通过。
- `node --test tests/desktop/`：**95/95**（含 script-co-load 装载新 AdvertisementSheet.js 的真实脚本链）。
- `python -m py_compile / compileall`：Q 通过。
- `dotnet build`：V 0 错误（2 个既有警告）；`dotnet test`：**55/55**。
- E-WIN 真 UI 冒烟（Edge headless + CDP，mock polyfill）：`ewin-f004-advdlg-smoke.mjs` **4/4**：
  - A1 点击扫描卡本体 → 弹层 flex + 标题「广播数据 · Adv-Full」+ kv 四行
  - A2 AD 段重建 5 段（0x09/0x03/0x07/0xFF/0x16）+ 厂商 ID 小端解析 0x4C42 正确
  - A3 无 advertisement 设备 → 4 处「本轮平台 API 未提供此字段」miss 标注
  - A4 复制数据 → toast「已复制」
  - 截图 `ewin-f004-advdlg.png`

## 坑位账

- 仓库无 `ws` 包且 Node 20 无 global WebSocket → 冒烟脚本内嵌极简 WS 客户端（net+crypto 握手，支持分帧拼接）。
- E-WIN `device-card` 无 `dataset.id`（T-WIN 有）→ CDP 选择器须按 `card.device?.id` 匹配。
- G-WIN 镜像文件为 CRLF（repo 存 LF），同步用 `sed 's/$/\r/'` 转换。

## 未做（下轮真机窗口）

- ~~五壳真机（SHID-00000001 等真实广播）弹窗内容目检~~ —— 20260924 晚真机窗口已补（见下章）。
- ~~V-WIN DataSections 与 bleak 侧同设备对照~~ —— 已做并**发现真缺陷**（跨帧不合并），已修复（见下章）。

## 真机窗口第二轮（2026-09-24 晚 · SHID-00000001 在广播）

### 基准抓取（realdevice/）

- `shid-bleak-groundtruth.json`：bleak 合并口径全字段（名称+`9f1d1001-…` UUID，
  mfg/sd 空，RSSI -42）。
- `shid-winrt-allframes.json`：WinRT 原生 8s 共 34 帧——**双帧交替平台事实**：
  ConnectableUndirected 帧 = `0x01 Flags(06) + 0x07 128-bit UUID 列表`（无名）；
  Extended 帧 = `0x09 "SHID-00000001"`（无 UUID）。名称与 UUID 分居不同帧。

### V-WIN 跨帧合并修复（真缺陷）

逐帧整替换快照会让弹窗内容随末帧漂移（缺名或缺 UUID）。修复（`BleService.cs`）：
按地址累积 AD 段（类型 upsert）/UUID 并集/厂商数据沿最新非空，开扫重置；
合并结果同时供匹配与弹窗。**dotnet build 0 错 + test 57/57**（新增 2 个
合并单测：`BuildAdvSnapshot_MergesNameAndUuidAcrossAlternatingFrames` /
`ManufacturerDataSurvivesEmptyFrames`，输入形状=真机 34 帧实证）。

### 五壳真机/真机字节取证

- **Q**（`run-q-broadcast-evidence.py` 同目录 `q-advdialog-real-shid.png`）：真实
  bleak 扫描 → ScanHit → AdvDialog 渲染，`widget.grab()` 取证。分段
  `0e09 5348…`/`1107 041c…` 与 WinRT 原始字节逐字节一致；复制文本 kv+段齐全。
- **E**（`ewin-real-bytes-smoke.mjs` → `ewin-f004-real-bytes.png`）：注入 noble
  合并投影形状的真机数据，CDP 断言 2/2（标题/kv/两段真机字节全中）。T/G 共用组件。
- **V**：数据层与 UI 层分别由 34 帧实证输入的单测 + build/test 覆盖（见上）。

### EWIN-DEF-PROV-001 修复（扫描卡匹配态晚于首渲）

根因=逐帧投影无合并：SHID 名称与 UUID 分居两帧，首帧（无名无 UUID）匹配失败
→ 首渲无「配置」按钮/chip。修复：
- E 主进程 `mergeAdvertisement`（index.js）：按 id 跨帧合并（名称非空沿新、
  UUID 并集、mfg/sd 沿最新非空）再投影；
- E/G 渲染层（app.js 镜像）：末帧字段缺失不冲掉已建立态（名称/UUID/匹配粘滞）；
- T 渲染层（app.js）：同款粘滞防线。
验证：`ewin-defprov001-smoke.mjs` CDP 3/3（首帧无按钮 → 晚到帧自动出现
「配置 Smart HID」+弱匹配 chip → 空名帧不回退），tests/desktop 95/95。

### F O-2 修复（断连显示错误态）

F-WIN `device_detail_page.dart`：意外断连（非用户主动）置 `_connectionLost` →
页面顶部错误横幅「连接已断开（意外断连）· 下方服务数据为断开前快照」+ 重连
按钮；用户主动断开旗标区分；重连成功/发现服务成功清态。flutter analyze 0 issues
+ test 129/129。

### 广播模板复制四壳齐（WIN-BRIDGE 边车同构）

V 原生实装已有（20260921）；本轮 G/Q/T 复用同一份 `win-broadcast-bridge.ps1`
（行协议 start/stop/exit ↔ started/stopped/error）：

| 壳 | 实现 | 验证 |
|---|---|---|
| G | `winbridge.go`（协议层）+ `winbridge_windows.go`（HideWindow 拉起）+ `winbridge_other.go`（桩）；`StartAdvertising/StopAdvertising` win 路径走边车（embed ps1 落 %TEMP%）；`shutdownBLE` 先收边车 | go vet/build 过；`winbridge_test.go` 真机往返 PASS |
| Q | `win_broadcast.py`（subprocess+queue 等待者）+ `BleService.start/stop_broadcast` + P008 页面重建（四字段表单+31B 预算+启停+日志+状态徽章）；切页/退出真停播 | `run-q-broadcast-evidence.py` 全链 PASS（广播中→已停止态转换+超限拦截），3 截图 |
| T | `src-tauri/src/win_bridge.rs`（windows 模块）+ `start_advertising` win 分支 + `confirm_exit` 收边车 + 前端 `broadcastUnsupported` 放开 Windows | cargo check/test 过（含 `bridge_start_stop_roundtrip` 真机单测） |

**平台事实（新登记）**：本机无线电不自环——广播中 bleak 同机扫可见 SHID 116 帧、
自身厂商块 0 帧（`g-aircheck.json` 判别实证）；空口收包须外部接收端
（与 E-WIN 20260921 手机双端收 44 包口径一致），G/Q/T 外部空口收包待下轮手机窗口。

### 坑位账（第二轮）

- winrt-python `DataReader.read_bytes(buffer)` 是"填充预分配缓冲"签名（传长度报
  TypeError）——与 V-WIN C# `ReadBytes(buffer)` 同构。
- WinRT 抓原始段不能按 local_name 过滤（UUID 载荷帧无名会被丢）——按
  `bluetooth_address` 过滤。
- E 工作副本 app.js 是 CRLF（autocrlf 检出）→ G 镜像直接 `cp`（再 sed 会 CRCRLF）。
- Q `_sync_state` 须带 running 语义（stop 成功≠广播中——首版把停播成功也报
  「已发射」，取证脚本抓出后修正）。
- Rust `recv_timeout` 返回双层 Result（外层 RecvTimeoutError + 内层桥结果），
  `.and_then(|inner| inner)` 展平；`creation_flags` 需 `std::os::windows::process::CommandExt`。
