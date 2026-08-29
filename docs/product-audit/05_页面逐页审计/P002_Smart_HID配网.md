# P002 Smart HID 配网

页面路径：`pages/hid/add`；类型：多阶段流程页。复核：2026-08-29。

## A. 页面目的
连接已识别 Smart HID，填写 Wi-Fi/ControlHub，扫码取 token，下发并等待设备 Status。

## B. 页面信息结构
步进器 → 连接态 → 表单态（SSID/密码/地址/扫码/隐私）→ 状态态（进度/成功/错误恢复）。

## C. 页面内容合理性
安全说明清晰；状态页缺「取消等待」。

## D. 用户操作（操作清单）

| 操作ID | UI入口 | 用户操作 | 触发代码 | 预期 | 实际 | 后续 |
|---|---|---|---|---|---|---|
| O1 | 重新连接 | 连接失败后重连 | `connectDevice`（composable） | 建连并订 Info/Status | PASS 逻辑；真机待验 | 表单态 |
| O2 | 返回设备列表 | 放弃 | `goDevices` → switchTab P001 | 回扫描 | PASS | P001 |
| O3 | 扫码卡 | 扫配对 QR | `scanControlHubQr` → `uni.scanCode` | 解析 hub/token | PARTIAL：fail 空处理 | 表单 |
| O4 | 下发配置 | 提交 | `provision` → workflow write+wait | Status ready | PASS 逻辑+单测 | 成功→P003 |
| O5 | 查看设备 | 成功后 | `goDetail` → redirect P003 | 详情 | PASS | P003 |
| O6 | 恢复按钮 | 失败恢复 | `runRecovery` | 改表单/诊断等 | PASS 映射 | P002/P004 |

## E. 页面跳转
成功 → P003；MQTT 类失败 → P004；返回 → P001。

## F. 页面状态
connect/configure/status + 中/成功/错；缺扫码取消、提交取消、离页确认。

## G–I
`hid` Store + composable；BLE connect/notify/write；token 仅内存。

## J. 关键链路

### O4 下发
```text
UI → provision → useSmartHidProvisioning
→ 建终态 waiter → 分帧写 candidate → Status notify ≤60s
→ ready：commitKnownDevice → redirect P003
→ fail：错误映射 + recovery
判定：链路 PASS（单测）；真机 PARTIAL
第一断点（产品）：等待中无法取消 ← P2
假设修复后：扫码 fail 仍空；离页可能丢事务感知
```

### O3 扫码
```text
UI → scanControlHubQr → uni.scanCode
success → 解析表单；fail → （空）← 第一断点 FAIL
后续：权限拒绝/取消无法解释
```

## K–M
onLoad 带 deviceId 自动连；返回/中途退出弱；异常靠 Status error 映射。

## N. 假完成
无（不以 write 成功代替 Status）。

## O–S
缺取消等待；弱名称误匹配由 Device Info 二次确认兜底。

## T–V
步进/进度组件复用好；页面+composable 职责合格。

## W
增加取消等待与扫码失败 modal；离页确认。

## X
产品 B；UI 82%；可用 70%；链路 75%；异常 55%；复用 85%。
