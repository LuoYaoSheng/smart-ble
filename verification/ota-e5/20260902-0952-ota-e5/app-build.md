# Android App 准备

| 字段 | 值 |
|---|---|
| 目标 App | UniApp Android（`apps/uniapp`，含 OTA Client） |
| App version（VERSION 文件） | 1.0.5 |
| Git commit | `4933d39` |
| **测试 APK** | **未生成 / 未安装** |

## adb devices

```
emulator-5554    device    sdk_gphone64_arm64
```

- 仅有 Android **模拟器**，无物理真机。
- 模拟器 BLE 无法与外部 ESP32 测试板建立真实 OTA 空口链路。

## 构建尝试

```bash
HBuilderX/cli launch app-android \
  --project apps/uniapp \
  --deviceId emulator-5554 \
  --compile true
```

**结果：FAIL**

```
Invalid value "iife" for option "output.format" - UMD and IIFE output formats are not supported for code-splitting builds.
已停止运行...
```

日志：`app-log/hbuilderx-launch.log`

## 结论

- **禁止**使用旧 APK 冒充 — 仓库内无可用 UniApp Android APK。
- OTA E5 在 **App 安装/启动** 阶段阻塞；正向流程、abort、disconnect 场景均未执行。
