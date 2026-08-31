# PAGE-001 扫描

> 路径：`pages/index/index`
> 文件：`apps/uniapp/pages/index/index.vue`
> 审核日期：2026-08-31
> 证据：E0 源码 + E1 扫描/过滤单测；E5 UNPROVEN

## A. 用户任务与界面存在必要性

用户任务：确认蓝牙/平台状态，开始扫描，筛选附近设备，查看广播快照，进入通用连接或 Profile 任务。

必要性：**保留**。这是唯一扫描 Tab，也是通用 BLE 主入口。没有本页，PAGE-006/007/002 没有合法发现路径。

## B. 进入来源、参数、正常出口、返回和深链

| 方向 | 事实 |
|---|---|
| 进入 | 启动首页；Tab「扫描」；PAGE-004/007 空态 `switchTab` |
| 参数 | 无 query。Share：微信 `onShareAppMessage` path `/pages/index/index` |
| 正常出口 | 卡片「连接」→ PAGE-006；Profile 动作 → PAGE-002（smart-hid）；历史「查看」→ PAGE-003；「全部历史」→ PAGE-004 |
| 返回 | Tab 页，无 navigateBack |
| 深链 | 无设备参数。Share 只回首页 |

## C. 当前真实内容（从上到下）

1. `app-navbar`：kicker `SmartBLE Mini`，title `BLE Toolkit+`，状态「蓝牙就绪 / 当前平台不支持 BLE / 蓝牙未开启」。
2. `scan-summary`：状态芯片（待开始/扫描中/已完成/需重试）、`{deviceCount} 台设备 · {connectedCount} 台已连接`、主按钮「开始扫描/停止扫描」、失败时 `error-banner`「重试」。
3. **已配置 Smart HID** 面板（`knownDevices.length` 时）：说明「本机保存的非敏感历史记录，不代表设备当前在线。」、数量、「全部历史」、每行名称/ID、「查看」「移除」。
4. **附近设备**：标题、「筛选/收起筛选」、`filter-panel`（RSSI/前缀/隐藏无名）。
5. 列表空态：无扫描结果 vs 筛选无匹配（两种文案）。
6. `device-card`：点击看广播；「连接」；Profile 时额外主按钮。
7. `advertisement-dialog`：原始字段 + 复制/关闭。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 | 说明 |
|---|---|---|
| 蓝牙状态 + 主扫描按钮 | 保留 | 首屏主操作 |
| 扫描数量 | 修改 | `filteredCount` 已传入 scan-summary **但未展示**；用户看不到「扫描 N / 筛选 M」 |
| 已配置 Smart HID 完整列表 | 修改或上收 | 与 PAGE-004 重复；有历史时挤占首屏扫描 |
| 附近设备 + 筛选 | 保留 | |
| 卡片点击=广播详情 | 保留 | meta 已写「点击卡片查看广播原始数据」 |
| 连接 vs Profile 分按钮 | 保留 | 弱匹配文案存在 |
| 显示名规则 | 缺失 | 卡片用 `device.name \|\| '未知设备'`，未走 name→localName→AD 0x09/0x08→Profile→厂商→ID 后缀 |
| 权限拒绝/蓝牙关/扫描失败/无设备/筛选空 | 部分 | 微信有独立 modal；H5 unsupported 走 modal；scanError banner 主要覆盖启动失败；权限拒绝不一定写入 scanError |

## E. 操作表

| 操作 ID | 控件 | 显示条件 | 禁用条件 | 点击行为 | 成功反馈 | 失败反馈 | 跳转/返回 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-001 | 开始扫描 | 未扫描 | 无显式 disable | `toggle` → `useBleScan.start` | 按钮变停止；列表增量 | 权限/蓝牙/平台 modal 或 error-banner | 留本页 | 失败不残留 discovery：session finish 会 stop |
| OP-002 | 停止扫描 | 正在扫描 | 无 | `store.stopScan('user')` | 按钮恢复开始；状态「已完成」若已有设备 | stop 失败进 scanError | 留本页 | timer/session 释放 |
| OP-003 | 超时自动停止 | 扫描达 5s | N/A | `scan-session` timer `timeout` | toast「扫描完成 · 发现 N 台」或未发现 | timer 失败少见 | 留本页 | timer 清理 |
| OP-004 | hide/unload 停扫 | 扫描中离页 | N/A | `onHide/onUnload` `stop('page_hide/unload')` | 返回后不应假扫描中 | 停止失败可见于 scanError | Tab 切换 | discovery+timer |
| OP-005 | 第二轮扫描 | 第一轮结束后再点开始 | 若上一轮仍 active 则 join | 新 sessionId；starting 清空列表 | 新列表 | 同 OP-001 | 留本页 | 旧 buffer 在 starting 清空 |
| OP-006 | 卡片主体 | 有设备 | 无 | `showAdvertisingData` | 弹窗快照 | 缺字段分别标注 | 无路由 | 关闭清空 selected |
| OP-007 | 连接 | 未 connected | 已连接时按钮 disable「已连接」 | `prepareConnect` 停扫 → PAGE-006 | 进入详情 | 连接失败在 PAGE-006 | PAGE-006 | 扫描停止 |
| OP-008 | Profile 动作 | `device.profileId` | 无 | smart-hid 则 `setCurrentDevice` → PAGE-002 | 进入配网 | 弱匹配仍可进，身份在 PAGE-002 确认 | PAGE-002 或其他 profile 路由 | 不建第二套扫描器 |
| OP-009 | 筛选 | 展开筛选 | 无 | 本地 filter | 列表即时变化，源数据不变 | 筛选空单独空态 | 无 | 无 |
| OP-HID-VIEW | 历史查看 | 有 knownDevices | 无 | PAGE-003 | 详情 | 记录不存在由 PAGE-003 处理 | PAGE-003 | 无 |
| OP-HID-REMOVE | 历史移除 | 有 knownDevices | 无 | 确认框后 `hidStore.removeKnownDevice` | 行消失 | 存储失败仅 logger | 留本页 | 仅本地 |
| OP-HID-ALL | 全部历史 | 有 knownDevices | 无 | PAGE-004 | 历史页 | N/A | PAGE-004 | 无 |
| OP-COPY-ADV | 复制广播 | 弹窗开 | 无 | `uni.setClipboardData` | toast 已复制 | 系统失败无独立文案 | 留弹窗 | 无 |
| OP-SHARE | 微信分享 | MP-WEIXIN | N/A | 右上角 | 系统 | N/A | 首页 path | 无 |

