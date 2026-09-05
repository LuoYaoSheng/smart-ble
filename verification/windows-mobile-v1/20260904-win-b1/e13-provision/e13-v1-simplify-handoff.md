# E13 续：V1 简化去配对——跨机交接说明

> 2026-09-05 · 本文档写给**另一台电脑（macOS）做合并/续做的人**，完整记录
> 本轮对话做了什么、改了哪些文件、验证到什么程度、还欠什么。
> 状态标注遵守全仓铁律：没真实运行过的一律 NOT_RUN，不写"应该可以"。

## 1. 背景与用户决策

E13 真机测试期间，三星手机每次 BLE 连接 Smart HID 设备都弹**系统配对框**，
且配对后 ~3s 出现 `l2c_link_timeout` 拆链（该怪病已由 STATUS 2s 保活轮询绕过）。
用户拍板：**"我们现在不需要那么麻烦，就是蓝牙连接然后配网"**——取消 SMP
配对，连接即配网，零系统弹窗。代价：配网数据（含 Wi-Fi 密码）BLE 空口明文，
风险已在正典 §7 如实声明（不虚构安全性）。

**配对弹窗的三个来源（本轮全部移除）**：

1. 固件连接建立后主动 `ble_gap_security_initiate()`；
2. Provision Input 特征定义为 `WRITE_ENC`（不加密不让写）；
3. App 侧（Flutter transport）写之前自己调 `createBond()`。

## 2. smart-hid-workspace（main 分支）

**提交 `80a5e58`，已推 gitee origin。** 基于父提交 `cb44128`。

改动文件（共 2 个）：

| 文件 | 改动 |
|---|---|
| `protocols/ble/PROVISIONING_V1.md` | §1 概览"连接（明文直连，无系统配对）"；§2 表格 INPUT 权限"write（明文）"；**§7 整节重写**为明文模型 + 变更记录 + 嗅探风险声明 |
| `smart-hid-firmware/components/ble_provision/ble_provision.c` | ① `g_chrs[]` INPUT：`BLE_GATT_CHR_F_WRITE_ENC`→`BLE_GATT_CHR_F_WRITE`；② `BLE_GAP_EVENT_CONNECT` 删 `ble_gap_security_initiate` 调用；③ `ble_provision_init` 的 sm 配置块删 `sm_bonding/sm_sc/sm_mitm` 三行（仅留 `sm_io_cap`，注释说明只有中心端从系统设置强制配对时才可能触达 SMP） |

编译验证：**PASS**（Windows 本机 ESP-IDF v5.4.0，`idf.py build` 通过；
`smart-hid-firmware.bin` 0x10acd0 字节，app 分区余 31%）。
注意：本机 IDF 是 v5.4.0（安装器目录），build 时把 `dependencies.lock` 的
idf 版本从 5.4.4 改写了——**已还原不提交**；macOS 端（BUILD.md 验证环境
v5.4.4）重编译不受影响，该 diff 与补丁版本无关。

## 3. smart-ble（refactor/uniapp-v1 分支）

**提交 `3ed02ab`，已推双远程（gitee + github，同一 origin 双 pushURL）。**
基于父提交 `5fdf40e`（E13 主体）。

改动文件（共 7 个）：

| 文件 | 改动 |
|---|---|
| `apps/flutter/lib/core/ble/provisioning_transport.dart` | 接口与 FBP 实现删除 `prepareInputWrite()`（内含 `createBond`，即 App 侧配对源）；`_classifyWriteError` encrypt 类文案改为"设备固件为旧加密模型，请重烧 V1 简化固件" |
| `apps/flutter/lib/core/ble/provisioning_controller.dart` | 删 `encryptRetryDelay` 字段/构造参数与 submit 里的配对重试分支（写失败立即呈现）；保活轮询注释更新（轮询保留，作用从"扛 SMP 拆链"转为通用链路保活） |
| `apps/flutter/test/core/ble/provisioning_controller_test.dart` | FakeTransport 删 bond 字段/方法；"encrypt 重试一次"与"bond 失败重试"两用例改写为 **fail-fast** 断言（writeCalls==1、立即 write_failed、不滞留） |
| `apps/flutter/integration_test/p002_provisioning_test.dart` | 仅注释（60s 超时说明不再提 createBond） |
| `apps/uniapp/services/provisioning/transport.js` | `normalizeWriteError` encrypt 类 tip 改固件升级指引 |
| `core/protocols/hid-provisioning-protocol.ts` | 镜像注释同步（INPUT 明文 write，受锁定镜像跟正典走） |
| `verification/windows-mobile-v1/20260904-win-b1/e13-provision/runbook.md` | 头部新增第 5 条：V1 简化说明 + 新固件烧录后配对守护不再需要 + 运行态无串口的烧录途径 |

