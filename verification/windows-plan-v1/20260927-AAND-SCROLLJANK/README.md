# AAND-SCROLLJANK · 扫描列表滚动卡顿修复（2026-09-27）

**触发**：用户反馈「列表滚动的时候会卡顿」（手机端 apps/android 扫描 Tab）。
**状态**：PASS——两刀代码修复 + release 形态归因闭环；真机矩阵实测见 evidence/。

## 根因（两层叠加）

1. **扫描风暴（代码缺陷，已修）**：`BleManager.onScanResult` 每条 BLE 广播回调都
   `tryEmit(全列表快照)`。办公环境 `ALL_MATCHES+AGGRESSIVE+LOW_LATENCY` 下
   ~54-57 条/秒，每条都在主线程跑：回调体（adv hex 拼串、ScanRecord/Map 重建、
   全列表 toList）+ 下游管线（ViewModel `map{it.device}` → combine →
   filterDevices → StateFlow 整表替换 → LazyColumn 全量 diff + 可见卡因 RSSI
   变化全重组）。滚动帧预算（16ms@60Hz）被吃光。
2. **debug 构建固有开销（形态问题，非代码可修）**：debug 包即使不扫描纯滚动也
   60-77% 掉帧（中位 57ms；framestats 显示 traversal 派发 26-76ms/帧）。用户
   日常侧载的是 debug 包——卡顿主体来自这里。

## 修复（两刀，均在 apps/android）

| 文件 | 改动 |
|---|---|
| `ui/viewmodel/DeviceListViewModel.kt` | `bleManager.scanResults.sample(400)` —— UI 管线整条压到 ≤2.5Hz；采样 tick 发最新快照，终态不丢 |
| `core/ble/BleManager.kt` | 回调体转发专用 HandlerThread `ble-scan-callbacks`（`startScan` 无 Handler 变体，回调固定投递主线程 Looper，只能 post 转发）；单例常驻不 quit |

## 真机归因矩阵（华为 TAS-AN00，同场景：扫描 5s 内连滚 4 次）

| 构建 | 代码 | 掉帧率 | 中位帧 |
|---|---|---|---|
| debug | 旧码 | 95.60% | 44ms |
| debug | +两刀 | 75.00% | 48ms |
| release | 旧码 | 24.86% | 19ms |
| **release** | **+两刀** | **1.45%** | **7ms** |

纯滚动三连测：debug+两刀 61-69%/57ms；release+两刀 **0.5-1.0%/6ms**（满帧）。

## 结论与交付

- 两刀修复在 release 下把扫描期掉帧砍 17 倍（24.86%→1.45%），独立有效。
- 用户日常应侧载 **release 签名包**（assembleRelease + debug.keystore 签名，
  与 debug 包同签名可原地升级）：扫描中滚动 1.45% 掉帧、纯滚动 <1%。
- 已装机最终形态 = smartble-release-FIXED.apk（见 evidence/gfxinfo-release-vs-debug.txt
  坑位账：08:47 一次安装被增量安装异常静默吞掉，install 必须裸跑看 Success）。

## Evidence

- `evidence/gfxinfo-baseline-before-fix.txt` —— 基线 95.6%/44ms + ≥287 回调/5s
- `evidence/gfxinfo-round1-sample-only.txt` —— 刀一后 76.6%、纯滚动 49-77%、
  framestats 逐帧分解（traversal 26-76ms）
- `evidence/gfxinfo-release-vs-debug.txt` —— 归因矩阵 + 坑位账（install 假成功、
  TID 验尸法、测量方差）
