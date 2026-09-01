# 19 开源开发者体验

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE Product / DevRel
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：新开发者从零到首次闭环的路径目标、构建/烧写文档、Profile 扩展指南、贡献流程、仓库治理入口。

本文不负责：具体教程正文（文档站内容）；Release 流程（`18`）。

---

## 2. 双计时目标：5 分钟 Quick Start 与 30 分钟 Clean Machine（FEAT-077，REQ-062）

两类计时**语义不同、验证不同、不得互相冒充**：

### 2.1 5 分钟 Quick Start（CLAIM-017，TEST-R-005）

定义：**前置条件已经满足**时，从"拿到仓库/产物"到"跑通最小闭环"≤5 分钟。

前置条件（教程开头显式列出，不满足时如实引导走 2.2）：

- Android：已有 APK 且手机已允许安装；
- 微信：已安装微信且小程序入口可用；
- ESP32：已安装 PlatformIO，或直接使用已发布预编译固件。

**5 分钟不包含**：IDE/JDK/Node/PlatformIO 从零安装等工具链准备。

路径：

1. 克隆仓库（GitHub 主，DEC-011）或获取产物；
2. App/小程序：导入运行（微信开发者工具或 HBuilderX）；
3. ESP32：`pio run`→选择自己的串口→`-t upload`→`pio device monitor`；
4. 手机安装 App/进入小程序→扫描发现 `BLEToolkit-Server`→连接→写 `FF01` 灯亮→订阅 Notify。

### 2.2 30 分钟 Clean Machine（CLAIM-031，TEST-R-011/E6）

定义：真正的新电脑从零开始 ≤30 分钟完成端到端闭环：

```text
clone → 安装依赖 → build → flash → install → scan → connect → write → notify
```

覆盖 Windows/macOS/Linux；验证方式为独立电脑全流程录屏（FLOW-014 口径）；任何需要从旧电脑复制 `node_modules/unpackage/build/bin/私有配置` 才能跑通的步骤都判 FAIL（Clean Machine 红线，`16` NFR-024）。

### 2.3 故障表

教程必含：串口找不到（驱动/端口选择）、权限（Windows 签名/macOS 安全）、构建失败（网络/平台版本）、烧写失败（boot 模式）。

## 3. ESP32 从零教程（FEAT-077）

覆盖：硬件清单（DevKit/LED）、接线（板载 LED 无需接线）、环境、构建、烧写、串口监看、双模式说明（peripheral/observer 如何选择构建环境）、恢复（USB 重刷）、常见故障。**全文不写死串口**（示例用 `<your-port>` 占位）。

## 4. Profile 扩展指南（FEAT-078）

新设备家族接入清单：

1. 注册描述符：`id`（唯一）、`version`、`uuids`（强匹配）、`namePrefix`（弱匹配）、`required` 特征、`notify` 特征、`preferredMtu`、`capabilities`、路由；
2. 实现编解码与 workflow（可复用 Runtime 原语）；
3. 页面路由与动作文案；
4. 测试模板：matcher 单测、身份确认、主路径、错误路径、真机步骤；
5. 红线自检：移除该 Profile 后通用功能零回归；通用层零 import。

注册校验（拒绝项）：重复 id、非法 UUID、缺 required 特征、描述不可变（version 递增）。

## 5. 贡献与治理（FEAT-079）

- CONTRIBUTING：环境、分支、提交规范（Conventional Commits）、PR 检查单（测试+证据）；
- Issue 模板：Bug（环境/版本/复现/日志）、Feature（场景+目标）；
- 安全披露：SECURITY.md（私密渠道，禁止公开 issue 报安全问题）；
- License：MIT；行为准则；
- 文档结构入口：START_HERE / README 导航到产品契约与目标文档。

## 6. Release 与 Changelog（FEAT-080）

- Changelog 由 Release Metadata 生成（DATA-009），与 PAGE-010 同源；
- 每次 Release 附：版本、commit、产物+SHA、固件版本、已知限制、证据索引。

## 7. 仓库可复现性

- 固定 commit 可复现构建（NFR-024）：App（微信/H5）+固件（PIO）；
- 无机器特定配置入库（串口、本机路径、私钥）；
- CI 最小化且 secrets 不落日志（SEC-014）。

## 8. 验收条件与关联测试规划

- 5 分钟/30 分钟两级目标与故障表；
- Profile 扩展五步清单与红线；
- 治理入口齐备。

关联计划测试：`TEST-R-005`（链接矩阵）、`TEST-E-008`（独立电脑复现）、`TEST-C-007`（Profile 注册契约）。
