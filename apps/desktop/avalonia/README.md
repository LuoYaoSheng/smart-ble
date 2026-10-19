# 蓝析BLE工具箱 · Avalonia Windows 客户端

唯一项目根目录为 `smart-ble/`。此实现使用 Avalonia / .NET 8 与 Windows WinRT BLE，当前构建脚本产出 Windows x64 自包含目录，CI 附件下载为 ZIP。ARM64 仍是待构建、待设备验证的目标；必须保留完整目录，单个 EXE 不能独立分发，该目录不是安装器或已签名正式发行。

九页入口包括扫描、GATT、已连接、广播、关于、版本、Smart HID 配网、设备详情和诊断。每台设备独立拥有 GATT 句柄、通知、连接生命周期和 1 / 3 / 5 秒重连。GATT 操作按设备串行，包含超时、取消及迟到结果所有权校验。广播使用 Windows 厂商数据发布者，平台不支持的名称 / 服务 UUID 发射会明确提示。

Smart HID V1 先校验设备身份和协议，再分帧下发、跟踪真实 STATUS；支持有效配对链接及剪贴板导入，相机尚未接入。凭据仅在内存使用，在离开、切换目标或成功时清理；配对码导入后 5 分钟过期。

发现完整 OTA 服务及三特征能力后，GATT 页面提供固件更新面板。原生选择 `.bin` 和 manifest，校验契约六字段、size、SHA256，再执行 start / ready / DATA / commit / success。只有设备 success 回执才能达到 100%；取消、失败、超时会尝试 abort 并清理订阅，未确认的断连不会冒充升级成功，重启后需重连核对版本。

```sh
dotnet test SmartBLE.Desktop.Tests/SmartBLE.Desktop.Tests.csproj
```

测试共享 `../qt/ota-fixtures.json`，覆盖 manifest、设备回执、旧回执拒绝、取消、超时、断链和重启边界。纯逻辑测试可在安装 .NET 8 的 macOS 上使用 `-p:EnableWindowsTargeting=true --filter 'FullyQualifiedName!~BuildAdvSnapshot'` 执行；WinRT 测试及完整候选需 Windows。上述验证不代表当前版本已经通过真机 BLE、OTA、安装升级或分发签名验收。
