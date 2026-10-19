# E8: 双手机设备矩阵（三星 SM-G9910 × 小米 24117RK2CC）

日期：2026-09-04 14:20–14:35。新手机 B=50143338（24117RK2CC，WebView 暴露文本节点）。
U-AND APK 从手机 A 拉取安装（15,231,245 字节，versionName 1.0.0）。

## 结论
- **DEF-009 判别为设备相关**：同一 APK，三星连接 0/2 静默失败；小米首试失败、**二试成功**（已连接+5 服务+断开恢复广播 521ms）
- **DEF-011 新增（P2）**：U-AND 服务展开后特征值行不渲染（空白）
- U-AND 读/写/notify：NOT_RUN（被 DEF-011 UI 不可达阻塞）

## U-AND on 手机 B 全程
| 步骤 | 结果 | 证据 |
|---|---|---|
| 安装/启动/扫描 | PASS：BLEToolkit-Server -41dBm 列表可见（此机 WebView 暴露文本） | b-launch.xml / b-after-scan-tap.xml |
| 连接第 1 次 | FAIL：静默回列表，串口零事件、logcat 零 GATT 行 | b-connecting.xml |
| 连接第 2 次 | **PASS**：串口 connected ts=10745031→service_ready；UI 已连接+发现 5 个服务 | b-connected.xml |
| 服务 1800 展开 | FAIL（DEF-011）：展开按钮变"收起"但特征行区域（y1595-1735）**0 个非背景像素**；重置展开复验仍 0 | b-1800open.png + 像素扫描（README 记录） |
| 读/写/订阅 | NOT_RUN：特征行不渲染→操作按钮不存在 | — |
| 断开 | PASS：UI 断开；串口 disconnected ts=11335966→adv started ts=11336487（**521ms**） | 串口 |

## DEF-009 修订（结合双机证据）
- 三星 SM-G9910（Android 15）：连接 0/2，logcat 零 connectGatt，广播同样静默失效
- 小米 24117RK2CC：首试失败但二试成功 → U-AND 的连接实现**存在时序竞态**（怀疑：扫描未停即发起连接/系统栈繁忙时 uni-app BLE 插件静默吞错），在三星上 100% 触发、小米上间歇触发
- 广播失效仅三星复现（小米端广播未测——如需可补）

## 环境备注
- 手机 B 分辨率 override 1080x2400（物理 1440x3200）；uiautomator 可抓 WebView 文本但特征行层级不暴露
- APK 安装命令与哈希：u-and-base.apk（同目录）
