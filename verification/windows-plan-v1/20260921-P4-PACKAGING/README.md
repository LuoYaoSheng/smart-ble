# 20260921 P4 六壳安装包（WIN-009）验证记录

> 基线：`4785b65`（refactor/uniapp-v1，开工 commit=交接计划落库）。日期：2026-09-21。
> 结论：**PASS_WITH_OBS**——六壳 8 个产物全部构建+SHA256 登记；E(NSIS) 与 T(NSIS) 完成干净安装冒烟（安装→启动→CDP 真首扫→卸载→残留检查→重装）；T 的 MSI 与 E 的 portable 有观察项（见 OBS 清单）。
> 本机终态：E 1.0.5（`%LOCALAPPDATA%\Programs\smart-ble-desktop`）与 T 1.0.5（`%LOCALAPPDATA%\BLE Toolkit+`）保持安装，可各自一键卸载；MSI 未安装。

## 1. 产物登记（artifacts/，自忽略 .gitignore，二进制不入库）

| 产物 | 壳 | 类型 | 版本口径 | 体积 | SHA256（前 16） |
|---|---|---|---|---|---|
| EWIN-smartble-electron-1.0.5-setup-x64.exe | E-WIN | NSIS oneClick 每用户 | 1.0.5（exe 元数据 ProductName="BLE Toolkit+"） | 78 MB | ffd bc09 9e32 7ac3 |
| EWIN-smartble-electron-1.0.5-portable-x64.exe | E-WIN | portable | 1.0.5 | 78 MB | f67 d45f a307 da7a |
| TWIN-smartble-tauri-1.0.5-msi-x64.msi | T-WIN | MSI（perMachine） | 1.0.5 | 4 MB | 0c9 9a1e 0b82 3911 |
| TWIN-smartble-tauri-1.0.5-nsis-setup-x64.exe | T-WIN | NSIS（currentUser） | 1.0.5 | 3 MB | 42c cb83 b335 4213 |
| VWIN-smartble-avalonia-selfcontained-win64.zip | V-WIN | 自包含目录 zip | exe 无版本资源；产品名=SmartBLE.Desktop | 53 MB | 0d9 9176 c735 a058 |
| FWIN-smartble-flutter-release-win64.zip | F-WIN | Release 目录 zip | pubspec 2.0.0+1（与 VERSION 单源不同，见 OBS-7） | 33 MB | 374 a66c 50f2 a8c0 |
| GWIN-smartble-wails-1.0.5-x64.exe | G-WIN | 单 exe | exe 无 Win32 版本资源；app 内读 embed VERSION=1.0.5 | 13 MB | 4bb 554d 0658 9e03 |
| QWIN-smartble-qt-1.0.5-venv-win64.zip | Q-WIN | venv 自包含 zip + 启动.bat | zip 内置 VERSION=1.0.5（HERE.parents[2] 命中） | 243 MB | 66c 05f6 7442 e417 |

完整 64 位 SHA256 见 `artifacts/SHA256SUMS.txt`（本机留存；上表为速查）。**全部未签名，一律只标 Preview。签名凭据不入库。**

## 2. 构建记录

| 壳 | 命令 | 结果 |
|---|---|---|
| E-WIN | `npm run build:win`（electron-builder 24.13.3，node20.19.3） | nsis+portable 双产物；native 依赖 rebuild（bluetooth-hci-socket/usb） |
| T-WIN | `tauri build`（补装 `npm i -g @tauri-apps/cli@^1`；cargo 1.98.1，release 5m32s） | msi+nsis 双产物（WiX3.14/NSIS3 工具链自动拉取） |
| V-WIN | `dotnet publish -c Release -r win-x64 --self-contained`（SDK 9.0.200，net8.0-windows） | publish/ 目录全量；2 条既有风格警告（CS4014/CS1998）非阻塞 |
| F-WIN | `flutter build windows --release`（3.38.3） | `build/windows/x64/runner/Release/smart_ble.exe` 31.3s |
| G-WIN | `wails build`（v2.16.0，go1.24.0，28.5s） | `build/bin/smartble.exe`（新 Go WebView2Loader） |
| Q-WIN | 见 §3 | venv zip |

