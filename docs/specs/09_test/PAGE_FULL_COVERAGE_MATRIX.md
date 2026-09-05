# 页面全量覆盖矩阵（PAGE_FULL_COVERAGE_MATRIX）

- 状态：初版 2026-09-05（run-id `20260905-1726-1b793ca`，基线 commit `1b793ca`）
- 配套：[`WINDOWS_MOBILE_V1_MASTER_MATRIX.md`](WINDOWS_MOBILE_V1_MASTER_MATRIX.md)（F 功能维度）、
  [`REAL_INTERACTION_SMOKE.md`](REAL_INTERACTION_SMOKE.md)（真实点击用例）、
  [`CROSS_IMPLEMENTATION_PARITY_MATRIX.md`](CROSS_IMPLEMENTATION_PARITY_MATRIX.md)（三线一致性）
- 每页统一 20 项检查（进入路径/参数/区块顺序/按钮/输入/开关/卡片/弹窗/loading/empty/error/
  permission/unsupported/disconnected/timeout/success/返回路径/生命周期清理/原型对照/三线一致）
- 状态词与总矩阵一致；初始全 NOT_RUN

## 逐页矩阵

| 页面 | 名称 | 必须验证要点 | U-WX | U-AND | F-AND | 证据 | 结论 |
|---|---|---|---|---|---|---|---|
| P001 | 扫描首页 | 扫描、权限、筛选、广播详情、普通连接、Profile 双入口、空态、失败态 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P002 | Smart HID 配网 | 连接验证、表单、扫码、下发、进度、错误恢复、离开确认 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P003 | Smart HID 详情 | 重新配置、诊断、高级 BLE 调试、上下文缺失 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P004 | 历史页 | **必须不存在**：无路由、无入口、无持久化、不可达 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P005 | Smart HID 诊断 | 在线检测、离线连接检测、五项结果、失败恢复、栈感知导航 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P006 | GATT 调试 | 连接、服务、Read/Write/Notify、日志、重连、OTA BLOCKED 展示 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P007 | 已连接 | 活动 Session、单断、全断、部分失败、Profile 分流 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P008 | 广播 | 能力检查、表单、31B、开始/停止、权限、平台降级、日志 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P009 | 关于 | 产品信息、版本、外链、推广、分享、平台状态 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |
| P010 | 版本记录 | 当前版本、历史、限制、复制版本信息 | NOT_RUN | NOT_RUN | NOT_RUN | — | NOT_RUN |

## 每页 20 项检查清单（回填用模板）

对每页按以下顺序核对并在证据中逐项落结论（不能合并为一句「页面正常」）：

1. 所有进入路径（含 P001 卡片双入口 / P003 上下文跳转 / 深链或分享回流）
2. 页面参数（必需参数缺失时的兜底）
3. 页面区块顺序（对照 PAGE_SPEC / v1-new 原型）
4. 每个按钮
5. 每个输入
6. 每个开关
7. 每个卡片
8. 每个弹窗（含离开确认）
9. loading 态
10. empty 态（EmptyState 无 action 时不出现空按钮）
11. error 态
12. permission 态（拒绝/永久拒绝/去设置回流）
13. unsupported 态（如微信开发者工具内外围广播）
14. disconnected 态
15. timeout 态
16. success 态
17. 返回路径（系统返回/AppBar 返回语义一致）
18. 生命周期清理（离页停扫描/停广播/断 Session 的产品口径）
19. 与 v1-new + platform high-fi 原型截图对照
20. 三实现线一致性（差异须在 PARITY 矩阵登记并可溯源）
