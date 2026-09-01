# ESP32 Observer 夹具执行模板（TEST-E-006 / E5）

> 状态：模板；Owner：Smart BLE QA；环境：Observer 夹具 + 手机广播

## 步骤

1. Observer 上电，串口 115200 开始捕获 JSON 流
2. 手机 PAGE-008 开广播：31B 内字段逐项核对原始字节
3. 32B 超预算场景：手机端必须阻止（Observer 不应看到该帧）
4. 速率：≥5 条/秒不丢帧（环形缓冲验证）

## 证据

- Observer JSON 流为手机 Peripheral 的**正式证据**（EVID 等级高于手机自述）

## 清理

- 停止广播；保存串口捕获文件
