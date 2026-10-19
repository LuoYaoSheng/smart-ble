# ESP32 Peripheral 夹具执行模板（TEST-E-001..005/007 / E5）

> 状态：模板（Windows Mobile V1 轮已按 §7.1 修订）；Owner：Smart BLE QA；环境：COM 口实测枚举（禁写死 COM3）、115200 串口监视
> 夹具规则：只有一块 ESP32 时，Peripheral 与 Observer **分轮烧录**（先 Peripheral → 再 Observer），同一块板不得同时承担两种角色

## 步骤

1. `pio run -e fixture_peripheral -t upload`（UPLOAD_PORT 用实测枚举的 COM 口；烧录前需已获授权）
2. 串口确认：广播名 BLEToolkit-Server、服务/特征 UUID 与 ble-fixture-target.json 一致
3. 手机连接：LED FF00..FF03 逐条下发并核对效果（三条客户端实现线 U-WX / U-AND / F-AND 分轮覆盖）
4. Notify 订阅：周期数据到达；断开重连计数（TEST-E-002）
5. 故障注入：按 fault_injection 表逐项（发现失败/写失败/断链/delay fault）
6. OTA：**OTA = BLOCKED P-03**——十步正典各步骤+故障相位（start/ready/data/commit/success/version）可测可记录，端到端 OTA 不得宣称已验证

## 证据

- 串口全程 JSON 流 + 手机端截图；固定 commit 记录

## 清理

- 测试后刷回基线固件版本并记录
