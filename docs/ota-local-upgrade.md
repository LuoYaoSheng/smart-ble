# 本地 BLE 固件升级

蓝析BLE工具箱的 OTA 升级设备固件；App 自身通过应用商店更新。此次不建设管理后台，不自动发现或下载新固件，不提供远程批量升级。设备必须实现以下 LightBLE 协议，不能向任意蓝牙设备刷入 `.bin`。

## 固件包与型号

用户明确选择 `firmware.bin` 和 `manifest.json` 两个文件。iOS/macOS 沙盒下必须对两个文件分别取得文件选择器授权，不假定能读取所选 `.bin` 旁边的文件。

manifest 必须恰好包含以下六字段，沿用 `contracts/target/ota-package.schema.json`：

```json
{
  "format_version": 1,
  "target": "lightble-peripheral",
  "hardware": "esp32-s3",
  "firmware_version": "1.0.1",
  "size": 600000,
  "sha256": "实际 firmware.bin 的 64 位小写 SHA256"
}
```

上例是字段说明，不能用于刷写。客户端验证字段、版本、实际长度和 SHA256 后，还须读取设备身份比对 target/hardware。当前 Peripheral 型号为 `esp32-wroom-32`（芯片 ID 0）与 `esp32-s3`（芯片 ID 9）；Observer 仅扫描，虽保留在通用 manifest target 枚举中，目前不提供 OTA 服务。版本和 App 的版本号互不绑定；同版本重复升级应拒绝，避免无法证明镜像发生切换。

## GATT 与事务

| 用途 | 服务 / 特征 UUID |
| --- | --- |
| OTA 服务 | `4fafc201-1fb5-459e-8fcc-c5c9c331914d` |
| CTRL（有响应写） | `beb5483e-36e1-4688-b7f5-ea07361b26c0` |
| DATA（按发现的写能力） | `beb5483e-36e1-4688-b7f5-ea07361b26c1` |
| STATUS（通知） | `beb5483e-36e1-4688-b7f5-ea07361b26c2` |
| 身份服务 | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` |
| INFO（读取 system_info） | `beb5483e-36e1-4688-b7f5-ea07361b26a8` |

INFO 返回 `type=system_info`、`target`、`hardware`、`firmware_version`。版本必须来自当前运行镜像，禁止把客户端请求版本写入 NVS 后当作升级成功证据。

事务顺序：

1. 校验两个本地文件，读取 INFO，核对型号、目标与当前版本。
2. 订阅 STATUS，再写 CTRL：

   ```json
   {"op":"start","target":"lightble-peripheral","hardware":"esp32-s3","target_version":"1.0.1","size":600000,"chunk_size":180,"sha256":"实际摘要"}
   ```

3. 固件准备非活动分区后通知 `{"type":"ota","status":"ready","max_chunk":180}`。ready 前不得发送 DATA；客户端取 MTU-3、自己的上限与 max_chunk 中的最小值，顺序分包，块间留 20ms。
4. DATA 传输完写 `{"op":"commit"}`。固件必须先排空已接收的暂存数据，再校验长度、完整 SHA256、镜像芯片、app descriptor 的 project_name 角色及实际版本，最后调用 `Update.end(false)`。
5. `{"type":"ota","status":"success","rebooting":true}` 仅代表固件提交、即将重启。客户端显示“等待重启验证”，进度不得据此标记最终成功。
6. 观察真实断开，等待重连并重新发现服务，读取 INFO，确认 target/hardware/实际 firmware_version 与包完全相同后才显示成功和 100%。超时、旧版本、错误设备均失败。

STATUS 只按 `type=ota`、`status` 的精确值识别 `ready`、`progress`、`success`、`error`、`failed`、`aborted`。不得搜索 message/detail 里的 ready/success 子串，否则 `not_ready` 会被误认成功状态。阶段不匹配的 ready/success 不推进状态。

start 新增 `hardware` 是本轮有意收紧：缺少型号的旧客户端会收到拒绝，应更新客户端，不放宽设备保护。

## 固件执行与失败

NimBLE 回调仅投递有界 RAM 命令队列；Flash 写入、SHA、会话状态由 loop 单独拥有。每轮 Flash 写入最多 4KB，避免长时间阻塞；commit 时仍继续排空已接收缓存。队列溢出、镜像错芯片/版本、长度和摘要不符、Flash 错误均失败关闭。

取消使用 `{"op":"abort"}`；传输时断线、30 秒无输入均终止并清理临时状态。失败后重新校验并从头传输，不承诺断点续传。正常提交后的重启断开与提交前的意外断开分别处理。

| 错误 | 含义 |
| --- | --- |
| `OTA_ERR_STATE` | 时序、target/hardware、镜像身份、队列、断线或超时错误；detail 给出原因 |
| `OTA_ERR_SIZE` / `OTA_SIZE_MISMATCH` | 非法长度、超出范围或数据不完整 |
| `OTA_ERR_CHECKSUM` / `OTA_HASH_MISMATCH` | 非法摘要或完整镜像摘要不符 |
| `OTA_ERR_SPACE` / `OTA_ERR_FLASH` | 分区准备、Flash 写入或最终提交失败 |
| `OTA_VERSION_MISMATCH`（客户端） | 重启后实际版本不符，不能确认升级成功 |

双分区保护避免失败传输切换启动镜像。断电恢复与回滚仍需真实板卡验证，不能以宿主模拟的 Update 成功推断。固件包的 SHA256 是完整性检查，不是厂商数字签名；本轮仅支持用户主动导入可信来源的本地测试/自研固件，不提供 Secure Boot 或云端固件授权。

## 生成与验证真实固件包

工具链固定为 `espressif32@6.12.0`（Arduino 2.0.17 / ESP-IDF 4.4.7），避免干净环境自动升级到改变 OTA/SHA API 的 Arduino 3.x。先通过 PlatformIO 构建对应 Peripheral 固件，然后执行：

```bash
python3 scripts/ota/package-firmware.py \
  --firmware hardware/esp32/LightBLE/.pio/build/fixture_peripheral_s3/firmware.bin \
  --hardware esp32-s3 --version 1.0.0 \
  --output-dir .tmp/ota/esp32-s3-1.0.0
