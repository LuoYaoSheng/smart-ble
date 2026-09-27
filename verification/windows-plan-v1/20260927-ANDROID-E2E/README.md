# 华为真机驱动配网 E2E（2026-09-27）：层2/层3 双裁决 + 安卓 App 六连修

**触发**：用户提出「两台安卓手机 + 一台 ESP32 + 一台 Windows，理论上可测完大部分」，
授权我自动化执行搁置的「手机手动配网」决定性实验。

## 一句话结论

1. **层 2 裁决（决定性实验）**：Android 中央（华为 TAS-AN00, API31）下 **coex 饥饿不存在**
   ——BLE 保持连接时 WiFi 关联 HJWY 仅 1.1s（auth→run），全程无 reason=210 循环；
   固件侧 CPUP relax（200-300ms lat4）rc=0 被中央接受。Windows 中央的 210 饥饿是
   WinRT 栈特有，产品主路径（手机端）无此问题。
2. **层 3 裁决（新实锤）**：HJWY 2.4G 侧（192.168.23.x NAT 段）设备**无法回穿**到
   21 段 hub——设备关联+拿 IP 后 POST `192.168.21.77:17892` 超时（EAGAIN 15s）
   → `controlhub_unreachable`。同址手机（24 段）ping hub 可通，**23 段出站被隔离**。
   属环境事实（HJWY 子路由隔离），非产品缺陷；产品链路终态改走 Windows 移动热点
   （192.168.137.x 直连段）验证。
3. **E2E 最后一环（配对 POST→MQTT→READY）未达成**——非产品原因：会话中途板子被
   并行会话/他人**偷刷为第三方固件**（串口新横幅 `SD_WIFI: connecting to ssid K80`，
   SD_* 日志标签非本仓固件），15:46 最终下发时设备已非我方固件。层 2 证据在此之前
   已完整捕获。

## 安卓 App 真机首曝六连修（本会话代码变更，全部真机验证）

| # | Bug | 修复 | 验证 |
|---|-----|------|------|
| 1 | 背靠背 CCCD descriptor 写：第二个 `writeDescriptor` 被 Android GATT 串行队列拒绝（false 无回调）→「打开配网特征通知失败」秒断链 | BleManager 新增 `descriptorWriteEvents` 流；传输层改为「写→等 onDescriptorWrite(status==0)」串行 + 120ms×4 重试 + 订阅后 150ms 沉降 | 串口 `attr=3 notify=1` + `attr=8 notify=1` 双订阅、连接保持 |
| 2 | ConnectPhaseCard 显示条件 `connecting \|\| (phase==Connect && deviceInfo==null)` 恒先命中 → connError 被永久遮蔽成「正在连接…」，无重试入口 | 错误分支前置 + 「重新连接」按钮 | 真机出现「读取特征超时（10s）」+ 重连按钮 |
| 3 | **API<33 回调签名失明**：只重载 API33+ 新签名（`onCharacteristicRead(gatt,chr,value,status)` 4 参 / `onCharacteristicChanged(gatt,chr,value)` 3 参），本机 API31 框架只调旧签名 → 读值/通知结构性不可见（读 accepted 但 10s 无事件） | 双签名兼容转发（旧签名取 `characteristic.value` 转发新签名统一发射） | Device Info 读取成功、阶段切到「填写配置」 |
| 4 | **底部 Tab 点击 NPE 崩溃**（三崩实锤 PID 6801/7917/…，重启后早期点 Tab 必崩）：`BottomNavItem.entries` companion clinit 时序竞态把未完成初始化的单例固化为 null | entries 改 getter（每次现取）+ switchTab getOrNull 兜底 | 其后全程 Tab 切换零崩溃 |
| 5 | **DsInput 长文本挤掉 trailing 按钮**：`weight(1f)` 挂在 decorationBox 内层 Box，BasicTextField 本体无约束 → 长配对码把「解析」按钮挤出可视区（截图实证） | weight 移到 BasicTextField 本体，内层 Box fillMaxWidth | 长文本下「解析」按钮恒在 [827,1241][909,1294] |
| 6 | **token 输入框一字即卸载**：token 非空就换掩码行 → 手输/注入第二字符起全部落空（只能走粘贴/扫码） | 满 32 位才切掩码行 | 32hex 直打成功切掩码（`重新输入` 出现） |