## F. 状态表

| 状态 | 适用 | 当前表现 |
|---|---|---|
| idle | 是 | 「待开始」，无设备空态 |
| loading | 是 | 「扫描中」 |
| empty | 是 | 「还没有扫描结果」 |
| success/complete | 是 | 「已完成」+ 列表或空 |
| error | 是 | error-banner + 「需重试」 |
| permission denied | 是 | 微信 modal；不一定有 banner |
| unsupported | 是 | navbar「当前平台不支持 BLE」+ start modal |
| disconnected | N/A | 本页不展示连接态树；计数含 HID session |
| reconnecting | N/A | |
| timeout | 是 | 当 complete + toast，不当失败 |
| cancelled | 部分 | 用户停止无 toast（刻意） |

## G. 字段数据来源

| 字段 | 来源 | 实时/历史 |
|---|---|---|
| 蓝牙状态 | `uni.getBluetoothAdapterState` + adapter listener | 实时 |
| 扫描列表 | BLE 广播 → Runtime discovery → Store merge | 本轮扫描实时 |
| RSSI/UUID/Manufacturer | 广播 + `normalizeAdvertisement` | 本轮 |
| 显示名 | 平台 `name`/`localName`，**未解析 AD Complete/Shortened Local Name** | 本轮 |
| Profile 标记 | `matchScannedDevices` | 本轮匹配 |
| 筛选结果 | Pinia 源数据 + 本地 filterSettings | 派生 |
| 已连接计数 | Store 活动 session + `hidStore.sessionOnline` | 实时 |
| Smart HID 历史 | `uni.getStorageSync` 非敏感快照 | 历史 |

## H. 真实运行链路

用户点开始 → `toggleScan` → `useBleScan.start` → `requestBleScanPermission` → `store.startScan(5000,'home-scan')` → `scan-session` `openAdapter` → `stopDiscovery` 兜底 → `startBluetoothDevicesDiscovery({allowDuplicatesKey:true})` → `onBluetoothDeviceFound` → Store buffer 1s 节流 → `mergeDeviceCollection` → UI。

失败：权限层 modal 直接 return；adapter/start 失败 → `scanError` + modal。

清理：hide/unload/timeout/user stop → `stopDiscovery`；starting 清空列表与 buffer。discovery listener 在 Store 生命周期常驻（单例），不在页面级注销。

## I. ESP32 / 平台 / 外部依赖

- ESP32 Peripheral 持续广播固定名与主服务 UUID，用于发现与两轮扫描。
- 当前固件广播名是 `ESP32-BLE-Server`（见基线）。
- H5：`ble_not_supported`。
- 微信：蓝牙授权 + 定位授权。
- Android App：`scan-permission.js` 非微信分支只检查 API 存在，具体 Android 12+ 权限依赖系统/HBuilder 运行时，本页无独立权限 UI。

## J. 第一断点与风险

| 等级 | 断点 |
|---|---|
| P0 | E5 未做：不能宣称扫描可用 |
| P1 | 显示名规则缺口可能把有 AD 名的设备显示成「未知设备」 |
| P2 | 历史面板干扰通用扫描首屏；筛选数量不展示 |
| P2 | Android 权限路径比微信弱 |

## K. 自动化与真机验收

- E1：`scan-session.test.mjs`、`device-collection.test.mjs`、`device-filter.test.mjs`、`scan-permission.test.mjs`、`advertisement.test.mjs`。
- E4：`pages/index/index.test.js`、`page-flow.test.js`（非 BLE）。
- E5 Must：Android + 微信各一轮；发现 LightBLE；第二轮独立；权限拒绝/蓝牙关/无设备/筛选空四种空态；卡片不连接即可看 UUID。

## L. 产品结论

**NEEDS_CHANGE**

页面必须保留。需要改：展示筛选数量、压缩或移除首屏 HID 历史列表（改入口到 PAGE-004）、补齐显示名规则、区分权限拒绝与扫描失败。

不 REMOVE，不与 PAGE-007 MERGE。

## M. 需要用户决定的问题

1. 扫描首屏是否还要直接列出全部 Smart HID 历史，还是只留「全部历史」入口？
2. 无名设备兜底文案用「未知设备」还是契约「未命名 BLE · ID 后缀」？
3. 扫描默认时长是否保持 5 秒？