验证：`flutter analyze` **0 issues**；`flutter test` **59/59 PASS**（本机真实运行）。
真机：**NOT_RUN**（新固件未烧录，见 §5）。

## 4. 本轮新查明的环境事实（重要，防再踩）

1. **Smart HID 固件运行态没有任何串口**：TinyUSB HID 键鼠复合设备
   （USB `303A:4001`）占用 USB-OTG，硬件 JTAG-Serial 外设被顶掉。
   E13 中途 COM13"从总线消失"的真相是这个，不是 USB 接触不良。
2. Windows 上 COM4 是**三星手机的 modem 串口**（VID_04E8），别认成 ESP32。
3. 重烧途径二选一：①按住 BOOT 点按 RST 进下载模式（届时枚举
   `303A:1001` 串口）②插 DevKit 另一侧 UART 口（CH343）。
4. 该固件工程是 **ESP-IDF（idf.py）**，不是 platformio（E12 的 pio 是
   本仓 `hardware/esp32/LightBLE` 夹具，别混）。
5. Windows 端 idf.py 不能在 Git Bash 直接跑（MSys 不支持）：走
   `cmd //c` 临时 bat，bat 里先 `set MSYSTEM=` 等变量再 call
   `export.bat`（`IDF_TOOLS_PATH` 指向安装器目录）。

## 5. 未竟清单（按序，另一台机接手即做）

| # | 事项 | 前置 |
|---|---|---|
| 1 | 烧录 V1 简化固件（workspace 源码重编译或用 Windows build 产物；`idf.py -p <实际枚举端口> flash`） | 物理 BOOT+RST 或插 UART 口 |
| 2 | 真机复验"无配对弹窗直连"：跑 U-01→T5a→T5b 回归，**不需要配对守护进程**；顺带建议删掉手机蓝牙设置里旧 SHID bond（无害但干净） | 1 完成 |
| 3 | T2 带串口复现定位（E13 遗留：候选被逐帧 ACK 但固件不迁移——旧固件黑盒；新固件+串口日志可直接看 prov_task） | 1 完成 |
| 4 | T3→T4(需管理员防火墙拦 17891 入站)→T1→T6→T7→小米 | 用户给 HJWY Wi-Fi 密码（只进命令 env + App 内存，绝不入库/入证据） |
| 5 | 收尾：canon fixture_peripheral_s3 回刷（erase+4 图）→ 停 ControlHub → 清 Windows 本地临时件（controlhub 运行副本/config.yaml/controlhub.log，均未入库） | 全场景完 |

Windows 本机未入库的文件（另一台机**不需要**它们，别当遗漏）：
smart-ble 工作树里的用户脏文件（firmware_build_info.h、.hbuilderx/launch.json、
electron package-lock、tests/target/** 的 CRLF 幻影、e5 diag 会话文件、out*.txt）
与 workspace 的 `smart-hid-controlhub/config.yaml`，按"不提交用户脏文件"约定留置。

## 6. 另一台电脑（macOS）合并步骤

```bash
# smart-ble：拉到 ≥3ed02ab（在 refactor/uniapp-v1）
git fetch origin && git log --oneline -3   # 应见 3ed02ab
# 若 macOS 有本地并行提交：rebase/merge 均可，冲突面见 §3 文件表
# （l10n/tests-target 的 CRLF 幻影差异不是内容冲突，git checkout -- 即可）

# smart-hid-workspace：拉到 ≥80a5e58（main）
git fetch origin && git log --oneline -2   # 应见 80a5e58
# 若 macOS 改过 ble_provision.c / PROVISIONING_V1.md，冲突集中在：
#   - g_chrs[] INPUT 的 flags 行
#   - BLE_GAP_EVENT_CONNECT case 内 initiate 调用
#   - ble_provision_init 的 sm 配置块
#   - 正典 §7 整节
```

合并后建议：macOS 按 BUILD.md 用 v5.4.4 重编译固件并烧录（Windows 产物
未烧过、无偏好在先）；App 侧跑 `flutter analyze && flutter test` 应复现
0 issues + 59 全过。
