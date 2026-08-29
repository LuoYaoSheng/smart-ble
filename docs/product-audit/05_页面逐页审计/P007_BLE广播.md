# P007 BLE 广播（pages/broadcast/index）

> 基线 `bf5d17e`。Tab 页。微信小程序（peripheral 服务器）与 App 端（LysBlePeripheral 原生插件 + Android 权限矩阵）双路径。
> 结论先行：微信路径**功能真实闭环**（默认值预填、UUID 校验、31 字节预算、10008 自动降级）；但存在一个**跨页系统性风险**——本页直调 `wx.openBluetoothAdapter({mode:'peripheral'})` 且全项目从不 `closeBluetoothAdapter`，tab 切换顺序可能破坏设备页扫描（需真机验证）。

## 1. 基本信息

```text
页面名称：BLE 广播（tabBar 第 2 项）
页面路径：pages/broadcast/index
页面类型：Tab 页
进入方式：tabBar
退出方式：tabBar（onHide 自动停广播——平台限制，诚实处理）
是否依赖权限：微信端系统蓝牙；App 端 Android 定位/蓝牙权限矩阵（本审计以微信端为主）
是否依赖网络：否
```

## 2. 页面产品目的

把本机变成一个 BLE 外设进行广播（自定义名称/服务 UUID/厂商数据），供其他设备扫描验证——调试与演示用途。

## 3. 信息结构

```text
广播页
├── 状态大卡：LIVE/OFF 图标 + 正在广播/未广播 + 副标题
├── 平台说明卡（按 platform 显示 Android/iOS/微信 说明）
├── 广播设置卡
│   ├── 设备名称 / 服务UUID（128 位或短 UUID，实时格式校验提示）
│   ├── （仅 Android）广播模式/发射功率 picker + 可连接/含设备名/加服务UUID 开关
│   ├── 厂商ID(HEX) / 厂商数据
│   └── 预计广播包大小 N/31 字节（超限红字警告）
├── 操作：开始广播↔停止广播（换色）/ 检查支持
├── 广播状态条：dot + 广播中/已停止 + 提示   ← 与状态大卡信息重复
└── 操作日志（logger 'broadcast' 频道，可清空）
```

## 4. 操作清单（微信路径为主）

| 操作ID | 用户操作 | 触发函数 | 预期结果 | 实际结果 | 状态 |
| --- | --- | --- | --- | --- | --- |
| O01 | 进入页面 | onLoad（:585-613） | 预填默认值 + 检查支持 | 预填（名称/UUID/厂商数据）✓；checkSupport → `wx.openBluetoothAdapter({mode:'peripheral'})` → 创建 PeripheralServer，日志可见 | ✅ |
| O02 | 开始广播 | `toggleAdvertising`（:567-577） | 校验→初始化→广播 | UUID 校验 ✓ → open(peripheral) → startAdvertising（名称截 8 字符、厂商数据截 4 字符——静默适配微信限制）；**errCode 10008 自动降级简化广播重试** ✓；成功状态卡变 LIVE | ✅ |
| O03 | 停止广播 | 同上 | 停止 | stopAdvertising 成功 → 状态复位；**无 fail 处理**（I04） | ⚠️ |
| O04 | 修改设置 | 各输入/picker/switch | 广播中禁用编辑 ✓ | 同预期（`:disabled="advertising"`） | ✅ |
| O05 | 检查支持 | `checkSupport` | 探测能力 | 日志反馈；不支持时状态条显示"当前平台不支持广播" | ✅ |
| O06 | 清空日志 | `clearLogs` | 清空 | 同预期 | ✅ |
| O07 | 分享 | 右上角菜单 | 分享卡片 | title/path 正常（落地 /pages/index/index） | ✅ |
| — | 清空名称+UUID 后点开始 | `startWxAdvertising:402` | — | **静默 return，零反馈**（I02） | ❌ |

## 5. 跨页系统性风险（本页最重要发现）

```text
时序：用户先进"设备"页（central 模式 open，adapterReady=true）
  → 切到"广播"页：wx.openBluetoothAdapter({mode:'peripheral'}) 直调（:214/:554，绕过 ble-runtime）
  → 切回"设备"页点扫描：ensureAdapterReady 因 runtime 的 adapterReady 标志仍为 true 而跳过重新 open
    → startBluetoothDevicesDiscovery 在 peripheral 模式下的可用性取决于微信实现（模式切换通常需先 closeBluetoothAdapter）
    → 若失败，错误经 errors.js 归一为"蓝牙开关未打开…"——文案与真实原因（模式冲突）不符
反向时序：先广播页后设备页同理。
证据：broadcast/index.vue:214、:554 直调 wx.*；ble-runtime/index.js:266-276 adapterReady 标志不感知模式；
     全项目 grep 无 closeBluetoothAdapter 调用。
```

**判定：P1 风险（待真机验证）**。若复现，修复方向：广播页启停时经 runtime 统一管理（进入前记录模式、离开时 close 重置 adapterReady），或设备页扫描前强制探测模式。

## 6. 生命周期

| 钩子 | 行为 | 判定 |
| --- | --- | --- |
| onLoad | 平台分支预填 + checkSupport | ✅（注意：**仅进入 tab 就切 peripheral 模式**——见 §5） |
| onMounted/onUnmounted | 日志订阅/退订 + 停广播 | ✅ |
| onHide | 广播中则停（微信后台限制） | ✅ 诚实；副作用=切去设备页自测广播必停（页面副标题已说明"其他设备可扫描"） |
| onUnload | 停广播 + 关 server | ✅ |
| onShow | **无** | ⚠️ 停止失败时状态卡"广播中"无从纠正（与 I04 叠加） |

## 7. 问题清单

| ID | 问题 | 证据 | 严重度 | 建议 |
| --- | --- | --- | --- | --- |
| I01 | 适配器双模式冲突风险（跨页，详见 §5） | broadcast:214/:554；runtime:266-276；无 closeBluetoothAdapter | **P1（待真机验证）** | 广播启停经 runtime 统一；离开广播 tab 时恢复 central |
| I02 | 名称+UUID 均清空时点"开始广播"静默 return，零反馈 | `broadcast/index.vue:402` | P3 | 前置校验 + toast |
| I03 | 微信路径静默截断：名称>8 字符、厂商数据>4 字符无提示（仅日志） | `:403-410` | P3 | 输入框 maxlength 或截断时 toast |
| I04 | stopAdvertising 无 fail 处理：停止失败则状态卡死"广播中" | `:438-446` | P4 | fail 时仍复位 UI 并日志说明 |
| I05 | 状态双显：顶部状态大卡与底部广播状态条信息完全重复 | `:4-10` vs `:106-116` | P4 | 二选一 |

**假完成检查：无**（微信路径全链路真实实现；App 路径为原生插件调用，代码结构完整，超出本轮小程序审计范围）。

## 8. 评价

```text
产品合理性：B    调试/演示工具定位成立；双平台分支使单文件 985 行、维护成本偏高
功能完成度：80%  微信路径闭环；有静默点与停止失败盲区
交互完整度：75%  校验/预算/降级做得细；静默 return 与静默截断拉低
异常完整度：70%  10008 降级 ✓；stop 失败、模式冲突无兜底
```