python3 scripts/ota/package-firmware.py --verify .tmp/ota/esp32-s3-1.0.0
```

版本必须与实际 app descriptor 一致。构建脚本会把编译 FIRMWARE_VERSION 与固件角色写入 ELF 描述符后，才由 esptool 生成镜像及校验和。打包工具额外检查芯片、镜像角色、每段边界、镜像 checksum、附加 SHA256 和分区上限，拒绝 bootloader、合并 Flash、SDK 默认版本和未识别签名尾部；不覆盖已有目录。

测试入口：

```bash
python3 -m unittest discover -s scripts/ota -p 'test_*.py'
python3 scripts/ota/test-firmware-host.py
node --test tests/desktop/ota*.test.mjs tests/target/integration/ota-transaction-target.test.mjs
dotnet test tests/ota-dotnet/SmartBLE.Ota.Tests.csproj
```

宿主测试编译实际 `ota_server.cpp`，仅硬件 API 由 stub 替代，属于软件证据。真实 BLE、Flash、重启、取消、断线重试与安装升级分别记录证据；没有完成这些检查时，不把 OTA 标为正式可用。

## 真实设备验证

`scripts/ota/verify-device.py` 默认仅扫描，不自动挑设备或刷写。写入要求同时明确 `--address`、`--package` 和 `--scenario`；必须先确认是可重刷的测试板，并通过 USB 安装其对应 baseline 固件。

```bash
.tmp/qt-venv/bin/python scripts/ota/verify-device.py --scan-seconds 5
.tmp/qt-venv/bin/python scripts/ota/verify-device.py \
  --address "准确的设备地址或macOS设备UUID" \
  --package .tmp/ota/2026-10-20/pinned/esp32-s3/1.0.1 \
  --scenario cancel
```

在 baseline 1.0.0 上依次验证 `cancel`、`hash`、`size`、`disconnect`，确认失败后运行版本不变，再执行 `success` 升级到 1.0.1；同版固件不会重复启动升级。脚本复用 Qt 的实际 OTA 协议内核、Bleak 和逐连接 ATT 调度，保存前后 INFO、STATUS、写确认和固件 SHA 到新建的 `.tmp/ota-device-validation/*.json`，拒绝覆盖证据。它不代替原生 Apple/Android App 的真机操作回归，也不验证断电恢复。

镜像结构与双分区验证依据：[Espressif 镜像格式](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/app_image_format.html)、[Espressif OTA](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/ota.html)。
