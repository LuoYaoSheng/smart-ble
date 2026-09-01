# 03 Contract/Static 测试规范（TEST-C-001..014 / E0）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：文档/JSON/ID/路由/版本/公开状态/链接的机器门禁。
不负责：运行行为（E1+）；不修改真实目标文档制造失败（一律内存 Fixture）。

## 2. Checker 清单（scripts/target/，ctx 可注入）

| Checker | 测试 ID | 核心断言 |
|---|---|---|
| check-target-contract.mjs | C-001/002/003/008/010/011/014 | ID 唯一、登记处（01/03 号）↔JSON 双向一致、元数据齐备、APPROVED/user、FEAT→Test 非空、FEAT 优先级 md↔json parity、ERR/STATE/DATA 登记、架构静态（页面无全局 BLE 回调直注册、通用层无 HID import）、DEC 默认一致 |
| check-target-pages.mjs | C-005 | PAGE-001..010+WEB-001 完整、四 Tab、路由唯一/前缀、参数不冲突、废弃不复活、规模下限、04 号登记 |
| check-target-flows.mjs | C-009 | FLOW-001..014 连续、字段齐、引用闭合、≥7 图、06 号登记 |
| check-target-platforms.mjs | C-004 | 四平台、状态五词表、目标姿态（h5=UNSUPPORTED、ios=NOT_RELEASED）、能力值域、正式入口降级必注 |
| check-target-protocols.mjs | C-012/013 | UUID 形态/唯一、OTA 十步+第 0 步包校验、DEC-016 六项、串口 115200/8 事件、八类 HID 错误、token 仅内存、镜像 lock |
| check-target-traceability.mjs | C-008/009 | 套件计数=实算、Must 100%、无孤儿/悬空、coverage 数字一致 |
| check-target-landing-claims.mjs | C-010 | 31 Claim 登记+证据前置+测试、no_fake_download/sha/NOT_RELEASED、QR 规则、VERIFIED 必带 URL+SHA、相对链接 |

## 3. 测试文件（tests/target/contract/，39 用例）

每份 = 真实仓库自检 + 故意错误 Fixture（内存 ctx：snapshot→mutateJson→makeVirtualCtx）。

## 4. 故意错误验证（任务书十三，9 类全覆盖）

| 类别 | 载体测试 |
|---|---|
| ① 重复 ID | target-contract（复制 REQ-001） |
| ② 坏引用 | traceability（REQ-999）+ flows（PAGE-099） |
| ③ 缺 Must Test | traceability（FEAT-081 摘除）+ contract（planned_tests 清空） |
| ④ 错 Tab/路由 | pages-target（PAGE-002 变第 5 Tab；路由改 /device-detail） |
| ⑤ OTA 缺 start/commit/version | protocol-target（删 commit；替换 firmware_version） |
| ⑥ 32 字节 Payload | unit/broadcast-payload 参照层（静默截断实现被抓） |
| ⑦ PREVIEW 假下载 | landing-target（no_fake_download=false；缺产物行为改“即将上线”） |
| ⑧ VERIFIED 缺 SHA/Evidence | landing-target（CLAIM-004 标 VERIFIED 无 artifact 对） |
| ⑨ HID token 持久化 | protocol-target（token_storage 改 uni.setStorage） |

## 5. 已知契约缺陷（TP-G1 发现，不在本轮修）

- **FEAT-035 优先级漂移**：03 号登记行=Must（3 台扩展才是 Should），product-target.json=Should。TP-G1 禁改该 JSON；checker 如实 FAIL，留 TP-G2 修数据。
- 03 号第 17 节汇总句为 v1.0 陈旧口径（Must 75/Should 4/Could 2），与逐行登记（Must 80/Should 1）不一致——留 TP-G2 一并修。

## 6. 退出条件

真实仓库自检通过（除已记录缺陷）；9 类 Fixture 全部触发 FAIL；不修改业务代码与真实契约。
