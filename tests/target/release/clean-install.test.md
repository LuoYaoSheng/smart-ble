# Clean Machine 干净安装测试（TEST-R-011 / CLAIM-031，E6 手工）

> 状态：模板（TP-G1 交付；执行发生在 TP-G5/TP-G6 Release Gate）
> 铁律：30 分钟 Clean Machine ≠ 5 分钟 Quick Start（CLAIM-017/TEST-R-005），不得互相冒充。

## 环境定义

- 全新电脑（或重置的 VM/容器）：无仓库、无工具链、无缓存
- 计时器从 `git clone` 开始，到最后一步断言通过为止
- 网络：正常公网；硬件：ESP32（实测枚举 COM 口）+ Android 真机

## 步骤（每步记录耗时与第一断点）

1. `git clone` 固定 Commit（记录 URL + SHA256）
2. 依赖安装（按 README/Quick Start 指引，不允许额外私下修补）
3. 构建：Android App（Release）+ ESP32 固件（`pio run`）
4. 烧写 ESP32（普通 upload，禁 erase-all/efuse）
5. 安装 APK（Release 产物 + SHA 校验）
6. 扫描 → 连接 → 写入 → Notify 全链路
7. 计时停止；全程 ≤30 分钟为达标

## 断言

- [ ] 总耗时 ≤ 30 分钟
- [ ] 无需本文档未记载的私有知识/秘钥/口令
- [ ] 每一步的报错信息可自解释（S 系列文案）

## 证据包（13 号格式）

Commit、各步耗时表、录屏、终端日志、APK SHA256、最终截图。

## 失败处理

超时或断链 → 记第一断点 → 14 号缺陷分级（P0/P1 阻断发布）。
