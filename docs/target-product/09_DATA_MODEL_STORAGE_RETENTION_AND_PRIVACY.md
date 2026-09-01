# 09 数据模型、存储、保留与隐私

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：全部数据实体（DATA-001~012）的 Schema、存储位置、生命周期（TTL/容量/删除/迁移）与敏感字段分类。

本文不负责：日志脱敏规则细节（`14`/SEC）；协议编码（`11`~`13`）。

---

## 2. 数据实体总表

| ID | 实体 | 存储 | 生命周期 | 敏感级 |
|---|---|---|---|---|
| DATA-001 | Device（扫描发现项） | 内存 | 扫描轮次内；新一轮重置 | 3 |
| DATA-002 | Advertisement（广播快照） | 内存（随 DATA-001） | 同上 | 3 |
| DATA-003 | Session（活动会话） | 内存（Registry） | 连接生命周期 | 3 |
| DATA-004 | Characteristic（特征值/属性） | 内存（服务树） | 会话生命周期 | 3 |
| DATA-005 | DeviceLog（通信日志） | 内存 | 200 条/设备环形；清空/导出后继续 | 2（载荷需脱敏） |
| DATA-006 | HidKnownDevice（配网历史） | 本地 storage | TTL 90 天；上限 50 台；用户可删 | 1（不含凭据） |
| DATA-007 | HidDiagnosticReport（诊断结果） | 内存（页面） | 页面会话 | 2 |
| DATA-008 | VersionInfo（版本） | 构建期生成 | 跟随构建 | 0 |
| DATA-009 | ReleaseMetadata | 构建期生成+发布产物 | 跟随 Release | 0 |
| DATA-010 | EvidencePackage | 发布仓库目录 | 长期（随 Release 归档） | 1（脱敏后） |
| DATA-011 | BroadcastConfig（payload 配置） | 内存+本地草稿 | 页面会话+草稿 7 天 | 0 |
| DATA-012 | FilterConfig（筛选配置） | 内存 | 应用会话 | 0 |

敏感级：0=公开；1=本机非敏感；2=含用户操作数据需脱敏；3=含设备标识仅本地。

## 3. 实体 Schema

### DATA-001 Device

```text
{ deviceId: string(平台归一), displayName: string, rssi: int,
  profileId?: 'smart-hid', advertisement: DATA-002, firstSeen: ts, lastSeen: ts }
```

规则：deviceId 唯一键；去重合并更新 rssi/lastSeen；上限 100 条后停止新增并提示。

### DATA-002 Advertisement

```text
{ localName?: string, advNames: [{type:0x09|0x08, value}], serviceUUIDs: string[],
  manufacturerData?: {companyId, bytes}, serviceData?: [{uuid, bytes}],
  rawAdvertisement: bytes?, rawScanResponse: bytes? }
```

三态：未提供（字段缺省）/ 空（bytes 长度 0）/ 有值。

### DATA-003 Session

```text
{ deviceId, state: STATE-GBL-11..17, notifySubscriptions: Map<tuple,sub>,
  retryCount: int<=3, loggerRef, createdAt, ownedBy: 'page'|'workflow'|'registry' }
```

### DATA-005 DeviceLog

```text
{ seq: int, ts, direction: 'in'|'out'|'event', kind: 'read'|'write'|'notify'|'indicate'|'error'|'lifecycle',
  serviceId?, characteristicId?, hex?, text?, opId?, errorCode?, redacted: bool }
```

### DATA-006 HidKnownDevice

```text
{ device_id: /^HID-[A-Z0-9]{8}$/, name?, protocol?, firmware?,
  wifi_ssid, hub_host, hub_port, configured_at: ts }
```

存储键：`smart_ble.smart_hid.known_devices.v1`（数组）。禁止字段：token、wifi_password、MQTT 凭据。

### DATA-008 VersionInfo

```text
{ version: semver|'dev.<shortsha>'|'dev.unknown', shortsha?, channel: 'release'|'dev', buildDate }
```

### DATA-009 ReleaseMetadata

```text
{ release_tag, app_version, commit, built_at,
  artifacts: [{kind:'apk'|'firmware-peripheral'|'firmware-observer', url, sha256, size}],
  wechat_qr: {status:'published'|'not_released', image?},
  verified_capabilities: [{claim_id, status:'VERIFIED'|'PREVIEW'|'BLOCKED'|'UNSUPPORTED'|'NOT_RELEASED', evidence_ids[]}],
  known_limitations: string[], tested_devices: string[] }
```

### DATA-011 BroadcastConfig

```text
{ deviceName?, localName?, serviceUuids: string[], manufacturerId?, manufacturerDataHex?,
  android?: {mode, txPower, connectable, includeDeviceName, includeServiceUuids},
  budgetBytes: int<=31 }
```

## 4. 生命周期规则

| 规则 | 值 | 依据 |
|---|---|---|
| 设备列表上限 | 100 台 | NFR-006 |
| 通信日志 | 200 条/设备（环形淘汰） | NFR-013 |
| 页面广播日志 | 100 条 | PAGE-008 |
| Smart HID 历史 TTL | 90 天（启动与进入时惰性清理） | REQ-052 |
| Smart HID 历史上限 | 50 台（淘汰最旧） | FEAT-059 |
| 广播草稿 | 7 天 | DATA-011 |
| 设备上下文 stash | 30 条 LRU | `10` 第 6 节 |
| 版本历史展示 | 最近 30 条 | PAGE-010 |

删除规则：

- 用户显式删除：Smart HID 历史移除（OP-P004-02）= 立即彻底删除本机记录；
- 清空日志：仅当前设备；
- 卸载应用：本地 storage 随之清除（平台行为，隐私声明中说明）。

迁移规则：存储键带版本后缀（如 `.v1`）；结构变更时新建 `.v2` 键并一次性迁移，读失败降级为空态并记 ERR-DATA-01，不得静默丢弃用户数据之外的报错。

## 5. 敏感字段分类与红线

| 类别 | 字段 | 红线 |
|---|---|---|
| 凭据 | Wi-Fi 密码、Pairing token、MQTT username/credential | 仅内存；不落盘；不入日志/URL/导出/截图/证据（SEC-007） |
| 设备标识 | deviceId/MAC | 本地使用；不上送远端（SEC-002）；证据中可保留 deviceId 但非 MAC |
| 用户内容 | 写入载荷、广播 payload | 日志/导出经脱敏规则（SEC-005/006） |
| 环境 | 平台/型号/版本 | 可入日志与证据（脱敏规则不含） |

本产品无账号体系、无云端个人数据存储；一切持久化均在设备本地（SEC-008）。

## 6. 验收条件与关联测试规划

- [x] 12 个实体有 Schema、存储、生命周期、敏感级；
- [x] TTL/容量/删除/迁移规则量化；
- [x] 敏感字段红线与 `15` 一致。

关联计划测试：`TEST-U-012/015`（日志/历史/TTL 纯函数）、`TEST-I-001`（生命周期清理）、`TEST-C-010`（数据契约一致性）、`TEST-R-004`（证据脱敏检查）。
