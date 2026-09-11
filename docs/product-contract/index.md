---
title: 产品规范（整体）
description: BLE Toolkit+ 整体产品规范——功能目录、用户流程、页面契约、平台适配矩阵、ESP32 参考硬件与发布门禁，全平台共用一份。
---

# BLE Toolkit+ 产品规范

> 本目录是 BLE Toolkit+ 的**整体产品规范**：产品必须提供哪些功能、用户如何完成一条完整任务、每个页面显示什么、各平台如何适配、达到什么证据才算通过——全平台共用这一份。微信小程序与 Android（UniApp 工程）是第一个完整实现运行时；iOS、H5、桌面按同一契约扩展。
>
> 工程实现事实与平台扩展分析见 [specs/ 产品基准与工程正典](../specs/README.md)。

## 本规范回答的五个问题

1. 产品必须提供哪些功能？
2. 用户如何完成一条完整任务？
3. 每个页面显示什么、能做什么、有哪些状态？
4. Android、微信、iOS、H5 如何适配或降级？
5. ESP32 和真机达到什么证据才算通过？

## 阅读顺序

1. [产品范围](./01_PRODUCT_SCOPE.md)
2. [功能目录](./02_FEATURE_CATALOG.md)
3. [用户流程](./03_USER_FLOWS.md)
4. [页面契约](./04_PAGE_CONTRACTS.md)
5. [平台适配矩阵](./05_PLATFORM_MATRIX.md)
6. [ESP32 参考硬件](./06_ESP32_REFERENCE.md)
7. [测试矩阵](./07_TEST_MATRIX.md)
8. [发布门禁](./08_RELEASE_GATES.md)
9. [HTML 交互原型规范](./09_HTML_PROTOTYPE_SPEC.md)
10. [公开落地页规范](./10_LANDING_PAGE_SPEC.md)

## 稳定编号

- `SYS-*`：应用与平台基础能力
- `DISC-*`：扫描与设备发现
- `CONN-*`：连接与会话
- `GATT-*`：服务和特征值操作
- `ADV-*`：广播 / Peripheral
- `OTA-*`：固件升级
- `PRO-*`：设备 Profile
- `HID-*`：Smart HID
- `ESP-*`：ESP32 参考设备
- `PAGE-*`：页面
- `FLOW-*`：用户流程
- `TEST-*`：验收用例

编号一旦发布不得因排序改变而重用。删除的编号保留并标记 Deprecated。

## 事实源优先级

```text
产品规范（本目录）
    ↓
HTML 可交互原型
    ↓
客户端实现（微信小程序 / Android 优先，iOS、H5、桌面随后）
    ↓
自动化测试 + Android/微信/ESP32 真机证据
    ↓
公开落地页的能力声明
```

旧的 `docs/plans/`、`docs/product-audit/`、`docs/MASTER_ARCHITECTURE.md` 和历史截图只作为演进证据，不再新增产品定义。

## 变更规则

任何新功能或交互变更必须按顺序完成：

1. 更新功能编号和验收结果。
2. 更新用户流程与页面契约。
3. 更新平台差异和 ESP32 依赖。
4. 更新 HTML 原型。
5. 编写失败测试，再修改代码。
6. 补充自动化与真机证据。
7. 最后更新落地页能力声明。

不得仅修改某个平台页面后再反向补文档。

## “完成”的统一含义

- **Implemented**：代码路径存在并通过构建。
- **Automated**：单元、集成或页面自动化覆盖预期与失败路径。
- **Device-proved**：指定真机、ESP32 固件和版本下完成测试并保存证据。
- **Release-ready**：所有 Must 功能达到要求的证据等级，且无阻断问题。

公开页面只能宣称 `Device-proved` 或 `Release-ready` 的能力。
