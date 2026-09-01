# 01 产品定位、范围与原则

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product Owner
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：产品定位、第一完整版本的固定范围与非目标、各平台与组件的角色、能力状态定义、贯穿全部目标文档的产品原则与发布阻断规则。

本文不负责：具体功能定义（`03`）、页面契约（`05`/`pages/`）、流程（`06`）、平台逐项矩阵（`08`）、版本机制细节（`18`）。

---

## 2. 产品定位

**Smart BLE 是一个开源的跨平台 BLE（低功耗蓝牙）调试、学习与硬件联动工具。**

- 对嵌入式开发者：它是"手机上的 BLE 万用表"——扫描、解析广播、连接任意 GATT 设备、读写/订阅特征值、查看通信日志、完成固件 OTA，并用开源 ESP32 夹具做可复现验证。
- 对 BLE 学习者：它是"可操作的协议教材"——每个页面展示真实协议字段，广播 31 字节怎么花、MTU 怎么影响分包、Notify 怎么路由，全部可见可试。
- 对自托管硬件玩家：它内置第一个第一方 Profile「Smart HID」，把一台 SHID 设备安全地配到自己的 Wi-Fi 与 ControlHub，并支持诊断与重配。

成功标准（第一完整版本）：

1. 新开发者在一台新电脑上 30 分钟内完成：克隆、构建、烧写 ESP32 夹具、手机安装、完成首次扫描→连接→写入→Notify 闭环（FLOW-013/FLOW-014 有证据）。
2. 所有 Must 需求达到其规定的最低证据等级（BLE 能力 E5，公开产物 E6）。
3. 公开落地页没有任何无证据声明、假下载、假二维码。

---

## 3. 第一完整版本固定范围

以下 13 项是第一完整版本的固定包含项，不得裁剪：

| # | 范围项 | 对应目标 |
|---|---|---|
| 1 | UniApp Android App（正式产物 APK） | `08` 平台矩阵 Android 列；E5/E6 证据 |
| 2 | BLE Toolkit+ 微信小程序（正式发布） | `08` 微信列；E5 证据；正式小程序码 |
| 3 | H5 页面/文档与明确 BLE 降级 | `08` H5 列；UNSUPPORTED 诚实提示 |
| 4 | UniApp iOS 目标定义 | `08` iOS 列；未发布时 NOT_RELEASED |
| 5 | LightBLE `fixture_peripheral` 固件 | `12` 第 3–8 节 |
| 6 | LightBLE `fixture_observer` 固件 | `12` 第 9–11 节 |
| 7 | Smart HID 第一方 Profile | `13` 全文 |
| 8 | 10 个 App 页面（PAGE-001~010） | `05`/`pages/` |
| 9 | 公开落地页 WEB-001 | `web/WEB-001` |
| 10 | HTML 交互原型（10 页四态） | `19` 第 5 节 |
| 11 | Android/微信/ESP32/Smart HID 证据体系 | `14`；EVID-001~008 |
| 12 | VERSION、Release Metadata、下载、SHA、二维码、已知限制 | `18` 全文 |
| 13 | 开源开发者文档与 Profile 扩展指南 | `19` 全文 |

## 4. 非目标（Not Now / REFERENCE）

以下实现**不作为第一版本的产品入口或阻断项**，在目标文档中只能标 `REFERENCE` / `Not Now` / `NOT_RELEASED`，不得与 UniApp 主线并列宣传：

- Flutter 客户端（`apps/flutter`）；
- 原生 Android（`apps/android`）；
- 原生 iOS / macOS（`apps/ios`、`apps/desktop/macos`）；
- Tauri / Electron / Avalonia 桌面端；
- Windows / Linux placeholder；
- 云端服务、账号体系、会员、支付、订单、License 销售；
- 第三个第一方 Profile（Smart HID 之外的新设备家族）。

不恢复清单（历史上被明确移除，不得在目标中复活）：云端设备管理、账号登录、会员付费、订单与 License 校验。

---

## 5. 平台与组件角色

