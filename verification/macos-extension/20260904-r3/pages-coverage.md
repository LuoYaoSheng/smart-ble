# r3 · 原型对齐页面覆盖（2026-09-04）

> 触发：用户走查反馈「要按原型稿开发页面吧，感觉没怎么对齐」。
> 原型基准 = `docs/specs/prototype/platform/desktop/`（PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE + high-fi 实例），
> 页面正典 = `docs/specs/03_flow/PAGE_SPEC.md`（9 页 · TabBar 四项 · 二级页入栈）。
> r1/r2 的旧三分栏 + 工具栏 UI（发明的临时界面、英文文案）与原型完全不对齐，r3 全量重写 UI 层。

## 1. 对齐决策与范围

| 项 | 决策 |
| --- | --- |
| 对齐对象 | 原生 SmartBLE-mac（`apps/desktop/macos/**`，spike 允许区） |
| 设计令牌 | `docs/specs/prototype/v1-new/assets/tokens.css` 逐值映射（颜色/字号/4 基准间距/圆角），不产生圈外值 |
| 导航语义 | 复刻原型内核 app.js：switchTab / go / back / redirect / smartGo（页面栈感知） |
| 组件口径 | COMPONENT.md 组件族以 AppKit 等价实现：B1 按钮/B2 chip/B3 badge/B4 kv/B5 表单/B6 empty/B7 op-state/B8 error-banner/B9 note/C5 log-panel（六色）/C6 stepper |
| 文案 | 全量采用正典中文文案（按钮/状态/空态/错误/日志行） |
| Flutter macOS | 结构已对齐（MainScreen 底部四 Tab = P001/P007/P008/P009 正典），视觉/桌面适配深化属 `apps/flutter/lib/**` 共享层 —— 不可改区，见 integration-notes S8 |

## 2. 页面级对齐矩阵（9/9）

| 页 | 原型结构落地 | 真实能力（诚实口径） | 冒烟 |
| --- | --- | --- | --- |
| P001 扫描 | 自绘导航栏（kicker/标题/蓝牙三态 chip）→ 扫描工具条（5s 会话文案）→ 附近设备（筛选面板×预设/滑杆/前缀/隐藏无名/重置 + 计数 chip）→ 设备卡（头像/名称 fallback/ID 等宽/信号四格/SHID 徽章双入口）→ 两种空态 → 广播数据弹窗（F004 含「本轮平台 API 未提供此字段」标注） | CoreBluetooth 真实扫描（本轮环境发现 3-4 台）；名称多级 fallback（F005）；Profile 匹配=探针启发式（服务 UUID 强/名称前缀弱，正式注册表在共享层） | UIS-01..05 PASS |
| P002 配网向导 | 三步 stepper + 设备摘要卡 + 三阶段（连接/填写/四行进度）+ 离开确认（配网中/脏表单隐私口径） | 连接阶段真实；配对码=桌面口径「扫码为主+粘贴兜底」：摄像头 NOT_RUN（探针未实现，sheet 内显式标注）→ 粘贴/手输兜底真实正则解析（t= 必需/hub= 回填）；下发无 SHID 夹具→诚实错误态（smart_hid_service_missing，BLOCKED_FIXTURE），不伪造成功 | UIS-07 PASS |
| P003 SHID 详情 | 设备身份卡/最近配置卡/内存快照 note/三出口（重新配置/运行诊断/高级 BLE 调试） | 快照态需配网成功（夹具）→ 守卫空态「设备记录不存在」为当前真实态 | UIS-12 PASS |
| P005 诊断 | 状态行（六值徽章）+ 五项诊断行（五态）+ 错误码显隐 + 栈感知返回/重新配网确认 | BLE 链路项真实；其余四项需 SHID 协议（BLOCKED_FIXTURE）→ error 态 + modal 引导 | UIS-12 PASS |
| P006 GATT 调试 | **桌面差异：两栏重排**（左主区设备/服务树/操作、右 dnote+日志常驻）；服务折叠树+特征行 props chip+读/写/监听；写入弹窗（TEXT/HEX 校验）；OTA 仅检测到 4FAFC201 服务显示 + P-03 BLOCKED 演示弹窗 | 真实连接→服务/特征枚举→读写监听（正向链需夹具，NVC-04）；连接 10s 超时+3 次退避重试（正典口径） | UIS-06 PASS |
| P007 已连接 | 汇总卡 + 连接态设备卡（ON 角标/断开 danger）+ 双空态文案 | **单连接限制（诚实标注）**：BLEManager 单会话，多设备并行属共享层能力 | UIS-02 PASS |
| P008 广播 | **桌面差异：平台徽标 Desktop · macOS + 页首原生层提示（CoreBluetooth · D2 不预判）**；表单四项 + 深色字节预算条 + 分项预算 + 超限红字拦截（不静默截断）+ 检查支持 + card 日志 | 真实 CBPeripheralManager 启停与支持判定；31B 预算实时核算（默认 21B→注入超限 46B 拦截→恢复）；外部可见性仍 BLOCKED_OBSERVER | UIS-08/09 PASS |
| P009 关于 | 品牌卡（渐变）/更多小程序（推广 sheet：伪二维码+落地页+下载候选拦截）/应用信息（真实环境+**操作系统行**）/平台状态五词/生态矩阵卡（macOS 行：广播发送 ❌【待验证】C2）/四菜单/页脚 | 落地页真实 NSWorkspace 打开；外链 modal；分享复制真实剪贴板；OS 行=真实宿主 macOS·CoreBluetooth（见 §3 分歧） | UIS-10 PASS |
| P010 版本记录 | 当前版本卡/当前限制卡（r3 实测限制清单）/正式发布历史空态/预览记录（spike 轮次）/页脚投影声明 | 探针构建元数据投影（0.1.0-spike · preview · spike/macos-extension-v1） | UIS-11 PASS |

