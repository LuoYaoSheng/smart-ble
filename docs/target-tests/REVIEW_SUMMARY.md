# TP-G1 审核摘要（用户审核入口）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

> 本文件浓缩 TP-G1 交付（docs/target-tests/** + scripts/target/** + tests/target/** + traceability 更新）。
> **未经用户批准本摘要前，禁止进入 TP-G2（差距报告与修复计划）。**
> 本轮未修改任何业务代码（apps/uniapp、core/ble-core、hardware 固件）、未烧写、未 push。

---

## 1. 交付总览

| 类别 | 内容 |
|---|---|
| 测试规范 | docs/target-tests/ 01–17 + 本摘要（18 份，全部 REVIEW 状态） |
| 契约检查器 | scripts/target/ 7 checker（ctx 可注入：真实 FS / 内存 Fixture）+ lib/check-utils |
| 契约测试 | tests/target/contract/ 7 文件 39 用例（含 9 类故意错误验证） |
| 单元目标测试 | tests/target/unit/ 15 文件 33 用例（双层：故意错误参照 + 目标模块 ESM 桥导入） |
| 集成/Fake Runtime | tests/target/integration/ 12 文件 27 用例（FakePlatform 平台缝注入） |
| 页面 | pages.manifest.json（契约单源生成）+ 5 用例 + 11 份 Playwright 骨架 |
| 固件静态 | tests/target/firmware/ 3 文件（UUID/广播名/LED/串口/产物元数据） |
| 硬件模板 | tests/target/hardware/ 5 份（Android/微信/双 ESP32/Smart HID） |
| Release 静态 | tests/target/release/ 3 用例文件 9 用例 + clean-install 模板 |
| 统一入口 | `node scripts/verify-target.mjs`（七层汇总 + 第一断点前 20 预览） |
| 追踪更新 | test-traceability.json（scope/映射补全/implemented/coverage 实算）+ schema（scope 字段）+ 02 号生成投影 + 22 号 3b 节 + target-tests README |

## 2. 数量与覆盖

- 目标登记：REQ 66｜FEAT 81（Must 80/Should 1）｜PAGE 10 + WEB 1｜FLOW 14｜计划测试 103（C14/U16/I10/P12/E8/A14/W10/H8/R11）
- **Must 自动化覆盖**：73/80 Must FEAT 直接有自动化（其余 7 项为 E5/E6 专属：真机矩阵/发布模板承载）
- **REQ 自动化可达**：65/66（1 条纯 E5 语义经矩阵行覆盖）
- **Must E5 覆盖**：TEST-E/A/W/H 矩阵行 100% 登记（模板待 TP-G4 执行）；**E6 覆盖**：TEST-R 11 条（静态 6 条已落地，5 条手工模板）
- 无孤立 REQ/FEAT/PAGE/FLOW/CLAIM/Test（check-target-traceability 21/21 PASS）

## 3. 各层测试数量

| 层 | 用例 | 初跑 |
|---|---|---|
| Contract/Static | 39 | 39 PASS / 0 FAIL |
| Unit | 33 | 22 PASS / 11 FAIL（NOT_IMPLEMENTED 差距） |
| Integration | 27 | 25 PASS / 2 FAIL（差距） |
| Page manifest | 5 | 5 PASS（+11 spec BLOCKED 待浏览器） |
| Firmware static | 7 | 3 PASS / 4 FAIL（差距） |
| Release static | 9 | 8 PASS / 1 FAIL（差距） |
| Traceability | 21 断言 | PASS |
| **合计** | **141** | **PASS 123 / FAIL 18 / BLOCKED 11** |

## 4. 故意失败验证（任务书十三：9/9 全部被抓）

| # | 类别 | 验证载体 | 结果 |
|---|---|---|---|
| 1 | 重复 ID | target-contract.test（REQ-001 复制） | ✅ FAIL 被断言捕获 |
| 2 | 坏引用 | traceability.test（REQ-999）+ flows.test（PAGE-099） | ✅ |
| 3 | 缺 Must Test | traceability.test（FEAT-081 摘除）+ contract（planned_tests 清空） | ✅ |
| 4 | 错 Tab/路由 | pages-target.test（第 5 Tab / 非 pages/ 路由 / 参数冲突 / 页面缺失 / 废弃复活） | ✅ |
| 5 | OTA 缺 start/commit/version | protocol-target.test（删 commit、替换 firmware_version） | ✅ |
| 6 | 32 字节 Payload | unit/broadcast-payload 参照层（静默截断被抓，S-38） | ✅ |
| 7 | PREVIEW 假下载 | landing-target.test（no_fake_download=false / 缺产物行为≠NOT_RELEASED） | ✅ |
| 8 | VERIFIED 缺 SHA/Evidence | landing-target.test（CLAIM 标 VERIFIED 无 artifact 对） | ✅ |
| 9 | HID token 持久化 | protocol-target.test（token_storage 改 uni.setStorage） | ✅ |

全部通过内存 Fixture（snapshot→mutate→virtual ctx）完成，**真实目标文档零修改**。

## 5. 当前实现初跑结论（预览，非正式 gap）

FAIL=18、BLOCKED=11（Playwright spec×11）。FAIL 全部为诚实差距，见 §6 第一断点与 §8 分级。Contract 自身仅 1 项已知契约数据缺陷（FEAT-035 优先级漂移，见 §7）。

## 6. 最主要 20 个第一断点预览（≠正式 gap；TP-G2 生成）

1. [TEST-U-006/REQ-013] display-name.js 模块缺失（名称解析链七级）
2. [TEST-U-010/REQ-026] validateHexInput 接口缺失（HEX 整体拒绝）
3. [TEST-U-013/REQ-036/050] log-redaction.js 模块缺失（脱敏）
4. [TEST-U-016/REQ-066/DEC-016] validateOtaPackage 缺失（六项传输前校验）
5. [18号§2] public-status.js 模块缺失（五词表派生）
6. [REQ-022/023] reconnect-policy.js 模块缺失（有限重连策略）
7. [TEST-U-005/DATA-003/DEC-017] Registry 快照缺 subscription_count
8. [TEST-U-002/S-47] version-metadata.js 模块缺失（版本投影）
9. [TEST-U-011/REQ-028] write-queue.js 模块缺失（MTU 分包+队列）
10. [TEST-U-007/REQ-014] filterBleDevices 无 keyword 目标接口（N/M 口径）
11. [TEST-U-015] smart-hid/profile.js 含 TS 语法，Node 桥不可载（需编译缝）
12. [REQ-020/021/ERR-CONN-03] connectDevice 未编排服务发现（半开泄漏面）
13. [REQ-053/PAGE-007] Registry 无配网会话分类（活动会话口径无法排除）
14. [18号] 仓库根 VERSION 单源文件缺失（五处同源源头）
15. [12号] 固件缺 Observer 广播名（BLEToolkit-Observer）
16. [12号] 固件缺 LED 指令表（FF00..FF03）
17. [12号] 固件特征面与 3 服务/12 特征契约不全
18. [TEST-C-002] FEAT-035 优先级 md=Must ↔ json=Should（契约数据漂移）

## 7. 已知契约缺陷（TP-G1 发现、本轮禁改、留 TP-G2）

- FEAT-035：03 号登记行=Must（3 台扩展才是 Should），product-target.json=Should；03 号 §17 汇总句为 v1.0 陈旧口径（Must 75/Should 4/Could 2 与实算 Must 80/Should 1 不符）。

## 8. 缺环境/工具/硬件/凭据

| 项 | 影响 | 对策 |
|---|---|---|
| Playwright 未安装 | E4 spec×11 BLOCKED | TP-G2+ 接 H5 原型后安装（最小依赖） |
| ESP32 真机/串口 | TEST-E 真机项未执行 | TP-G4（COM 口实测枚举，禁写死） |
| Android 真机+Release APK | TEST-A 未执行 | TP-G4（需开启 USB 调试） |
| 微信正式 AppID+真机 | TEST-W/H 未执行 | TP-G4 |
| Smart HID 设备/ControlHub | TEST-H 未执行 | TP-G4 |
| Release 产物 | TEST-R E6 静态已过、手工待发布 | TP-G5/6 |

## 9. 用户批准清单（批准后方可 TP-G2）

- [ ] 测试体系 18 份规范与工件清单接受
- [ ] 9 类故意错误验证结果接受
- [ ] 初跑 18 项 FAIL 作为 TP-G2 差距输入接受（含 FEAT-035 契约数据修正）
- [ ] verify-target 入口接受（仍不并入 verify-uniapp.sh 阻断）
- [ ] 批准进入 TP-G2（差距报告与修复计划；仍不改目标规范以迎合实现）

## 10. 红线重申

本轮：BUSINESS CODE: NOT MODIFIED｜HARDWARE: NOT EXECUTED｜未烧写｜未 push。
下一轮 TP-G2：先差距报告，后修复计划，均需用户批准分段推进。
