# F018–F024 · Smart HID 域（Windows 战役，2026-09-09）

执行机：Windows · 手机：Samsung SM-G9910（R5CR1284Y7H，E5）
夹具：ESP32-S3 **真 Smart HID 固件**（smart-hid-workspace 78bc4ef 构建 v1.1.0，2026-09-05 15:57 bin，
本轮 erase_flash + 全量烧录回 SHID 态，`f018-fixture-firstboot-serial.txt`：
`[prov] state=unprovisioned` + `provisioning advertising as SHID-00000001`）
口径：没有真实运行的能力不写 PASS。本会话无用户 Wi-Fi 凭据 → 凭据类场景用
伪 SSID 提交（E14 W2 已证伪 SSID → 设备侧真实 `wifi_failed` 终态）；token 为 32hex 占位值。

## 结论总表

| # | 场景 | F-AND | U-AND | A-AND | U-WX | E-WIN/T-WIN |
|---|---|---|---|---|---|---|
| F018 | 扫描卡片 SHID 徽章+双入口 | **PASS**（p002 三场景 `shidConfigureBtn` 命中；p001 负向断言） | **PASS**（run2/run3 双轮：徽章 `Smart HID · 强匹配` + `配置 Smart HID`+`连接` 双入口截图） | NOT_RUN（PARITY-001） | BLOCKED_TOOLCHAIN | PARITY-002 |
| F019 | P002 配网向导（连接即配网） | **PASS**（HEAD 复跑 leave/cancel/wifi_fail：configure 相位 1 次连接即达） | **FAIL**（WIN-UAND-003b：读特征 10007，连接失败态 5/5 复现） | NOT_RUN（PARITY-001） | BLOCKED_TOOLCHAIN | PARITY-002 |
| F020 | 扫码面板（相机/粘贴） | **PASS**（qrPaste 粘贴路径三场景：解析回填「已获取」） | NOT_RUN（被 003b 阻在前置连接；扫码相册路径已备 QR 图未达） | NOT_RUN（PARITY-001） | BLOCKED_TOOLCHAIN | PARITY-002 |
| F021 | 分帧明文写入+状态跟踪 | **PASS**（设备串口：`candidate: ssid=… token=**redacted**` → `received` → `connecting_wifi`；STATUS 轮询跟踪在案） | NOT_RUN（003b 阻塞） | NOT_RUN（PARITY-001） | BLOCKED_TOOLCHAIN | PARITY-002 |
| F022 | 错误终态恢复 | **PASS**（HEAD 复跑：wifi_failed 终态+「返回表单修改」+cancel→timeout+「重新下发」；pairing/mqtt 分流引用 E14 T3/T4 真机） | NOT_RUN（003b 阻塞） | NOT_RUN（PARITY-001） | BLOCKED_TOOLCHAIN | PARITY-002 |
| F023 | 设备历史删除红线 | **PASS**（三线静态检查：无历史页/无路由/无持久化；代码注释记录 2026-09-02 移除决策） | 同左（PASS） | 同左（PASS） | — | — |
| F024 | 实时诊断（五项） | **PASS_WITH_LIMITATION**（E14 T4 真机诊断面板重读 INFO/STATUS@3638f66 + HEAD 代码复核 `HidDiagnosticsPage(fromWizard)` 五行映射；独立页真机复跑需 mqtt_invalid→真凭据，本轮未达） | NOT_RUN（003b：诊断依赖读特征） | NOT_RUN（PARITY-001） | BLOCKED_TOOLCHAIN | PARITY-002 |

## F-AND（flutter Android，p002_provisioning_test.dart @ HEAD 8bab16d）

E14 基线（3638f66）后 `provisioning_page.dart` 改 229 行 + hid_detail/hid_diagnostics 新页
→ 按 §3 需 HEAD 复跑。凭据自由三场景全绿：

| 场景 | 结果 | 关键证据 |
|---|---|---|
| leave v2 | All tests passed (19s) | U-01 填写态/等待态双弹窗 ✓；`f019-leave-v2-app.log` + 设备串口 `candidate ssid=f018-leave-net` → `received` → `connecting_wifi` |
| cancel_wait v1 | All tests passed (17s) | `cancelWaitBtn` → `outcome=timeout` + 「重新下发」 |
| wifi_fail v2 | All tests passed (31s) | `outcome=wifi_failed` + 「返回表单修改」；设备串口 `state=provisioning step=wifi_failed err=wifi_failed`（15s 伪 SSID 扫描超时） |

- 驱动迭代：v1 失败——P001 改版后「开始扫描」命中文本×2（操作条+空态 CTA），tap 二义性；
  修测试 `find.text('开始扫描').first`（产品 UI 合法，测试基建跟进）。
