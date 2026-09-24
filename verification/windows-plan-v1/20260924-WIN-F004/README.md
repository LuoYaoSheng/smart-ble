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

- 五壳真机（SHID-00000001 等真实广播）弹窗内容目检。
- V-WIN DataSections 与 bleak 侧同设备对照（原始段 vs 重建段一致性）。
