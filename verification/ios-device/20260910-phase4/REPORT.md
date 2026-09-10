# 第四阶段：原生 iOS 真机（签名）+ 包名规划 — 验证报告

- 日期：2026-09-10
- 分支：refactor/uniapp-v1
- 设备：iPhone 11 Pro (iPhone12,3)，iOS 26.5.2，UDID `00008030-001211062EC0802E`
- 工具链：Xcode 26.1.1 (17B100)、xcodegen 2.44.1、Flutter 3.38.5

## 1. 判定总表

| # | 项目 | 判定 | 关键证据 |
|---|---|---|---|
| 1 | 签名链验证（证书×profile×真机） | **PASS** | 通配 profile `iOS Team Provisioning Profile: *`（711a0591，72MZZQB893，exp 2027-01-29，get-task-allow=true）内嵌本机 Apple Development 证书（SHA1 `88705da9…`/`4b44c08a…`）；设备清单含本机 iPhone |
| 2 | 包名规划文档 + 全端整改 | **PASS** | `docs/specs/10_platform/BUNDLE_IDS.md` 定稿；7 端改名落地（见 §3） |
| 3 | 原生 iOS 真机构建 | **PASS** | `xcodebuild … -destination id=00008030-…` BUILD SUCCEEDED，签名 = Apple Development + 通配 profile（ios-device-build.log 末段） |
| 4 | 真机安装 | **PASS** | devicectl install：bundleID `com.smartble.ios` v2.0.0 装入 `/private/var/containers/Bundle/Application/D24B5678…/`（device-install.log） |
| 5 | 真机首启 | **PASS** | devicectl launch 成功，6s 后进程表存活 PID 5384（路径与安装容器一致；UI 渲染未闪退）（device-launch.log） |
| 6 | 产物包名/entitlements 核验 | **PASS** | `Identifier=com.smartble.ios`、`TeamIdentifier=72MZZQB893`、`application-identifier=72MZZQB893.com.smartble.ios`、get-task-allow=true（开发签名预期） |
| 7 | Flutter macOS Release 真签名（N-3 收口） | **PASS** | Release 配置注入 `CODE_SIGN_IDENTITY=Apple Development` + `DEVELOPMENT_TEAM=72MZZQB893` + `CODE_SIGN_INJECT_BASE_ENTITLEMENTS=NO`；重建后 entitlements 仅 app-sandbox + bluetooth，**get-task-allow 消除**；TeamIdentifier=72MZZQB893；首启进程存活（flutter-release-resign.log） |

## 2. 签名事实（本机核验，供后续阶段引用）

- **证书**（3 张有效）：
  - Apple Development ×2 —— CN 显示 `(L5Q7JP9RH9)`，但 **OU=72MZZQB893 才是权威团队**（通配 profile 内嵌二者可证；CN 括号为证书显示名残留，勿据此选团队）。
  - Apple Distribution ×1（72MZZQB893）——App Store 上架用。
  - **Developer ID Application 未配置**——macOS 店外分发/公证（Phase 5 桌面正式化）时需补。
- **通配 profile**：`iOS Team Provisioning Profile: *`，任意 bundle id 可开发签名装机，有效期至 **2027-01-29**，设备 4 台在册。
- 上架时再注册显式 App ID（自动签名可代劳）；本阶段全部走通配，未消耗新 App ID。

## 3. 包名整改前后（详情见 BUNDLE_IDS.md）

| 端 | 旧 | 新 |
|---|---|---|
| 原生 iOS | com.luoyaosheng.smartble.ios | **com.smartble.ios**（project.yml ×4 + xcodegen 再生 pbxproj + README + ExportOptions teamID） |
| 原生 macOS | com.smartble.desktop | **com.smartble.macos** |
| Electron | com.smartble.desktop（撞名） | **com.smartble.electron** |
| Tauri | com.smartble.desktop（撞名） | **com.smartble.tauri** |
| 原生 Android | com.smartble（裸根） | **com.smartble.android**（applicationId；namespace 不动） |
| uni-app | 空（云打包手填） | **com.smartble.uniapp**（distribute.android.packagename + distribute.ios.appid 新增字段；nativePlugins 内空字段是插件坐标，未动） |
| Flutter 全端 | com.smartble.flutter | **不动**（macOS/Android 已一致，跨端一码） |

整改前问题：原生 macOS/Electron/Tauri 三端共用 `com.smartble.desktop`（同机互覆、TCC 与日志不可区分）；iOS 带个人名；Android 裸根；uniapp 空置。

## 4. 附带发现与移交

1. **旧包并存**：真机上仍有 `com.luoyaosheng.smartble.ios`（进程表另有残留 PID 4834）。新旧 bundle id 并存互不影响；旧包由用户在手机上自行删除（未代删）。
2. **iOS 真机 BLE 无线电回归未跑**：本阶段口径为签名链+装机+首启；手机上 App 已在场，扫描页手动冒烟（应见 midea/iphone 广播）用户开屏即验；自动化 UI 回归（XCUITest on device）待排期。
3. **macOS Release 分发签名**：现为 Apple Development 真签名（本机运行 ✓），spctl 仍 rejected（origin=Apple Development）——店外分发需 Developer ID + 公证，**Phase 5 桌面正式化统做**。
4. 通配 profile 2027-01-29 到期前需留意（自动签名会自动续期）。

## 5. 复现命令

```bash
# 证书/profile 核验
security find-identity -v -p codesigning
security cms -D -i <profile> | plutil -p -   # 团队/设备/证书/entitlements

# 原生 iOS 真机（包名已 com.smartble.ios）
cd apps/ios && xcodegen generate
xcodebuild -project SmartBLE.xcodeproj -scheme SmartBLEiOS \
  -destination 'id=00008030-001211062EC0802E' -configuration Debug \
  -derivedDataPath build/DerivedData build
xcrun devicectl device install app --device 00008030-001211062EC0802E \
  build/DerivedData/Build/Products/Debug-iphoneos/SmartBLE.app
xcrun devicectl device process launch --device 00008030-001211062EC0802E com.smartble.ios

# Flutter macOS Release（N-3 已收口）
cd apps/flutter && flutter build macos --release
codesign -d --entitlements :- build/macos/Build/Products/Release/smart_ble.app
```

## 6. 证据清单（logs/）

- `ios-device-build.log` —— 真机构建全量日志（196K，含签名块：Apple Development + 通配 profile 711a0591）
- `device-install.log` —— devicectl 安装（bundleID com.smartble.ios）
- `device-launch.log` —— devicectl 启动 + 进程存活检查
- `flutter-release-resign.log` —— Release 重建（50.0MB）+ entitlements/spctl 核验
