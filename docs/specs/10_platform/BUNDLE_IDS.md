# 包名（Bundle ID / Application ID）规划

> 状态：2026-09-10 定稿（第四阶段）。本文是 smart-ble 家族全部客户端标识的唯一权威来源；新增端先在此登记，再写工程配置。

## 1. 规则

1. **家族根**：`com.smartble`（与仓库名一致，不含个人名、不含拼音）。
2. **第二段 = 端 / 技术路线**，一端一 ID，永不复用：
   - `com.smartble.ios` 原生 iOS（SwiftUI + CoreBluetooth）
   - `com.smartble.macos` 原生 macOS（AppKit/SwiftUI 主线，方案 A 正式端）
   - `com.smartble.flutter` **Flutter 跨端全家（macOS / Android / iOS 未来）**——同一产品一个 ID，各商店命名空间独立，天然合法
   - `com.smartble.android` 原生 Android
   - `com.smartble.uniapp` uni-app（iOS 云打包 bundle id 与 Android package name 同用此 ID）
   - `com.smartble.electron` / `com.smartble.tauri` 桌面技术验证线（第五阶段甄别期保留各自 ID，正式化只留胜者）
3. **测试 target 加后缀**：`*.tests` / `*.uitests` / `*.RunnerTests`，跟随宿主 ID。
4. Android 的 `namespace`（代码包）与 `applicationId`（应用标识）分离：**只规划 applicationId**，namespace 跟随源码目录不动。
5. ESP32 固件不进本表（BLE 设备名前缀 `SmartBLE-*` 已有独立口径）。

## 2. 现状 → 目标（2026-09-10 整改）

| 端 | 工程位置 | 旧 ID | 新 ID | 说明 |
|---|---|---|---|---|
| 原生 iOS | `apps/ios`（xcodegen） | `com.luoyaosheng.smartble.ios` | **`com.smartble.ios`** | 含 `.tests`/`.uitests` 同步；个人名移除 |
| 原生 macOS | `apps/desktop/macos/SmartBLE-mac` | `com.smartble.desktop` | **`com.smartble.macos`** | 原三方撞名，取主语义 |
| Flutter macOS/Android | `apps/flutter` | `com.smartble.flutter` | **不动** | 已合规且双端一致 |
| 原生 Android | `apps/android` | `com.smartble`（裸根） | **`com.smartble.android`** | applicationId；namespace `com.smartble` 不动 |
| uni-app | `apps/uniapp` | 空（云打包手填） | **`com.smartble.uniapp`** | manifest 已写入 ios_bundle_id + android_package_name |
| Electron | `apps/desktop/electron` | `com.smartble.desktop`（撞名） | **`com.smartble.electron`** | appId |
| Tauri | `apps/desktop/tauri` | `com.smartble.desktop`（撞名） | **`com.smartble.tauri`** | identifier |

**整改前的问题**：① 原生 macOS / Electron / Tauri 三端共用 `com.smartble.desktop`，同机安装互相覆盖、日志与 TCC 授权无法区分；② 原生 iOS 带个人名 `com.luoyaosheng.*`；③ 原生 Android 用裸家族根 `com.smartble`；④ uni-app 包名空置。均无线上用户，改名零成本——这就是赶在签名/上架前统一的原因。

## 3. 签名配套（本机事实，2026-09-10 核验）

- **开发证书**：Apple Development: longcan cai（本机 2 张，SHA1 `88705da9…` / `4b44c08a…`），**OU=团队 72MZZQB893**（CN 里的 L5Q7JP9RH9 是证书显示名残留，以 OU 为准）。
- **通配描述文件**：`iOS Team Provisioning Profile: *`（72MZZQB893，`application-identifier=72MZZQB893.*`，`get-task-allow=true`，**有效期至 2027-01-29**），内嵌上述本机证书，设备清单 4 台（含本会话 iPhone 11 Pro，UDID `00008030-001211062EC0802E`）。
- **结论**：任何 `com.smartble.*` 包名都能以 `DEVELOPMENT_TEAM=72MZZQB893` + 自动签名直装开发真机；上架时再注册显式 App ID（Xcode 自动签名会代劳，或开发者后台手工建）。
- **分发证书**：Apple Distribution（72MZZQB893）在册；macOS 店外分发需要的 Developer ID Application **未配置**，第五阶段桌面正式化时处理。

## 4. 变更影响与注意事项

- macOS 沙盒容器按包名隔离：原生 macOS 换 ID 后 TCC 蓝牙授权与容器是全新的（首启会重新弹权限，属预期）。
- Android `applicationId` 变更 = 全新安装，不覆盖旧包；无分发渠道，无影响。
- `verification/` 历史证据中出现的旧 ID（如 `com.smartble.desktop`、`com.luoyaosheng.*`）是**当时事实记录，不回溯修改**。
- 后续新增端（如 Avalonia `com.smartble.avalonia`）沿用第 1 节规则，先改本表再动工程。
