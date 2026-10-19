# FLOW · App（流程 · Android 实例）

> 平台设计说明之三 · 2026-09-03
> 流程正典 = [03_flow/USER_FLOW.md](../../../03_flow/USER_FLOW.md)（S1–S6）。本文件登记 Android 平台在正典流程上的**插入环节**。

## 1. S1 扫描发现（权限链插入）

```
开始扫描 → [Android 插入] FINE_LOCATION 系统弹窗
   ├─ 允许 → 基线扫描流程（渐进发现 → 列表）
   └─ 拒绝 → 横幅（bluetooth_permission_denied）→ 重试
        ├─ 再次弹窗（系统仍询问）
        └─ 第二次拒绝 → 永久拒绝 → 重试即「去设置」（应用详情›权限）→ 开启 → 回流自动续扫
蓝牙关闭分支：modal 去设置 → Intent 系统蓝牙设置 → 开启 → 返回应用 → 继续权限链/扫描
```

## 2. S2 配网（V1 简化直连）

```
下发配置 → INPUT 分帧明文 write → 基线四行进度（wifi/hub/conn/usb）→ READY → P003
   └─ 若设备仍为旧加密固件 → 单次写失败 → 提示重烧 V1 简化固件
Android 与其他平台一致：不发起 SMP，不出现系统配对弹窗，也不等待配对后重试。
```

## 3. S4 广播（权限链 + Intent + 增强参数）

```
开始广播 → [Android 插入] 系统蓝牙关闭? → Intent 去系统设置 → 开启续链
        → 逐项权限：BLUETOOTH_ADVERTISE → BLUETOOTH_CONNECT
             ├─ 全允许 → 基线启动（日志含 mode/power/connectable · LysBlePeripheral）
             └─ 任一拒绝 → 缺失汇总 modal → 去设置开启
超 31B（按三开关口径核算）→ 拦截不截断（BR-05）。
```

## 4. 出口流程

外链→系统浏览器；分享→系统分享面板（失败降级复制）；日志导出→系统分享（文件候选拦截）。

## 5. 守则

前台生命周期同基准（BR-06）；后台保连未决策不实现；权限全部**用户触发**（不启动即不请求，PERMISSION_REVIEW §4）。
