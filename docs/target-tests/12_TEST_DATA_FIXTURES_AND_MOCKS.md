# 12 测试数据、Fixture 与 Mock

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

## 1. 范围 / 非范围

负责：全部测试数据/假实现/故障注入/时间控制的登记与红线。
不负责：用例本身（03–11）。

## 2. 设备 Fixture 集（E1/E2 用）

| Fixture | 用途 |
|---|---|
| 有名设备（BLEToolkit-Server/Observer） | 正常路径 |
| 无名设备（仅 deviceId） | 兜底文案（未命名 BLE·ID 尾 4） |
| 短名/长名（1B/28B localName） | 名称链与预算边界 |
| 重复 deviceId、RSSI 递增 | 去重与刷新 |
| 1 台/2 台/超上限（20+） | 并行与容量 |
| 只读/只写/notify 特征 | 属性约束矩阵 |
| Notify burst（1 秒 50 条） | 路由不丢不串 |
| 断电/断链事件 | 重连策略 |
| 31B/32B 广播组合 | S-38 预算 |
| OTA：大包/最后小块（5B@MTU23）/各相位失败 | 十步事务 |
| Smart HID：正常候选 + 八类错误响应 | 配网矩阵 |
| Release：产物有/无/坏 SHA | NOT_RELEASED 规则 |
| 假 QR（过期 URL） | R-009 |

## 3. 假实现（已在 TP-G1 落地）

| 假件 | 文件 | 红线 |
|---|---|---|
| FakePlatform | tests/target/lib/fake-runtime.mjs | E2；不得冒充 E5 |
| ESM 桥 | tests/target/lib/import-target.mjs | data URL ≤3 层内联；uni/wx 可注入 |
| 内存 ctx | scripts/target/lib/check-utils.mjs makeVirtualCtx | 故意错误只在内存副本；真实文档零修改 |
| 平台缝 | ble-runtime setBlePlatformForTesting | 生产代码自带测试缝（非测试专用分支逻辑） |
| 页面行为契约 | tests/target/pages/page-behavior.manifest.json | Expected 单源；Actual 仅 Page Driver 探测，禁止回填 |
| 页面 Fixture | tests/target/pages/pages.manifest.json | 与 pages-target 对齐的断言维度 |

## 4. Fake Clock / Timer

时间相关断言（10 秒扫描、重连退避、90 天 TTL）一律注入 now/时钟（known-devices options.now 模式）；测试不得真等长时。

## 5. 敏感数据红线

Wi-Fi 密码/token 一律明显测试值（test-password/tok_test_1234）；证据包扫描不得出现真实凭据（R-004）。

## 6. ESP32 测试目录

`hardware/esp32/LightBLE/test/`：TP-G1 仅登记目标目录说明；骨架接入在固件整改 Gate（不重构现有固件）。

## 7. 退出条件

全部 Fixture/假件登记在册；无真凭据；故意错误不触碰真实文档。
