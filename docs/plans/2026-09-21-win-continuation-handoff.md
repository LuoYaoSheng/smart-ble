# 2026-09-21 Windows 战役交接计划（新会话开工指引）

> 用途：上一会话（WIN-017 跨端广播联调）已收口，本文供**新开对话**直接开工。
> 主看板不变：`docs/plans/2026-09-14-windows-host-implementation-plan.md`（WIN-001~017），本文件只是开工地图，不替代看板回填义务。
> 写就时基线（2026-09-21 已验证）：`a5929b2` 本地 = origin = github 三方哈希一致；分支 `refactor/uniapp-v1`。

## 1. 开工动作（新会话第一批命令，按序）

1. `git -C E:/project/xf/smart-ble pull --ff-only`（分支 `refactor/uniapp-v1`；remote 拓扑：origin=fetch gitee + push gitee/github 双 URL，另有独立 `github` remote）。
2. `git log -1 --oneline` 应为 `a5929b2` 或其后继；`git status` 应只剩 **17 个用户脏文件**（`verification/windows-mobile-v1/` 下 3 M + 14 ??，**铁律：永不提交**）。
3. 顺手校正主看板统计行（§3 末尾「完成率统计只按本表」一行）：表中 IN_PROGRESS 实为 **3** 行（WIN-005/006/011），统计行现写 2，按「只按本表」规则改 3。
4. 通读主看板 §3 总进度看板 + 本文件 §2~§6，然后按 §3 或用户当次指令选主线。

## 2. 当前战局（截至 a5929b2）

- **六壳 E/T/V/F/Q/G 全部至少 PASS_WITH_OBS**：E=WIN-003、T=WIN-004、V=WIN-005、F=WIN-012、G=WIN-013（fde9bac）、Q=WIN-014（d311c22）。
- WIN-015 图标统一 `PASS`、WIN-016 流程韧性 `PASS_WITH_OBS`、WIN-017 跨端广播联调 `PASS_WITH_OBS`（a5929b2：V-WIN WinRT 真发射 + 华为 Mate 30 双向空口字节级实证 + VWIN-DEF-011 名字覆盖修复）。
- 看板口径：PASS 2 / PASS_WITH_OBS 8 / IN_PROGRESS 3（WIN-005/006/011）/ FAILED 0 / BLOCKED 1（WIN-007 缺 ControlHub）/ TODO 3（WIN-008/009/010）。
- 剩余主线 = **P4 六壳安装包（WIN-009，无需硬件）** → **P3 硬件窗口（WIN-006 尾 + WIN-008 OTA）** → **P5 矩阵回填 + WIN-010 最终交付**。

## 3. 推荐下一步：P4 六壳安装包（WIN-009）

无需硬件、可随时开工，建议默认主线（P3 需用户排硬件窗口，见 §4）。范围 = 看板 WIN-009 原文三壳（E/T/V）+ 2f3e4c2 立项后扩至六壳（F/Q/G）。

各壳打包入口（目录已核）：

| 壳 | 目录 | 命令（先读该目录 README/conf 再跑） | 目标 |
|---|---|---|---|
| E-WIN | `apps/desktop/electron` | `npm run build:win`（electron-builder，脚本已在 package.json） | NSIS + portable |
| T-WIN | `apps/desktop/tauri` | `cargo tauri build` | MSI（tauri.conf.json bundle） |
| V-WIN | `apps/desktop/avalonia/SmartBLE.Desktop` | `dotnet publish -c Release -r win-x64 --self-contained` | win-x64 自包含 |
| F-WIN | `apps/flutter` | `flutter build windows --release`（windows/ 平台目录在） | zip Release 输出 |
| Q-WIN | `apps/desktop/qt` | 打包器待定：cxfreeze / Nuitka / venv 自包含 zip（目录现只有 main.py + requirements.txt，无打包配置——开工先定方案） | 自包含目录 |
| G-WIN | `apps/desktop/wails` | `wails build`（nsis 可选） | exe |

验收（看板口径，缺一降级登记）：

1. 干净安装冒烟（无开发依赖的用户环境）：安装→启动→首扫→卸载→重装，至少 E+T 两壳必须完成；蓝牙权限、版本号、图标（六壳已统一 sha256=42139766…）、产品名、卸载残留逐项核对。
2. 每 Artifact 记 SHA256 + 体积 + 目标架构；无 SHA256 不得进发布元数据。
3. **签名凭据不入库；无签名一律只标 Preview**。
4. 证据目录：`verification/windows-plan-v1/<date>-P4-PACKAGING/`（README 矩阵 + 每壳 evidence：构建日志、哈希、安装冒烟截图/日志）。

