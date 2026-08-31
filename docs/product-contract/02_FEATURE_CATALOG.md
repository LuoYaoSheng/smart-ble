# UniApp 功能目录

状态说明：`Baseline` 表示当前已有实现；`Gap` 表示第一完整版本必须补齐；`Future` 不阻塞当前发布。证据状态统一见 [测试矩阵](./07_TEST_MATRIX.md)。

## 应用与平台基础

| ID | 功能 | 优先级 | 当前基线 | 完成结果 |
|---|---|---:|---|---|
| SYS-001 | 应用启动与四 Tab 导航 | Must | Baseline | 扫描、已连接、广播、关于均可进入 |
| SYS-002 | 平台与 BLE 能力检测 | Must | Baseline | 支持、降级、不支持三态明确 |
| SYS-003 | 权限前置检查与恢复入口 | Must | Baseline | 蓝牙、定位、相机/扫码拒绝均有下一步 |
| SYS-004 | 统一状态词汇 | Must | Gap | idle/loading/empty/error/success/disconnected/unsupported 含义唯一 |
| SYS-005 | 页面隐藏、返回和销毁清理 | Must | Baseline | 扫描、Notify、广播、连接按契约清理 |
| SYS-006 | 中英文与产品名称一致 | Should | Partial | 不再出现历史 LightBLE/SmartBLE 混用 |
| SYS-007 | 无障碍标签、字号和触控目标 | Should | Gap | 核心操作可被读屏识别，触控目标合格 |

## 扫描与设备发现

| ID | 功能 | 优先级 | 当前基线 | 完成结果 |
|---|---|---:|---|---|
| DISC-001 | 打开适配器并开始/停止扫描 | Must | Baseline | 手动停止、超时停止、页面隐藏停止均可观察 |
| DISC-002 | 连续两轮扫描 | Must | Baseline | 第二轮不受第一轮监听或状态影响 |
| DISC-003 | 设备去重、RSSI 更新与最多 100 台 | Must | Baseline | 同一 deviceId 只有一项且信号更新 |
| DISC-004 | 设备名称兼容解析 | Must | Gap | name → localName → AD 0x09/0x08 → Profile/厂商 → 唯一兜底 |
| DISC-005 | RSSI、名称前缀、隐藏无名设备筛选 | Must | Baseline | 不修改原扫描数据，筛选结果即时更新 |
| DISC-006 | 广播快照查看与复制 | Must | Baseline | 区分未提供、空数据和值，完整复制 |
| DISC-007 | Manufacturer/Service Data 展示 | Should | Baseline | 显示 companyId、UUID、字节数和 HEX |
| DISC-008 | Profile 强/弱匹配标识 | Must | Baseline | 弱匹配连接后必须再次确认身份 |

## 连接与多设备会话

| ID | 功能 | 优先级 | 当前基线 | 完成结果 |
|---|---|---:|---|---|
| CONN-001 | 扫描结果连接设备 | Must | Baseline | 连接前停止扫描并显示连接中状态 |
| CONN-002 | 服务与特征值自动发现 | Must | Baseline | 成功显示树，空服务和失败可重试 |
| CONN-003 | 主动断开 | Must | Baseline | Runtime、Store、Notify 与 UI 同步 |
| CONN-004 | 被动断开与有限重连 | Must | Baseline | 不无限重试，不把离线显示成在线 |
| CONN-005 | 已连接 Tab 恢复会话 | Must | Baseline | 返回后不重复建立连接 |
| CONN-006 | 多设备同时连接 | Must | Baseline | 事件按 device/service/characteristic 隔离 |
| CONN-007 | 批量断开与失败汇总 | Should | Baseline | 显示失败设备，不误报全部成功 |

## GATT 与日志

| ID | 功能 | 优先级 | 当前基线 | 完成结果 |
|---|---|---:|---|---|
| GATT-001 | 服务/特征值属性展示 | Must | Baseline | Read/Write/WriteNR/Notify/Indicate 准确 |
| GATT-002 | 读取特征值 | Must | Baseline | HEX 与 UTF-8 同时记录，超时清理监听 |
| GATT-003 | TEXT 写入 | Must | Baseline | UTF-8 编码正确，成功/失败有日志 |
| GATT-004 | HEX 写入 | Must | Baseline | 严格偶数长度与字符校验 |
| GATT-005 | Notify/Indicate 开关 | Must | Baseline | 重复点击串行，断开/离页正确清理 |
| GATT-006 | 命令队列与写入节流 | Must | Partial | 高频写入不并发冲击设备 |
| GATT-007 | MTU 与分包策略 | Must | Baseline | 未知 MTU 使用安全值，超限明确失败 |
| LOG-001 | 每设备通信日志 | Must | Baseline | 时间、方向、类型、HEX、文本可区分 |
| LOG-002 | 日志清空与导出 | Must | Baseline | 空日志不假导出，复制结果明确 |
| LOG-003 | 日志容量上限 | Must | Baseline | 页面长期运行不无限增长 |
| LOG-004 | 敏感数据脱敏 | Must | Baseline | Wi-Fi 密码、token 不进入日志 |

## 广播与 OTA

