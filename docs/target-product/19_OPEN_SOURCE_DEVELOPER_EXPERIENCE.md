# 19 开源开发者体验

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product / DevRel
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：新开发者从零到首次闭环的路径目标、构建/烧写文档、Profile 扩展指南、贡献流程、仓库治理入口。

本文不负责：具体教程正文（文档站内容）；Release 流程（`18`）。

---

## 2. 5 分钟上手（FEAT-077）

目标：任何新电脑（Windows/macOS/Linux）在**教程指导下 5 分钟内进入可构建状态，30 分钟内完成端到端闭环**（FLOW-013/014 验收口径）。

路径：

1. 克隆仓库（GitHub 主，DEC-011）；
2. App/小程序：安装依赖→运行（微信开发者工具导入或 HBuilderX）；
3. ESP32：安装 PlatformIO→`pio run`→选择自己的串口→`-t upload`→`pio device monitor`；
4. 手机安装 App/进入小程序→扫描发现 `BLEToolkit-Server`→连接→写 `FF01` 灯亮→订阅 Notify。

故障表（教程必含）：串口找不到（驱动/端口选择）、权限（Windows 签名/macOS 安全）、构建失败（网络/平台版本）、烧写失败（boot 模式）。

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

- [x] 5 分钟/30 分钟两级目标与故障表；
- [x] Profile 扩展五步清单与红线；
- [x] 治理入口齐备。

关联计划测试：`TEST-R-005`（链接矩阵）、`TEST-E-008`（独立电脑复现）、`TEST-C-007`（Profile 注册契约）。
