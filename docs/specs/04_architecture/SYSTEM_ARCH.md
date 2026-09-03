# SYSTEM_ARCH —— 系统整体架构

> SOP v2.0 Phase 5 产出 · 2026-09-02
> 事实源：REVERSE_ANALYSIS §1.2（技术架构）/ §2（结构）。描述旧项目现状架构，作为重构基线。

## 1. 系统架构图

```mermaid
flowchart TB
    subgraph UI["UI 层（apps/uniapp）"]
        P["pages ×10（页面）"]
        C["components ×15（自建组件）"]
    end
    subgraph LOGIC["逻辑编排层"]
        CO["composables ×4（页面专属编排器）"]
        ST["Pinia store ×2（ble 通用会话 / hid Smart HID）"]
    end
    subgraph SVC["服务层（平台无关为主，6 组）"]
        BR["ble-runtime（16）<br/>会话注册表/写队列/重连"]
        PV["provisioning（5）<br/>设备无关配网框架"]
        SH["smart-hid（11）<br/>第一方 Profile 专属"]
        BC["broadcast（6）<br/>广播会话/31B 预算"]
        OT["ota（3）<br/>12 态事务"]
        MI["散装（13）<br/>权限/路由/汇总/元数据"]
    end
    subgraph CORE["仓库根共享层 core/"]
        PR["protocols（协议受锁镜像）"]
        FR["ble-core（framing/Profile 契约/logger）"]
    end
    subgraph PLAT["平台 API（收敛点）"]
        WX["uni.* / wx.*（BLE、扫码、剪贴板、跳转…）"]
        PLUS["plus.* + LysBlePeripheral 原生插件（App 广播）"]
    end
    DEV(("BLE 设备<br/>Smart HID (ESP32-S3)<br/>LightBLE 固件 / 通用设备"))
    HUB(("ControlHub<br/>(MQTT)"))

    P --> CO --> ST --> SVC
    C -.-> P
    SVC --> CORE
    BR --> WX
    BC --> PLUS
    BC --> WX
    WX <--> DEV
    PLUS <--> DEV
    HUB -.->|"仅设备侧连接，不经小程序"| DEV
```

**关键声明**：全系统**无后端、无 HTTP、无登录**（REVERSE_ANALYSIS §1.2）；小程序与 ControlHub 之间没有任何网络路径，配网信息经 BLE 下发到设备、由设备侧连接 ControlHub。

## 2. 分层规则（架构铁律）

1. 依赖单向：`pages → composables → store → services → core → 平台 API`。
2. 平台调用收敛：uni.\*/wx.\*/plus.\* 只出现在 4 处（ble-runtime/index.js 经 platform.js 注入、scan-permission.js、wx-peripheral-\*.js、broadcast/index.vue）——详见 [../00_context/TECH_STACK.md](../00_context/TECH_STACK.md) §2。
3. 服务层纯 JS 化：业务状态机可在 Node 直接单测（仓库根 tests/unit 29 个）。
4. core/ 为跨端正典：协议镜像受 smart-hid-contract.lock.json 锁定，改动须走契约流程。

## 3. 三层会话体系（产品可感知行为的架构源头）

- **注册表层**（session-registry）：会话 8 态状态机 + 所有权（owner 可断开 / borrow 只可 release）+ 配网互斥标志。
- **运行时回调层**（ble-runtime）：uni BLE 全局回调唯一所有者；主动断开 2s marker 区分被动断线。
- **重连管理层**（reconnect-manager/policy）：3 次上限、backoff 1s/3s/5s；USER_REQUEST 永不重连。

## 4. Profile 扩展机制（生态系统位）

新设备家族以 Profile 注册表接入（契约 core/ble-core/provisioning/profile-contract.js）：serviceUuid/namePrefix 匹配 → 专属路由（model.routes）与动作（presentation）→ 复用通用连接/写入/notify 基础设施。内置 smart-hid（真实）+ esp32-demo（演示）。**重构时该机制属须保留的通用层，不得为单一设备族改写**（与用户既有约定一致）。