## 3. Q-WIN 打包方案定稿（本轮决策）

选 **venv 自包含 zip + 启动.bat**：`requirements.txt`（PySide6/bleak）均为轮子纯 pip 可装，无编译器依赖；Nuitka 需 MSVC+长构建、cxfreeze 需额外配置面，Preview 级无必要。布局：zip 根 = `VERSION` + `apps/desktop/qt/{源码+assets+.venv-pkg}` + `SmartBLE-QWin-启动.bat`——保留相对层级使 `main.py` 的 `HERE.parents[2]/VERSION` 版本读取命中（否则降级 "dev"）；Windows venv 的 `Scripts/python.exe` 按 `pyvenv.cfg` 相对定位，整树搬移可运行（已在 %TEMP% 解压实测）。依赖版本：PySide6 6.11.2 / bleak 3.0.2（与开发全局环境同版，20260921 真机走查 12/12 即此组合）。venv 建 `.venv-pkg/`，已加入 qt/.gitignore。

## 4. 冒烟矩阵（启动→主窗口标题→截屏→退出）

| 壳 | 形态 | 窗口标题 | 证据 |
|---|---|---|---|
| E-WIN | win-unpacked / 安装版 / portable / 重装后 | `BLE Toolkit+`（portable 见 OBS-2） | ewin-unpacked-launch.png / ewin-installed-launch.png / ewin-reinstalled-launch.png |
| T-WIN | 安装版 | `SmartBLE`（窗口标题）+ 页 title `BLE Toolkit+` | twin-installed-firstscan.png |
| V-WIN | zip 解压 | `BLE Toolkit+` | vwin-portable-launch.png |
| F-WIN | zip 解压 | `SmartBLE` | fwin-portable-launch.png |
| G-WIN | 单 exe | `SmartBLE`（首测 alive=0 为偶发，复测 ALIVE+WebView2 环境创建成功） | gwin-launch.png |
| Q-WIN | venv zip 解压，pythonw main.py | `SmartBLE` | qwin-venv-launch.png |

## 5. E-WIN NSIS 干净安装闭环（oneClick /currentuser，全部静默）

1. **安装** `/S` exit=0 → `%LOCALAPPDATA%\Programs\smart-ble-desktop`（目录名取 package.json name）；桌面+开始菜单 lnk；HKCU 卸载键 DisplayName "BLE Toolkit+ 1.0.5" 含 QuietUninstallString /S。
2. **元数据**：已装 exe ProductName="BLE Toolkit+" / ProductVersion 1.0.5.0 / FileVersion 1.0.5。
3. **CDP 真首扫**（`--remote-debugging-port=9223`，node23.8 `ewin-firstscan-cdp.mjs`）：点击「开始扫描」→ **扫描完成 · 发现 8 台**，SHID-00000001（疑似 Smart HID · 弱匹配，-45dBm）等真设备在列，页面 url=安装目录 app.asar（干净安装形态）。证据 ewin-installed-firstscan.png。
4. **卸载**（注册表 Quiet 串）→ 桌面/开始菜单 lnk 全清、注册表键全清；安装目录残留 14 项——根因是 CDP 轮的 8 个 Electron 进程未被杀净锁文件（见坑位-2），**非卸载器缺陷**；进程按路径清杀后文件可删。
5. **重装** `/S` exit=0 → 目录/双 lnk/注册表全恢复，再启动 title=[BLE Toolkit+]（ewin-reinstalled-launch.png）。

## 6. T-WIN 干净安装闭环

1. **MSI**：`msiexec /i /qn` → 1603（非提权 shell 拒 perMachine 安装），Program Files/注册表零写入 → **MSI 干净安装冒烟待管理员窗口**（OBS-1）。产物本身已产出+登记 SHA256。
2. **NSIS** `/S` exit=0 → `%LOCALAPPDATA%\BLE Toolkit+`（注意：tauri currentUser 装在 Local 直下，不在 Programs）；桌面+开始菜单 lnk。
3. **WebView2 CDP 真首扫**（`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9224`）：点击「开始扫描」→ **扫描完成 · 发现 7 台**，SHID-00000001 **Smart HID · 强匹配**（-42dBm，MAC 10:B4:1D:CD:23:8E）。证据 twin-installed-firstscan.png。
4. **卸载** `uninstall.exe /S` exit=0 → **3 秒目录全清**；**重装** exit=0 → exe/桌面 lnk 恢复。

