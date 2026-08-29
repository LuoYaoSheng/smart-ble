# 设备 Profile 扩展指南

`smart-ble` 开源定位为 **通用 BLE 工具 + 可插拔第一方 Profile**。每种设备型号通过 Profile 注册表接入，而不是在页面里写死 `profileId`。

## 架构分层

```text
uni BLE API
    ↓
ble-runtime（扫描 / 连接 / GATT / 通知）
    ↓
provisioning/transport + framing
    ↓
Profile Contract（registry + matcher + codec 可选）
    ↓
第一方 Profile 服务（如 smart-hid/index.js）+ 专属页面
```

与 [Smart-HID-Workspace](https://github.com/LuoYaoSheng/Smart-HID-Workspace) 的关系：

- **协议语义正典**：主仓 `protocols/contracts/smart-hid-v1.json` + `PROVISIONING_V1.md`
- **smart-ble**：开源客户端 + 通用 BLE 能力 + Smart HID 第一方实现
- **契约锁**：`core/protocols/smart-hid-contract.lock.json`（见 [docs/contracts/README.md](../contracts/README.md)）

集成实施记录见主仓：`docs/plans/2026-08-21-smart-ble-smart-hid-integration.md`。

## 添加一个新 Profile（最小步骤）

### 1. 定义 Profile descriptor

在 `apps/uniapp/services/<your-device>/profile.js`：

```javascript
export const myProfile = {
  id: 'my-device',
  displayName: 'My Device',
  serviceUuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  characteristics: { INFO: '...', INPUT: '...', STATUS: '...' },
  required: ['INFO'],
  notify: ['STATUS'],
  presentation: { badge: 'My', actionLabel: '配置', actionDescription: '...' },
  model: {
    productLine: 'my-device',
    capabilities: ['provisioning'], // 或仅 'gatt-debug'
    connectedLabel: 'My Device',
    routes: {
      detail: '/pages/my-device/detail',
      provision: '/pages/my-device/add'   // GATT-only 可省略
    }
  },
  matchAdvertisement(device) { /* PROFILE_MATCH.STRONG | WEAK | NONE */ },
  verifyDeviceInfo(info) { /* 连接后身份确认 */ },
  codec: { /* 配网型设备需要 */ },
  workflow: { /* 配网型设备需要 */ }
};
```

契约校验：`core/ble-core/provisioning/profile-contract.js`

### 2. 注册到 builtins

`apps/uniapp/services/provisioning/builtins.js` → 加入 `BUILTIN_PROFILES` 数组。

### 3. 路由走 profile-navigation

页面跳转统一用 `services/provisioning/profile-navigation.js`：

- `buildProfileActionUrl` — 扫描卡片主按钮
- `buildProfileDetailUrl` — 详情
- `buildConnectedDeviceOpenUrl` — 已连接 Tab

**不要在** `device-card.vue` / `connected/index.vue` 里写 `if (profileId === 'xxx')`。

### 4. 实现设备服务（配网型）

参考 `services/smart-hid/index.js`：会话、notify、write、状态 waiters。后续可抽到 `provisioning/orchestrator.js` 复用。

### 5. 测试

- `tests/unit/<profile>-profile.test.mjs` — 注册 + 匹配
- `tests/unit/profile-navigation.test.mjs` — 路由
- `./scripts/verify-uniapp.sh`

## 内置 Profile 一览

| ID | 类型 | 页面 | 跨仓契约 |
|---|---|---|---|
| `smart-hid` | 配网 + 诊断 + GATT | `pages/hid/*` | `smart-hid-contract.lock.json` |
| `esp32-demo` | 仅 GATT 调试 | 通用 `pages/device/detail` | 无（示例设备） |

## 开源原则

1. 移除某个 Profile 注册后，通用扫描 / 连接 / 广播仍可用。
2. 通用层不得 import Smart HID 专用 UUID 或 ControlHub 语义。
3. 每个第一方设备可有专属 UI，不强制 JSON 动态表单。
4. 新产品版本与 miniapp 版本独立；协议兼容靠 contract SHA-256 lock。

## 后续路线（非阻塞）

- ~~`provisioning/orchestrator.js`~~ — **已落地**：`connectProfileSession` / `writeProfileCandidate` / `runProvisionTransaction` + `framing-strategies`
- ~~契约 bump 脚本~~ — **已落地**：`scripts/bump-smart-hid-lock.mjs`
- `pages/solutions/` — 多 Profile 方案 Hub（集成计划批次 9）
- 第三方 Profile 动态加载（暂不支持，安全原因）
