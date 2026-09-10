# 20260910-ui-conv 视觉证据集

UI 统一收敛轮（2026-09-10）截图证据与采集工具归档。

## parity/ 子目录

| 目录 | 轮次 | 内容 | 通道 |
|---|---|---|---|
| smoke-uwx / smoke-fand / smoke-nios | 烟测首跑（P001/P007/P008/P009 默认态，3×4=12 张）+ P009 F028 移除后三线重采 | 见 MULTI_END_VISUAL_PARITY_MATRIX §3 与 PARITY_AUDIT §14.6/§15 | U-WX automator / F-AND 宿主窗口截屏 / N-IOS simctl |
| vis1-nios | 视觉 Gate 可达态首轮 | P001 空态A（平台不支持 chip）+ 筛选展开 + P010 | simctl + CGEvent（窗口 [2120,158,397,858]，scale≈0.902） |
| vis1-uwx | 同上 | P001 空态A + 筛选展开（setData）+ P010 + P002（reLaunch） | automator（脚本 vis1-uwx-capture.cjs） |
| vis1-fand | 同上 | P001 空态A（蓝牙不可用）+ Error B8 横幅（E2 形态）+ P010 | 宿主 screencapture -R100,100,411,942 + adb input tap（guest 1080×2400，scale x2.628/y2.548） |

登记：VISUAL §2/§3、PARITY_AUDIT §17。所有截图均经视觉模型逐字复核为真实页面（防空白/黑屏/错页冒充）。

## 工具链坑位（复用）

- automator 穿不进 uniapp 自定义组件（page 树仅宿主浅层）；页面级 setData/reLaunch 可用。
- Flutter semantics 未开时 uiautomator dump 无节点（返回 launcher 层）。
- CUA 辅助功能授权失效时：Quartz CGWindowList 查窗口 bounds（dict 取值）+ CGEvent 点击；坐标用像素聚类定位（品牌蓝文字簇）而非视觉模型坐标（噪声大）。
- 微信开发者工具窗口为 GPU 合成，screencapture 取色有偏移，勿依赖精确色值匹配。
