# 🗺️ 官方开源演进路线图 (Development Roadmap)

> **"A great open source project is a marathon, not a sprint."**  
> 顶级开源项目的价值不仅在于当下提供的代码，更在于它向社区展示的**确定性演进预期**。

本路线图（Roadmap）宏观展示了 **Smart BLE** 核心团队及社区共建者在未来几个季度内的产品研发脉络。我们欢迎任何人根据这份规划提出 PR (Pull Request)。

---

## 🎯 阶段一：跨端大一统与可用性基建 (当前阶段)
*代号：Foundation & Alignment*

**目标**：拉平所有主流生态（移动、桌面、小程序）的底层调用逻辑，确保核心交互与 UI 样式完全一致。

- [x] **SSOT 架构落地**：提供一键 Python 脚本，跨 5 端分发颜色与国际化 (i18n) 词条。
- [x] **纯广播生态打通**：不建立 GATT 连接，完成无缝扫描与 Manufacturer Data 自定义解析。
- [x] **端到端测试防线**：注入基于异步拦截队列的 WatchDog 算法，免疫高频数据风暴。
- [x] **硬件开源基石**：提供 C/ESP32 下位机模板与 18字节工业防呆全天候控制帧。
- [x] **文档体系国际化**：构建中英双文、按角色智能分发的 VitePress 文档中心。

---

## 🚀 阶段二：打桩自动化与桌面原生化 (Upcoming - Q3)
*代号：Automation & Desktop Native*

**目标**：彻底告别“必须要买一块单片机才能测代码”的窘境，并深挖桌面级 OS 底层特性。

- [ ] **全端 Mock 适配器 (Dummy Mocking)**：
  - 研发一层拦截架构，当环境变量 `MOCK_BLE=true` 时，底层切断真实硬件依赖，返回虚拟外围设备队列流。
  - 用途：让 GitHub Actions 云端 CI 流水线能直接跑通蓝牙连接逻辑自动化回归测试。
- [ ] **Windows 性能探针优化**：
  - 目前基于 Tauri/Rust `btleplug` 在部分旧网卡的 Windows 10 系统上存在扫描缓存刷新慢的问题。
  - 动作：增加基于底层 OS 钩子的 Force Cache Clear 机制。
- [ ] **Linux (BlueZ) 对齐**：
  - 对齐 Ubuntu / Fedora 下的桌面应用级蓝牙调用，彻底实现包含国产统信/麒麟OS的桌面大满贯。

---

## 🌌 阶段三：Web / OTA 与云端聚合 (Future - Q4)
*代号：Web Bluetooth & Cloud Sync*

**目标**：将能力边界拓展到纯 H5 环境，并深化 IoT 生态最痛的固件升级机制。

- [ ] **Web Bluetooth API 拓展**：
  - 让纯 Chrome/Edge 浏览器用户打开网页就能控制硬件，彻底跳过应用安装与小程序审核步骤。
- [ ] **全协议 OTA 流水线**：
  - 目前仅在 Flutter 与 iOS 提供固件 OTA (Over-The-Air) 升级样例。
  - 动作：拉齐 UniApp 与 Tauri 的文件流传输组件，将 DFU (Device Firmware Update) 设为开箱即用的跨端组件。
- [ ] **底层协议解析的 WASM 化**：
  - 将复杂的 HEX 解包规则采用 Rust 编写，并编译为 `.wasm`。
  - 所有端（客户端、桌面端、Web 端、甚至是云上的 Node.js 服务）**共用唯一一份解析引擎**，杜绝“安卓算对、iOS 算错”的灾难。

---

## 💡 如何参与共建？
我们希望将 Smart BLE 打造成泛 IoT 生态中“拿来即用”的顶配基础设施：
1. **领取任务**：您可以从上方的规划栏中挑选感兴趣的模块，在 GitHub 提交名为 `[PROPOSAL]` 的 Issue。
2. **源码探讨**：若在底层实现上遇到瓶颈，请随时查阅 [核心架构白皮书](/MASTER_ARCHITECTURE) 或 [组件与状态流转规约](/UI_COMPONENTS_GUIDE)。
3. **提交 PR**：请参考 [贡献指南](/CONTRIBUTING_GUIDE) 提交符合 Conventional Commits 约定的代码。
