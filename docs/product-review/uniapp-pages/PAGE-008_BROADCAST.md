# PAGE-008 广播

> 路径：`pages/broadcast/index`
> 文件：`apps/uniapp/pages/broadcast/index.vue` + `wx-peripheral-mode.js` / `wx-peripheral-server.js` / `advertising-payload.js`
> 审核日期：2026-08-31
> 证据：E0/E1；Observer E5 BLOCKED（无 Observer 固件）

## A. 用户任务与界面存在必要性

用户任务：在支持的平台把手机当 Peripheral，配置名称/UUID/厂商数据，在 31 字节预算内开始/停止广播，并用第二设备验证。

必要性：**保留 Tab**。这是首版闭环「手机广播」唯一入口。H5 必须诚实不支持。

## B. 进入、参数、出口

Tab 进入，无参数。无下级页。hide/unload 停止或释放 owner。

## C. 当前真实内容

1. 「广播设置」+ 平台标签（Android/iOS/微信/Web）+ 状态（广播中/已就绪/未就绪/不支持）。
2. 设备名称；Android 提示「使用系统蓝牙名称」。
3. 服务 UUID；校验错误第一行。
4. Android：模式、发射功率、可连接、包含设备名称、添加服务 UUID。
5. 厂商 ID、厂商数据。
6. 预计字节 `calcAdvertiseBytes() / 31`，>31 显示超出。
7. 「开始广播/停止广播」「检查支持」。
8. 操作日志（可清空）。

默认 payload：`DEFAULT_ADVERTISING_PAYLOAD`（SmartBLE / FFE0 / 0001 / BLE）；Android 默认名 `SmartBLE-A`，iOS `SmartBLE-I`。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 平台状态 + 起停 | 保留 |
| 31 字节校验 | 保留（E1 已测 31 过 32 拒） |
| 默认 payload | 保留为可直接试，但须标注实验名 |
| Android 名称可控性 | 修改文案：系统可能接管，输入框可能无效 |
| Observer 证据入口 | **缺失** |
| Central 冲突保护 | 微信 controller 有；需 E5 |
| 双套字节计算 | 修改：UI `calcAdvertiseBytes` 与 `analyzeAdvertisingPayload` 可能不一致，需单一预算 |

## E. 操作表

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-026 | 检查支持 | 始终 | 无 | 插件/API detect | 已就绪/日志 | 不支持原因 | 本页 | owner 可释放 |
| OP-027 | 改字段 | 未广播时输入可编 | advertising 时 input disabled；部分 Android switch 仍可点 | 本地 state | 字节即时 | 非法 UUID/HEX 阻止开始 | 本页 | 无静默截断（validator errors） |
| OP-028 | 开始 | 未广播 | payload 非法应挡住 | App：LysBlePeripheral；微信：peripheral mode + server start | 实际成功后 advertising=true | 权限/蓝牙/插件/连接冲突 | 本页 | owner 单一 |
| OP-029 | 31/32 边界 | 有 UUID 或厂商数据 | 32 应不能 start | validator | 31 可开始 | 超限文案 | 本页 | 32 无 API |
| OP-030 | 停止/离页 | 广播中或 hide | 无 | stop + close server + release | 已就绪 | 停止失败可见 | Tab | server/adapter |

## F. 状态表

未知/检查中（弱，主要靠未就绪）、不支持（web）、未就绪、已就绪、广播中、停止中（日志级）、权限错误、蓝牙关闭（10001）、连接冲突、参数错误、启动/停止失败。timeout：插件无响应依赖平台。cancelled：hide 取消。

## G. 字段来源

静态默认 + 用户输入 + 平台能力。广播是否真发出：必须 Observer/第二手机，不能信本机 advertising 布尔值单独作为 E5。

## H. 运行链路

```text
检查/开始
 → 页面 #ifdef
 → App: uni.requireNativePlugin('LysBlePeripheral')
 → 微信: createWxPeripheralAdapterController.open(mode peripheral)
      → createWxPeripheralServerController create/start
 → 活动连接 getConnectedCount>0 则拒绝关 central adapter
 → UI advertising + logger('broadcast')
```

`useBroadcastSession.js` 存在但页面主要自管 logs；以页面为准。

## I. 依赖

- Android：LysBlePeripheral 原生插件。
- 微信：BLE Peripheral API + 无活动连接或交接。
- **Observer：当前仓库无 ESP32 Observer 模式** → E5 BLOCKED，除非用 nRF Connect/第二手机并记录为外部观察端。
- H5：不支持。

## J. 第一断点

- P0：无 Observer 夹具，不能 VERIFIED 广播。
- P1：Android 名称/系统蓝牙名可能与输入不一致。
- P1：微信 central/peripheral 与活动连接。
- P2：默认名 SmartBLE vs 产品名 BLE Toolkit+。

## K. 验收

- E1：`advertising-payload.test.mjs`、`broadcast-validation.test.mjs`、`wx-peripheral-*.test.mjs`。
- E5：31 可见、32 无新广播、start/stop、hide 停止、连接保护。

## L. 产品结论

**NEEDS_CHANGE**（诚实平台字段、统一字节预算、Observer 方案、H5 文案）。

保留页面。

## M. 需要用户决定的问题

1. 首版观察端：第二手机 nRF 是否算正式证据，还是必须做 ESP32 Observer 固件？
2. Android 无法自定义名称时，是否隐藏名称输入框？
