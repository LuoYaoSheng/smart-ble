# E13 · P002 Smart HID 配网真机测试（Samsung 主线）

日期：2026-09-05 · 执行机：Windows（ControlHub 宿主）· 手机：Samsung SM-G9910（R5CR1284Y7H）
设备：ESP32-S3 `10:B4:1D:CD:23:8E`（真 Smart HID 固件 fw=1.1.0，广播名 SHID-00000001）
ControlHub：本机单进程监听 17890/17891/17892 · PC LAN IP `192.168.21.77`

> 口径：**没有真实运行的能力不写 PASS**。全部判定基于真实设备/真实链路；
> 未跑或被外部条件挡住的场景一律 BLOCKED 并写明依赖。

## 结论表

| # | 场景 | 判定 | 一句话证据 |
|---|---|---|---|
| 0 | 网页控制台配对码路径（用户流程前置） | **PASS** | 真实点「创建配对会话」→ 180×180 二维码上屏 + 5:00 倒计时 + 自动轮询；`qr_payload = shid://pair?token=<32hex>&host=192.168.21.77&port=17892` 格式与 App 解析函数一致；截图 `evidence/web-qr-path-check.png`（内含 token 的会话已当场撤销作废） |
| 1 | U-01 离开确认两态（填写态/等待态） | **PASS** | `evidence/u01-leave-app.log`：`U-01 填写态弹窗 ✓` + `U-01 等待态弹窗 ✓` + `全部断言通过`；全链路含真实 SMP 配对（系统弹窗由守护点按）→ 加密链路 → 2 帧 149B 候选真实写入 |
| 2 | T2 错密码 → wifi_failed | **FAIL（设备侧）** | App 线完整履职：加密链路上 `submit frames=2 bytes=150` 被设备 ACK；此后 120s 设备 STATUS 始终 `unprovisioned`（连 `received`/`connecting_wifi` 都未出现）→ 见「T2 黑盒归因」 |
| 3 | T5a 取消等待 → timeout + 重新下发 | **PASS** | `evidence/t5a-cancel-app.log`：`outcome=timeout` + 「重新下发」存在 + 全断言通过 |
| 4 | T5b 配置页断连 → 断开横幅 + 重新连接 | **PASS（变体注入）** | 原设计 esptool 复位因串口消失（见「环境事件」）不可用，改手机侧 `svc bluetooth disable` 注入；LOST_ARMED 后 **1.2s** 呈现断开横幅 + 重新连接入口；`evidence/t5b-lost-app.log` |
| 5 | T3 伪 token → pairing_invalid | **BLOCKED** | 依赖设备消化候选（T2 已证当前固件不消化）+ HJWY 真实密码 |
| 6 | T4 mqtt_invalid + 运行诊断 | **BLOCKED** | 同上（另需防火墙拦 17891 入站的管理员权限） |
| 7 | T1 成功链路 → READY + provisioned:true | **BLOCKED** | 同上 |
| 8 | T6 ControlHub 设备表核验 | **BLOCKED** | 依赖 T1 |
| 9 | T7 重配（删除→RECOVERY→再配） | **BLOCKED** | 同上 |
| 10 | Xiaomi happy path | **BLOCKED** | 同上（另：小米 adb 序列号本 session 中途由 50143338 变为 FEC0220629005177，USB 总线不稳的旁证） |

## 真机过程中发现并修复的缺陷（App 侧，本仓库）

1. **扫码解析后配网页被连弹两次关闭（DEF，`provisioning_page.dart`）**
   `qrParseBtn` 先 pop 扫码面板再回调，`_onQrText` 内又 `Navigator.pop()` 一次 →
   把配网页本身弹掉，用户被踢回设备列表且 toast 仍报"已回填"。相机路径同样双 pop。
   修复：弹层关闭所有权归扫码面板自身，`_onQrText` 只解析/回填/toast。
2. **SMP 配对完成后 ~3s 链路被本机拆除（`provisioning_controller.dart`）**
   真机 logcat 定位：`l2c_link_timeout … All channels closed →
   GATT_CONN_TERMINATE_LOCAL_HOST`——加密切换后若无 GATT 活动，三星栈按空闲拆 ACL，
   密钥分发永远完不成（表现为每次连接必弹配对框 + 提交前后掉线）。
   修复：configure 阶段每 2s 读 STATUS 特征保活（顺带刷新状态）；修复后同条件下
   U-01/T5a/T5b 三场景零掉线，配对一次完成。
