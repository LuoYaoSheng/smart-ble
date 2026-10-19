# 蓝析BLE工具箱 · 名称同步记录

2026-10-19 用户确认正式名称为 **蓝析BLE工具箱**。所有平台、语言、应用显示、关于页、隐私说明、产品主页和上架资料使用此完整名称，不加空格、加号或技术栈后缀。

## 统一信息

| 字段 | 内容 |
| --- | --- |
| 正式名称 | 蓝析BLE工具箱 |
| 简介 | 用于低功耗蓝牙设备扫描、连接与数据调试的工具。 |
| 功能介绍 | 扫描附近的 BLE 设备，查看服务与特征值，进行数据读写和通知订阅。广播、配网等功能按平台与设备能力提供。 |
| 发布文件前缀 | Lanxi-BLE-Toolkit |
| Android / 原生 Apple 应用标识 | com.i2kai.open.smartble |
| 开发者类型 | 个人 |
| 公开支持邮箱 | 121912336@qq.com |
| 统一工程 | smart-ble |

显示名的权威来源为 `release/product-identity.json`。技术模块、程序集、仓库地址、Bundle ID、签名身份与外设型号不随产品更名而变更。ASCII 文件前缀用于跨平台下载文件；系统应用名称仍完整显示为蓝析BLE工具箱。

应用显示名与蓝牙空口设备名分开：原先以产品名称作为广播默认值的客户端改用短名 `LanxiBLE`，避免中文 UTF-8 字节与服务/厂商数据合并后挤占传统广播包预算。硬件示例和协议匹配用的 `SmartBLE`、`BLEToolkit-Server` 等设备标识保持原值。

## 同步范围

- UniApp、Flutter、Kotlin、SwiftUI、AppKit、Electron、Tauri、Wails、Avalonia、Qt 的名称、窗口、应用元数据、关于与隐私文案。
- Apple 工程的产品名、测试宿主和 scheme 产物引用；Windows 产品资源、自动化窗口查找；发布脚本及契约检查。
- 网站标题、导航、搜索关键词、分享元数据、页脚、用户手册、当前产品规范及宣传材料。
- 产品发布矩阵注明更名状态，旧产物路径、哈希和历史验证结果保留原始名称及来源。

## 渠道信息

微信小程序名称字段使用「蓝析BLE工具箱」，简介使用上表内容；其名称占用、审核和线上展示需在微信后台确认。本次信息同步不自动恢复已退役的小程序构建目标。

App Store Connect、国内 Android 商店、桌面下载页及其他已发布内容也应使用相同名称。仓库中的元数据更新不代表渠道后台已修改、网站已部署或新安装包已上传。

## 既有证据与新产物

`release/apple-native-store-build.json`、`release/windows-vm-software-verification.json` 及发布矩阵中的既有产物与测试描述属于旧名称 BLE Toolkit+。这些结果保留用于追溯；新名称的签名包、Windows GUI 与商店提交需要各自重新验收。不能只改旧产物文件名或哈希记录来宣称完成新包验证。

## 本轮验证

- 发布配置和打包路径检查：13 项通过；桌面契约：190 项通过。
- Flutter：分析无问题，156 项测试通过；UniApp：27 个单测文件及 15 个静态门禁通过，H5 与 App 资源构建通过。
- VitePress 官网构建通过，修复 Windows 验证页两处仓库脚本链接。
- Android Debug APK、iOS 模拟器 Debug App、原生 macOS Debug App 构建通过，并读取实际包确认显示名为「蓝析BLE工具箱」。
- Tauri Linux 使用 ASCII 包标识和中文桌面名称，平台配置合并、官方配置类型与桌面模板验证通过；Windows MSI 设置中文语言码页，PowerShell 5 脚本保留 UTF-8 BOM。Linux/Windows 新安装包仍待对应 runner 验证。
- 广播短名 `LanxiBLE` 搭配默认 UUID/厂商数据为 21 字节，包含 3 字节 Flags 后为 24 字节。

本轮没有执行新名称的分发签名、商店上传或渠道后台改名。签名产物、网站上线与微信审核状态应以各自实际结果为准。
