# integration-notes.md — r5 增补（2026-09-04）

本轮（store-readiness）无禁改区冲突、无共享文件改动；以下为**信息性登记**，供 Windows Gate 决策与后续 spike 接力。

## S12. 上架就绪链路事实（信息性，无禁改区修改）

1. **沙盒 + ad-hoc → CoreBluetooth `.unsupported`（双侧、双启动方式）**
   - 2×2 实证矩阵：非沙盒×{直接执行, open} 均 poweredOn；沙盒×{直接执行, open} 均 unsupported。
   - 空 entitlements + hardened runtime 对照正常 → 单变量为 `com.apple.security.app-sandbox`。
   - `com.apple.security.device.bluetooth` 键不存在/无效：ad-hoc 下 AMFI 启动期直接杀死进程。
   - 影响：**MAS 形态的 BLE 能力无法在无账号环境提前证明**；spike 结论中 MAS 相关表述必须带此限定。真实签名链（Apple Distribution + profile，Team ID 在位）落地后需第一优先回归（方法见 store-readiness.md B-1）。
   - 对 S8（Flutter macOS 适配）同样适用：Flutter 上架 MAS 走沙盒时将遇到同一验证边界。

2. **App Sandbox 在 ad-hoc 签名下即被内核执行**（容器 home 重定向 + 容器外写阻塞，未签名对照 OFF/exit3）→ 无账号环境可验证沙盒行为学（非 BLE 能力），SandboxProbe 可复用于 Flutter 侧。

3. **本机签名身份盘点**（未使用、未记录私钥）：存在 Apple Development ×2 与 Apple Distribution ×1；**无 Developer ID Application**。含义：MAS 路线签名前提已在机器上，差 App ID/profile/ASC；Developer ID+公证路线需先建证书。

4. **图标资产只读复用**：`apps/flutter/assets/brand/icon.png`（512）→ `Resources/AppIcon.icns` + `AppIcon-1024.png`（squircle 化脚本 `scripts/macos/make-app-icon.sh` 可复跑）。禁改区零修改；1024 市场图标为上采样（品牌方若有 ≥1024 源图可直接替换重跑）。

5. **SPM Release 通用二进制可移植性**：系统 ABI 稳定 Swift 运行库（`/usr/lib/swift/*`），无工具链 rpath。对 S8 的含义：Flutter 之外的原生辅助工具同样可按此打包。

## Windows Gate 积压（累计）
S5（CommandQueue 修复）/ S8（Flutter macOS 桌面适配，注意第 1 条同适用）/ S9（多设备会话）/ S10（OS 维度真实宿主策略）/ S11（分发链事实）/ **S12（本文件）**。
