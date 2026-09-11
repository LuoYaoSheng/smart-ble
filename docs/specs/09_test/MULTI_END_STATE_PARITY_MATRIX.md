# 多端状态一致性矩阵（MULTI_END_STATE_PARITY_MATRIX）

- 创建：2026-09-07 · Multi-end Parity Gate
- 验收对象：U-WX / U-AND / F-AND
- 事实源：[STATE_MODEL.md](../02_product/STATE_MODEL.md)（清单与不变量）+ [STATE_MACHINE.md](../04_architecture/STATE_MACHINE.md) §1–§9（正典转移表）+ PAGE_SPEC 各页「状态列表」
- 判定值：`PASS / FAIL / NOT_AUDITED / ALLOWED_PLATFORM_DIFFERENCE(须引 10_platform 条目)`
- 不变量（STATE_MODEL §2）：状态集合与转移平台无关，不得增删状态或改恢复路由；错误态必须呈现「提示+下一步+恢复动作」三要素。

## 1. 全局 12 态（页面六项特别检查 + 连接域，PAGE_SPEC §11 口径）

| 状态 | 含义 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| idle | 待开始/空转 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| loading | 加载中（内联反馈，无遮罩） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| empty | 空态（文案区分场景） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| error | 错误（横幅/日志行+重试） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| permission | 权限态（授权引导/去设置） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| unsupported | 平台不支持（如实提示） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| disconnected | 已断开 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| connecting | 连接中（按钮禁用） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| ready | 就绪（状态点绿） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| timeout | 超时（连接 10s/读 3s/配网 60s） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| success | 成功（toast/进度全绿） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| cancelled | 用户取消（静默/分类提示） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

> 2026-09-11 假数据通道补充：U 线经 H5 mock 桥（`?mock=1`）已可离线驱动本表多数状态（idle/loading/empty/error/unsupported/disconnected/connecting/timeout(种子)/success/cancelled 的 U 侧 UI 形态），36/36 正典文案断言在册（[REPORT](../../../verification/windows-mobile-v1/20260911-h5-mock-sweep/REPORT.md)）；为 code-level 证据，真机/开发者工具运行态复核仍待窗口，不据此回填 PASS。

## 2. 扫描会话（STATE_MACHINE §7 · P001）——2026-09-10 回填（G1 真机证据 + code 层）

| 状态 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|
| 未扫（idle） | PASS·code | PASS（G1 真机：空态 A 逐字实证 uand-01/09） | PASS（G1：空态 A widget_test 断言+真机） | UI_G1_P001_FINAL §1 #8；U-WX=同码 code-verified |
| 扫描中（scanning，工具条标签） | PASS·code | PASS（G1 真机：danger 停止键+「扫描中 · 5s 会话」标签实证 uand-02） | PASS（G1 真机：danger 键 9437 红像素+PulseDot fand-02） | UI_G1 §1 #3/9 |
| 完成（5s 自动停+toast「发现 N 台」） | PASS·code | PASS（G1 真机：「扫描完成 · 发现 8 台」dump 逐字） | PASS·code（同口径实现；toast 断言待运行态复核） | UI_G1 §1 #3 |
| 失败（failed，横幅+重试） | PASS·code（scan_failed 横幅组件对齐；10001 modal 文案偏差 E1 登记） | PASS（横幅）/ FAIL 登记（10001 modal 文案≠正典，E1 受 F 域证据链约束延后） | FAIL 登记（蓝牙未开走 B8 横幅而非 10001 modal，E2） | UI_G1 §1 #10/§2 E1-E3——三端各一子偏差，待 F 域证据链更新窗口统一修复 |
| 权限态（微信授权引导） | code（宿主弹窗承接，待 U-WX 截图复核） | PASS（G1 真机：点「开始扫描」即时触发系统定位弹窗 uand-06） | ALLOWED_PLATFORM_DIFF（init 时机 vs 首扫触发，E3 登记） | UI_G1 §1 #11 |

## 3. BLE 连接会话 8 态（STATE_MACHINE §1 · session-registry）

| # | 状态（正典名） | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 1 | idle | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 2 | connecting | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 3 | discovering（服务发现） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 4 | ready | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 5 | disconnecting（主动断开，2s marker） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 6 | disconnected（被动断线） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 7 | reconnecting（1s/3s/5s ×3） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 8 | failed（重连耗尽/超时 10s） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

> 状态名以 STATE_MACHINE §1 正典为准；本表行名如与正典有出入，以正典为 SINGLE SOURCE，登记 TEST_MATRIX_DEFECT 后修正本表。

## 4. 广播会话 6 态（STATE_MACHINE §5 · P008）

| 状态 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|
| idle（未就绪/已停止） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 启动中/已就绪 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 广播中 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 停止 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 失败 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 平台不支持分支 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## 5. Smart HID 配网工作流（STATE_MACHINE §3/§4 · P002）

| 状态/阶段 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|
| phase=connect（connecting） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| connect 错误（identity_failed，重新连接/返回） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| phase=configure（断线 connectionLost，表单保留） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| pairingReady（badge 必需→已获取） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| provisioning（60s 跟踪中） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| provisionDone（ready，四行全绿） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 错误恢复 8 错误码→4 动作（form/pairing/diagnostics/retry） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 设备侧 STATUS 步进（wifi/hub/conn/usb 四行 × pending/active/done/fail/warn） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 超时/取消等待 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## 6. 诊断页状态（STATE_MACHINE §8 · P005）

| 状态 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|
| offline（未连接，modal「连接并检测」） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 检测中（checking，按钮禁用） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 完成（live，五行结论） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 五行行态（ok/warn/fail + pending/active） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| error（检测失败，lastError+modal） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## 7. OTA 事务 12 态（STATE_MACHINE §6 · P006 子流程，端到端 BLOCKED P-03）

| 状态（枚举全集以 ota-manager 为准） | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|
| pick（选包） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| validating（六重校验） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| subscribing（订阅 STATUS） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| starting（start→ready 30s） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| transferring（分包进度） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| committing | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| verifying（版本回读比对） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| success（2s 自动关闭） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| failed（六包错误+五运行错误） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| cancelled（abort） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 其余枚举（以 ota-manager 全集核对补齐） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## 8. 服务面板五态（STATE_MACHINE §9 · P006）

| 状态 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|
| idle | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| connecting | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| ready | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| empty（服务发现为空专用文案） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| error（+手动重试 ×3） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
