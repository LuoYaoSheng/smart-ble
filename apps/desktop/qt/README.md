# SmartBLE · Qt / PySide6 Windows 客户端

唯一项目根目录为 `smart-ble/`。本实现使用 PySide6 和 bleak / WinRT，当前发布候选目标为 Windows x64；本轮没有原生 ARM64 包或真机证据。

现有九页：扫描、GATT 详情、已连接、广播、关于、版本记录、Smart HID 配网、设备详情、诊断。扫描为真实 5 秒扫描；GATT 支持多设备、读写、notify / indicate、断链后 1 / 3 / 5 秒重连。通用 GATT、Smart HID 和 OTA 共用每连接 ATT 队列，含在途最多 16 项，同设备串行、跨设备并行；read / write / notify 执行超时分别为 3 / 5 / 3 秒。超时或在途取消会退役连接、清理等待项，并拦截旧结果和通知。Smart HID 配网使用 INFO 身份校验、V1 分帧 INPUT 写入和 STATUS 回执；配对链接可粘贴导入，尚未接入相机。密码和配对码仅在内存中使用，离开页面、切换设备及配网成功时清理，配对码保留不超过 5 分钟。

GATT 页面仅在发现完整 OTA 服务和三特征能力后启用“固件更新”。原生文件选择器读取 `.bin` 与 manifest，按 `contracts/target/ota-package.schema.json` 验证六字段、实测大小和 SHA256，然后执行 `start → ready → DATA → commit → success`。DATA 按真实特征能力选择写模式，串行写入并控制间隔；只有设备 success 回执才显示 100%。取消、失败和超时会尝试 abort 并退订，断连没有 success 时不会宣称升级成功；收到 success 后的重启仍须重连核对版本。

广播使用 Windows 厂商数据块发布者。名称和服务 UUID 发射受系统接口限制，不能把配置预览视为已经发射这些字段。

运行与测试：

```sh
pip install -r requirements.txt
python main.py
QT_QPA_PLATFORM=offscreen python -m unittest discover -s tests
```

候选由仓库根 `scripts/release/build.py` 构建 PyInstaller 自包含目录，CI 附件下载为 ZIP。必须保留完整目录，单个 EXE 不能独立分发；该目录不是安装器或已签名正式发行。本轮自动测试与候选构建不能代替当前源码的真实 BLE、多设备恢复、配网、OTA、安装升级和签名验收。

`SMARTBLE_AUTOMATION_PORT` 仅供本地测试，默认不启动自动化端口。共享 OTA 测试输入位于 `ota-fixtures.json`，由本实现与 Avalonia 测试共同消费；运行时不依赖该文件。