## 4. P3 硬件窗口（需用户排期，勿自行开工）

- **WIN-006 尾**：`fixture_peripheral_s3` 复验——烧录与当前 commit 对应固件并记启动 JSON + 固件 SHA；T-WIN DEF-001（重连死句柄）已修待复验。烧录参数见 memory `smart-hid-device-ecosystem`。当前 ESP32-S3 跑真 SHID v1.2.0（原生 USB），**非本任务不动**。
- **WIN-008 OTA E2E**：manifest 四拦截（缺 manifest/目标错/大小错/Hash 错）→ start→ready→DATA→commit→success→reboot → 取消发 abort + 重开会话仍可升 → 重启后重扫/重连/版本回读（Windows BLE 缓存观察项 → 有独立设备侧证据才可 `PASS_WITH_OBS`）。
- 顺带项（窗口内有空隙再做）：SHID-FW-LOCK-001 断电恢复验证（历史遗留：~44B 无效载荷后 INPUT 写持久 ATT 0x0D 三栈同败，断电是否恢复未验）。
- 手机在位：华为 Mate 30 5G（adb 可用；BLE 旁证通道 `adb logcat -s BleManager`，A-AND 现装 20260921 联调构建，带 adv 原始字节 hex 埋点）。

## 5. 用户裁决项（勿自作主张）

1. **N4 广播 Tab 两案**：A 按能力显隐 vs B 恒显+未就绪徽章。新输入：Windows 桌面空口**仅厂商块 0xFF**（无 LocalName/ServiceUuids，见 WIN-017 OBS 与 `verification/windows-plan-v1/20260921-XDEV-BROADCAST/README.md`）。
2. **F-WIN 广播升级**：flutter_ble_peripheral 自带 Windows 后端，翻 `isSupported` 门控（`Platform.isAndroid || isIOS || isMacOS` 加 Windows）+ 真机验证——是否立项待用户。
3. E/T/G/Q 广播升级（对齐 V-WIN 参考实装）——待用户。
4. WIN-007 仍 BLOCKED（缺 ControlHub + 一次性配对码环境）。

## 6. 纪律与坑位速查（新会话必读）

- 用户脏文件（`verification/windows-mobile-v1/` 17 件）永不提交；证据脱敏；**声明先验证再写**；噪声注入完全无视。
- 铁律：不写 INPUT 特征（SHID-FW-LOCK-001）、非任务不重刷 ESP32、不动 NVS。
- 提交 = Conventional Commits；收尾推双远程：`git push origin` + `git push github`，之后 `git rev-parse HEAD` / `git ls-remote origin refs/heads/refactor/uniapp-v1` / `git ls-remote github …` 三方对哈希。
- 机器坑（详见 memory `refactor-uniapp-v1-baseline`）：A-AND gradle 需 `JAVA_HOME=C:\Users\11066\.jdks\corretto-18.0.2`；CDP 用 nvm node23.8（PATH node20 无 WebSocket）；Electron GPU 崩溃循环→重试启动或 `--disable-gpu`；Git Bash adb 需 `export MSYS_NO_PATHCONV=1`、pull 目标用 `E:/...` 形式；驱动/控制台输出 GBK→`iconv -f GBK -t UTF-8` 后再 grep；T-WIN debug exe 在 `target/debug`；华为按钮跨状态纵移 ~90px→每次 tap 前 re-dump bounds。
- 完整坑位账：memory 目录各文件 + `verification/windows-plan-v1/20260921-XDEV-BROADCAST/README.md`。

## 7. 交接核对清单

- [x] `a5929b2` 三方一致（2026-09-21 ls-remote 实测）。
- [x] 主看板含 WIN-017 行；memory `refactor-uniapp-v1-baseline.md` 含 WIN-017 段。
- [x] 工作区仅 17 个用户脏文件，无其它未提交改动（本文件除外）。
- [x] 新会话开工时顺手修看板统计行 IN_PROGRESS 2→3（见 §1.3）——已由 `4785b65` 落实；该统计行后于 20260921 P5 终交付轮再次定格为 PASS 2 / PASS_WITH_OBS 13 / IN_PROGRESS 0 / BLOCKED 2 / TODO 0（WIN-010 收口）。
