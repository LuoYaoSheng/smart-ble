# F014–F017 广播域总结（run-id 20260905-1726-1b793ca 续）

- 日期：2026-09-09 08:10–09:35 本地
- 布景：三星 E5（R5CR1284Y7H，蓝牙名「耀生 的 S21」）为广播者（A-AND/F-AND/U-AND 轮换）；
  ESP32-S3 刷 `fixture_observer_s3`（COM12，boot JSON `git_sha=f9f23b2`，`fixture_role=observer`，
  NimBLE 连续主动扫描、逐条输出 `{"type":"advertisement",...}` JSON，无去重）
- 夹具烧录：`pio run -e fixture_observer_s3 -t upload --upload-port COM12`（SUCCESS 28.5s）

## 结果总览

| 线 | F014 微信广播 | F015 App 广播 | F016 31 字节预算 | F017 观察侧匹配 |
|---|---|---|---|---|
| U-WX | BLOCKED_TOOLCHAIN（开发者工具扫码登录，沿用） | N/A | BLOCKED_TOOLCHAIN（同左） | BLOCKED_TOOLCHAIN（同左） |
| U-AND | N/A | **PASS_WITH_LIMITATION**（降级路径 9/9；正路径 BLOCKED_TOOLCHAIN） | **PASS**（7→11→23→34 算术+拦截） | BLOCKED_TOOLCHAIN（随 F015 正路径） |
| F-AND | N/A | **PASS**（dart 集成 30s 全过） | **PASS**（46/31 红显+按钮禁用） | **PASS**（15 条 mfg 逐字节交叉） |
| A-AND | N/A | **PASS**（F015 等价并入，9/9） | NOT_APPLICABLE（广播页无负载编辑器） | **PASS**（34 条 fff0+净停） |

## A-AND（a-and-f014-f017-e5.py v5 = 9/9）

- 驱动迭代 v1→v5：v1 页面滚动坑（开始广播按钮在折叠下方，dump 不含出屏节点→进页先上滑露出）；
  v2/v3 停止断言口径（stopAdvertising 异步拆链在途帧）+ **v3/v4 观察侧匹配坑：邻居设备
  manufacturer hex「ffff07…」撞子串 fff0**→改 JSON 解析按 services/uuids 数组精确匹配。
- F015 等价：非法 UUID（xyz）→「UUID 格式不正确」错误卡；恢复默认 UUID 0000FFF0-…→开始广播
  →按钮变停止广播+状态卡「正在广播」+logcat `Advertising started successfully`；停止→「未广播」
  +`Advertising stopped`。
- F017：10s 窗口 services 含 fff0 的 advertisement 23 条（≥5）、其中 23 条 name=「耀生 的 S21」；
  再 8s 23→31 持续；停止后宽限内收尾 2 条（异步拆链在途）+宽限后 8s 窗口 0 新增（净停）。
- raw AD 逐段可解码（教学口径）：`020102` flags + `0f09 + 14B UTF-8 完整名` + `0303 f0ff`
  （16 位服务 UUID 0xFFF0 LE）。
- 证据：android-native/aand-f014-f017-results.json + aand-f014-f017-observer-serial.txt
  （fff0 匹配 34 条全录）+ 帧 aand-f015-broadcast-idle/-invalid-uuid/-advertising/-stopped.png。

## F-AND（p008_broadcast_test.dart v10 + f014-run-fand.sh）

- dart 集成 30s 全过（flutter test -d R5CR1284Y7H）：F016 厂商数据 24 字符→预算 46/31 红显
  「合计 · 超限，启动将被拦截」+开始广播按钮 onPressed=null（禁用即拦截，不静默截断）；恢复
  默认 25/31 可启动；F015 负路径×2（'FF'=合法 hex 但长度非 4/8/36→errorText+禁用；空 UUID→
  点开始→错误便签「请输入服务 UUID」且不广播）；正路径默认载荷（FFF0/0001/BLE）→徽标「广播中」
  →保持 15s（F017 观察窗）→停止→徽标离开广播中。
- 观察侧（flutter-android/f014-f017-broadcast-observer-serial.txt + -analysis.txt）：15 条
  fff0 advertisement、全部 name=「耀生 的 S21」、全部 manufacturer=`0100424c45` =
  **公司 ID 0x0001（LE）+ ASCII 'BLE'（424c45）逐字节交叉命中**；raw AD 同样逐段可解码。
