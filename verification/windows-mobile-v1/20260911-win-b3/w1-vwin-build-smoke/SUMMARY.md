# W1 V-WIN Build Smoke（PARITY-006 收口）

- 日期：2026-09-11
- 基线：fea7659（开工前 `git pull --ff-only` = Already up to date）
- 工具链：dotnet SDK 9.0.200（Windows），目标框架 net8.0-windows10.0.19041.0
- 验收判据：`dotnet build` 退出码 0
- 结果：**通过**（evidence/dotnet-build-final.log：0 错误 6 警告，产物 bin/Debug/net8.0-windows10.0.19041.0/SmartBLE.Desktop.exe）

## 注册缺陷（PARITY-006 原文）修复

| 原文 | 修复 |
|---|---|
| csproj 引用不存在的 `app.manifest` | 新增标准 manifest（PerMonitorV2 DPI + Win10/11 supportedOS） |
| csproj 引用不存在的 `Assets\icon.ico` | 从 `apps/desktop/electron/assets/icon.ico` 复用跨端统一图标（8e58f0e），并补 `icon.png`（MainWindow.axaml `Icon="/Assets/icon.png"` 亦引用） |

## 首次真实编译暴露的隐性缺陷（代码从未被编译过）

1. **幽灵 NuGet 包**：`WindowsBluetooth 1.0.1` 在 nuget.org 不存在（flat-container 404 + 搜索无此 ID；evidence/dotnet-build-first-fail-nu1101.log = NU1101）。修复：TFM `net8.0` → `net8.0-windows10.0.19041.0`，WinRT 投影（Windows.Devices.Bluetooth/Radios、Windows.Storage.Streams）由 SDK 原生提供，删除包引用，真 WinRT 代码语义不变。
2. **保留字作标识符**：BleService.cs `foreach (var char in ...)`（CS1525 等共 10 错）→ 重命名 `characteristic`。
3. **`Windows.UI.Xaml.DispatcherTimer`**（UWP XAML，桌面不可用）→ `Avalonia.Threading.DispatcherTimer` 平替（API 同形）。
4. **`using Avalonia.ReactiveUI` / `.UseReactiveUI()`** 但未引用 ReactiveUI 包 → 移除（工程实际用 CommunityToolkit.Mvvm）。
5. **MainWindowViewModel.cs 缺 `using System.Collections.Generic`**（Dictionary CS0246）。
6. **生成成员冲突**：`[ObservableProperty] _showWriteDialog` 生成的 `ShowWriteDialog` 属性与 `[RelayCommand] ShowWriteDialog()` 方法同名（CS0102）→ 方法改名 `OpenWriteDialog`，XAML 命令绑定同步 `OpenWriteDialogCommand`。
7. **绑定路径字符串拼接**：XAML 三处 `{Binding ...Uuid + '|' + ...Uuid}` 为非法绑定语法（AXN0002）→ `BleCharacteristicInfo` record 增加 `ServiceUuid`（BleServiceViewModel 构造时 `with` 回填）与 `CommandKey`（`service|characteristic`），XAML 三处退化为 `{Binding CommandKey}`，VM 命令处理器 `Split('|')` 契约不变。
8. **绑定类型转换语法**：`(ViewModels.MainWindowViewModel)` 不被绑定语法解析 → 改用根 xmlns 前缀 `(vm:MainWindowViewModel)`（共 3 处）。
9. **编译绑定类型推断**：5 个 DataTemplate 补 `x:DataType`（vm:BleDeviceViewModel / vm:BleServiceViewModel / vm:BleCharacteristicInfo / x:String / vm:LogEntry）。
10. **Avalonia 10→11 API 与 XAML 语法**：`this.AttachDevTools()` 移除（11 移至 AppBuilder）；`PathIcon Stretch`（无此属性）删除；`TextBox WatermarkText` → `Watermark`；`Grid Padding` → `Border` 包裹；`Setter Color=` → `Value=`；样式选择器控件名小写 → PascalCase（Button/Border/TextBlock/StackPanel）；`SolidColorBrush` 资源移入 `<Styles.Resources>`；`Setter BoxShadow` 元素语法（结构体不可元素加载）→ 字符串值 `0 2 5 #10000000` 等 4 处；Window 双直接子级（主 Grid + 写入对话框 Grid）→ 单根 Grid 包裹（ZIndex 叠层语义保留）。
11. **BleService.cs 缺 `using Windows.Devices.Radios`**（Radio/RadioKind/RadioState CS0103）。

## 遗留（不属本单元范围）

- 6 个编译警告（CS1998×3 / CS0067 / CS8622 / CS4014）：存量代码质量问题，按主矩阵 §4.1 裁决「仅 Build Smoke，不入功能对齐」不在本轮清理。
- 读写通知 ViewModel 未接线：主矩阵 §4.1 已裁决维持 Experimental 定位。

## 复现

```bash
cd apps/desktop/avalonia/SmartBLE.Desktop
dotnet build   # exit 0, 0 errors
```
