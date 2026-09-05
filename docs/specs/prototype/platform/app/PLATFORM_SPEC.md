# PLATFORM_SPEC · App（Android 实例 · D1 首批 P2）

> 平台设计说明之一 · 依据《平台设计说明规范 v1.0》§3 · 2026-09-03
> 三引用：① 基准 = [prototype/v1-new](../../v1-new/) ② 能力/限制 = [10_platform §2.2](../../../10_platform/PLATFORM_EXTENSION.md) ③ 差异设计 = 10_platform §4 App 列。
> iOS：现状 NOT_RELEASED（能力矩阵「待开发」列），随 App 后续评估，不占本实例。

## 1. 架构：基准内核 + 平台覆写层

`high-fi/` 的内核文件（app.js / pages / components / assets / mock-data）**字节复制自基准**；平台差异全部收敛在 `android.js` 覆写层（加载于内核之后）：

- **ACTION 覆写**（运行时替换 `APP.ACTIONS` 条目，原函数保留回调）；
- **renderAll 后处理**（P008 Android 增强表单注入 + 开关感知预算重算）；
- **defaults 包装**（P008 platform 固定 'android'，复位不丢失）。

基线零改动 ⇒ 基准回归即平台回归的大半，评审只看覆写层一个文件。

## 2. 优势 / 限制（10_platform §2.2）

- **优势**：系统能力完整——原生插件广播已有（LysBlePeripheral，F015 现状）；可后台受限保连【候选】；系统文件选择；系统级分享。
- **限制**：iOS 需原生开发（NOT_RELEASED）；后台连接受 Doze/电池优化约束；商店分发成本。

## 2b. 生态矩阵口径（2026-09-03 三份入库 · 呈现层）

评审栏注入「生态能力矩阵」卡（`11_ecosystem/PLATFORM_CAPABILITY_MATRIX_v1.0.md` **UNI-APP-AND 行**）。本行与本项目实证**全量一致，直接吸收**，无冲突项：广播监听/发送 ✅、长连接 ✅（后台保连=候选不做）、自动重连 ✅（F012 前台会话内）、多设备 ✅（F013）、OTA ⚠️（现版 F025 BLOCKED）。卡内另标注 **iOS（UNI-APP-IOS）NOT_RELEASED 待开发**（随 App 线评估）；微信侧冲突 C1/C3 标注于 wechat 实例，不在本卡（[ALIGNMENT_NOTES §2](../../../11_ecosystem/ALIGNMENT_NOTES.md)）。仅呈现，不改产品逻辑。

## 3. 差异设计（10_platform §4 App 列 → 覆写点）

| 差异点 | 覆写实现（high-fi/android.js） |
|---|---|
| 权限模型：运行时权限 + 清单引导 | `p001-scan` 覆写：FINE_LOCATION 弹窗 → 拒绝横幅 → 二次拒绝=永久拒绝 → 仅剩系统设置引导（回流自动续扫） |
| 广播前置：SDK≥31 逐项权限 + 系统蓝牙 Intent | `p008-start` 覆写：ADVERTISE→CONNECT 逐项；拒绝→缺失汇总 modal + 去设置；btOff→Intent 系统蓝牙设置 |
| BLE 写语义：V1 简化明文直连 | 不覆写 `p002-submit`：沿用基准分帧写入；不得弹系统配对；旧加密固件错误立即提示重烧 |
| 广播增强：模式/功率/三开关 | renderAll 后处理：激活基线静态 picker + 注入三开关；预算按开关重算；超限拦截 |
| 分享/外链/日志导出 | `p009-openweb`→系统浏览器、`p009-shareapp`/`*-logexport`→系统分享面板（失败降级复制；文件为候选拦截） |
| 推广卡（F028 · 2026-09-03） | `p009-promo` 覆写：非微信渠道承接 sheet = 小程序码（示意图形）+ 打开落地页（`asysBrowser` 系统浏览器，实证 `plus.runtime.openURL`）+ 长按识别/保存（演示）——App 无 `navigateToMiniProgram` |

## 4. 生命周期

后台受限保连为**候选未决策**（默认不实现）；前台生命周期同基准（BR-06）。

## 5. 候选增强（未决策 · 默认不做）

后台保连 / 日志导出文件（分享面板中标注「候选」并拦截）/（蓝牙快捷设置：现状已有 Intent，无新增）。做任何一项须先回写 10_platform §4 并补三查。