| 平台/组件 | 角色 | 首版状态目标 |
|---|---|---|
| UniApp Android App | 正式产品入口之一；BLE 能力 Full | E5 后 VERIFIED |
| 微信小程序 BLE Toolkit+ | 正式产品入口之一；BLE 能力 Full/Adapted（权限策略不同） | E5 后 VERIFIED |
| H5（同仓文档站） | 文档、落地页入口、模拟演示；BLE UNSUPPORTED | 始终诚实降级 |
| UniApp iOS | 目标已定义、产物未发布 | NOT_RELEASED（DEC-005） |
| LightBLE fixture_peripheral | 公开标准测试夹具（不是示例代码） | 固件可下载/可复现后 VERIFIED |
| LightBLE fixture_observer | 手机广播的正式证据源 | 同上；首版必须存在（DEC-002） |
| Smart HID Profile | 第一方 Profile，占 `pages/hid/*` 四个二级路由，不占 Tab | 是否进入首版公开能力见 DEC-006 |
| 其他客户端（Flutter 等） | REFERENCE（参考实现） | 不得出现在公开能力卡 |

## 6. 能力状态定义

- **正式能力**：状态 VERIFIED，满足最低证据等级，允许在落地页能力卡展示。
- **Preview**：状态 PREVIEW，功能与 E0–E4 证据存在，未到 E5/E6；展示时必须带"预览"与已知限制。
- **Blocked**：状态 BLOCKED，被外部条件阻断（固件缺失、工具链、凭据）；展示阻断原因。
- **Unsupported**：状态 UNSUPPORTED，该平台不支持；提供替代路径或说明（如 H5→文档/小程序入口）。
- **Not Released**：状态 NOT_RELEASED，目标已定义、产物未发布（iOS App、未发布的 APK）；禁止出现下载入口。

状态词与转换的唯一登记处在 `00` 第 5 节；逐能力赋值在 `08`；公开面赋值在 `18`。

---

## 7. 产品原则（贯穿全部目标文档）

1. **目标先于当前实现**：目标不由当前代码能力决定；当前没有的能力是差距，不是目标降级理由。
2. **页面能打开不等于页面正确**：正确性由状态、错误、恢复、清理和证据定义。
3. **真实设备结果优先于 UI 自报成功**：广播成功以 Observer 观测为准；OTA 成功以设备 success + 版本回读为准。
4. **构建、Mock、模拟器不等于 E5**：证据等级不得通胀。
5. **历史数据不得冒充实时在线状态**：Smart HID 历史是快照，禁止在线绿点、"稳定"等暗示。
6. **不支持的平台必须正确降级，不模拟成功**：H5 不发起不存在的 BLE API。
7. **资源所有权明确**：Listener、Timer、Session、Adapter、Peripheral Server、File Handle 每项都有唯一所有者与释放时机（`10` 释放矩阵）。
8. **OTA 必须完成完整事务与版本回读**：subscribe→start→ready→data→commit→success→reboot→reconnect→readback，任何一步缺失都不得显示成功。
9. **落地页不能有假下载、假二维码和无证据声明**：下载必须绑定真实产物 + SHA256；无产物显示 NOT_RELEASED。
10. **凭据不出边界**：密码、token、API Key、MQTT credential、私钥不得持久化到不允许的位置，不得进入日志/URL/截图/证据。
11. **每个 Must 可追踪到测试和发布条件**：REQ→FEAT→PAGE/FLOW→TEST→CLAIM 链完整（`22`）。
12. **同一事实只有一个 SSOT**：版本只有 VERSION；Smart HID 历史只有 PAGE-004；其余文档以 ID/链接复用。

## 8. 发布阻断规则

出现任一情况，对应能力不得进入公开 Release（落地页不得标 VERIFIED）：

1. Must 流程无规定等级证据；
2. 崩溃、白屏、死路、假成功、敏感数据泄露任一存在；
3. OTA 未收到设备 success 或版本回读不一致却显示完成；
4. 手机广播与 Observer 观测不一致；
5. 固件只能私有环境构建；
6. 落地页声明与平台矩阵/Release Metadata 矛盾；
7. 版本五处（VERSION/manifest/package/关于页/版本页）不一致；
8. 下载链接 404、SHA 不符或二维码不可用。

---

## 9. 需求总表（REQ-001~REQ-065）

需求是功能的归约入口；完整字段（输入/输出/错误/平台/测试/发布条件）在 `03` 的 FEAT 展开。

