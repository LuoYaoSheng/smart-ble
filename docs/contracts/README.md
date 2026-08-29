# 跨仓协议契约锁

`smart-ble` 与 [Smart-HID-Workspace](https://github.com/LuoYaoSheng/Smart-HID-Workspace) 通过 **固定 commit + SHA-256** 绑定 Smart HID V1 协议，保证开源客户端与私有固件/ControlHub 语义一致。

## 锁文件

| 文件 | 作用 |
|---|---|
| `core/protocols/smart-hid-contract.lock.json` | pin 主仓 commit、contract 摘要、已测产品版本 |
| `core/protocols/hid-provisioning-protocol.ts` | 可执行 TS 镜像（UUID、错误码、状态枚举） |

## 校验

```bash
# 需本地 clone Smart-HID-Workspace
SMART_HID_WORKSPACE=/path/to/Smart-HID-Workspace node scripts/check-smart-hid-contract.mjs
```

CI `uniapp-contract` job 会 clone **固定 commit**（非 moving `main`）并校验。

## 主仓正典

| 资源 | 路径（Smart-HID-Workspace） |
|---|---|
| 机器契约 | `protocols/contracts/smart-hid-v1.json` |
| 人类可读 | `protocols/ble/PROVISIONING_V1.md` |
| CI 校验 | `scripts/validate-protocols.py` |

当前 lock 对应 commit：`ef4506795b8f689da110b223cc7bcb7770e22e1a`

## 升级 checklist（主仓 contract 变更后）

```bash
# 1) 刷新 lock（写入 canonical_commit + sha256）
SMART_HID_WORKSPACE=/path/to/Smart-HID-Workspace node scripts/bump-smart-hid-lock.mjs

# 2) 若 UUID/错误码/状态枚举变化，同步 core/protocols/hid-provisioning-protocol.ts

# 3) 校验
SMART_HID_WORKSPACE=/path/to/Smart-HID-Workspace node scripts/check-smart-hid-contract.mjs

# 4) 门禁
./scripts/verify-uniapp.sh
```

仅检查是否过期：`node scripts/bump-smart-hid-lock.mjs --check`

## 多设备型号

- **Smart HID**：本 lock 覆盖
- **其它型号**（如 ESP32 演示灯控）：各自 Profile + 可选独立 lock；不修改 Smart HID V1 语义

详见 [docs/profiles/README.md](../profiles/README.md)。
