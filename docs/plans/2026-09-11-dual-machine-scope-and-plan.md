# 双机并行开发范围与计划（2026-09-11）

基线：`refactor/uniapp-v1` = b717d9d（双远程同步）。分工裁决（用户 2026-09-11）：**Windows 机处理 Windows 专项，其余全部归 Mac**。本文是该裁决的执行细化；同步规则见《2026-09-09-windows-first-mac-followup-development-plan.md》末节「双机并行分工基线」。

任务编号依据：`docs/specs/09_test/WINDOWS_MOBILE_V1_MASTER_MATRIX.md`（下称主矩阵）§1/§2/§4。

---

## 一、Windows 机（Windows 专项 + 接驳硬件代跑）

**范围**：`apps/desktop/{electron,tauri,avalonia}` 三线（E-WIN/T-WIN/V-WIN）+ Windows 工具链（cargo 1.98.1-msvc / dotnet / 便携 JDK21）+ 接在该机上的硬件（双手机：三星 SM-G9910=E5 中央、华为 TAS-AN00=广播者；ESP32 夹具，现烧真 Smart HID 固件 v1.1.0 unprovisioned）。

**计划（按序，每单元完成即提交推双远端，证据入 `verification/windows-mobile-v1/`）**：

| # | 任务 | 内容与验证口径 |
| --- | --- | --- |
| W1 | **P8 V-WIN Build Smoke**（PARITY-006，P2 小项） | `apps/desktop/avalonia` csproj 引用不存在的 `app.manifest` 与 `Assets/icon.ico` → 补齐或移除引用后 `dotnet build` 冒烟通过。仅 Build Smoke，不入功能对齐（主矩阵 §4.1 Experimental 裁决不变）。 |
| W2 | **E-WIN 打包冒烟**（PARITY-005，P2 小项） | electron-builder `build:win` 引用不存在的 `assets/icon.ico` → 修复后打包冒烟。与 W1 同类，顺手收口桌面打包双缺陷。 |
| W3 | **T-WIN/E-WIN 真实 GATT 收口**（硬件窗口） | P7 已到扫描级（WinRT 4s/7 台）。补：连接→服务发现→特征读/写（TEXT+HEX）/Notify 订阅往返→断线重连观察（ownsDevice 守卫）全链，E-WIN（noble）与 T-WIN（btleplug）双线同轮跑；对照主矩阵 F006-F012 判据。串口旁证可开则开（注意 serial-tap DTR/RTS 复位脉冲）。 |
| W4 | **E5 Smart HID 真机全链**（硬件窗口） | 夹具已是真 SHID 固件（SHID-00000001 广播中）。E-WIN/T-WIN P002 向导全链：扫描卡 SHID 徽章→配置向导 connect→configure（SSID/密码 + F020 配对码粘贴/手输）→下发 STATUS 跟踪→P003 会话快照→P005 五项诊断；F022 错误恢复分支按需注入。需真实 ControlHub 配对码凭据。 |
| W5 | **E3 OTA 实刷**（硬件窗口） | 桌面 OtaDialog（R-1/R-2 契约版已落库）对 ESP32 真刷全链：选包→分块下发→ACK 进度→校验/复位→版本回读。这是 F025（P-03 BLOCKED「端到端未验证」）解除证据的唯一来源；解除与否仍归正典裁决，本轮只产证据。 |
| W6 | **硬件代跑（Mac 线真机轮）** | F013 双手机夹具复验（F-AND/A-AND 在册待跑）；Mac 侧修复的 A-AND 006/007/008 与 U-AND 003b 完成后，若设备在本机则代跑复验轮（先 pull 最新）。 |

## 二、Mac（其余全部）

**范围**：uniapp / Flutter / A-AND（Kotlin 代码线）/ Apple 双端（N-MAC/N-IOS）代码与验证、ESP32 工具链（ESP-IDF v5.4.4）、`docs/specs` 正典与 docs 站、三门禁 + release 元数据管线、主矩阵收口。

**计划（按序，可并行的注明）**：