| ID | 功能 | 优先级 | 当前基线 | 完成结果 |
|---|---|---:|---|---|
| ADV-001 | 平台 Peripheral 支持检查 | Must | Baseline | 不支持时解释原因和替代方案 |
| ADV-002 | 名称、Service UUID、Manufacturer 配置 | Must | Baseline | 字段与平台实际能力一致 |
| ADV-003 | 31 字节预算与 UUID 校验 | Must | Baseline | 31 通过，32 阻止，禁止静默截断 |
| ADV-004 | 开始、停止和状态同步 | Must | Baseline | 实际成功后才显示广播中 |
| ADV-005 | Central/Peripheral 模式交接 | Must | Baseline | 活动连接受保护，离页释放所有权 |
| ADV-006 | 第二设备观察广播 | Must | Gap | Android/微信均保存观察端证据 |
| ADV-007 | 广播失败日志与恢复 | Must | Baseline | 权限、蓝牙关闭、插件错误可恢复 |
| OTA-001 | 固件文件选择与基础校验 | Must | Baseline | 空文件/非法文件不开始传输 |
| OTA-002 | Start/Ready/Data/Commit 状态机 | Must | Baseline | 设备 ready 后才发送数据 |
| OTA-003 | 分包、进度与写入节流 | Must | Baseline | 进度基于设备与客户端一致数据 |
| OTA-004 | 取消升级 | Must | Baseline | 客户端与 ESP32 均进入 aborted/idle |
| OTA-005 | 断线、超时、包错误 | Must | Partial | 不报成功，可重新开始 |
| OTA-006 | Success 确认与重启 | Must | Baseline | 收到设备 success 才成功 |
| OTA-007 | 重启后版本回读 | Must | Gap | 固件版本必须与升级目标一致 |
| OTA-008 | 回滚/损坏固件保护 | Should | Gap | 失败后设备仍可启动旧版本 |

## Profile、Smart HID 与 ESP32

| ID | 功能 | 优先级 | 当前基线 | 完成结果 |
|---|---|---:|---|---|
| PRO-001 | Profile 注册、校验和不可变描述 | Must | Baseline | 重复 ID、坏 UUID、缺特征拒绝 |
| PRO-002 | Profile 驱动路由与文案 | Must | Baseline | 页面不写死型号判断 |
| PRO-003 | 通用 GATT 与 Profile 任务并存 | Must | Baseline | Profile 设备仍可通用连接 |
| PRO-004 | 新 Profile 测试模板 | Should | Partial | matcher、路由、codec、真机步骤齐全 |
| HID-001 | Smart HID 广播识别和 Device Info 确认 | Must | Baseline | 产品、协议和 device_id 同时匹配 |
| HID-002 | 自动连接与 Notify 初始化 | Must | Baseline | 半初始化失败必须关闭连接 |
| HID-003 | Wi-Fi、Hub 地址与二维码 | Must | Baseline | token 仅内存，地址可编辑 |
| HID-004 | V1 candidate 分帧下发 | Must | Baseline | 与跨仓契约锁一致 |
| HID-005 | Wi-Fi/Pairing/MQTT/Ready 状态 | Must | Baseline | 即时终态不丢失，超时不假成功 |
| HID-006 | 八类错误与恢复动作 | Must | Baseline | 每个错误只有一个用户恢复动作 |
| HID-007 | 非敏感历史记录 | Must | Baseline | 过期、去重、上限和移除正确 |
| HID-008 | 诊断与历史设备重连 | Must | Partial | 离线、实时和历史状态不混淆 |
| ESP-001 | 参考设备稳定广播名和 UUID | Must | Baseline | Android/微信均可识别 |
| ESP-002 | LED 开/关/快闪/慢闪 | Must | Baseline | HEX 与文本命令结果一致 |
| ESP-003 | Read/Write/Notify 权限组合服务 | Must | Baseline | 每个特征只允许声明的操作 |
| ESP-004 | 周期状态 Notify | Must | Baseline | 内容、频率和断开停止正确 |
| ESP-005 | 设备状态和系统信息 JSON | Must | Baseline | schema 稳定且可解析 |
| ESP-006 | OTA 参考实现 | Must | Baseline | 覆盖全部 OTA 功能条目 |
| ESP-007 | 可重复故障注入 | Must | Gap | 断线、延迟、拒绝写入、错误状态可触发 |
| ESP-008 | 固件自动测试 | Must | Gap | PlatformIO 单测不再只有 README |

## 开源项目与落地页

| ID | 功能 | 优先级 | 当前基线 | 完成结果 |
|---|---|---:|---|---|
| DOC-001 | 公开产品落地页 | Must | Partial | 定位、能力、平台、硬件、下载和文档入口完整 |
| DOC-002 | 可交互 HTML 原型 | Must | Partial | 平台视图、页面、状态和流程可点击 |
| DOC-003 | ESP32 刷写与首次成功教程 | Must | Partial | 新用户 30 分钟内完成首次联调 |
| DOC-004 | 平台能力与限制公开 | Must | Gap | 不支持/降级不隐藏 |
| DOC-005 | 测试结果和版本证据 | Must | Gap | 每个发布版本可追溯 |
| DOC-006 | 贡献指南与新增 Profile 流程 | Should | Partial | 文档、代码、测试和截图同时提交 |
