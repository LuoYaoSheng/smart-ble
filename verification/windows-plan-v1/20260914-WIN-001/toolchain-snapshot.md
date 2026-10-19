# WIN-001 工具链与环境快照

- Date: 2026-09-14
- Host: Windows 10 22H2 (10.0.19045.3803), x64
- HEAD: `760dc16043e3e1d30be4c33c463fa26d99877618` (`refactor/uniapp-v1`)
- Remotes: `github/refactor/uniapp-v1` = `origin/refactor/uniapp-v1` = HEAD(双远端一致,已验证)

## Git 同步

```
$ git fetch --all --prune        # exit 0
$ git pull --ff-only             # Already up to date (基线 718b3c0 -> 760dc16 于本会话拉齐)
$ git status --short --branch    # ## refactor/uniapp-v1...github/refactor/uniapp-v1 (无 ahead/behind)
```

工作区有 33 个用户既有脏文件(历史 verification 日志、tests/target spec 修改、flutter l10n 生成物),按双机约定不触碰、不提交。

## 工具链版本

| 工具 | 版本 | 计划约束 | 结论 |
|---|---|---|---|
| Node.js | v23.8.0 (nvm,任务期 PATH 前置 `C:\Users\11066\AppData\Roaming\nvm\v23.8.0`);系统默认 v20.19.3 | >=22.18 或 >=23.6 | 合规(v23.8.0,含原生 WebSocket,满足 CDP 需求) |
| npm | 11.2.0 (随 v23.8.0) | - | 记录 |
| rustc / cargo | 1.98.1 / 1.98.1,`stable-x86_64-pc-windows-msvc` | MSVC toolchain | 合规 |
| .NET SDK | 9.0.200 (RID win-x64) | 至少 8 | 合规 |
| JDK | 默认 `java` = 24.0.1;本机另有 corretto-18.0.2 / openjdk-23.0.2-1 / azul-13 / corretto-11 | 17/21,不用 25 | **偏差**:无 17/21;Windows 任务线(WIN-002~009,Electron/Tauri/Avalonia/PIO)不消费 JDK,Android 不在 Windows 职责内,登记观察项 |
| PlatformIO | Core 6.1.18(`~/.platformio/penv/Scripts/pio.exe`,不在 PATH) | ESP32 烧录 | 可用 |

注:`nvm use 23.8.0` 在本 Git Bash 会话挂起(需提权),采用 PATH 前置方案,不改全局默认。

## 硬件环境

| 项 | 值 |
|---|---|
| 蓝牙适配器 | Intel(R) Wireless Bluetooth(R) + Microsoft 蓝牙 LE 枚举器 |
| WebView2 | 152.0.4191.66 |
| ESP32-S3 串口 | COM12 = USB-Enhanced-SERIAL CH343(serial-tap 独占) |
| 其他串口 | COM40 = USB 串行设备 |
| 测试手机 | FEC0220629005177(adb `device` 在线) |

## 验收对照

- HEAD 为双远端共同最新提交:通过。
- 工作区干净:用户既有 33 个脏文件按约定保留(非本任务引入,不触碰),登记观察项。
- 全部必需工具有版本记录:通过(见上表)。

## 结论

WIN-001 = **PASS_WITH_OBS**。观察项:
1. JDK 无 17/21(Windows 线不消费,不影响 WIN-002~009)。
2. 系统 PATH 默认 Node v20.19.3,任务执行统一以 nvm v23.8.0 PATH 前置。
3. 用户既有脏文件 33 个保持原样。