| # | 任务 | 内容与验证口径 |
| --- | --- | --- |
| M1 | **P9 主矩阵回填**（立即可做，纯离线） | 以 b717d9d 起入库的在册证据回填 §1「最终结论」列：E-WIN/T-WIN 域（W6 六页对齐、P7 运行级 30/30、真机四缺陷修复）、F026-F030 桌面行、E-WIN 真机轮记录；NOT_RUN 行逐项定性（可跑/BLOCKED_TOOLCHAIN/待硬件）。产出：主矩阵 §1/§2 全行有结论或显式 BLOCKED，无悬空 NOT_RUN。 |
| M2 | **U-AND WIN-UAND-003b 修复** | 真机读特征 10007→连接失败态 5/5，向导不可达 configure，整域 F019-F024 U-AND 被 BLOCK。定位修复后复跑 F019-F024 U-AND 真机轮（设备在位则本机跑，否则挂 Windows 机 W6 代跑）。 |
| M3 | **A-AND 结构性缺陷修复**（纯代码，可与 M2 并行） | 006（MTU 20 字节截断）/007（通信期列表重置）/008（通知载荷不达 UI）+ PARITY-003（批量/循环写入 CommandQueue 死代码接线）+ PARITY-004（manufacturerData=null 补实）。改码+单测在本机，真机复验按设备在位归属。 |
| M4 | **F-AND FEAT-F-003** | 未命名设备 R05 显示名链（「未命名 BLE·ID后四位」兜底）实现，关闭 F005 在册偏差。 |
| M5 | **UI 契约 phase-2**（已登记，本轮计划内） | 角色级门禁断言：页面 wrapper 水平 padding 必须 32rpx、navbar padding 域正典；阴影值机检（shadow-1/2/primary 白名单）；regFS 9/16 文件级圈定。产出：`check:dimensions` 扩容后全绿。 |
| M6 | **ESP32 DEV-014 烧录协调**（等用户物理动作） | 修复固件已编译待烧（NimBLE 回调内 flash 操作复位设备）。用户 BOOT+RST 一次解锁后跑 Phase7 四线（OTA 正典/串口 CDC/SHID/Observer）。 |
| M7 | **F029 分享域** | U-AND/F-AND 先行验证（页面级分享+P009 入口）；A-AND 复验按设备在位。 |
| 持续 | 维护线 | docs 站与部署链、`check:dimensions`/token/icon 三门禁、`generate-release-metadata` 管线、双机合并的冲突域裁决（uniapp/Flutter/docs 归 Mac 语义优先）；P2×13 原型遗留（06_review 在册，低优先）。 |

## 五、同日增补：Mac 线「假数据先全面处理页面 UI」轮（2026-09-11 下午）

用户指令口径：真机暂不可用，模拟器/H5 优先（Mac 本机窗口可用）。Mac 线落地：

- **uniapp H5 假数据通道**：`apps/uniapp/services/mock/`（`?mock=1` 桥，正典演示集驱动真实渲染管线；mp/app 构建条件编译剥离，产物 0 引用实证）。根因修复：`@dcloudio/uni-h5{,-vite,-vue}` 补声明（此前 uni CLI 扫不到 h5 平台插件，H5 构建长期空壳）。
- **九页 43 态截图 + 36/36 正典文案断言**：`verification/windows-mobile-v1/20260911-h5-mock-sweep/`；修复 UI-DEF-01（DeviceCard displayName 多级链）/02（eb-title fs-h2）/03（P003 设备名 fs-h1）。
- **M5 完成**：`check:dimensions` phase-2 角色级断言（wrapper 32rpx / navbar·subnav padding 域 / 阴影白名单 css+flutter / regFS 9/16 文件圈定）全绿；门禁套件+mp-weixin 构建+jest 基线对照+flutter analyze/test 113/113 零回归。
- **遗留（Mac 后续）**：F-AND 六态视觉 sweep 需 Flutter 侧 mock 桥（未建，待排期）；U-WX 扫描态元素级驱动仍 automator 受限。
- **Windows 界内（本轮未动）**：桌面三线 G1-G10 结构级重建（四页缺失等）依赖用户 D2 二选一裁决后由胜者壳套「基准内核 + desktop.js 覆写」；`?mock=true` 静态渲染通道已具备。

## 三、用户裁决/放行队列（两机均不自主执行）

1. **main 推送与站点部署**：main 冻结 dbb38a8；双机只动 `refactor/uniapp-v1`。
2. **U-WX 线**：微信开发者工具扫码登录（BLOCKED_TOOLCHAIN）——F014-F017/F018-F024 的 U-WX 列全挂在此。
3. **F025 P-03 解除**：E3 证据产出后由用户/正典裁决，不在 W5 内自动解除。
4. **W-3 营销字号层级、C-1 stepper Unicode ✓ 替换（需基准+四壳字节重同步）、C4 裁决**：specs/UI 遗留决策。
5. **硬件窗口排期**：E3/E5/F013/DEV-014 均需 ESP32 或双手机独占窗口，由用户安排接驳与时间。

## 四、里程碑与收口

- 双机各自单元完成即推双远端；`主矩阵 §1` 全行结论化（M1 吸收 W1-W5 证据）+ F025 裁决 = windows-mobile-v1 战役收口条件。
- 任何一方开工前 `git pull`；冲突按文件域：`apps/desktop/**`+`tests/desktop/**` Windows 语义优先，uniapp/Flutter/docs/specs Mac 语义优先。
