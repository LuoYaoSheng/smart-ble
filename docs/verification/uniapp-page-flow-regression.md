# UniApp 10 页页面与跳转回归

## 运行

```bash
./scripts/verify-uniapp-pages.sh
```

需要 HBuilderX 和微信开发者工具。快速单元/静态门禁仍运行 `./scripts/verify-uniapp.sh`。

## 正典页面清单

| 页面 | 路径 | 当前自动化 |
|---|---|---|
| 扫描 | `pages/index/index` | Tab 打开、可读主动作 |
| Smart HID 配网 | `pages/hid/add` | 带设备上下文打开 |
| Smart HID 详情 | `pages/hid/detail` | 历史设备上下文打开 |
| Smart HID 历史 | `pages/hid/history` | 有数据列表、进入详情 |
| Smart HID 诊断 | `pages/hid/diagnostics` | 带设备上下文打开 |
| 通用设备详情 | `pages/device/detail` | HID/通用设备上下文打开 |
| 已连接 | `pages/connected/index` | 空态返回扫描、设备上下文进入详情 |
| 广播 | `pages/broadcast/index` | Tab 页面和操作区渲染 |
| 关于 | `pages/about/index` | Tab 页面、进入版本记录 |
| 版本记录 | `pages/about/version` | 当前版本 `v1.0.5`、返回关于 |

## 证据边界

模拟器证明页面注册、渲染、状态传递和路由往返；扫描结果、扫码、真实 GATT、Notify、OTA 状态、微信外设广播和原生插件仍必须按 `uniapp-real-device-checklist.md` 真机验证。