- 驱动坑（v1–v10 迭代，已注释入测试文件）：真机 live 模式页面级 TextField enterText 偶发不落位
  （p006 对话框场景可用、本页复现失败）→tap 聚焦+轮询校验+controller 直写兜底；
  **ElevatedButton.icon 的 runtimeType 是私有子类 _ElevatedButtonWithIcon，find.byType 精确匹配
  0 命中**→byWidgetPredicate 子类匹配；hex 输入格式器把 'xyz' 剥成空串→非法长度用 'FF'；
  按钮出屏 tap 落空→ensureVisible。
- 门禁：flutter analyze 0 issues；flutter test 69/69。

## U-AND（uand-f014-f017-e5.py v5 = 9/9，HBuilder 标准基座）

- **WIN-UAND-002（P1，已修复）**：`#ifdef APP-ANDROID/#ifdef APP-IOS` 条件编译 token 在本仓
  工具链（HBuilderX CLI 标准基座 + npm build:app 生产构建）中不被定义——广播页 Android 专属块
  （广播模式/发射功率/可连接/包含设备名称/添加服务UUID 开关）、onLoad 默认载荷（SmartBLE-A/FFE0/
  0001/BLE）、蓝牙开闭+权限前置链（checkBluetoothAndPermissionsBeforeAdvertise）在 App 编译产物中
  **整体为死代码**（函数体编译为空）。修复：App 端细分平台改 runtime `uni.getSystemInfoSync().platform`
  分支，APP-PLUS/MP-WEIXIN/H5 单层 token 保留。验证：编译产物 SmartBLE-A=1/getDefaultAdapter=1
  （修复前均=0）+ E5 真机 9/9。
- F016 全套：默认预算 7/31（名称不含+UUID不含+厂商块 2+2+3）→添加服务UUID 开→11→再包含设备名称
  开→23（SmartBLE-A 10B）→两开关还原关→7→厂商数据 30 字符→34/31 超限红显+点开始广播被 toast
  「广播包 34 字节，超过 31 字节限制」拦截且不进入广播→force-stop 冷重启默认恢复 7/31（tab 切换
  不重跑 onLoad 字段留存，v4 教训）。
- F015 降级路径（标准基座无 LysBlePeripheral 原生插件）：检查支持→日志「插件未初始化」+未就绪；
  合法载荷点开始广播→「广播插件未初始化」错误且不广播。**正路径 BLOCKED_TOOLCHAIN**：LysBlePeripheral
  为本地原生插件，需自定义基座=HBuilderX 云打包（登录）或离线 SDK 集成，本机未登录。
- 驱动坑（v1–v5，已注释入驱动）：webview 只暴露可视区内容（开关 y1187-1580/按钮 y2057+ 折叠
  下方→滚动编排）；键盘关闭态发 BACK 会把 uni-app 页面弹栈（broadcast→已连接）→BACK 仅紧跟
  输入且发后验页；EditText dump 属性顺序 text 在 class 前。
- 同步：HBuilderX CLI `/d/HBuilderX/cli.exe launch app-android --project …/apps/uniapp
  --deviceId R5CR1284Y7H --playground standard`（编译成功+App Launch）。

## F014（微信）与遗留

- U-WX 维持 BLOCKED_TOOLCHAIN（开发者工具扫码登录未做）；R22 微信从机就绪/冲突拦截/开发者工具
  提示等验收项待解锁后补跑。
- **预先存在（非本轮引入）**：tests/unit/hid-navigation.test.mjs 仍 import 已被 5ad66f9
  （PARITY-G1 删 P004 历史链）移除的 `buildHidHistoryUrl` → node --test 该文件失败；本轮
  verify-uniapp.sh 全量门禁因此红，广播相关单测（advertising-payload/broadcast-validation/
  advertisement 3 文件）全过 + npm run build:mp-weixin DONE。归用户并行 PARITY 工作收口。

## 观察侧证据交叉（F017 汇总）

| 线 | fff0 条数 | name 匹配 | mfg 交叉 | 停止净停 |
|---|---|---|---|---|
| A-AND | 34 条（10s 窗 23） | 23/23 全名 | （A-AND 无厂商数据字段，PARITY-004 在册） | 宽限后 8s 0 新增 |
| F-AND | 15 条 | 15/15 全名 | 15/15 = 0100424c45（0x0001+'BLE'） | dart 侧停止断言+采集窗内停止 |

## 夹具状态

- COM12 现为 `fixture_observer_s3`；F018–F024 Smart HID 域前需刷回对应夹具。
- 下一步（§28 顺序）：F018–F024 Smart HID 域（F-AND 复用 E14 证据链重跑口径 + U-AND 真机；
  A-AND 无配网页=PARITY-001 不跑）。
