# P004 Smart HID 诊断

页面路径：`pages/hid/diagnostics`；类型：工具页。

## A. 页面目的
用户验证当前 Smart HID 的 BLE、Wi-Fi、ControlHub、MQTT 与 Ready 状态，并查看错误信息。

## B. 页面信息结构
当前状态→五项诊断行→重新检测/显示错误码→可选最近错误详情。

## C. 页面内容合理性
分层诊断目标正确；“USB Ready”仅从设备上报状态推断，文案已提示 BLE 不等于真机 HID 验收。

## D. 用户操作
重新检测、确认连接并检测、显示/隐藏错误码。

## E. 页面跳转
无正常自动跳转；由 P002/P003 进入。

## F. 页面状态
idle/connected/checking/live/offline/error；有 pending、active、ok、warn、fail；缺设备不存在状态和连续刷新中的上次结果时间。

## G. 数据来源
`hid.diagnostic/lastError/currentDevice`，以及 Smart HID 的 Info/Status。

## H. API依赖
Smart HID connect、read/notify，间接依赖 BLE 平台。

## I. Store依赖
`hid` 持有诊断结果，页面进入会清空旧结果，防止串设备。

## J. 完整运行链路
刷新→检查当前 session→必要时弹确认→connect→`diagnose` 并行读 Info/Status→映射诊断项→Store→UI；借用/自有连接清理有单测。

## K. 首次进入场景
以 deviceId 查历史设置 currentDevice；没有找到仍显示待检测，直到用户触发，识别度较弱。

## L. 返回页面场景
自建连接在卸载断开；借用连接不误断，状态存 Store 但下次进入会清空。

## M. 异常场景
未连接有 modal 指引；连接/诊断失败有 modal/toast；真实外设状态语义待验。

## N. 假完成
无；诊断使用实际设备 Info/Status，不是硬编码成功。

## O. 功能遗漏
缺“复制诊断报告”、检测时间、连接入口以外的返回设备列表操作。

## P. 交互问题
P3：初始“尚未检测”不展示目标设备，用户难以确认在诊断哪台设备。

## Q. 信息重复
状态总览与行状态互补，合理。

## R. 第一断点
无 session 时依赖用户确认弹窗；若 deviceId 为空，confirm 分支直接 return，未解释原因。

## S. 后续潜在断点
Wi-Fi/MQTT 状态从单次 Status 推断，需对照固件在慢网络/重启时的实际事件。

## T. 公共组件复用
诊断展示高度专用，独立合理。

## U. 公共逻辑复用
复用 Smart HID service 与 Store，未重复 GATT 操作。

## V. 页面职责
少量映射与 UI 状态在页内，规模可控。

## W. 优化建议
显示设备名称/ID、检测时间和复制报告；无 deviceId 时立即引导回 P001/P003。

## X. 最终结论
产品合理性 B+；UI完成度 80%；核心功能可用度 70%（待真机）；运行链路 80%；异常状态 70%；复用质量 85%。

