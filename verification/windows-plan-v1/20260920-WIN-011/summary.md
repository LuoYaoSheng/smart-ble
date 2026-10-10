# 20260920-WIN-011（N3）+ WIN-005 单测补齐

## N3：bt-chip 状态词对齐正典（来源 ui-nav-audit-20260915 N3）

正典词表（Flutter `device_list_page.dart` btStatusWord 为镜像）：
`on→蓝牙就绪` / `off+unauthorized→蓝牙未开启` / `unavailable(unsupported)→平台不支持` /
`unknown+turning*→初始化中…`。

**Electron（public/app.js stateMap）三处修改：**
1. `unauthorized`：「未授权」→「蓝牙未开启」（正典词，对齐 MainActivity.kt:147 注释口径）
2. fallback：「状态未知」→「初始化中…」（非正典词退场）
3. 补 `unsupported`→「平台不支持」灰点态（noble 有该状态、原映射表缺失）

**Tauri（src/app.js + src-tauri）：**
- `updateStatus` 新增 `off` 分支：蓝牙未开启 + `bt-dot off` 红点（CSS 原有）
- 后端 `init_ble` 前置无线电状态检查（`Radio.GetRadiosAsync`，windows 0.61 与 btleplug
  同投影去重，target 门控仅 Windows）：无线电 Off → 以 `BLUETOOTH_OFF:` 前缀失败 → 前端
  显示「蓝牙未开启」；无无线电/查询失败按原「平台不支持」路径
- 修的是审计指出的错分箱：poweredOff 原归入「平台不支持」

**验证：**
- `node --check` 双壳 app.js 过；桌面测试套 95/95；cargo fmt --check/check/test 过
- CDP 芯片词回归（无线电=ON 路径）：两壳 `蓝牙就绪` + `bt-dot on`
  （electron-chip / tauri-chip .json+.png）
- **声明**：蓝牙关闭分支（蓝牙未开启红点）无法在本机免改系统状态下活体验证——不 toggle
  系统无线电；该分支为纯词表映射 + 后端单条件返回，随构建门覆盖
- N4（广播 Tab 口径）维持待用户裁决，本轮不动

## WIN-005：单测工程补齐（验收项「新增测试全过」）

- 新建 `SmartBLE.Desktop.Tests`（xunit，net8.0-windows10.0.19041.0，ProjectReference 主工程，
  主工程 InternalsVisibleTo）
- BleService 抽出可单测纯函数：`CharKey`（特征字典键契约）、`ResolveWriteOption`（写选项
  降级真值表——顺带修掉一个真 bug：请求无响应写且特征双支持时原实现错按带响应写）
- 19 测试：先红后绿——**首跑 5 败**，暴露生产真 bug：`Uuid.ToString()` 产小写十六进制，
  名称映射 switch 用大写分支，含字母的已知短 UUID（180a/180f/2a00/2a19/2a26…）全部落到
  Unknown 回退；两映射函数补 `ToUpperInvariant()` 归一后 **19/19 全绿**
- `dotnet build` 主工程 0 错 0 警（CS0067 已在上一轮消除）

## 变更文件

- apps/desktop/electron/public/app.js（stateMap，CRLF 保留）
- apps/desktop/tauri/src/app.js（updateStatus/initBluetooth，CRLF 保留）
- apps/desktop/tauri/src-tauri/Cargo.toml + src/lib.rs（windows 依赖 + 无线电检查）
- apps/desktop/avalonia/SmartBLE.Desktop/SmartBLE.Desktop.csproj（InternalsVisibleTo）
- apps/desktop/avalonia/SmartBLE.Desktop/ViewModels/BleService.cs（helper 抽取 + 大小写归一）
- apps/desktop/avalonia/SmartBLE.Desktop.Tests/（新工程 + 19 测试）
