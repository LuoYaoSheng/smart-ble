# SmartBLE 跨平台 UI 组件库指南

SmartBLE 项目在涉及 Web/Electron/Tauri/移动端 的界面开发时，通过 Web Components 机制统一了各端的交互标准。此文档介绍了各个独立组件的职责、引用方式和平台差异说明。

## 设计目标
为确保所有平台用户享有**完全相同的操作流程**和**零学习成本**的排障体验，我们构建了一套多端对齐的组件标准。

## 核心组件拆分

### 1. 设备卡片组件 (`<device-card>`)
负责渲染单一 BLE 设备的微观视图。
- **功能特性**：显示设备名称、UUID/MAC 地址、实时动态更新的 RSSI 信号强度条，以及动态的连接状态按钮。
- **平台映射**：
  - **Flutter/UniApp**: `DeviceCard.dart` / `device-card.vue`
  - **Tauri/Electron**: 位于 `components/DeviceCard.js`
  - **iOS原生**: `DeviceCard.swift`

### 2. 条件过滤组件 (`<filter-panel>`)
用于在高频广播环境中筛选目标设备。
- **功能特性**：提供基于 RSSI（信号阈值）过滤、名称前缀（Prefix）过滤等配置项。过滤参数改变时，发出实时事件重新绘制列表。
- **底层支持**：支持持久化存储最近一次过滤记录，防止重新启动后频繁输入。

### 3. 服务特征值面板 (`<service-panel>`)
负责解析连接后的 GATT 协议树。
- **功能特性**：自动罗列 Primary Service 及其拥有的 Characteristics；根据 Characteristic 的 Properties (Read/Write/Notify/Indicate) 渲染不同形式的交互按钮。
- **跨平台一致性**：特征值数据返回时，将通过 Hex 格式或 UTF-8（当判定为字符串时）展示在对应的卡片行中，数据流响应式更新。

### 4. 日志捕获面板 (`<log-panel>`)
系统级的交互与错误追踪底座。
- **功能特性**：提供不同级别的彩色高亮 (Info/Receive/Send/Error)；支持一键清空及自动滚动到底部；日志数据结构严格遵循 `[时间戳] [设备ID] [内容]` 规范。
- **呈现形式**：在所有平台（iOS除外为 SwiftUI inline pane），均作为底部可随设备详情收起的抽屉或内联面板出现，确保任何操作错误均可第一时间溯源。

### 5. 跨端弹窗对齐 (`<write-dialog>`, `<ota-dialog>`)
- **写入命令 (`<write-dialog>`)**：用于下发十六进制/字符串指令包。
- **OTA 升级 (`<ota-dialog>`)**：封装了固件升级的进度条轮询面板。

---
## 如何在前端容器中引入

以 Electron 和 Tauri 所在的原生 JS DOM 容器为例：

```html
<!-- 在 HTML 中声明载体 -->
<div id="deviceDetailView">
    <service-panel id="mainServicePanel"></service-panel>
    <ota-dialog id="otaDialog"></ota-dialog>
</div>
```

并在 `app.js` 层捕获事件转发到原生层（通过 IPC Invoke 或 Tauri Invoke）：
```javascript
document.querySelector('#mainServicePanel').addEventListener('request-read', async (e) => {
    const { deviceId, serviceUuid, characteristicUuid } = e.detail;
    await window.bleAPI.readCharacteristic(deviceId, serviceUuid, characteristicUuid);
});
```

*注意：此组件层全解耦于底层框架，任何底层框架只需要正确暴露事件通道即可，高度方便二次开源传播！*