**桌面差异点落地清单**（PLATFORM_SPEC §3）：P002 扫码为主+粘贴兜底 ✅（摄像头 NOT_RUN 分歧见 §3）· P006 两栏 ✅ · P008 OS 徽标+原生层提示 ✅ · P009 操作系统入口 ✅（信息呈现口径）· F029 分享=复制+候选拦截 ✅ · F011 日志导出=复制+候选拦截 ✅ · F028 推广承接=落地页+小程序码 ✅ · 生命周期=常驻+退出确认（会话感知）✅。

## 3. 与原型的诚实分歧（登记，非静默偏离）

| 分歧 | 原型 | r3 实现 | 理由 |
| --- | --- | --- | --- |
| P009 OS 切换 | mac/win/linux 三档切换（评审演示装置，联动 chrome/徽标/矩阵） | 只读信息 sheet（三系原生层口径），实机呈现真实宿主 macOS | 实机伪造 win/linux 环境属造假；切换装置服务原型评审，非产品能力 |
| P002 摄像头扫码 | 取景器 sheet 1.6s 演示识别 | 取景器位置显式标注 NOT_RUN + 粘贴兜底为可用主路径 | 探针范围无二维码识别；不伪造「识别成功」 |
| 窗口 chrome | 还原层三形态（交通灯/右侧三钮/仅 ✕） | 原生 macOS 窗口（OS 渲染） | 原型明示「窗控为还原层，实际由操作系统渲染」 |
| P007 多设备 | 3 台会话演示 | 单会话 + 诚实标注 | BLEManager 单连接；多连接属共享层（Windows Gate） |

## 4. 证据

- 冒烟：`logs/pages-smoke.txt`（UIS-01..13 全 PASS，真实扫描 3 台/真实连接尝试/外围就绪）
- 快照：`snaps/snaps-r3/p001..p010.png`（9/9，cacheDisplay 渲染，无需屏幕录制权限；UIS-14）
- 视觉复核：p001/p008/p009/p006 经 AI 视觉核对（导航/kicker/状态点/表单/深色预算条/两栏布局逐块符合）
- 汇总：`logs/native-summary.tsv`（NVB 2 PASS · NVC 3 PASS + 2 BLOCKED · UIS 14 PASS）

## 5. 复现

```bash
cd apps/desktop/macos/SmartBLE-mac && swift build
./.build/debug/SmartBLE-mac --smoke-pages   # UIS-01..13
./.build/debug/SmartBLE-mac --snap-pages    # snaps-r3/*.png（cwd 输出）
# 或一键： scripts/macos/verify-native-macos.sh 20260904-r3
```