## 7. OBS 清单

1. **T MSI 需提权**：非管理员静默装 1603（evidence/twin-msi-attempt.log）；本轮以 T-NSIS 完成「T 安装包干净安装冒烟」验收，MSI 冒烟留管理员窗口。
2. **E portable 窗口延迟**：portable 启动器（eportable.exe）为壳，真身解压至随机 %TEMP% 目录后运行；壳进程 MainWindowTitle 恒空且首启解压 80MB 慢——冒烟以真身进程树（BLE Toolkit+×4）+ 截屏佐证 PASS，用户感知首启偏慢。
3. **E/T 桌面快捷方式同名互踩**：两壳 productName 同为 "BLE Toolkit+"，桌面 lnk 同名，后装覆盖/卸载连带删除；本轮终态桌面 lnk 属 T。建议后续差异化 shortcutName（产品决策，未动）。
4. **tauri NSIS DisplayName 无版本号**（"BLE Toolkit+"，不带 1.0.5），与 E 的 "BLE Toolkit+ 1.0.5" 口径不一致。
5. **V/G exe 无 Win32 版本资源**：V（net8.0-win 未设 Version）、G（Go 默认不嵌）；版本以 app 内关于页/VERSION 单源为准（G 读 embed VERSION=1.0.5，Q zip 内置 VERSION=1.0.5）。
6. **G-WIN 首测 alive=0 偶发**（V/F 强杀后立刻启动），复测正常；如复现可考虑 `-tags native_webview2loader` 回退。
7. **F 版本口径 2.0.0+1**（pubspec）与仓库根 VERSION=1.0.5 不同源——版本单源未覆盖 F，待统一。
8. 无签名：全部产物仅可标 **Preview**。

## 8. 坑位速查（本轮新增）

1. PS 5.1 `Start-Process -ArgumentList` 不接受空数组（ParameterBindingValidationException）——smoke-launch.ps1 已做条件分支。
2. **`taskkill //IM` 与 `MSYS_NO_PATHCONV=1` 互斥**：双斜杠参数保持字面致 taskkill 静默失败（stderr 被吞看不出），残留 Electron 进程锁文件造成 E 卸载半残留假象——杀进程一律用 powershell `Get-Process | ? {$_.Path -like ...} | Stop-Process -Force` 按路径精确清杀。
3. `cmd //c` 传含 `/currentuser` 的引号串会被切碎（'urrentuser' 不是内部或外部命令）——同类调用走 powershell Start-Process。
4. cargo-tauri CLI 缺失时用 `npm i -g @tauri-apps/cli@^1`（预编译秒装），`cargo install tauri-cli` 源码编译要 10min+。
5. MSYS_NO_PATHCONV=1 下给 node 传脚本路径必须 Windows 形式（`E:/...`），POSIX `/e/...` 会被解析成 `E:\e\...`。
6. tauri NSIS currentUser 装到 `%LOCALAPPDATA%\BLE Toolkit+`（非 Programs），探测别找错层。
7. Q venv 打包必须保留 `apps/desktop/qt` 相对层级 + zip 根放 VERSION，否则 app_version() 降级 "dev"；PySide6 拷贝用 robocopy（MSYS cp 有 260 路径风险）。
8. electron-builder 安装目录名取 package.json `name`（smart-ble-desktop）而非 productName。

## 9. 证据文件

- `artifacts/`（自忽略）：8 产物 + SHA256SUMS.txt
- `evidence/smoke-launch.ps1`（通用冒烟脚本）、`evidence/ewin-firstscan-cdp.mjs`（CDP 首扫脚本，E/T 通用）
- `evidence/*.png`：六壳启动/首扫/重装截屏（见 §4/§5/§6 引用）
- `evidence/twin-msi-attempt.log`：MSI 1603 全量日志
