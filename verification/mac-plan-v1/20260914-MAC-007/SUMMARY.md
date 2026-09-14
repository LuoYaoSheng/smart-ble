# MAC-007 证据：原生 macOS AppKit 发布链

- Host: macOS / Xcode swift toolchain；真实 CoreBluetooth 环境

## 结果（2026-09-14）

| 项 | 结果 |
|---|---|
| 模块测试 target（新增） | Package.swift 增 SmartBLEMacTests；PageContractTests 7/7（九页集/无 P004/四 Tab/switchTab 清栈/go-back/redirect/smartGo 栈复用） |
| swift build / swift test | Build complete；7/7 PASS |
| 深度验证 r2（verify-native-macos.sh，40 行汇总） | EXIT=0：真实扫描/连接/GATT 链（NVC-04 PASS，环境外设 connect+ATT+服务发现）、9/9 页快照、bundle 组装+ad-hoc 签名、MAS 沙盒、soak 12 轮、通用二进制、spctl 预期拒绝 |
| **修复真 bug** | make-app-bundle.sh 漏拷 SwiftPM 资源 bundle（SmartBLE-mac_SmartBLE-mac.bundle）→ 分发二进制启动即崩 "unable to find bundle"；已补拷贝并复验 bundled binary 双管理器 poweredOn |
| ad-hoc Preview | NVP-01/02/03 PASS（公证待 Apple 账号条件，NOT_RUN 红线沿用） |

## Observations（非阻塞）

- UIS-18-OTA FAIL：真实无线电 OTA 对 ESP32 夹具（BLEToolkit-Server）phase=failed——即历史 OTA 契约分歧（R-1/R-2）未决，待用户裁决，不以本轮沿用旧结论关闭。
- UIS-19 SKIP（环境无 9F1D1001 SHID 夹具广播）；NVC-05 BLOCKED_OBSERVER（需第二观察端）。

- Status: PASS_WITH_OBS
