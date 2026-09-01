# Android 真机执行模板（TEST-A-001..014 / E5）

> 状态：模板（TP-G1 交付；执行发生在 TP-G4+ 真机 Gate）
> Owner：Smart BLE QA；最低环境：Android 8+ 真机、已安装 Release APK（带 SHA）、LightBLE 双夹具上电

## 执行前检查

- [ ] `git rev-parse HEAD` 记录 Commit
- [ ] APK 来源 = Release 产物（URL+SHA256 成对），非本地 debug 混用
- [ ] 权限基线：首次安装后未授蓝牙/定位
- [ ] ESP32 夹具：Peripheral（BLEToolkit-Server）与 Observer（BLEToolkit-Observer）均上电，串口 115200 可捕获

## 用例组（对齐 08 号矩阵）

| 组 | 覆盖 | 关键断言 |
|---|---|---|
| 权限 | TEST-A-001 | 拒绝→S-03 恢复；永久拒绝→系统设置引导；能力驱动不预取 |
| 导航 | TEST-A-002 | 四 Tab；二级页返回栈；参数契约 |
| 生命周期 | TEST-A-003 | hide/unload 后扫描停止、会话保留 |
| 蓝牙开关 | TEST-A-004 | 关闭→S-04 引导；恢复可用 |
| 扫描 | TEST-A-005 | 10 秒超时；两轮重置；N/M 双数；名称解析链 |
| 连接/发现 | TEST-A-006 | attempt 去重；空服务关闭重试 |
| 断开 | TEST-A-007 | 主动不重连；被动有限重连；耗尽恢复 |
| GATT/日志 | TEST-A-008 | 读写订阅隔离；日志导出脱敏 |
| 双设备 | TEST-A-009 | 同 UUID 不串台；断 A 不影响 B |
| 广播+Observer | TEST-A-010 | 31/32 预算；Observer 串口 JSON 为正式证据 |
| OTA | TEST-A-011 | 十步正典；版本回读一致才成功 |
| 关于/版本 | TEST-A-012 | 与 WEB-001/Release Metadata 五处一致 |
| 性能/资源 | TEST-A-013 | 扫描内存平稳；无泄漏 |
| 安装烟测 | TEST-A-014 | 全新安装→首屏→扫描 5 分钟内 |

## 证据与清理

- 每组：截图/录屏 + logcat 片段 + Observer 串口 JSON 存 `docs/verification/runs/<date>/`
- 结束后：断开全部连接、停止广播、清 App 数据（除非用例要求保留）

## 退出条件

全部用例有 PASS/FAIL 结论与第一断点；FAIL 进入 14 号缺陷分级。
