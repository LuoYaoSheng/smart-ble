# U-AND 模拟器可达态首轮（vis1-uand）· 2026-09-11

## 0. 定位与口径

- **背景**：U-AND 上一次像素证据是 2026-09-09 UI-G1 轮的 E5 真机 P001 九态；此后三轮（09-10 烟测/vis1、09-11 mock）U-AND 持续缺席，卡点为「HBuilderX 打包域」未打开。本轮在 Mac 上打通该域（HBuilderX CLI + 标准基座 + 模拟器），**首次落袋 P001 之外页面（P002/P007/P008/P009/P010）的 U-AND 像素证据，并对当前 HEAD 复证**。
- **通道**：HBuilderX 5.24 CLI（`launch app-android --playground standard`）编译并运行到 **Pixel_API35 模拟器**（emulator-5554，Android 15，420dpi，1080×2400）。基座宿主包 `io.dcloud.HBuilder`（标准基座；正式打包后为 com.smartble.uniapp）。
- **编译产物**：`apps/uniapp/unpackage/dist/dev/app-plus/app-service.js`（2026-09-11 12:29 编译，源=当前 HEAD）。
- **证据等级**：真实 app-android 渲染管线（uni-app vue3 → V8 逻辑层 + 系统 WebView 渲染层），非 H5 代理。仍属「可达态首轮」：模拟器无 BLE 射频，扫描/连接/OTA 深态不可达（与 vis1 各线同口径，深态留真机/夹具）。

## 1. 采集清单（12 张，全部 PNG 落袋本目录）

| 文件 | 页面/状态 | 目检结论 |
|---|---|---|
| uand-sys-permission-dialog.png | 基座运行时权限弹窗（CALL_PHONE，基座自带非应用清单项） | 基座壳噪声，已拒绝；BLE 四权限已 pm grant |
| uand-p001-default.png / uand-p001-empty-a.png | P001 默认/空态A | 导航「BLE TOOLKIT+/扫描」+蓝牙就绪+「待开始扫描」+空态 |
| uand-p001-scanning.png | P001 扫描中（真实 startBluetoothDevicesDiscovery） | 「扫描中 · 5s 会话」+danger 停止钮 |
| uand-p001-scan-done.png | P001 扫描完成（用户停止后） | 「扫描完成 · 发现 0 台」+空态B「还没有扫描结果/点上方按钮开始扫描附近 BLE 设备」 |
| uand-p001-filter.png | P001 筛选面板展开 | 「收起筛选」toggle + 信号强度/强匹配/隐藏无名等控件 |
| uand-p002-default.png | P002 添加 Smart HID（cli --pagePath 深链直达） | 步骤条 1/3+设备名称/配对码/确认配对码+扫码大卡+「连接设备」 |
| uand-p007-devices-empty.png | P007 设备页空态 | 空态「当前没有已连接设备」族 |
| uand-p008-off.png | P008 广播页未开启 | PERIPHERAL「未开启」+本地名称/UUID/厂商ID/数据表单+「开始广播」+空日志面板 |
| uand-p009-about.png | P009 关于 | 品牌卡（BLE TOOLKIT+/蓝牙工具箱·Android preview 渠道段在位）+四菜单项 |
| uand-p010-versions.png | P010 版本记录 | 版本卡 v1.0.5·build 101·preview+历史/预览卡（五线同值） |

P001 toast（use-ble-scan.js:87 `扫描完成 · 未发现设备`，0 台特判）在 scan-done 帧后 2.5s 复采剔除。

## 2. 设备渲染文案 = 正典（bundle 级核对）

对设备实际运行的编译产物 `app-service.js` 跑 43 态文案集（scripts/ui/uniapp-h5-mock-copycheck.mjs 的 121 条 expect）：

- **109/121 直接命中**；3 条为运行时插值（模板本体在 bundle：`扫描完成 · 发现`×2、`errCode`×15、`未命名 BLE`×2、`（未命名）`×3=UI-DEF-01 修复已入设备包）→ 实收 **113/121 硬命中**；
- 8 条未命中全部为 **H5-mock 专有字串**（Office-5G / 通用访问 / 电池服务 / OTA 服务 / 串口透传 / diagnostic_read_failed 等，`#ifdef H5` 剥离，按设计缺席）；
- 1 条 `未发现可用服务` 为未被引用的 toast 导出（tree-shake 正常剔除，非缺陷）。

## 3. 过程事故与裁定（诚实记录）

1. **视觉模型 OCR 幻觉两起**：全帧与 2× 放大裁图两次把空态A 读成「还没有扫描到设备/开启蓝牙后点击开始扫描…」；经源码+bundle grep 裁定实际渲染为正典「还没有扫描结果/点上方按钮开始扫描附近 BLE 设备」。**教训：截图文字以 bundle grep 为准，OCR 仅作页面身份判别**。
2. 「扫描中 · 4s 会话」误读 → 裁图放大裁定为「**5s** 会话」（scan-summary.vue:42 正典）。
3. 基座弹窗×2（设备标识码授权 / CALL_PHONE 每次冷启重问）为标准基座噪声，正式打包不存在。
4. Tab 点击 y=2330 被底部手势区吞掉，y≈2260-2290 生效（Android 15 gesture insets，采集脚本注意项）。

## 4. 结论

- **U-AND 可达态落袋：像素级 12 张 + bundle 文案 113/121 硬命中**，与 vis1 五线同口径，未发现 UI 缺陷。
- 至此六线可达态首轮齐整（U-WX/U-AND/F-AND/N-IOS/N-MAC/F-MAC）。
- 剩余（各线共同队列）：扫描有结果/连接/配置/诊断/OTA 深态需真机或 BLE 夹具；U-WX 扫描态元素级驱动仍卡 devtools 登录（用户队列）。

## 5. 复现

```bash
/Applications/HBuilderX.app/Contents/MacOS/cli open
/Applications/HBuilderX.app/Contents/MacOS/cli launch app-android \
  --project <repo>/apps/uniapp --deviceId emulator-5554 --playground standard \
  [--pagePath pages/hid/add]
# 驱动：adb input tap（Tab y≈2270，避开底部手势区）；截图 adb exec-out screencap -p
# 基座 BLE 权限：adb shell pm grant io.dcloud.HBuilder android.permission.BLUETOOTH_{SCAN,CONNECT} ...
```
