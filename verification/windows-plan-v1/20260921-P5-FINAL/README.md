# 20260921-P5-FINAL · WIN-010 最终交付轮证据

> 开工指令：用户「继续」（UIALIGN-PAGE 收口后，主线上唯一非裁决/非排期项 = P5）。
> 基线：开工 `a1215a8`（三方一致）；本目录与本轮看板/FINAL-REPORT 同一提交入库。
> 主交付物：`../FINAL-REPORT.md`。

## 1. 最后一轮门禁（六壳，全绿）

| 壳 | 命令 | 结果 | 日志 |
|---|---|---|---|
| E-WIN | `node --check` ×18 文件（跳过 bundle/vendor） | √ | `evidence/gate-e-syntax.txt` |
| T-WIN | `cargo fmt --check`；`cargo test`（src-tauri） | √ / 3 目标 ok（crate 设计上 0 单测） | `evidence/gate-t-cargo-test.txt` |
| V-WIN | `dotnet test` | 55/55（2 条历史警告 CS4014/CS1998 在册） | `evidence/gate-v-dotnet-test.txt` |
| F-WIN | `flutter analyze`；`flutter test` | 0 issues / 123/123 | `evidence/gate-f-analyze.txt` |
| Q-WIN | `compileall`；无头契约冒烟（UIALIGN-PAGE 脚本复跑） | √ / 17/17 | `evidence/gate-q-smoke.txt` |
| G-WIN | `go vet ./...`；`go build ./...` | √ / √ | （终端直证，无遗留文件） |

## 2. 真实 BLE 冒烟（真机 ESP32-S3 = SHID-00000001，fw 1.2.0，未配对态）

1. **bleak 层探针**：复跑 `../20260921-QWIN-GATT/qwin-gatt-probe.py`（bleak 3.0.2/WinRT，零写入）。
   扫描 11 台、SHID -47dBm 恒在；连接 MTU 256；枚举 1 服务/3 特征；INFO 读 130B 完整 JSON；
   STATUS 订阅/退订正常（未配对 0 推送=已知口径）。→ `evidence/ble-smoke-bleak-probe.txt`
2. **Q-WIN app 级走查 12/12**：驱动脚本 `qwin-gatt-walk-p5.mjs`（= `../20260921-QWIN-GATT/qwin-gatt-walk.mjs`
   副本，仅改 spawn 为 `.venv-pkg` 绝对 python 路径，避免污染原轮证据目录）。
   断言链：boot 版本→真扫描 11 台 SHID 恒居首(-42dBm)→连接 GATT 树(1svc/3char)→INFO 读→STATUS
   订阅语义→**INPUT 写护栏拦截实证**（SHID-FW-LOCK-001，零设备风险）→P007 会话→busy 退出确认→
   全断→广播降级口径→关于→常驻退出 exit 0。→ `evidence/ble-smoke-app-walkthrough.txt` +
   `evidence/*.png`（13 张）+ `qwin-gatt-walk.json`

## 3. 产物新鲜度（不重构建的依据）

六包 mtime 均晚于各自源树最新源文件（E/T/V/G 对 P4 产物、F/Q 对 UIALIGN-PAGE 重建包），
逐一比对结论 FRESH（比对命令与输出见本轮会话；哈希以
`../20260921-P4-PACKAGING/artifacts/SHA256SUMS.txt` 为准）。

## 4. 看板动作

- WIN-005/006/011 → `PASS_WITH_OBS`；WIN-008 → `BLOCKED`；WIN-010 → `PASS_WITH_OBS`；
  统计行定格 `PASS 2 / PASS_WITH_OBS 13 / IN_PROGRESS 0 / FAILED 0 / BLOCKED 2 / TODO 0`。
- WIN-012 结论列补 P5 终报记（F-WIN Windows 侧 GATT 无独立真机走查）。

## 5. 遗留（详见 FINAL-REPORT §7）

WIN-007/008 BLOCKED；四项用户裁决项（N4 两案/F 翻门控/E-T-G-Q 广播升级/T MSI 管理员窗口）；
F 深层像素缝；全产物未签名仅 Preview。
