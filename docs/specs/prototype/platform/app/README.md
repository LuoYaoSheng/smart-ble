# App · Android 平台原型（D1 首批 P2）

> 2026-09-03 按三规范重构：由「差异原型（6 屏）」升级为**完整平台实例**（基准内核 + 平台覆写层），页面全集自带。
> 说明文档四件套：[PLATFORM_SPEC](PLATFORM_SPEC.md) · [PAGE_SPEC](PAGE_SPEC.md) · [FLOW](FLOW.md) · [COMPONENT_RULE](COMPONENT_RULE.md)
> iOS：NOT_RELEASED，随 App 后续评估（能力矩阵「待开发」列）。

## 1. 结构

```
app/
├── low-fi/index.html    线框：9 页 × 状态 × 流程 + 每页「平台差异注入点」
├── high-fi/             完整实例：基准内核（字节复制）+ android.js 覆写层
├── PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE.md
└── README.md（本文）
```

## 2. high-fi：基准内核 + 覆写层

- 内核文件**字节复制自 v1-new**（components.js = v1.0.1，2026-09-03 用户走查修正后重同步：SHID 卡恢复标准「连接」入口，特殊设备 = 标准设备的扩展）；平台差异全部在 `android.js`（约 300 行）：ACTION 运行时覆写（权限链/系统配对/分享导出）+ renderAll 后处理（广播 Android 增强表单 + 三开关预算重算）+ P008 defaults 包装（platform 固定 android）。
- 覆盖差异：FINE_LOCATION 权限链（拒绝→横幅→永久拒绝→清单引导回流）/ 广播前置权限链（ADVERTISE→CONNECT + 蓝牙关闭 Intent）/ 系统配对（PIN · 取消 2s 重试一次 · 二次取消失败恢复【未知】登记）/ 广播增强（模式·功率·三开关实时参与 31B 预算）/ 系统分享 + 系统浏览器 + 日志导出。
- **生态能力矩阵卡（2026-09-03 生态三份入库轮）**：评审栏注入 11_ecosystem 矩阵 UNI-APP-AND 行——与本项目实证**全量一致，直接吸收**（广播发送 ✅ LysBlePeripheral / 长连接 ✅ / 多设备 ✅ / OTA ⚠️ 现版 F025 BLOCKED）；另标注 iOS（UNI-APP-IOS）NOT_RELEASED 待开发。
- SOP §10 三引用逐差异点登记于 PAGE_SPEC §2。

## 3. 三查自评（SOP §11 / 10_platform §7）

| 查 | 结论 |
|---|---|
| 功能保留 | ✅ 页面全集自带（9 页 44 场景同基准）；六域能力矩阵 Android 全 ✅（10_platform §3） |
| 限制合规 | ✅ 权限全部用户触发（PERMISSION_REVIEW §4）；拒绝/蓝牙关闭/配对取消均有显式引导与恢复；超限拦截不截断（BR-05） |
| 增强利用 | ✅ 已用：原生广播增强、系统分享、系统浏览器。候选未决策默认不做：后台保连 / 日志文件（面板内标注「候选」并拦截） |

## 4. 运行

```bash
cd docs/specs/prototype/platform && python3 -m http.server 8952
# high-fi：http://127.0.0.1:8952/app/high-fi/index.html
# low-fi ：http://127.0.0.1:8952/app/low-fi/index.html
```

## 5. 资源清单

| 文件 | 来源 |
|---|---|
| high-fi/{app.js, mock-data/, pages/, components/, assets/{tokens,components,pages}.css} | **字节复制自 v1-new**（diff 校验） |
| high-fi/assets/android.css | 系统还原层（权限/配对/分享/设置/浏览器弹窗；Material 还原值豁免，头注声明） |
| high-fi/android.js | 平台覆写层（ACTION 覆写 + 后处理注入，基线零改动） |
| low-fi/index.html | 线框（注入点标注） |

## 6. 开发注意事项（映射 uni-app App·Android）

1. 权限：`plus.android.requestPermissions`；「去设置」= 应用详情 Intent（旧实现现状 PAGE_SPEC P008 / F015）。
2. 系统配对：加密写（writeWithType=encrypted）首次触发；自动 2s 重试一次为现状（PAGE_SPEC P002 蓝牙链路）。**二次取消策略旧文档未记载【未知】**，开发期以旧包行为核对。
3. 广播：LysBlePeripheral options（mode/power/connectable/includeName/includeUuid）；预算算法与基准同源。
4. 分享/浏览器：`uni.share`（失败降级 `uni.setClipboardData`）/ `plus.runtime.openWeb`。
5. 候选红线：后台保连 / 日志文件未决策不得实现（BR-12）。

## 7. 验证记录

- 2026-09-03（修正轮）：内核重同步后回归 4/4 —— SHID 卡双入口（v1.0.1，配置 + 连接）/ 权限链包装仍生效（位置权限弹窗 → 授权 → 扫描出卡）/ P008 platform=android 且三开关注入；console 0 error。初轮 23/23（权限链全路径 / 永久拒绝回流续扫 / 配对取消-重试-失败-成功 / 预算开关联动 / 超限禁用 / 广播中输入禁用 / 系统分享含候选拦截行；修复 1 处真实缺陷 P008 defaults 复位丢 platform → defaults 包装）见 git 历史。
- 2026-09-03（生态矩阵轮，v1.2.0）：8/8 —— 矩阵卡（UNI-APP-AND 行 + iOS 待开发 + OTA BLOCKED）/ 权限链 + SHID 双入口回归 / P008 矩阵卡与 Android 增强表单并存；console 0 error；内核 diff 零差异。
- 2026-09-03（全量复走轮）：7/7 —— 端到端用户路径：首扫弹 FINE_LOCATION 系统弹窗→仅此一次→自动扫描→SHID 双入口；P008 ADVERTISE→CONNECT 双权限链→广播启动、关闭「包含设备名称」预算 11/31B 联动；P002 系统配对 PIN 385204；P009 系统分享面板（微信/朋友圈/QQ/钉钉）；矩阵卡 11 行常驻。PLATFORM_SPEC 补 §2b 生态矩阵口径（本行与实证全量一致直接吸收）。console 0 error。
- 2026-09-03（推广承接轮，v1.3.0）：13/13 —— `p009-promo` 覆写为非微信渠道承接 sheet（用户指示：App 无 navigateToMiniProgram → 落地页 + 小程序码）：小程序码示意 128px 三定位角 + 打开落地页（asysBrowser 系统浏览器还原 lightble.example.com，实证 plus.runtime.openURL）+ 保存演示 toast + 双推广卡入口；note 行内排版与按钮单行在 sheet 内复核；console 0 error；内核 diff 零差异（仅覆写层与壳）。
