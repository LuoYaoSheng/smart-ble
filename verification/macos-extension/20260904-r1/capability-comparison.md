# 两条 macOS 路线对比 — run 20260904-r1

证据来源：flutter-macos-{baseline,capabilities}.md、native-macos-{baseline,capabilities}.md、
test-results.json。所有"实测"均来自本轮真实执行；无证据处标注 NOT_RUN/BLOCKED。

| 维度 | Flutter macOS（apps/flutter + FBP 1.36.8 / FBP-Periph 2.1.1） | 原生 AppKit（apps/desktop/macos/SmartBLE-mac + native-probe） |
|---|---|---|
| 构建成功 | **实测 PASS**（debug+release 均 0 error；analyze/test 全绿） | **实测 PASS（修复后）**：开箱 19+ 错误，本轮 5 处平台层修复后 0 error |
| 运行成功 | **实测 PASS**（App 启动、窗口前台、无崩溃） | **实测 PASS（修复后）**：@main 默认引导曾完全不进生命周期 |
| Central 扫描 | **实测 PASS**：真实发现 6 设备/87 更新 | **实测 PASS**：5 设备/23 更新 |
| 多设备 | 去重正确（6 unique） | 去重正确（5 unique） |
| GATT（发现/读/写/通知） | 插件 API 链完整；正向 **BLOCKED_FIXTURE**（无安全夹具） | 探针全链代码 + 负面路径实测；正向 **BLOCKED_FIXTURE** |
| Peripheral 广播 | **API 层 PASS**（状态流 idle→advertising→idle）；外部可见性 **BLOCKED_OBSERVER** | **API 层 PASS**（含 GATT server 三特征）；外部可见性 **BLOCKED_OBSERVER** |
| 生命周期 | SIGTERM 干净退出；探针多进程启停一致 | terminate 钩子显式 disconnect/stopScan；SIGTERM 干净退出 |
| 权限 | entitlements+Info.plist 齐备；已授权直接 PoweredOn | Info.plist 双键齐备；CLI 链路直接 PoweredOn |
| App Sandbox | Debug/Release 均 Sandbox+bluetooth；Release 无多余 network server；广播在 Sandbox 下 API 层成功 | SPM CLI 无 Sandbox（无 bundle）；App 化需补打包 |
| 长时运行 | 未做小时级长跑（本轮范围外） | 同左 |
| 共享移动 UI | **与 Flutter Android 共享 lib/**（本轮 Mac 未改一行） | 无共享，UI 需重写（当前 2247 行原型且英文硬编码） |
| 平台原生体验 | Flutter widget 渲染，非真 AppKit 控件 | 真 AppKit（NSSplitView/NSTableView 等） |
| 维护成本 | 与 Windows 主线同一技术栈、同一 pubspec；平台差异集中在插件 darwin 实现 | 需维护第二套 Swift UI+Ble 栈；与 UniApp/Flutter 规格漂移已现 |
| 对 Windows 主线冲突 | **零共享文件修改**（lock/registrant 漂移已还原不提交） | 零（完全独立目录） |
| 当前第一断点 | BLE GATT 正向链无夹具；FBP 启动竞态（见 defects D1）需共享层守卫 | App 为早期原型（单连接/无重连/无队列/无 Profile/英文硬编码），距产品规格远 |

## 结论（按允许口径）

- **Flutter macOS：VIABLE_WITH_LIMITATIONS** —— 构建/运行/扫描/权限/沙盒全实测通过，
  与 Windows 共享产品层的接入成本最低；限制=插件竞态类缺陷需共享层守卫、GATT/外可见性证据待夹具。
- **原生 AppKit：VIABLE_WITH_LIMITATIONS** —— CoreBluetooth 能力与 Flutter 等价（同边界），
  真原生体验；限制=开箱不可编译的历史欠账本轮才修复、原型距产品规格远、双栈维护成本高。

**两条路线在 BLE 能力上无差异**（同一 CoreBluetooth 底座、同一同机可见性约束）。
差异全部在产品层复用与维护成本：Flutter 复用共享 lib（Windows 主线工作的直接延伸），
原生需重建全部 UI 与业务层。下一轮 spike 若无"真原生体验"硬需求，Flutter macOS 为
更低冲突路径；原生路线保留为 AppKit 深度集成（菜单栏常驻、系统级 UX）的对照选项。

本轮**不宣布** Desktop 正式技术选型（需用户授权 D2 决策）。