- **调度事故（已重跑覆盖）**：wififail v1 期间并发启动 HBuilderX 推送，U-AND 抢前台致
  flutter tap 落错应用（设备仅连接无 candidate）；v2 独占重跑全过。教训：**真机
  instrumentation 运行期间禁止对同一手机启动任何其他推送/应用**。
- T1 success/T3 pairing_invalid/T4 mqtt_invalid/T7 重配需真实 Wi-Fi 凭据与 ControlHub
  会话 → 引用 E14（2026-09-05 真机闭环，run-id `20260904-win-b1/e14-macos-return`），
  其中 T4 含诊断面板真机执行（F024 F-AND 依据）。

## U-AND（uni-app APP，HBuilder 标准基座 5.24 @ HEAD + 本轮修复）

- F018 真机两轮 PASS：`Smart HID · 强匹配` 芯片 + 双入口按钮
  （run2/run3 截图 + `uand-f018-f024-results.json`）。
- **WIN-UAND-003（P1，在册）——Smart HID 连接即配网真机不可用**：
  - **003a（已修复）**：`transport.connect` 相邻两次 `notifyBLECharacteristicValueChange`
    背靠背调用竞态失败（errCode 10003，fail 对象无 message → UI 显示兜底文案）。
    修复：订阅间 300ms 间隔 + 失败 500ms 退避重试一次（`apps/uniapp/services/provisioning/transport.js`，
    修复后两订阅均过，失败点后移）。
  - **003b（OPEN）**：订阅通过后 `readBLECharacteristicValue`（INFO，1002；换 STATUS 1004
    分叉实验同样失败）→ **errCode 10007 `property not support`**（DBG 证据截图
    `win-uand-003b-dbg-read-error.png`），会话拆除回连接失败态；手动「重新连接」5/5 复现，
    跳过 notify 循环亦复现 → 与订阅无关。固件侧 INFO/STATUS 均 READ|NOTIFY
    （`ble_provision.c` flags），**同手机 F-AND 读同一特征正常** → 缺陷定位在
    DCloud 标准基座读路径（该读路径为本仓 U-AND 首次真机消费）。后续出路：自定义基座
    对照 / 基座升级 / 蓝牙 GATT 缓存清理复测。F019–F022/F024 U-AND 全部被此阻塞。
  - 排查过程副产物（驱动/取证层，非产品缺陷）：uni-app 子页为**独立 WebView 叠层**，
    uiautomator dump 同时含前后层文本（本域曾致「扫描页文本在前、tap 落在 add 页空白」
    的迷航）；判读需按 `pages/hid/add` WebView 分层。另：杂散 tap 触发过扫码 fail 弹窗
    「无法识别配对码」遮屏吞点击。
- F020 准备就绪未达：相册路径 QR 已生成推送（`shid://pair?token=<32hex>&host=192.168.21.77&port=17892`，
  `f020-pairing-qr.png` + /sdcard/DCIM）；Android 15 媒体库注册不生效（broadcast
  result=0 / media_provider 服务缺失 / content insert 无回显），若后续复测相册不可见需改道。

## F023 删除红线（静态检查）

- U-AND：`pages.json` 9 路由无历史页；`known-devices.js` 仅内存归一化（注释记录 2026-09-02
  移除决策）；业务源码零 `setStorageSync`（命中项为 token 禁用清单 `FORBIDDEN_TOKEN_SINKS`）。
- F-AND：9 页面无 history；`hid_session_store.dart` 内存快照无持久化 API（注释同源决策）。
- A-AND：底部导航 Scan/Connected/Broadcast/About；`CommandQueue.clearHistory` 为写队列
  清空（会话内概念，非设备历史）。

## 门禁

- `node --test tests/unit/provisioning-transport.test.mjs`（1/1）+ orchestrator + form 全绿
  （transport 修复后复跑）。
- `verify-uniapp.sh` 全量门仍红：`tests/unit/hid-navigation.test.mjs` 引用用户已删的
  `buildHidHistoryUrl`（5ad66f9，先在案，非本轮改动）。
- flutter analyze/test 未跑（本轮无 flutter lib 改动；p002 测试文件改动已由三场景真机执行覆盖）。

## 夹具与遗留

- ESP32 现处**真 Smart HID 固件**（未配网态，`unprovisioned` + 广播中）。F025–F030 前
  若需 LightBLE 夹具需重刷 `fixture_peripheral_s3`。
- U-AND 手机端为标准基座 + 本轮修复代码（launch 推送）；Wififail v1 事故文件
  （`f022-wififail-v1-*`）保留为调度教训证据。
- ControlHub 本轮未启动（凭据类场景全部引用 E14）。
