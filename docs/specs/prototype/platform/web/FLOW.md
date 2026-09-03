# FLOW · Web（子集流程）

> 平台设计说明之三 · 2026-09-03
> 流程正典 = [03_flow/USER_FLOW.md](../../../03_flow/USER_FLOW.md)。Web 流程为正典的**子集 + 门禁前置**。

## 1. 主流程：门禁 → 选择 → 调试

```
进入 W1 → 环境门禁（HTTPS + 浏览器 + navigator.bluetooth）
   ├─ 不满足 → insecure_context / 不支持 横幅（域徽章全量联动 UNSUPPORTED）
   └─ 通过 → W2 选择设备
        → requestDevice（过滤：名称前缀 / 服务 UUID）
        → 浏览器选择器单选（取消=用户主动，非错误）
        → 授权即连接 → W3 GATT 工作台
             读取 / 写入 / notify 监听 / 日志（脱敏 BR-04）
             页签失焦：连接保持 + 暂停 UI（不静默断开）
             OTA：弹层说明 BLOCKED（同基准 P-03）
```

## 2. 指引流程（缺失域）

- W4 广播：显式 ✗（无外围 API【待验证】）→ 指引「去小程序/App」+ 四平台对比。
- W5 配网：显式 ✗（S2 依赖扫描发现）→ 指引同上；watchAdvertisements 即便未来可用，纳入配网域仍须回写 10_platform §4 并补三查。

## 3. 出口流程

复制 URL（F029 Web 表达）/ 日志：剪贴板（同基准 F011）或下载 .txt（浏览器下载条还原）。

## 4. 守则

页签可见性守则（BR-06 Web 表达）；无后台常驻语义；不引入任何 HTTP 后端调用（BR-01）。
