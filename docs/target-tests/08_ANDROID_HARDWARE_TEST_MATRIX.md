# 08 Android 硬件测试矩阵（TEST-A-001..014 / E5）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：Android 真机上 PAGE/OP 级 E5 验证。执行模板：tests/target/hardware/android-run-template.md。
不负责：微信差异（09 号）、模拟器（开发者工具最多 E4）。

## 2. 矩阵（按 PAGE/OP）

| 矩阵行 | 页面/操作 | UI 断言 | Runtime 断言 | ESP32/Observer | 清理 | 证据 |
|---|---|---|---|---|---|---|
| A-001 权限 | PAGE-001 OP-P001-01 | 首次点扫描才弹权限；拒绝→S-03；永久拒绝→系统设置引导 | 无预取调用 | — | 还原权限 | 录屏+logcat |
| A-002 导航 | 四 Tab+二级路由 | 返回栈正确；参数契约（pages-target） | 路由参数校验 | — | — | 录屏 |
| A-003 生命周期 | hide/unload | 扫描停止提示 | ScanSession 停止 | — | 全断开 | logcat |
| A-004 蓝牙开关 | PAGE-001/008 | S-04 引导 | 适配器状态映射 | — | — | 录屏 |
| A-005 扫描 | PAGE-001 全 OP | 10 秒超时；两轮重置；N/M；名称链 | generation/去重 | 双夹具可见 | 停扫 | 截图+串口 |
| A-006 连接/发现 | PAGE-001→006 | attempt 去重；空服务关闭重试 | 半开清理 | 连接计数一致 | 断开 | 串口 JSON |
| A-007 断开 | PAGE-006/007 | 主动不重连；被动有限；耗尽恢复 | 重连策略 | 断链注入 | — | 录屏 |
| A-008 GATT/日志 | PAGE-006 | 属性约束禁用；TEXT/HEX；队列；订阅徽标 | 写队列串行 | Echo 回读 | 导出后清 | 导出文件 |
| A-009 双设备 | PAGE-006/007 | 同 UUID 不串；断 A 不影响 B | tuple 隔离 | 双 Peripheral | 全断 | 录屏 |
| A-010 广播+Observer | PAGE-008 | 31/32 预算；S-41 | Owner 守卫 | **Observer JSON 为正式证据** | 停广播 | 串口捕获 |
| A-011 OTA | PAGE-006 OTA 流 | 十步进度；S-31/S-33；版本一致才成功 | 事务状态机 | commit 复核+reboot | 重刷基线 | 全程录屏+串口 |
| A-012 关于/版本 | PAGE-009/010 | 五处一致 | SSOT | — | — | 截图 |
| A-013 性能/资源 | 全局 | 无 ANR；内存平稳 | 泄漏检测 | 长扫 10 轮 | — | perfetto |
| A-014 安装烟测 | 全新安装 | 首屏→扫描 5 分钟 | — | — | 卸载重装 | 录屏 |

## 3. 最低设备环境

Android 8+ 真机；Release APK（URL+SHA）；LightBLE 双夹具 115200 串口可捕获。

## 4. 退出条件

14 行全有结论+第一断点；FAIL 进 14 号分级；平台差异回填 08 号矩阵。
