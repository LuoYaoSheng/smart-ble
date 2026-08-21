# 目标 VS 当前 GAP

| ID | 功能 | 合理效果 | 当前 | 差距 | 严重度 | 建议 |
|---|---|---|---|---|---|---|
| G001 | 扫描 | 每轮独立、可停止、可重试、错误可见 | 第二轮用户实测失败；错误吞掉 | 核心入口失效 | P0 | ScanSession 状态机/串行 stop/start/错误面/真机测试 |
| G002 | 资源 | 代码引用即能在 dist 显示 | 新 assets 缺失于 dist | 关于页视觉失败 | P0 | clean build + asset manifest gate + fallback |
| G003 | 广播查看 | 完整、诚实展示发现字段 | 仅两字段 | 用户无法排障 | P1 | AdvertisementSnapshot + fixtures |
| G004 | 生命周期 | 切页不遗留扫描 | 仅 onUnload stop | session 竞争 | P1 | onHide/App hide cleanup |
| G005 | HID 文案 | 用户预期一致 | “免二维码”但实际扫码 | 产品误导 | P1 | 改为“手机 BLE 配网”/说明二维码用途 |
| G006 | HID 历史/诊断 | 历史可保存且可重连诊断 | 内存历史、诊断要求现存 session | 维护链断裂 | P1 | 存储非敏感元数据；诊断重连 flow |
| G007 | 微信广播 | 明示平台支持 | 页面能力承诺超前 | 平台兼容风险 | P1 | capability matrix + E4 验证 |
| G008 | 分享/关联应用 | 有可验证回流/失败 fallback | 仅代码路径 | 体验未验收 | P2 | 真机跳转测试、二维码/复制 fallback |

**第一轮结论：🔴 暂不建议上线。**依据是剩余 P0（连续扫描、dist 资源）而非代码量。已验证范围限 E1、局部 E2；微信开发者工具与真机核心 BLE 未验证。
