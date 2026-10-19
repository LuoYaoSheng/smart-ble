# 状态芯片词汇七端对齐清查（2026-09-12 第二轮）

承接 fix-nav（导航贴边 + Electron 卡「初始化中…」，ac71509）。用户指示"其他的也需要处理"——
将两类缺陷（贴边几何、状态芯片）扩展到全部剩余端做全仓清查。

## 一、几何清查（结论：无残留）

全仓扫 `margin:* -Npx|−Nrpx`（css/scss/vue/wxss + uniapp rpx）：

| 残留 | 判定 |
|---|---|
| `.logdock{margin:12px -16px 0}` ×11 副本 | 正确嵌套在 `.page` 内（上轮已实测），非缺陷 |
| `.asys-targets + .asys-hr{margin:0 -4px}` (android.css) | 卡内发丝线故意出血 4px（容器 padding 6px），非同类缺陷 |
| uniapp 负 rpx margin | 零命中 |

## 二、状态芯片词汇（正典锚点）

正典 `docs/specs/prototype/v1-new/pages/p001-scan.js:14`：
`on→蓝牙就绪 / off→蓝牙未开启 / 其余→平台不支持`。
正典无瞬态词；桌面壳（Electron/Tauri/Avalonia）约定瞬态 = **初始化中…**（中文省略号）。
本轮融资一词汇表：**就绪 / 未开启 / 平台不支持 / 初始化中…（瞬态）**。

## 三、逐端缺陷与修复

| 端 | 缺陷 | 修复 | 验证 |
|---|---|---|---|
| uniapp | 初始 `bleState='off'` 未探测就谎称「蓝牙未开启」 | 初始 `'initializing'` + 词映射四态（text+tone） | `node --check` store ✓；SFC compileScript ✓；pages/*.test.js 不引用 bleState（无本地 runner，jest 风格） |
| Flutter | `btStatusWord` 把 null（首帧未出）/unknown/turning* 全并入「平台不支持」 | 穷举 7 值+null：瞬态→初始化中…，unavailable→平台不支持 | `flutter analyze`：No issues |
| Android | null 首帧闪「平台不支持」；Unauthorized 并入 else | null→初始化中…；Unavailable→平台不支持；Unauthorized→未开启 | `:app:compileDebugKotlin` BUILD SUCCESSFUL 0 警告（JBR21+ANDROID_HOME） |
| iOS | `.unknown`（CBCentralManager 首回调前）→「平台不支持」 | `.unknown→初始化中…`（色维持灰 placeholder） | `xcodebuild …Simulator build` **BUILD SUCCEEDED** |
| Avalonia | 四词全偏（已开启/已关闭/不可用/状态未知）+Off 灰点+ASCII 省略号 | On→蓝牙就绪 / Off→蓝牙未开启+红 #FF3B30 / Unavailable→平台不支持+灰 / 初始「初始化中…」 | 无 dotnet（本机）→静态；BleService.InitializeAsync 首推已确认存在（lib 行 42/46），**W 线机器需复验** |
| Tauri | error 词「蓝牙不可用」+红点（error=无适配器，语义应为不支持） | 「平台不支持」+灰点 | `node --check` ✓（词汇源：lib.rs init_ble 无适配器 10s 重试后 success:false） |
| Electron | （上一轮 ac71509 已修：重载自愈补发） | — | ✓ |

## 四、已知留待项

- uniapp 芯片在**首次扫描前**停留在初始化中…（Electron/Tauri 启动即 init、uniapp 惰性）。
  启动即 openAdapter 涉及 iOS 权限弹窗时机，无 GUI 通道无法真机验证 → 留待窗口期专项。
- Avalonia 变更需 W 线（Windows/dotnet）编译复验。
