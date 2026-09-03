# DEPENDENCY_LIST —— 外部依赖清单

> SOP v2.0 Phase 1 产出 · 2026-09-02
> 事实源：REVERSE_ANALYSIS §8（外部依赖）。

## 1. npm 依赖（apps/uniapp/package.json）

| 包 | 版本 | 用途/状态 |
|---|---|---|
| @dcloudio/uni-ui | ^1.5.7 | 死依赖（源码零使用） |
| pinia | ^3.0.4 | 状态管理（在用） |

vue / vue-i18n 由 HBuilderX 编译器内置；历史 vue-i18n@9.14.4 当前未列。

## 2. 平台 API 依赖（uni.\* / wx.\*，收敛点见 TECH_STACK §2）

| 域 | API |
|---|---|
| 适配器 | openBluetoothAdapter（微信外围模式带 mode:'peripheral'）/ onBluetoothAdapterStateChange / closeBluetoothAdapter |
| 扫描 | startBluetoothDevicesDiscovery / stopBluetoothDevicesDiscovery / onBluetoothDeviceFound |
| 连接 | createBLEConnection / closeBLEConnection / onBLEConnectionStateChange / setBLEMTU |
| GATT | getBLEDeviceServices / getBLEDeviceCharacteristics / readBLECharacteristicValue / writeBLECharacteristicValue / notifyBLECharacteristicValueChange / onBLECharacteristicValueChange |
| 微信外围广播 | wx.createBLEPeripheralServer / server.startAdvertising / stopAdvertising / close |
| 权限（scan-permission.js） | wx.getAppAuthorizeSetting / openAppAuthorizeSetting / openSetting / getSetting / showModal / authorize(scope.userLocation) |
| 其他 | uni.scanCode（配网扫码）/ uni.setClipboardData / uni.showModal / uni.showToast / uni.navigateTo·navigateBack·redirectTo·switchTab / uni.navigateToMiniProgram / uni.share（APP）/ wx.chooseMessageFile + FileSystemManager（OTA 选文件）/ uni.getDeviceInfo / uni.getAccountInfoSync / onShareAppMessage·onShareTimeline |

## 3. App 原生桥（plus.\*，仅 APP 条件编译）

plus.android.importClass（BluetoothAdapter/Intent/Settings/Uri/Build/PackageManager）、plus.android.runtimeMainActivity、plus.android.requestPermissions、plus.runtime.getProperty/openURL、uni.requireNativePlugin('LysBlePeripheral')。

## 4. 原生插件 LysBlePeripheral

Android AAR（fastjson 1.1.46 + appcompat 1.6.1，minSdk 21）+ iOS framework（CoreBluetooth ≥10.0）；JS API：isSupported / startAdvertising / isAdvertising / stopAdvertising；文档 docs/readme-LysBlePeripheral.md。

## 5. 硬件 / 固件协同依赖（跨仓）

| 依赖 | 契约 | 状态 |
|---|---|---|
| **Smart HID 设备**（ESP32-S3，Smart-HID-Workspace 固件） | 配网 GATT 服务 `9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04`（INFO 1002 read+notify / INPUT 1003 write 加密 Just Works / STATUS 1004 read+notify）；名称前缀 `SHID-`；QR scheme `shid://pair?token=&host=&port=`；协议正典 = Smart-HID-Workspace `protocols/ble/PROVISIONING_V1.md`，本仓 core/protocols 为受锁镜像 | tested_smart_hid_version 1.1.1；契约锁 miniapp_version 1.0.4 滞后于 1.0.5 |
| **LightBLE ESP32 外设/观察者固件** | OTA 服务 `4fafc201-…-914d`（CTRL 26c0 / DATA 26c1 / STATUS 26c2，JSON 协议）；OTA target lightble-peripheral / lightble-observer | OTA 端到端 BLOCKED |
| **ESP32 演示设备** | 服务 `4fafc201-…-914b`（esp32-demo Profile，framing raw） | 演示档案 |
| ControlHub | HID 实时控制（keyboard/mouse/system，MQTT）**不经小程序**——hid-command-schema.ts 仅为文档/联调对照契约 | — |

## 6. 外链资源（仅展示，无网络请求）

官网 lightble.i2kai.com / Gitee Issues / 同开发者小程序：萌喵圈 `wxe0ed0e6727a0a5cd`、宝宝点滴 `wx1bb2d5c6821a7883`（config/product.js RELATED_MINI_PROGRAMS）。

## 7. 构建与测试工具链

HBuilderX（编译）/ 微信开发者工具 CLI（env.js executablePath，automator port 9420，E2E 前提）/ node:test ×29（仓库根）/ uni-automator ×2（本工程）/ scripts/generate-release-metadata.mjs（【未知】脚本细节）。