### 9.1 SYS 平台与能力

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-001 | 应用启动识别运行平台（Android App/微信/H5/iOS）并据此决定能力降级，冷启动落到扫描 Tab | Must |
| REQ-002 | 四 Tab（扫描/已连接/广播/关于）+ 六个二级页路由；跳转 URL 只传稳定设备身份字段 | Must |
| REQ-003 | 应用前后台生命周期：hide/unload 停止扫描并释放页面资源；应用级 Session 按 DEC-009 规则保留 | Must |
| REQ-004 | 版本唯一来源 VERSION：驱动 manifest/package/关于页/版本页；开发版显示 `dev.<shortsha>` | Must |

### 9.2 PERM 权限

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-005 | 蓝牙权限请求前置，状态区展示权限状态；拒绝后可重试 | Must |
| REQ-006 | 微信小程序权限按能力检测最小化申请：不预取定位；点击扫描时先申请 BLE 所需最小权限，仅当当前运行环境明确要求定位时才申请/引导定位（DEC-003） | Must |
| REQ-007 | 永久拒绝提供跳系统设置的恢复路径 | Must |
| REQ-008 | 蓝牙关闭时引导打开系统蓝牙设置 | Must |
| REQ-009 | 平台不支持 BLE 时诚实提示 UNSUPPORTED，不模拟 | Must |

### 9.3 SCAN 扫描

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-010 | 扫描开始/停止/超时自动停止；hide/unload 停止 | Must |
| REQ-011 | 第二轮扫描是独立 generation；旧 generation 迟到事件被丢弃 | Must |
| REQ-012 | 按 deviceId 去重；RSSI 更新不新建条目 | Must |
| REQ-013 | 显示名解析链：name→localName→AD 0x09/0x08→Profile→厂商→`未命名 BLE·ID后缀`；空名称不覆盖有效名称 | Must |
| REQ-014 | 设备列表上限与筛选（RSSI/前缀/隐藏无名） | Must |
| REQ-015 | 同时展示"发现总数"与"筛选后数量" | Must |

### 9.4 AD 广播解析

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-016 | 广播详情解析：名称（localName/AD 0x09/0x08）、Service UUID、Manufacturer Data、Service Data、原始字节 | Must |
| REQ-017 | 缺失/空字段区分显示（未提供 vs 空字节） | Must |
| REQ-018 | 广播字段可复制到剪贴板 | Must |

### 9.5 CONN 连接

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-019 | 连接（attempt 去重）→ 服务/特征发现完整链路 | Must |
| REQ-020 | 空服务与发现失败有独立状态和手动重试 | Must |
| REQ-021 | 手动重试不产生并发重复连接 | Must |
| REQ-022 | 主动断开不触发自动重连 | Must |
| REQ-023 | 被动断开有限重连（默认 3 次），耗尽转手动 | Must |

### 9.6 GATT

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-024 | 特征属性（read/write/writeNoResponse/notify/indicate）识别并约束可用操作 | Must |
| REQ-025 | Read 带超时与错误反馈 | Must |
| REQ-026 | TEXT（UTF-8）/HEX（严格偶数+字符校验）两种写入 | Must |
| REQ-027 | 并发写入串行化（Write Queue），失败不阻塞后续 | Must |
| REQ-028 | MTU 协商与按 MTU−3 分包；未知 MTU 用保守值 | Must |
| REQ-029 | Notify/Indicate 订阅按 (deviceId,serviceId,characteristicId) 三元组路由；多设备同 UUID 隔离 | Must |

### 9.7 SESSION

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-030 | 应用级 Session Registry；页面销毁不销毁会话 | Must |
| REQ-031 | 跨页/跨 Tab 复用同一连接 | Must |
| REQ-032 | 多设备并行（目标上限见 DEC-008），断 A 不影响 B | Must |
| REQ-033 | stale 事件与迟到回调被校验丢弃；Listener 有清理断言 | Must |

### 9.8 LOG

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-034 | 按设备记录通信日志（时间/方向/类型/HEX/文本） | Must |
| REQ-035 | 日志容量上限、清空、导出（空日志导出有提示） | Must |
| REQ-036 | 日志导出前敏感脱敏 | Must |
| REQ-037 | 日志条目关联操作/请求 ID | Must |

