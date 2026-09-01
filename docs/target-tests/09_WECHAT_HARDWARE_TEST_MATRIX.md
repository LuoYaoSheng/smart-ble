# 09 微信硬件测试矩阵（TEST-W-001..010 / E5）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：微信小程序真机（正式 AppID）验证。执行模板：tests/target/hardware/wechat-run-template.md。
不负责：Android（08 号）；开发者工具结果**最多 E4**，不得记 E5。

## 2. 矩阵

| 行 | 覆盖 | 关键断言（微信特性） |
|---|---|---|
| W-001/004 权限+定位 | FLOW-001 | 能力驱动最小申请（DEC-003）：不预取定位；基础库版本决定是否需要定位授权；拒绝恢复路径 |
| W-002 导航 | 四 Tab | 与 Android 同语义（同一目标测试） |
| W-003 生命周期 | hide | 停扫；会话保留 |
| W-005 蓝牙开关 | S-04 | 适配器状态 |
| W-006 不支持降级 | S-05 | 旧基础库 API 缺失时降级文案 |
| W-007 扫描/GATT | PAGE-001/006 | 10 秒；名称链（微信 name/localName 字段差异）；读写订阅 |
| W-008 会话/日志导出 | PAGE-007 | 统一断开；导出经微信文件 API |
| W-009 多设备/广播 | 并行上限 | NFR-012 实测回填；Peripheral API 能力差异（Adapted 项） |
| W-010 Smart HID/分享 | PAGE-002/003 | 配网闭环；分享卡片跳转正确 |

## 3. 环境与红线

正式 AppID（体验版/正式版）；稳定基础库版本记录；Android+iOS 双端各一轮；外链/跳转/分享域名配置合法。

## 4. 退出条件

10 行全有结论；Adapted 差异回填 platform-target；E5 证据含真机录屏。
