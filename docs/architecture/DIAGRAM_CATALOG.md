# Smart-BLE 封装分析 · 全图目录

> 配套正文：[SHARED_VS_PLATFORM_ENCAPSULATION.md](./SHARED_VS_PLATFORM_ENCAPSULATION.md)（**v1.5**）  
> 用途：按图 ID 速查「跨端共用 vs 单端封装」相关架构图 / 流程图 / 时序图。  
> 打开正文后可用本页 ID 或正文内「全图目录」锚点跳转。

---

## 怎么读

| 标记 | 含义 |
|---|---|
| **L1** | 多平台必须同一语义（契约/向量/纯逻辑） |
| **L2** | 同语言家族可物理共享（JS bundle / SmartHidCore / 桌面组件） |
| **L3** | 仅本端 Adapter / UI 封装 |

---

## A · 架构图

| ID | 名称 | 看什么 | 正文 |
|---|---|---|---|
| A1 | 三层封装总图 | L1/L2/L3 总边界 | [§1.1](./SHARED_VS_PLATFORM_ENCAPSULATION.md#11-三层封装总图l1--l2--l3) |
| A2 | Ports 目标分层 | Presentation→Domain→Port→Adapter | [§1.2](./SHARED_VS_PLATFORM_ENCAPSULATION.md#12-目标运行时分层ports--adapters与正典对齐) |
| A3 | 家族共享边界 | JS / Apple / 镜像端谁连 core | [§1.3](./SHARED_VS_PLATFORM_ENCAPSULATION.md#13-产品家族--共享边界图) |
| A4 | Manager 拆分 | 巨石→Domain+Store+Adapter | [§1.4](./SHARED_VS_PLATFORM_ENCAPSULATION.md#14-现状巨石-vs-目标拆分blemanager) |
| A5 | PortBundle ×9 | BLE 与权限等为何拆开 | [§1.5](./SHARED_VS_PLATFORM_ENCAPSULATION.md#15-platformportbundle-职责拆分图) |

---

## F · 决策 / 依赖流程

| ID | 名称 | 看什么 | 正文 |
|---|---|---|---|
| F1 | 归属决策流 | 新代码放 L1/L2/L3？ | [§2.1](./SHARED_VS_PLATFORM_ENCAPSULATION.md#21-封装归属决策流新代码放哪) |
| F2 | 跨语言同步流 | 改常量如何过 lock/vectors | [§2.2](./SHARED_VS_PLATFORM_ENCAPSULATION.md#22-跨语言共用落地流无法物理共享时) |
| F3 | UniApp 依赖流 | 禁 Store↔Service 双向 | [§2.3](./SHARED_VS_PLATFORM_ENCAPSULATION.md#23-uniapp-目标依赖流禁止双向) |
| F4 | 扫描状态机 | 态集合共用、启停单端 | [§2.4](./SHARED_VS_PLATFORM_ENCAPSULATION.md#24-扫描会话状态流语义跨端--实现单端) |

---

## S · 时序与专项

| ID | 主题 | L1 | L3 | 正文 |
|---|---|---|---|---|
| S1 | 扫描 | 过滤显示名 | 开扫 API | [§3.1](./SHARED_VS_PLATFORM_ENCAPSULATION.md#31-目标扫描发现设备命令流--事件流) |
| S2 | 重连 | 1/3/5 | 连接栈/timer | [§3.2](./SHARED_VS_PLATFORM_ENCAPSULATION.md#32-目标连接--被动断线重连策略共用--调度单端) |
| S3 | HID 配网 | 工作流+帧 | Transport | [§3.3](./SHARED_VS_PLATFORM_ENCAPSULATION.md#33-目标smart-hid-配网纯逻辑共用--传输单端) |
| S4 | 反例 | — | 直调平台 | [§3.4](./SHARED_VS_PLATFORM_ENCAPSULATION.md#34-现状问题时序反例page--manager-直调平台) |
| S5 | Electron/Tauri | bundle | noble/btleplug | [§3.5](./SHARED_VS_PLATFORM_ENCAPSULATION.md#35-electron--tauri前端共用--原生单端) |
| S6 | OTA | 校验·12 态 | 选文件·GATT；**BLOCKED** | [§3.6](./SHARED_VS_PLATFORM_ENCAPSULATION.md#36-目标ota-升级校验-l1-共用--传输-l3-单端--端到端-blocked) |
| S7 | 广播 C1 | 31B | 外围 API·探测 | [§3.7](./SHARED_VS_PLATFORM_ENCAPSULATION.md#37-目标外围广播发射31b-预算-l1--startadvertising-l3--c1) |
| S8 | 多设备 C3 | Registry | 句柄·系统上限 | [§3.8](./SHARED_VS_PLATFORM_ENCAPSULATION.md#38-目标多设备会话registry-l1-语义--连接-l3--c3) |
| S9 | 占用互斥 | owner | GATT | [§3.9](./SHARED_VS_PLATFORM_ENCAPSULATION.md#39-多设备--配网占用互斥) |
| S10 | P005 诊断 | 五行·generation | 读特征·modal | [§3.10](./SHARED_VS_PLATFORM_ENCAPSULATION.md#310-目标p005-smart-hid-诊断两路径--运行隔离) |
| S11 | P006 GATT | 队列·codec | write/read/notify | [§3.11](./SHARED_VS_PLATFORM_ENCAPSULATION.md#311-目标p006-gatt-读--写--notify--写队列) |
| S12 | 权限 | 判定次序·态枚举 | 授权弹窗·去设置 | [§3.12](./SHARED_VS_PLATFORM_ENCAPSULATION.md#312-权限判定次序--permissionportf002--与产品六态关系) |
| S13 | BR-06 | 停扫/播/听 | 宿主生命周期 | [§3.13](./SHARED_VS_PLATFORM_ENCAPSULATION.md#313-生命周期-br-06停扫--停广播--停监听) |
| S14 | 错误+四分流 | AppError·映射·form/pairing/diagnostics/retry | 原生码·按钮 UI | [§3.14](./SHARED_VS_PLATFORM_ENCAPSULATION.md#314-错误码四级分层--三级映射--恢复四分流) |

---

## 按场景找图

| 我想搞清… | 先看 |
|---|---|
| 什么能跨端抽、什么不能 | A1 → F1 |
| UniApp 怎么改依赖 | A2 → F3 → S4 |
| 协议/帧如何多语言一致 | A3 → F2 → S3 |
| 重连为何 Android 要对齐 | S2 → §5 总表 |
| OTA 为何不能宣称可用 | S6 |
| 微信广播/多连接边界 | S7 → S8 |
| 诊断旧回调盖新 UI | S10 |
| 写队列与断线 | S11 |
| 权限横幅 vs 蓝牙未开 | S12 |
| 进后台还在扫？ | S13 |
| 配网失败按钮为何不同 | S14 |

---

## 仓库外索引

`Open/docs/smart-ble/SHARED_VS_PLATFORM_ENCAPSULATION.md` → 指向本目录正文。
