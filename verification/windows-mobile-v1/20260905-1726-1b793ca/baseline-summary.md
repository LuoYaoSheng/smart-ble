# 基线总结（run-id 20260905-1726-1b793ca）

- 日期：2026-09-05 17:26–17:5x 本地
- Git：`refactor/uniapp-v1` @ `1b793ca`（接管检查：本地=origin=github 无 diverge；无 uniapp-next/flutter-next）
- 环境体检：见 [environment.md](environment.md) / [environment.json](environment.json)
- 用户脏文件（firmware_build_info.h、.hbuilderx/launch.json、out*.txt、tests/target/**、
  electron package-lock、e5 diag 会话、l10n CRLF）按约定留置不参与本轮提交

## 基线门禁结果

| # | 门禁 | 命令 | 结果 | 备注 |
|---|---|---|---|---|
| B1 | Git 接管 | fetch --all --prune + status/branch -vv | PASS | 无 diverge；脏文件仅用户既有集合 |
| B2 | 环境体检 | 版本收集 + pio device list + flutter doctor | PASS | doctor 仅 cmdline-tools/license 历史警告 |
| B3 | 工具链 Windows 化 | env.js/local.properties 检查 | PASS | env.js 已 env 驱动；local.properties 未被 git 跟踪 |
| B4 | Flutter 依赖清理 | 删 shared_preferences + flutter pub get | PASS | lib/test 无引用（零持久化口径）；lock 0 残留 |
| B5 | Flutter 静态/单测 | flutter analyze + flutter test | PASS | analyze 0 issues；test 59/59 |
| B6 | UniApp 静态 | bash scripts/verify-uniapp.sh | PASS_WITH_LIMITATION | 功能门禁全过（含 20 组单测）；空白检查仅被用户脏文件 diag1-full-session.txt（21 处尾随空白）绊住，非本轮代码问题 |
| B7 | UniApp 微信编译 | npm run build:mp-weixin | PASS | DONE Build complete；node:crypto externalized 为既有告知性警告（OTA 域 BLOCKED） |
| B8 | ESP32 Observer 构建 | pio run -e fixture_observer_s3 | PASS | RAM 8.9% / Flash 34.3% |
| B9 | ESP32 Peripheral 构建 | pio run -e fixture_peripheral_s3 | PASS（修复后） | 首跑 FAIL：shid_sim_main.cpp 与 main.cpp 双 setup()/loop() 链接冲突（shid_sim 并入后 +<*> 未排除）→ platformio.ini 三个 peripheral 系 env 补 `-<shid_sim_main.cpp>`；修复后 RAM 11.1% / Flash 42.5% |
| B10 | ESP32 回归 | pio run -e fixture_peripheral -e esp32dev | PASS | 证明 src_filter 修复不伤既有 env |

## 本轮修复（缺陷登记）

| 编号 | 等级 | 描述 | 修复 | 验证 |
|---|---|---|---|---|
| WIN-ESP32-001 | P1 | fixture_peripheral(_s3)/esp32dev 三 env 链接失败（multiple definition of setup/loop）——fixture_shid_sim_s3 引入 src/shid_sim_main.cpp 后未从 `+<*>` 排除 | platformio.ini 补 `-<shid_sim_main.cpp>` | B9/B10 四 env 全部 SUCCESS |

## 工具链变更清单（本轮 commit 内容）

- `apps/flutter/pubspec.yaml` + `pubspec.lock`：移除未使用的 shared_preferences 直接依赖（零持久化）
- `hardware/esp32/LightBLE/platformio.ini`：WIN-ESP32-001 修复
- `docs/specs/09_test/WINDOWS_MOBILE_V1_MASTER_MATRIX.md`（新）：F001–F030 总矩阵（全 NOT_RUN）
- `docs/specs/09_test/PAGE_FULL_COVERAGE_MATRIX.md`（新）：P001–P010 页面全量矩阵（全 NOT_RUN）
- 本目录 environment/baseline 四文件

## 下一步（按任务书 §28）

F001–F005 扫描域：刷 `fixture_peripheral_s3` → F-AND 真机 P001 扫描（integration_test 驱动）
→ U-AND/U-WX 基线运行 → 逐项回填矩阵。固件分轮：Smart HID（现态）→ peripheral → observer → 回刷。
