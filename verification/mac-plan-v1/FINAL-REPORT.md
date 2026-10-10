# Mac 主机实施计划 · 最终报告（2026-09-14）

> 计划：docs/plans/2026-09-14-mac-host-implementation-plan.md v1.0
> 基线：refactor/uniapp-v1@718b3c0 → 本报告时点（领先 main 218+ 提交，双远程同步）
> 状态词表：TODO / IN_PROGRESS / PASS / PASS_WITH_OBS / FAILED / BLOCKED

## 一、工作包结论

| ID | 工作包 | 状态 | 关键证据 |
|---|---|---|---|
| MAC-001 | 平台范围决策与正典冻结（路线 B：微信退役） | PASS_WITH_OBS | 20260914-MAC-001；三正典+五契约+schema+门禁脚本单一解释 |
| MAC-002 | 根级验证与元数据门禁 | PASS | make verify 五线全绿；SYSTEM 408/408 · HARNESS 108/108 · CURRENT 544/544 |
| MAC-003 | UniApp App/H5 收口 | PASS_WITH_OBS | 20260914-MAC-003；26+14 门禁、h5 零告警、页面层 226 pass |
| MAC-004 | Flutter 多端候选版 | PASS_WITH_OBS | 20260914-MAC-004；apk/simulator/macos 三构建、122/122 |
| MAC-005 | Kotlin Android 页面对齐 | PASS_WITH_OBS | 20260914-MAC-005；九页可达、75/75、双入口+分流 |
| MAC-006 | SwiftUI iOS 发布链 | PASS_WITH_OBS | 20260914-MAC-006；Archive+真机安装+启动；SwiftPM 修复 |
| MAC-007 | AppKit macOS 发布链 | PASS_WITH_OBS | 20260914-MAC-007；模块测试 7/7、深度 40 行 EXIT=0、分发崩溃修复 |
| MAC-008 | 共享 Core/协议/资产单源 | PASS | 20260914-MAC-008 + 追加节；二轮产品向量 parity（抓修 Kotlin F026、登记 D-SEMVER-1/2）；三轮桌面车道并入（09-15，五线全执行 PASS） |
| MAC-009 | ESP32 全环境 + STM32 边界 | PASS_WITH_OBS | 20260914-MAC-009；五环境构建、STM32 协议样板裁定 |
| MAC-010 | 桌面 macOS 目标 | PASS_WITH_OBS | 20260914-MAC-010；Electron/Tauri DMG+蓝牙声明；Linux 归 CI |
| MAC-011 | 官网/CI/发布管线 | PASS_WITH_OBS | 20260914-MAC-011；SSR 崩溃根治、CI/Release 重写、元数据一致 |
| MAC-012 | 跨平台总验收与归档 | IN_PROGRESS（本报告） | 终验全绿；**合入 main 待用户批准** |

## 二、终验命令与结果（2026-09-14）

| 命令 | 结果 |
|---|---|
| `make verify` | EXIT=0（uniapp 26+14 / flutter analyze 0 + 122 / android JDK17 / apple 三步含 TEST SUCCEEDED / tauri cargo check） |
| `node scripts/verify-target.mjs --mode=all` | SYSTEM 408/408 · HARNESS 108/108 · CURRENT 544/544 · pages 11 specs 226 pass 0 fail · EXIT=0 |
| `node --test tests/desktop/*.test.mjs` | 95/95 |
| `node scripts/generate-release-metadata.mjs --check` | PASS |
| `cd docs && npm run docs:build` | build complete（VitePress 死链零告警） |
| 分支卫生 | `git ls-files` 无 unpackage/.pio/DerivedData/build 产物误提交 |

## 三、平台回填摘要

- **UniApp（Android 主线 + H5）**：构建/单测/静态门禁/页面驱动层全绿；H5 诚实降级；微信目标退役单一解释。
- **Flutter（REFERENCE）**：三端构建全成；E5 真机 BLOCKED（无排期）。
- **Android 原生**：九页可达（P002/P003/P005 新增）；75/75；真机代跑按需交 Windows。
- **iOS 原生**：Simulator test 全过；Archive+真机安装+启动；完整 BLE E5 复验未做；App Store 导出凭据红线 NOT_RUN。
- **原生 macOS**：真实 BLE 链当日复验 PASS；分发 bundle 崩溃修复；OTA 契约分歧（R-1/R-2）在册待用户裁决。
- **桌面 Electron/Tauri**：macOS 双线当日构建 + 蓝牙声明；Linux CI 化；Windows 断言复核交 WIN-002。
- **ESP32/STM32**：五环境构建 + 产物指纹；真机烧录/E5 待用户 BOOT+RST；STM32 正式降级协议样板。
- **官网/发布**：状态页-元数据-落地页三方一致；CI/Release 候选产物模式（不自动发布）。

## 四、未决项（用户决策/条件门控）

1. **合入 main**：全部工作包 PASS/PASS_WITH_OBS，按计划 §7 需用户批准后执行合并与 Tag。
2. **OTA 契约分歧 R-1/R-2**（UIS-18-OTA 对 ESP32 夹具 phase=failed）。
3. **ESP32 烧录解锁**（用户 BOOT+RST 一次，正典/串口CDC/SHID/Observer 四线随之取证）。
4. **Windows 侧**：WIN-002 桌面元数据断言复核（tests/desktop 平台断言 Mac 已机械更新）；WIN-009/010 Windows 报告吸收后 MAC-012 才能关闭。
5. **Apple 正式分发**：Developer ID/公证/App Store 凭据条件。

## 五、合并预检与演练（2026-09-14 深夜补）

- **合并预检**：`git merge-tree --write-tree main HEAD` EXIT=0；temp 分支真试合并 `git merge --no-commit main` EXIT=0、零冲突（UU=0）——分支可安全合入 main。
- **干净安装演练**：分发 bundle 拷至 /tmp/clean-drill 经 LaunchServices `open` 启动成功（进程存活）→ 退出清理。
- **回滚演练**：temp 分支 revert 倒数第二个工作包提交 → 权限单测仍全绿 → 丢弃演练分支（还原现场）。

## 六、第二轮追加（同日深夜）

- MAC-008 升 PASS：产品级跨语言向量落地（ble-product-v1-vectors：脱敏 14 例 ×3 语言、OTA 交集 13 例 ×2 语言；四线 parity 全 PASS）；向量抓修 Kotlin F026 镜像缺口；登记 D-SEMVER-1/2 分歧。
- verify-uniapp 静态门禁 14→15（product parity）。

## 七、回滚路径

- 分支 refactor/uniapp-v1 双远程同步；任一工作包提交独立可 revert（Conventional Commits，回滚演练已证）。
- 发布侧：channel=preview、artifacts=[]，无对外发布物；官网与元数据由生成器单源可重生成。

## 八、第三轮追加（2026-09-15 上午）

- MAC-008 观察项「桌面 JS 线脱敏镜像未入 parity 车道」销项：新增 desktop 车道（tauri/electron 双副本字节相等门禁 + vm 沙箱求值 `globalThis.SmartBLELogRedaction`），logRedaction 向量 14/14。
- 带 JDK17 复跑 product parity 五线全执行全 PASS（js 27/27、dart 14/14、kotlin 14/14、swift 45/45、desktop 14/14）；verify-uniapp 26 单测文件 + 15 静态门禁全绿。
- 同轮事务：GitHub 推送差距（OAuth 缺 workflow scope）处理中——gh 需走本地代理 7897 重试授权（用户约 12:20 完成手机验证）；Gitee 全量同步不受影响。
