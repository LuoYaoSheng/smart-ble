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

- 内核文件**字节复制自 v1-new**（components.js = v1.0.1，2026-09-03 用户走查修正后重同步：SHID 卡恢复标准「连接」入口，特殊设备 = 标准设备的扩展）；平台差异全部在 `android.js`：ACTION 运行时覆写（权限链/分享导出）+ renderAll 后处理（广播 Android 增强表单 + 三开关预算重算）+ P008 defaults 包装（platform 固定 android）。
- 覆盖差异：FINE_LOCATION 权限链（拒绝→横幅→永久拒绝→清单引导回流）/ 广播前置权限链（ADVERTISE→CONNECT + 蓝牙关闭 Intent）/ 广播增强（模式·功率·三开关实时参与 31B 预算）/ 系统分享 + 系统浏览器 + 日志导出。P002 与基准一致为 V1 明文直连，无系统配对覆写。
- **生态能力矩阵卡（2026-09-03 生态三份入库轮）**：评审栏注入 11_ecosystem 矩阵 UNI-APP-AND 行——与本项目实证**全量一致，直接吸收**（广播发送 ✅ LysBlePeripheral / 长连接 ✅ / 多设备 ✅ / OTA ⚠️ 现版 F025 BLOCKED）；另标注 iOS（UNI-APP-IOS）NOT_RELEASED 待开发。
- SOP §10 三引用逐差异点登记于 PAGE_SPEC §2。

## 3. 三查自评（SOP §11 / 10_platform §7）

| 查 | 结论 |
|---|---|
| 功能保留 | ✅ 页面全集自带（9 页 44 场景同基准）；六域能力矩阵 Android 全 ✅（10_platform §3） |
| 限制合规 | ✅ 权限全部用户触发（PERMISSION_REVIEW §4）；拒绝/蓝牙关闭均有显式引导与恢复；V1 配网不触发系统配对；超限拦截不截断（BR-05） |
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
| high-fi/assets/android.css | 系统还原层（权限/分享/设置/浏览器弹窗；历史配对样式不再由 V1 流程调用） |
| high-fi/android.js | 平台覆写层（ACTION 覆写 + 后处理注入，基线零改动） |
| low-fi/index.html | 线框（注入点标注） |

## 6. 开发注意事项（映射 uni-app App·Android）

1. 权限：`plus.android.requestPermissions`；「去设置」= 应用详情 Intent（旧实现现状 PAGE_SPEC P008 / F015）。
2. 配网写入：V1 简化使用普通 write，不调用系统配对；遇旧加密固件错误立即提示重烧，不自动重试。
3. 广播：LysBlePeripheral options（mode/power/connectable/includeName/includeUuid）；预算算法与基准同源。
4. 分享/浏览器：`uni.share`（失败降级 `uni.setClipboardData`）/ `plus.runtime.openWeb`。
5. 候选红线：后台保连 / 日志文件未决策不得实现（BR-12）。

## 7. 验证记录

- 2026-09-05（V1 简化回归）：真实浏览器进入 P002、连接态→填写态→`pairing_expired` 下发状态流；平台覆写标识为「V1 零配对」，DOM 全程未出现系统配对/PIN 层；console 0 error。
- 2026-09-03（修正轮）：内核重同步后回归 4/4 —— SHID 卡双入口（v1.0.1，配置 + 连接）/ 权限链包装仍生效（位置权限弹窗 → 授权 → 扫描出卡）/ P008 platform=android 且三开关注入；console 0 error。初轮 23/23（权限链全路径 / 永久拒绝回流续扫 / 配对取消-重试-失败-成功 / 预算开关联动 / 超限禁用 / 广播中输入禁用 / 系统分享含候选拦截行；修复 1 处真实缺陷 P008 defaults 复位丢 platform → defaults 包装）见 git 历史。
- 2026-09-03（生态矩阵轮，v1.2.0）：8/8 —— 矩阵卡（UNI-APP-AND 行 + iOS 待开发 + OTA BLOCKED）/ 权限链 + SHID 双入口回归 / P008 矩阵卡与 Android 增强表单并存；console 0 error；内核 diff 零差异。
- 2026-09-03（历史全量复走轮）：当时 P002 仍演示系统配对；该行为已被 2026-09-05 V1 简化决策取代。当前 P002 明文直连，无 PIN 弹窗；其余权限、广播、分享与矩阵检查保持。
- 2026-09-03（推广承接轮，v1.3.0）：13/13 —— `p009-promo` 覆写为非微信渠道承接 sheet（用户指示：App 无 navigateToMiniProgram → 落地页 + 小程序码）：小程序码示意 128px 三定位角 + 打开落地页（asysBrowser 系统浏览器还原 lightble.example.com，实证 plus.runtime.openURL）+ 保存演示 toast + 双推广卡入口；note 行内排版与按钮单行在 sheet 内复核；console 0 error；内核 diff 零差异（仅覆写层与壳）。
