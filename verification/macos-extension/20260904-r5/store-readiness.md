# store-readiness.md — Mac App Store 上架就绪清单（r5，2026-09-04）

目标：把「能上架」拆成 **技术侧（本仓库可自主完成）** 与 **账号侧（用户门控，本 session 按红线 NOT_RUN）** 两栏，账号侧给出到命令级的操作序列。本文不含任何账号、密钥、token。

## A. 技术侧：已就绪（本轮验证）

| 项 | 状态 | 证据 |
|---|---|---|
| Release 通用二进制（arm64 + x86_64） | ✅ | NVD-01；`lipo -info` 双架构 |
| Swift 运行库可移植性 | ✅ | NVD-09；`otool -L` 全部指向 `/usr/lib/swift/*` 系统库 |
| AppIcon.icns（squircle + 透明边距） | ✅ | NVD-03；alpha 程序化验证（四角=0/边缘=255），源=apps/flutter/assets/brand/icon.png 只读复用 |
| Info.plist MAS 字段（版本/构建号/分类 utilities/出口合规 false/图标/zh-CN/版权） | ✅ | NVD-02（PlistBuddy 断言） |
| App Sandbox entitlements（仅 app-sandbox，无附加权限需求：无文件/网络/摄像头，日志导出走剪贴板） | ✅ | NVD-04 |
| 沙盒真实生效（容器 home + 容器外写阻塞，未签名对照 OFF） | ✅ | NVD-05（SandboxProbe 双向） |
| MAS 形态 LaunchServices 启动 | ✅ | NVD-06 |
| hardened runtime | ✅ | NVD-04（flags 含 runtime） |
| Gatekeeper 预期行为 | ✅ | NVD-09（ad-hoc 拒绝=预期） |
| 沙盒下 UI 层完整性 | ✅ | NVD-08（9 PASS；BLE 依赖用例见 B-1） |

**产出物**：`scripts/macos/make-app-bundle.sh` → `dist/SmartBLE-macOS-MAS.app`（MAS 形态）、`dist/SmartBLE-macOS.app`（运行形态，BLE 可用）。

## B. 缺口与风险

### B-1. 沙盒 + ad-hoc 下 BLE = .unsupported（平台事实，NVD-07）
- 2×2 定位：非沙盒（直接/open）均 poweredOn；沙盒（直接/open）均 unsupported。空 entitlements + runtime 对照正常；`com.apple.security.device.bluetooth` 键 → AMFI 启动期杀死（该 entitlement 不存在/无效）。
- 推定机制：blued 拒绝无 Team ID 的沙盒客户端。**真实 MAS 签名链下 BLE 是否恢复需账号侧第一步落地后回归验证**（生态旁证：LightBlue 等 BLE 工具长期 MAS 上架）。
- 回归方法：真实签名后跑 `SmartBLE-macOS-MAS.app --soak-scans=3 --bt-report=<容器内路径>`，btState 应= on。

### B-2. 产品完整性（非本轮范围）
GATT 正向链（NVC-04）与广播外部可见性（NVC-05）仍 BLOCKED_FIXTURE/BLOCKED_OBSERVER（需 ESP32/第二观察端）；上架审核前应补真实硬件演示视频与说明。

### B-3. 图标源分辨率
品牌源图为 512×512，1024 市场图标为高质量上采样（可用但细节略软）。若品牌方提供 ≥1024 源图，重跑 `scripts/macos/make-app-icon.sh` 即可。

## C. 账号侧：用户门控链（本 session NOT_RUN）

前提：本机钥匙串已存在 **Apple Distribution** 签名身份（`security find-identity` 可见；未使用、未记录私钥）。无 Developer ID Application 证书（Developer ID 路线需先创建）。

### 路线一：Mac App Store（推荐，与"上架"目标一致）
1. Apple Developer Program 会员（个人或公司；公司需 DUNS）。
2. App Store Connect 建 App 记录；Bundle ID 注册 `com.smartble.desktop`（若被占需改 id 并同步 Info.plist）。
3. 生成并下载 **Mac App Store provisioning profile**（含该 App ID）。
4. 签名与打包（占位符需替换；profile 放 `embedded.provisionprofile`）：
   ```bash
   CERT="Apple Distribution: <你的身份名>"        # security find-identity -v -p codesigning 查看
   APP=apps/desktop/macos/dist/SmartBLE-macOS-MAS.app
   cp <下载的>.provisionprofile "$APP/Contents/embedded.provisionprofile"
   codesign --force --sign "$CERT" --entitlements \
     apps/desktop/macos/SmartBLE-mac/Entitlements.plist \
     --options runtime "$APP"
   productbuild --sign "$CERT" --component "$APP" /Applications SmartBLE.pkg
   ```
5. 首次真机回归 B-1（沙盒 BLE）。
6. Transporter（或 `xcrun altool`）上传 pkg → ASC 提交审核。
7. ASC 元数据：名称/截图（10.14+/Apple silicon 两档）/描述/分级/隐私标签（本 app 无收集、无追踪，全否即可）。
8. 出口合规：Info.plist 已设 `ITSAppUsesNonExemptEncryption=false`（仅系统 BLE/系统加密，属豁免）；ASC 表单同步勾选豁免。

### 路线二：Developer ID 直接分发（不上 MAS，无沙盒强制）
1. 创建 Developer ID Application 证书（本机当前没有）。
2. `codesign --sign "Developer ID Application: ..." --options runtime --deep <app>`
3. `xcrun notarytool submit <zip> --apple-id .../--keychain-profile ...` + `stapler`（需 Apple ID 或 ASC API key 交互授权一次）。
4. 该形态无沙盒 → BLE 行为同 r4 运行形态（已验证可用）。

### 审核注意（两路线通用）
- BLE 硬件依赖：提供演示视频 + "无外设时的功能说明"（页面均可导航、扫描为环境依赖）。
- 名称/图标与品牌一致（图标源=品牌资产，已对齐）。

## D. 结论
技术侧打包链已达 MAS 形态就绪；剩余全部为账号门控步骤与 B-1 的真签名回归验证。结论维持 **VIABLE_WITH_LIMITATIONS**，不宣称完整产品 PASS（GATT/E5 仍待夹具）。
