# DESIGN_SYSTEM_INDEX —— 设计系统正典索引（UI-PARITY-G0 冻结）

> 2026-09-09 冻结 · UI-PARITY-G0 任务建立。
> 效力：U-WX（uniapp 微信）/ U-AND（uniapp Android）/ F-AND（Flutter Android）三端视觉统一的**入口正典**。
> 与既有三件套的关系：本目录 [TOKEN.md](TOKEN.md) / [COMPONENT.md](COMPONENT.md) / [PATTERN.md](PATTERN.md)（2026-09-02 冻结 v1.0）继续有效，定义「值与规格」；本索引新增 7 文件定义「机器可校验的单一来源与三端映射」。冲突时以本索引 + 生成器产物为准。

---

## 1. 文件地图

| 文件 | 角色 | 单一来源指向 |
|---|---|---|
| **DESIGN_SYSTEM_INDEX.md**（本文件） | 入口 + 冻结规则 | — |
| [TOKEN.md](TOKEN.md) | Token 规格三件套之一（2026-09-02） | 数值规格 |
| [COMPONENT.md](COMPONENT.md) | 组件规格三件套之二（2026-09-02） | 组件行为规格 |
| [PATTERN.md](PATTERN.md) | 交互模式三件套之三（2026-09-02） | 交互规格 |
| **[TOKEN_REFERENCE.md](TOKEN_REFERENCE.md)** | Token 三端映射参考 | `core/assets-generator/meta/design-tokens.json` |
| **[ICON_CATALOG.md](ICON_CATALOG.md)** | 图标目录（35 枚登记） | `docs/specs/prototype/v1-new/index.html` 内联 sprite |
| **[ICON_USAGE_MATRIX.md](ICON_USAGE_MATRIX.md)** | 图标 × 使用位置授权矩阵 | ICON_CATALOG |
| **[COMPONENT_CONTRACT.md](COMPONENT_CONTRACT.md)** | 公共组件三端契约 | uniapp `components/ui/` ↔ flutter `lib/ui/design/` |
| **[PAGE_LAYOUT_CONTRACT.md](PAGE_LAYOUT_CONTRACT.md)** | 页面骨架与布局契约 | prototype/v1-new `pages.css` |

## 2. 三大单一来源（SSOT）

| 资产 | 单一来源 | 分发产物 |
|---|---|---|
| **Token** | `core/assets-generator/meta/design-tokens.json` | uniapp `styles/tokens.css`（CSS variables）· flutter `lib/ui/design/app_tokens.dart`（`AppTokens`）· legacy `colors.json` 同值对齐（`app_theme.css` / `app_colors.dart`） |
| **Icon** | `docs/specs/prototype/v1-new/index.html` 内联 `<symbol>` sprite（35 枚） | uniapp `services/design/app-icons.js` · flutter `lib/core/design/app_icons.dart`（受锁定镜像，增删改先改 sprite） |
| **Component** | [COMPONENT_CONTRACT.md](COMPONENT_CONTRACT.md) | uniapp `components/ui/*.vue` · flutter `lib/ui/design/*.dart` |

## 3. 冻结规则（本阶段红线）

1. **页面禁止自行定义颜色**：业务页面/组件不得出现圈外 hex；颜色一律引用 Token（CSS var / `AppTokens`）。系统 UI 例外（uniapp tabBar 配置、`pages.json` 原生导航色等平台清单文件）。
2. **页面禁止自行定义图标**：不得使用 Unicode 字符图标（✓ ✕ ▶ ▼ › × 等作 UI 图标）、未登记 png、平台字体图标（`Icons.*` / `CupertinoIcons.*`）。业务代码只能引用 ICON_CATALOG 登记的 semantic icon id，经 `AppIcon` 渲染。
3. **页面禁止自行定义尺寸**：字号/间距/圆角/阴影引用 Token；组件内部尺寸以 COMPONENT_CONTRACT 登记为准。
4. **不触碰范围**：BLE Runtime（`services/ble-runtime/`）、协议（`core/protocols/`）、数据模型、功能范围。
5. **门禁**：`scripts/check-icon-usage.mjs` 与 `scripts/check-token-usage.mjs` 为提交前检查；违例即 FAIL。Apple 双线镜像由 `scripts/check-apple-tokens.mjs`（`npm run check:apple-tokens`）钉死「实现值 == 正典值」（2026-09-10 UI-CONV 加入；LEGACY_DRIFT 漂移容忍清单同轮清零，机制保留）。

## 4. 三端映射总表

| 层 | U-WX / U-AND（apps/uniapp） | F-AND（apps/flutter） |
|---|---|---|
| Token 载体 | `styles/tokens.css` CSS variables（`--c-*`）+ rpx 映射（px×2） | `lib/ui/design/app_tokens.dart`（`AppTokens.*`，px→逻辑像素 1:1） | Apple 双线（N-IOS `NativeDesignTokens.swift` / N-MAC `DSTokens.swift`）为**手写镜像**，不在生成管线 outputs 内，由 check-apple-tokens 钉子锁定（映射登记：09_test/DESIGN_TOKEN_PLATFORM_MAPPING §2/§3） |
| 图标组件 | `components/ui/AppIcon.vue`（data-URI SVG，mp-weixin 无内联 svg） | `lib/ui/design/app_icon.dart`（转接 `core/design/app_icons.dart` 的 `AppIcon` widget，flutter_svg 渲染） |
| 插图组件 | `components/common/app-ill.vue`（4 幅） | `lib/core/design/app_illustrations.dart` `AppIll`（4 幅） |
| 公共组件 | `components/ui/`（AppNavbar/AppButton/…） | `lib/ui/design/`（AppNavbar/AppButton/…） |
| 主题装配 | `App.vue` → `styles/tokens.css` → `styles/design-system.css`（`--ble-*` 别名层兼容旧页） | `main.dart` → `themes/app_theme.dart` → `AppTokens` |
| 页面骨架 | PAGE_LAYOUT_CONTRACT §tab/sub 两型 | 同左 |

## 5. 旧资产处置

| 旧资产 | 处置 |
|---|---|
| `--ble-*`（design-system.css） | 保留为**别名层**：值逐一指向 `--c-*` 正典 var；**2026-09-10 UI-CONV：全部自有 hex（v0 渐变/深字/兜底）收敛正典，`--ble-cyan`/`--ble-gradient-brand` 删除（零消费者），check-token-usage LEGACY_DRIFT 清零**；仅存量页面兼容，新页面禁用 |
| `components/common/app-icon.vue`、`app-navbar.vue`、`empty-state.vue` 等 | 存量页面继续使用；新页面一律用 `components/ui/` 正典组件；后续阶段迁移后删除 |
| `lib/ui/widgets/device_card.dart` 等 | 存量页面继续使用；P001 起改用 `lib/ui/design/` 正典组件 |
| `app_theme.css` / `app_colors.dart`（colors.json 生成） | 值全部对齐 design-tokens.json 正典（清除 #007AFF / #34C759 / #F2F2F7 旧 iOS 色双轨） |
| `static/tabs/*.png`（8 枚） | 系统级 TabBar 图标资产（mp-weixin tabBar 仅收 png），在 ICON_CATALOG §4 登记，不算业务图标违例 |
