# 20260910 · F004 广播数据查看 + F017 观察侧证据匹配（N-MAC / N-IOS 收口）

## 结论

| 项 | 结果 | 证据 |
|---|---|---|
| F004 N-MAC（R04） | **PASS** | UIS-05：`sheet=true fields=true missMarked=true copied=true toast=true closed=true`（mac-page-smoke.log） |
| F004 N-IOS（R04） | **PASS** | `AdvDataUITests.testP001DeviceDetailShowsAdvertisementDataAndCopies` 全断言（详情两段/UUIDs/缺失标注≥3/复制 toast/剪贴板内容含 设备 ID+服务 UUIDs+缺失标注） |
| F017（服务层） | **PASS（双端共享 Core）** | SmartHidCore `ObserverEvidence` 移植 + 10 项单测；`swift test` 32/32（core-unit.log） |
| iOS 单测回归 | 23/23 | ios-unit.log |
| iOS UI 全套回归 | 12/12（连续两轮） | ios-ui-suite.log |
| macOS --unit-core | 80/80 | mac-unit-core.log |
| macOS --smoke-pages | 20/21 PASS + 1 SKIP | UIS-18-OTA FAIL = P-03 固件侧未配合（待 ESP32 烧录，既有口径）；UIS-19 SKIP = 无 SHID 夹具广播 |

## F004 实现口径（对齐 uniapp canonical / R04）

- 设备详情弹窗展示：设备 ID/名称/RSSI/可连接 + 广播数据段（服务 UUIDs / Service Data / 厂商数据）。
- 平台未提供字段逐项标注「本轮平台 API 未提供此字段」（iOS：Service Data、厂商数据、原始广播整包 hex——CoreBluetooth 仅暴露结构化字段；fixture 场景下服务 UUIDs 有值）。
- 复制：写入剪贴板 + toast「已复制」（**本轮补齐 iOS toast**，2.2s 与 macOS 同步长）+ macOS 关闭按钮可关。
- iOS UI 测试经 `--ui-test-echo-pasteboard` 回显探针验证剪贴板内容（App 读自有剪贴板不触发 iOS 粘贴板隐私授权；runner 直读必挂——见下）。

## F017 移植口径（apps/uniapp observer-evidence-adapter.js → SmartHidCore）

- 事件门：`type=="advertisement" || t=="obs"`；字段别名 type/t、services/uuids、manufacturer/mfg、timestamp/ts。
- 名称约束：精确或包含；nil 视为无约束。
- 服务 UUID：去 `-` 小写后**全串相等**（非子串、不剥 16-bit 前缀——与 JS normalizeUuid 语义一致）。
- 厂商数据：hex 归一（仅 0-9a-f）后 `contains(idLE) || contains(idBE)`；data 非空再叠加 `contains(utf8hex(data))`；id==null 整项跳过。
- 时间戳：事件优先，缺省 nowMs/当前时间。
- 测试 10 项覆盖：门控/名称/UUID（含 16-bit vs 128-bit 不匹配）/厂商 LE+BE/中文 UTF-8 hex/data 缺失/无 id/JSON 别名与直通/时间戳回退/归一化工具。

## 过程中修复的三处真实缺陷

1. **iOS 详情 sheet 偶发不呈现（套件环境必现）**：`sheet(isPresented:)` + 外部 `selectedDevice` 双状态在启动窗口存在内容闭包捕获过期状态的竞争（仪表日志证实 onGattAction 已触发而 sheet onAppear 未执行）。重构为单一事实来源 `.sheet(item: $selectedDevice)`，删除 `showingDeviceDetails`。附带修复：BLEManager preview 锁回调幂等写（@Published 同值赋值也发 objectWillChange，启动期多余重渲染会取消进行中的合成触摸）。
2. **iOS 缺 R04 复制 toast**：uniapp/macOS 均有「已复制」，iOS 只写剪贴板。补 DeviceDetailSheet 底部 toast（两个复制按钮均接入）。
3. **UI 测试剪贴板读回方式**：runner 进程直读 `UIPasteboard.general` 触发 iOS 粘贴板隐私授权（PBErrorDomain 13），套件环境必挂。改为 App 侧 DEBUG 探针（`--ui-test-echo-pasteboard`：回显剪贴板按钮+标签）验证内容。

## 残留（非本轮范围）

- UIS-18-OTA / F008/F009/F010 字节级 / F025 OTA E2E：待用户 ESP32 烧录（BOOT+RST）后解锁。
- UIS-19 / F024 真机：需 SHID 夹具广播 9F1D1001。
- iOS 26 模拟器合成 tap 在应用启动窗口偶发不可命中/被吞（平台现象；测试侧已用 hittable 轮询+重试兜底；真实触摸不受影响，人工 computer-use 点击复现正常）。

## 复现命令

```bash
cd core/apple/SmartHidCore && swift test                       # 32/32
cd apps/ios && xcodebuild test -project SmartBLE.xcodeproj -scheme SmartBLEiOS \
  -destination 'platform=iOS Simulator,id=807B4008-57AB-4056-851F-98F8D7274086' \
  -only-testing:SmartBLETests -only-testing:SmartBLEUITests    # 23/23 + 12/12
cd apps/desktop/macos/SmartBLE-mac && swift build && \
  ./.build/debug/SmartBLE-mac --unit-core && ./.build/debug/SmartBLE-mac --smoke-pages  # 80/80 + 20/21
```
