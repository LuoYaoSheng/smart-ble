# ESP32 Observer 夹具执行模板（TEST-E-006 / E5）

> 状态：模板（Windows Mobile V1 轮已按 §7.1 修订）；Owner：Smart BLE QA；环境：Observer 夹具 + 手机广播
> 夹具规则：只有一块 ESP32 时先跑 Peripheral 轮、后改刷 `fixture_observer`，分轮承担两种角色；observer 固件构建成功但无实际扫描行为时标 `BLOCKED_FIXTURE`

## 步骤

1. 改刷 `pio run -e fixture_observer -t upload`（实测 COM 口），上电后串口 115200 开始捕获 JSON 流
2. 三条客户端实现线分轮开广播（U-WX 微信小程序 / U-AND UniApp Android / F-AND Flutter Android）：31B 内字段逐项核对原始字节（名称、Service UUID、Manufacturer ID/Data）
3. 32B 超预算场景：手机端必须阻止（Observer 不应看到该帧）
4. 速率：≥5 条/秒不丢帧（环形缓冲验证）
5. 停止广播后该设备不再出现；重启广播可恢复

## 证据

- Observer JSON 流为手机 Peripheral 的**正式证据**（EVID 等级高于手机自述；不得只凭手机端 `start()` 成功判 E5 PASS）

## 清理

- 停止广播；保存串口捕获文件；需要时刷回 Peripheral 固件进入下一轮