### 9.9 PERI 手机 Peripheral

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-038 | 广播平台能力检查（含原生插件缺失检测） | Must |
| REQ-039 | Payload 字段编辑与 31/32 字节预算：31 通过、32 阻止、禁止静默截断 | Must |
| REQ-040 | Central/Peripheral 单一 Owner；活动连接存在时不为广播静默关闭 Central | Must |
| REQ-041 | hide/unload/停止时释放 Peripheral Server/Adapter 所有权 | Must |
| REQ-042 | 手机广播的正式证据是 ESP32 Observer 观测流 | Must |

### 9.10 OTA

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-043 | 固件文件选择与基础校验（大小/读取） | Must |
| REQ-044 | 完整 OTA 事务（见原则 8 的 10 步）；version match 才成功 | Must |
| REQ-045 | 取消必须 CTRL abort；无 ready/commit/success/version match 都不得成功；失败后设备可恢复可用 | Must |
| REQ-046 | OTA 未达到 E5 前，正式版入口 BLOCKED/隐藏 | Must |
| REQ-066 | OTA 必须使用固件包（manifest+firmware.bin，PROTO-011）：开始传输前校验 manifest 格式/target/hardware/firmware_version/size/SHA256；错误包不得进入 BLE OTA 事务；CTRL start 携带 target 与 sha256，commit 阶段设备校验尺寸与 SHA256 全一致才 STATUS success（DEC-016） | Must |

### 9.11 Smart HID

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-047 | Profile 强/弱匹配；弱匹配连接后 Device Info 二次身份确认；错设备断开 | Must |
| REQ-048 | 配网表单（SSID/密码/Hub）→ QR → candidate 分帧单次写入 → STATUS waiter → READY | Must |
| REQ-049 | 八类协议错误各有唯一恢复动作；state/step 分离；超时不假成功 | Must |
| REQ-050 | token 仅内存；密码不落盘、不进 URL/日志/截图 | Must |
| REQ-051 | READY 后预期设备断开（关广播）并释放配网 Session | Must |
| REQ-052 | 历史快照存储、90 天 TTL、去重、上限、本机移除 | Must |
| REQ-053 | 诊断 owned/borrowed Session 语义；离页只关自己拥有的连接 | Must |
| REQ-054 | Smart HID 不阻塞通用 BLE 首版 Gate（独立发布状态，见 DEC-006） | Must |

### 9.12 PRODUCT / WEB / DOC / DATA

| ID | 需求 | 优先级 |
|---|---|---|
| REQ-055 | 关于页展示真实版本、平台状态（五词）、核心能力与公开入口 | Must |
| REQ-056 | 版本历史页首项等于运行版本，与 Release Metadata 一致 | Must |
| REQ-057 | 分享/反馈/隐私/安全披露/License 入口齐全 | Must |
| REQ-058 | 落地页定位为 UniApp 主线工具，不宣传多端大一统 | Must |
| REQ-059 | 下载/二维码/版本/SHA/证据/已知限制真实且联动 | Must |
| REQ-060 | 无产物时 NOT_RELEASED 降级，无假链接 | Must |
| REQ-061 | SEO/OG/canonical 正确；移动/桌面/暗色/键盘/焦点/alt 达标 | Must |
| REQ-062 | 开发者体验双计时目标：5 分钟 Quick Start（前置条件已满足，不含工具链从零安装）与 30 分钟 Clean Machine 端到端闭环（clone→依赖→build→flash→install→scan→connect→write→notify），两者用不同 TEST-R/E6 ID 验证且不得互相冒充 | Must |
| REQ-063 | Profile 扩展指南（注册/匹配/路由/编解码/测试模板） | Must |
| REQ-064 | Issue/Security/License/贡献流程公开 | Must |
| REQ-065 | 本地数据 TTL、容量上限与用户可删除 | Must |

---

## 10. 验收条件与关联测试规划

本文验收：

- 定位、范围、非目标、状态词、原则、阻断规则齐备且可执行；
- REQ-001~REQ-066 全部有优先级且可映射 FEAT；
- 与 `00`、`03`、`08`、`18` 无定义冲突。

关联计划测试：`TEST-C-001`（REQ 登记完整性）、`TEST-C-004`（非目标平台不出现在公开能力卡——与 TEST-R 联动）、`TEST-R-001`（发布阻断规则落地为 Release Gate）。
