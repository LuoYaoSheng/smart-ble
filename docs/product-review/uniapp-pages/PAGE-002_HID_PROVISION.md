# PAGE-002 Smart HID 配网

> 路径：`pages/hid/add`
> 文件：`apps/uniapp/pages/hid/add.vue` + `composables/use-smart-hid-provisioning.js`
> 审核日期：2026-08-31
> 证据：E0/E1；真实配网 E5 后置

## A. 用户任务与界面存在必要性

用户任务：对已匹配的 Smart HID 设备完成 BLE 连接与 Device Info 身份确认，填写 Wi-Fi/ControlHub，扫码获取一次性 token，下发 candidate，等待 Ready 或按八类错误恢复。

必要性：**保留独立页**。这是唯一三阶段向导。不能并进 PAGE-003（历史快照）或 PAGE-006（通用 GATT）。

## B. 进入来源、参数、正常出口、返回和深链

| 方向 | 事实 |
|---|---|
| 进入 | PAGE-001 Profile「Smart HID 配网」；PAGE-003「重新配置」；PAGE-005「重新配网」 |
| 参数 | `deviceId`；当前设备对象在 `hidStore.currentDevice`（扫描入口会 set） |
| 正常出口 | 成功「查看设备」→ PAGE-003；失败恢复可能 → PAGE-005 或回到表单 |
| 返回 | 系统返回；配网进行中 `onBackPress` 拦截并确认 |
| 深链 | 仅 deviceId；密码和 token **不进 URL** |

## C. 当前真实内容（从上到下）

1. `provision-stepper`：连接 / 填写配置 / 查看状态。
2. **phase=connect**：设备名/ID；loading「连接并确认设备中…」；错误 +「重新连接」「返回设备列表」。
3. **phase=configure**：已连接/已断开徽章；Device Info 摘要；SSID、密码（`password` 属性）、Hub 地址；扫码卡片（必需/已获取）；隐私说明；「下发配置」（缺 SSID/地址/token 时 disabled）。
4. **phase=status**：四步进度（Wi-Fi / ControlHub / MQTT / Ready）；成功「设备已就绪」；错误；「取消等待」；成功「查看设备」；失败「恢复」按钮文案随 recoveryAction。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 三阶段同一页 | 保留 |
| 密码不展示明文 / 不持久化 | 保留（input password；known-devices 排除密码/token） |
| 隐私说明 | 保留 |
| 八类错误单一恢复动作 | 保留逻辑（E1 覆盖）；UI 是否每种都可达待 E5 |
| 连接丢失保表单 | 保留 |
| 离页确认 | 保留（仅 provisioning 中拦截返回） |
| 自动连接 | 保留；无 deviceId 时错误文案要求回扫描 |
| 独立「取消连接」在 connect 阶段 | 缺失（只能返回） |

## E. 操作表

| 操作 ID | 控件 | 显示条件 | 禁用条件 | 点击行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-034 | 自动/重新连接 | connect 阶段或丢失 | connecting | `smartHidService.connect` | 进 configure | connectionError | 本页 | 半初始化由 service disconnect |
| OP-SCAN-QR | 扫码 | configure | 无 | 平台扫码 → 解析 shid:// | pairingReady 徽章 | `describeScanCodeFailure` | 本页 | 取消扫码不清已填表单 |
| OP-035 | 下发 | canSubmit | !canSubmit / provisioning | write candidate + status waiter | Ready 成功态 | 八类错误 + recovery | 本页 status | waiter 取消/disconnect |
| OP-CANCEL | 取消等待 | provisioning | 无 | `cancelWaiting` | 停止等待 | N/A | 留 status | waiter cancel |
| OP-RECOVERY | 恢复按钮 | errorMessage | 无 | diagnostics / pairing / form | 进入对应页或回表单 | N/A | PAGE-005 或本页 | 按动作 |
| OP-DETAIL | 查看设备 | provisionDone | 无 | PAGE-003 | 详情 | N/A | PAGE-003 | dispose 可 keepSession |
| OP-BACK-SCAN | 返回设备列表 | 连接失败 | 无 | switchTab 扫描 | 扫描 | N/A | PAGE-001 | dispose |
| OP-LEAVE | 返回键 | provisioning | N/A | 确认框 | 允许则 back | 继续等待 | 可能离开 | dispose |

## F. 状态表

| 状态 | 适用 | 表现 |
|---|---|---|
| idle | 短暂 | initialize 后立即 connect |
| loading | 是 | connecting / provisioning |
| empty | N/A | 无设备用 error |
| success | 是 | provisionDone |
| error | 是 | 连接错误、八类错误、超时 |
| permission denied | 扫码 | 平台扫码失败反馈 |
| unsupported | 扫码/H5 | 扫码能力依赖平台 |
| disconnected | 是 | connectionLost 保表单 |
| reconnecting | 是 | 重连按钮 busy |
| timeout | 是 | waiter 超时 → error |
| cancelled | 是 | 取消等待 / 取消扫码 / 取消离开 |

## G. 字段数据来源

| 字段 | 来源 | 性质 |
|---|---|---|
| deviceId/name | Store currentDevice / 路由 | 会话 |
| Device Info | GATT Read Smart HID Info | 实时 |
| SSID/密码/Hub | 表单 | 内存；密码不落盘 |
| token | QR payload | 内存；不进 URL/历史 |
| 进度 | Status Notify → store.progress | 实时 |
| 错误码 | Status.error 稳定字符串 | 实时 |

## H. 真实运行链路

PAGE-001 `openProfileDevice` → `buildProfileActionUrl` → PAGE-002 `initialize(options)` → `smartHidService.connect` → provisioning `connectProfileSession` → Runtime `createBLEConnection` + expected service → Read Device Info → 身份确认失败则断开。

扫码 → `parsePairingQrPayload` → `hidStore.setHubInfo`（token 在内存）。

下发 → `writeProfileCandidate` / framing → Status Notify waiter → `describeSmartHidStatus`。

`onUnload` → `dispose`（除非 keepSession 去详情）。

## I. 依赖

- Smart HID 固件与 ControlHub，**不是** LightBLE 灯控夹具。
- 通用 BLE Runtime 必须先稳定；本页 E5 后置。
- 网络：设备侧 Wi-Fi/MQTT，App 不直连 Hub（除扫码内容）。

## J. 第一断点

- P0：无 Smart HID 真机不得标配网 PASS。
- P1：扫描入口若未 `setCurrentDevice`、仅有 deviceId 时要确认 initialize 能恢复设备对象。
- P2：connect 阶段缺少明确取消。

## K. 自动化与真机

- E1：`smart-hid-workflow.test.mjs`（八类错误）、`smart-hid-provision-form.test.mjs`、`smart-hid-profile.test.mjs`、`provisioning*.test.mjs`。
- E5：后置。用例需覆盖身份错误、错设备断开、八类错误、取消等待、离页、重配。

## L. 产品结论

**NEEDS_CHANGE**（产品文案与阶段结构基本正确，但首屏身份/取消/无设备恢复仍要在 G3 冻结；实现未 E5）。

**不 MERGE、不 REMOVE。**

## M. 需要用户决定的问题

1. 配网成功后是否必须断开 BLE（READY 后设备关广播）？
2. 无 ControlHub 的开源演示是否提供 mock/跳过，还是本页仅第一方设备可用？
3. Wi-Fi 密码是否允许「显示密码」开关（当前始终掩码）？
