# MAC-008 第三轮 · 桌面车道并入产品向量 parity（2026-09-15 上午）

> 销项观察项：第二轮终验登记「桌面 JS 线（logRedaction）脱敏镜像未入 parity 车道」。
> Host: macOS arm64 / Node 24.12 / JDK temurin-17.0.19 / Dart / Swift 6
> 分支：refactor/uniapp-v1

## 改动面

| 文件 | 改动 |
|---|---|
| `scripts/check-product-parity.mjs` | 新增 desktop 车道（`runDesktopLane`）并列入默认平台集 |
| `core/protocols/ble-product-v1-vectors.json` | `logRedaction.platforms` += `desktop`；新增 meta（冻结日/桌面镜像口径/分歧登记册） |

桌面实现本体（`apps/desktop/tauri/src/log-redaction.js`、`apps/desktop/electron/public/log-redaction.js`）位于 Windows 写锁区，**只读消费、零改动**。

## 车道设计

1. **双副本字节门禁**：tauri 与 electron 两份镜像要求字节完全一致（其文件头即声明「E-WIN/T-WIN 共用同一字节」）——漂移即 FAIL，先于向量执行。
2. **vm 沙箱求值**：桌面镜像是无构建传统脚本（IIFE 挂 `globalThis.SmartBLELogRedaction`，非 ESM 无法 import），车道用 `node:vm` 的 `createContext + runInContext` 求值后取 `sandbox.SmartBLELogRedaction.sanitizeLogString` 跑 14 例脱敏向量。
3. **状态口径**：镜像缺失→NOT_IMPLEMENTED；求值失败/未暴露 API→BLOCKED；均沿用在册状态词表，不算失败。

## 命令与结果

```
$ node scripts/check-product-parity.mjs --platforms=desktop
  desktop PASS    14/14

$ JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
    node scripts/check-product-parity.mjs
  js      PASS    27/27
  dart    PASS    14/14
  kotlin  PASS    14/14
  swift   PASS    45/45
  desktop PASS    14/14
  product parity PASS（已执行平台零失败）

$ bash scripts/verify-uniapp.sh
  UniApp verification PASS (26 unit files plus 15 static gates)
  （product parity 门禁内含五车道；无 JAVA_HOME 的 shell 中 kotlin 车道按在册口径 BLOCKED，非失败）
```

## 复核要点

- 双副本 sha256 一致（`shasum -a 256` 两文件唯一哈希）。
- 桌面镜像行为与 UniApp 正典在全部 14 例脱敏向量上逐字节一致（含 Bearer/authorization 头、cookie 串、JSON 内嵌 token、容器内字符串元素等）。
- 车道双机通用：Windows Node 同样可跑 vm 求值与字节门禁，无平台特化代码。
- D-SEMVER-1/2 分歧登记册不变（仅 js/swift 的 otaSemVer 域，与桌面车道无关）。

## 结论

- Status: PASS（五线全执行全 PASS；观察项销项）
- Public status impact: none