3. **提交按钮被"配对码已解析"SnackBar 遮挡**（测试基建）：`_submit` 先等 toast 退场
   并收起键盘再点按。

## 测试基建（本目录）

- `sequence.md`：四张时序图（主链路/错误分叉/重配/自动化架构）+ 执行顺序修正
  （READY 停广播 → 失败场景先行）。
- `runbook.md`：每场景「PC 侧前置（**网页先开二维码**）→ 手机侧步骤 → 判定」清单
  （吸取用户指出的问题：配对码由网页生成，凡需真 token 的场景手机扫码前 PC 必须先
  点「创建配对会话」把二维码亮屏；控制台必须用 `http://192.168.21.77:17890` 打开，
  QR 的 host 按请求来源 IP 生成）。
- `e13-pairing-daemon.py`：系统弹窗守护（配对/权限正向按钮：精确文本优先、
  否定词排除——"不允许"含"允许"子串曾致误点）+ 断连注入看门狗
  （`--lost-mode esptool|bt`；注意 logcat 看不到 flutter `debugPrint`，
  实际注入由 PC 侧盯原始日志文件执行，见 runbook §3.5）。
- `e13-run-scenario.sh`：预授权（**安装后授权会被重置**，内含 grant-watch 监视器
  检测到重装立即补授）→ 防三星自动管控强杀（standby-bucket active + doze 白名单）
  → 运行 → token/密码掩码落证据。
- `evidence/*.log`：App 侧日志（token=MASKED32HEX、密码=MASKED_PASSWORD 后）。

## T2 黑盒归因（设备侧固件，smart-hid-workspace 仓库）

现象：候选 2 帧 150B 经加密链路写入、逐帧 ACK；此后 120s STATUS 读+通知均为
`unprovisioned`，无 `received`/`invalid_payload`/任何错误。

已排除（App 侧证据 + 固件源码审查）：
- 帧格式与分块：`[seq][total][len]` 117+27B，均 ≤ CHUNK_MAX=128；
- 固件管线（`chr_write_access → ble_frame_feed → parse → 队列 → prov_task →
  progress("received")`）源码逻辑健全，队列出入队均有守卫；
- 烧录产物比 smart-hid-workspace HEAD 旧 2 个提交（均为广播竞态修复，不涉本路径）。

无法进一步定位的原因：**ESP32 的 USB 串口（COM13，303A:1001）在 session 中途从
总线消失**（同窗口还发生 adb offline→unauthorized 一次、小米序列号变化），
串口日志与重烧均不可执行。

## 环境事件记录（影响判定的客观事实）

- USB 总线不稳：COM13 消失（12:0x 前后）；Samsung adb 掉线 1 次（重启 adb server
  恢复）；Xiaomi adb 序列号变化。三事件同窗口，判断为同一 USB/线缆/集线器层问题。
- `flutter test` 每轮重装 App（uid 逐轮变化）→ 运行时授权每轮被重置（已用
  grant-watch 消除弹窗竞态）；三星 mars_auto 曾强杀 App 一次（已加防杀护甲）。

## 复原状态

- 两手机 `svc power stayon false` 已还原（wrapper 收尾自带）；Samsung 蓝牙已重开
  （T5b 注入后 20s 自动 enable，`bluetooth_on=1` 实测）。
- **未执行**（依赖 USB 恢复）：回刷 canon 固件 fixture_peripheral_s3、
  ControlHub 停机与临时件清理中涉及串口的部分。
- ControlHub（PID 26260）与网页会话：验证用会话已撤销；进程仍在运行，待 USB
  恢复后随整批复原。

## 解除 BLOCKED 需要的两件事（用户）

1. ESP32 USB 重插（恢复串口；顺带芯片断电重启很可能消除候选静默不消化），
   并授权在串口恢复后重烧当前源码固件；
2. HJWY 的 Wi-Fi 密码（T3/T4/T1/T7/小米 需要；凭据只进命令环境变量与 App 内存，
   不落仓库与证据）。
