# 页面盘点

证据：`apps/uniapp/pages.json` 与页面源码（E1）。状态不是测试通过结论。

| ID | 路由 | 目的 | 入口/出口 | 当前状态 |
|---|---|---|---|---|
| P001 | `pages/index/index` | 通用扫描、广播查看、连接入口 | Tab；→ P005 | ⚠️ 部分通过（扫描会话风险） |
| P002 | `pages/hid/index` | 已移除：不再作为独立页面/Tab | — | ⚪ 由首页 Profile 入口替代 |
| P003 | `pages/hid/add` | 六步 Smart HID 配网 | P001 Profile 操作；→ P004/P006 | 🟡 已实现未验证 |
| P004 | `pages/hid/detail` | 专属资料与维护动作 | P001/P003；→ P003/P006/P005 | ⚠️ 部分通过（历史与实时混用） |
| P005 | `pages/device/detail` | 通用服务、特征、读写、notify、OTA | P001/P004 提示；→ 返回 | 🟡 已实现未验证 |
| P006 | `pages/hid/diagnostics` | Smart HID 诊断 | P003/P004；→ 返回 | ⚠️ 部分通过（无 session 无法诊断） |
| P007 | `pages/broadcast/index` | 外设广播工具 | Tab | 🟡 已实现未验证；微信适用性待证 |
| P008 | `pages/about/index` | 关于、分享、外部/关联应用入口 | Tab；→ P009/其它小程序 | ❌ 已验证失败（新增图像未进 dist） |
| P009 | `pages/about/version` | 静态版本历史 | P008；→ 返回 | 🟡 已实现未验证 |

Smart HID 入口统一由 P001 扫描结果中的 Profile 标识触发；P006 只能经详情或配网异常进入。
