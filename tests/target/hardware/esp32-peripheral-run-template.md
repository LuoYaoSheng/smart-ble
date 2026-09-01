# ESP32 Peripheral 夹具执行模板（TEST-E-001..005/007 / E5）

> 状态：模板；Owner：Smart BLE QA；环境：COM 口实测枚举（禁写死 COM3）、115200 串口监视

## 步骤

1. `pio run -t upload`（仅普通构建/烧写授权范围内）
2. 串口确认：广播名 BLEToolkit-Server、服务/特征 UUID 与 ble-fixture-target.json 一致
3. 手机连接：LED FF00..FF03 逐条下发并核对效果
4. Notify 订阅：周期数据到达；断开重连计数（TEST-E-002）
5. 故障注入：按 fault_injection 表逐项（发现失败/写失败/断链）
6. OTA：十步正典 + 故障相位（start/ready/data/commit/success/version）

## 证据

- 串口全程 JSON 流 + 手机端截图；固定 commit 记录

## 清理

- 测试后刷回基线固件版本并记录