另登记未修观察项：HidDeviceSessionViewModel.onCleared 中 dispose 的 launch 被
viewModelScope 取消竞态吞掉 → 退出配网页后 BLE 链路滞留（已连接 tab 可见）。

## 测试执行账（相对昨日搁置项）

- ✅ **T1 主链**：扫描→SHID 卡「配置 Smart HID」→自动连接+双订阅+Device Info 校验→
  表单（粘贴 shid://pair + 解析 一键填 hub/port/token）→ 下发 → 设备侧
  candidate→WiFi 关联（HJWY 1.1s，CPUP relax 生效）
- ✅ **T4 错误码 ×2**（顺带捕获）：`controlhub_unreachable`（23 段隔离，App 四行进度+
  错误码+恢复动作完整呈现，evidence/t007）、`wifi_failed`（SSID 塼错 → 设备
  reason=201 NO_AP_FOUND 循环→超时，evidence/t009）
- ✅ 失败后「返回表单」**表单保值**（canon 行为）
- ⛔ E2E 终局（pairing 消费→MQTT→READY）、T2 停广播复扫、T3 重配网：被固件偷刷中断

## EMUI 输入自动化坑位账（本会话新增，接昨日四坑）

1. **输入法是中文拼音态时，adb `input text` 的拉丁注入进组词管线不落框**（随机吞尾/
   全吞）——先 `adb shell ime set com.huawei.ohos.inputmethod/...LatinIME` 切拉丁
   输入法，注入才确定性
2. **uiautomator dump 不含 IME 窗口**且**无法暴露焦点/键盘开闭**——dump 坐标在键盘
   开合动画期是移动靶；折叠线以下节点被剪枝（掩码行不可见≠未设置）
3. 输入法工具栏**下拉收起箭头 ≈(1010,1545)** 是比 KEYCODE_BACK 安全的收键盘手段
   （BACK 在键盘已收时会退出配网页并清空表单——本会话烧了两次）
4. **三键导航条 y≥2245 是雷区**（点 Tab 必须 y≤2230）
5. 粘贴框 `shid://pair?token=…\&host=…` 的 `\&` 设备端转义可行（%26 不可解码的补充）
6. Windows 移动热点 WinRT 编排：PS5.1 必须 `-MTA`（STA 下 StartTetheringAsync 死锁）
7. 并行会话偷刷固件坑**再次实锤**（20260921 后第二次）：串口横幅日志标签+GAP 连接
   的 SSID 名是鉴别手段

## Evidence（evidence/）

- `serial-key-events.scrubbed.txt` — **主证据**（脱敏后）：country CN 生效、双订阅、
  层2 HJWY 1.1s 关联、层3 EAGAIN 超时、201 循环、SD_* 偷刷横幅
- `serial-live.log` / `serial-watcher.py` / `serial_watch.py` — 原始串口全量（**含
  密码字样与 token，仅本地留存，勿提交**）
- `t000`~`t010*.png` — 手机屏幕证据；**t004/t005/t008/t010 含明文密码，仅本地**；
  t002/t003/t006/t007/t009 可入库
- `form_filler.py` / `final_submit.py` / `converge_submit.py` — 自动化编排工具
  （**硬编码凭据，仅本地**；复用前先脱敏）
- `uidump-*.xml` — UI dump 快照序列（含敏感值，仅本地）
- `gradle-build*.log` — 五轮构建记录

## 设备归还状态

- 手机：App 为 debug 1.0.0（含全部六修，比晨间 release 新）；输入法已还原华为默认；
  常亮已关；未触碰 24117RK2CC（COM4 三星设备未动）
- 板子：已被第三方刷为 K80 固件，**未回刷**（他人进行中的工作，勿碰）
- Windows：移动热点已关；controlhub-cnfix.exe 保持运行（晨间原状）
