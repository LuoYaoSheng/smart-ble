# r4 集成备注（无禁改区改动，信息性登记）

## S11 · 分发链路平台事实（r4 实测，供 Windows Gate / D2 决策参考）

本轮（20260904-r4）在打包与真实交互验证中实测登记以下平台事实。**未修改任何禁改区文件**，仅登记影响未来共享决策的事实：

1. **ad-hoc 分发边界**：`codesign -s -` 可产出本机可运行的签名 bundle（strict 校验通过），但 `spctl --assess` 按预期拒绝未公证应用。正式分发需要 Developer ID 证书 + notarization（Apple 账号），按协议红线（不使用/不记录账号凭据）本轮 **NOT_RUN**。影响：若 macOS 桌面端进入正式分发阶段，需要 Windows 侧同步决策签名主体与分发渠道（DMG/PKG/直下）。
2. **TCC 责任进程归因**：从已授权终端 `open` 启动 bundle 时，蓝牙权限归因于终端（责任进程）并直接继承，不弹 bundle 自身授权框；`NSBluetoothAlwaysUsageDescription` 的弹框路径仅在 Finder/Dock 冷启动时触发（本轮未演练）。影响：测试环境自动化（脚本/CI）从终端拉起不会验证真实用户首次授权体验——正式验收用例需要补一条 Finder 冷启动路径。
3. **缺声明键不崩溃（macOS ≠ iOS）**：删除两个蓝牙用途键的 NoBT 对照 bundle 从已授权终端直跑不崩溃、蓝牙照常上电。iOS 上同类缺失会触发 API misuse 崩溃；macOS 桌面路径宽松。影响：`apps/flutter/macos/**` 与原生路径都无需为“键缺失即崩”做防御性测试，但键本身仍是分发必需项。
4. **自绘视图的可自动化性**：设备卡 / MenuRowButton 等自绘容器在 AX 树中不暴露 press 动作，元素级自动化不可达；坐标点击依赖屏幕录制权限（本宿主被拒）。建议共享层（S8 Flutter macOS 适配）优先使用标准控件或显式 accessibility，保证 Windows 侧 UI 自动化口径可迁移。

## 关联

- r3 集成备注：`../20260904-r3/integration-notes.md`（S5/S8/S9/S10）
- 本轮证据：`test-results.json`、`walkthrough.md`、`logs/`、`../20260904-r4/snaps/`
