# 07 ESP32 自动测试规范（TEST-E-001..008 / E5）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：LightBLE 双夹具（Peripheral/Observer）在目标板上的行为与协议一致性。
不负责：本轮不重构固件、不要求 `pio test` 全绿、不烧写（TP-G1 边界）。

## 2. TP-G1 已落地（静态可执行前置）

| 文件 | 断言 | 初跑 |
|---|---|---|
| tests/target/firmware/fixture-contract.test.mjs | 双夹具广播名、3 服务/12 特征 UUID、LED FF00..FF03 与契约一致 | 3 PASS / 4 FAIL（Observer 名/LED 表/特征面缺口=差距） |
| tests/target/firmware/serial-schema.test.mjs | 115200/8 事件/9 字段/≥5 条每秒、观察流行解析 | 3 PASS |
| tests/target/firmware/artifact-metadata.test.mjs | VERSION 单源、产物 manifest（版本+SHA）或 NOT_RELEASED | 1 PASS / 1 FAIL（VERSION 缺失） |

硬件骨架：`hardware/esp32/LightBLE/test/` 目标目录说明见 12 号 §5。

## 3. 真机项（TP-G4+，模板）

esp32-peripheral-run-template.md（连接计数/LED/Notify/故障注入/OTA 十步+相位）、esp32-observer-run-template.md（观测手机广播、字节级核对、≥5 条/秒）。

## 4. 关键红线

无固定 COM 口（实测枚举）；clean build 可复现；Observer 输出为手机 Peripheral 的正式证据（EVID 高于手机自述）。

## 5. 退出条件

静态前置可运行且差距入册；真机模板齐备；固件零修改。
