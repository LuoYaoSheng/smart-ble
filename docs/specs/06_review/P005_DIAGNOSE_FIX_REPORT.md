# P005 诊断重新检测运行错误修复报告（审计 P0-1 · M-1）

> 第 13 份评审文件 · 2026-09-03 · 修复轮（对应审计 [PAGE_CAPABILITY_COVERAGE_AUDIT.md](PAGE_CAPABILITY_COVERAGE_AUDIT.md) §7 修复项 M-1 / P0-1）
> 基准：[STATE_MACHINE §8](../04_architecture/STATE_MACHINE.md) · [STATE_MODEL #8](../02_product/STATE_MODEL.md) · [PAGE_SPEC §5](../03_flow/PAGE_SPEC.md) · [PRD F024/R20](../02_product/PRD.md)
> 实现：`prototype/v1-new/app.js`（内核，四实例字节同步）· git 基线 `2b25725`（未提交，沿用暂缓提交约定）

## 0. 结论先行

| 任务要求 | 结果 |
|---|---|
| 一、实现统一诊断入口 `p005Diagnose(device)` | ✅ app.js:170 新增（唯一新增函数，既有行零改动） |
| 二、状态符合 STATE_MODEL（idle→checking→live；异常 checking→failed） | ✅ 六值页面态 + 五值行级全部沿用正典，零新增（任务书 `failed` 对应正典页面态 `error`「检测失败」，见 §2.1） |
| 三、四项禁止（F024 定义/新增诊断能力/页面结构/Profile 流程） | ✅ 全部遵守（见 §6） |
| 四、四实例同步 + 内核 MD5 一致 | ✅ `c4b93b8d836d7543a26bd2d04779649a` ×4 |
| 五、Playwright 真实点击（空闲检测/离线连接检测） | ✅ 36/36（0 PAGEERROR · console 0 error · 复跑稳定） |

**审计 P0-1 关闭**：P005「重新检测」按钮从「点击即 ReferenceError、状态永久停滞」恢复为完整可用的诊断流。

## 1. 问题机理（审计 P0-1 复述）

- `prototype/v1-new/app.js`（修复前）`ACTIONS['p005-run']` 两个分支（在线直检 :295 / 离线确认后连接完再检 :293）均调用 `p005Diagnose()`，但内核自建立以来**从未定义该函数**（审计已证：静态 grep 零定义 + 运行时两路径均抛 `ReferenceError: p005Diagnose is not a function`，波及三平台壳字节同步副本）。
- 后果：点击「重新检测」→ PAGEERROR，`checking` 之后的推进全部中断，页面停留在「尚未检测」或「设备未连接」；F024（PRD §功能清单，P1）在原型层实际不可用。
- 根因（审计 §3）：场景库直接置状态（`scen/apply` 绕过页面动作），历轮冒烟从未真实点击该按钮，故缺陷穿越全部测试轮存活——本轮测试要求「必须真实点击」正是针对此。

## 2. 修复方案

### 2.1 状态机口径（不新增状态）

任务书流程 `idle → 点击重新检测 → checking → live`、异常 `checking → failed` 映射到正典既有状态（[STATE_MACHINE §8](../04_architecture/STATE_MACHINE.md)：页面六值 `idle/connected/checking/live/offline/error` + 行级五值 `pending/active/ok/warn/fail`）：

| 任务书 | 正典状态 | 页面词（p005-diagnostics.js 既有 word map） |
|---|---|---|
| idle | `idle` | 尚未检测（五行 待检测） |
| checking | `checking` | 正在读取实时状态…（行级 pending→active 逐项推进） |
| live | `live` | 实时检测完成（五行 ok + 明细） |
| failed | **`error`** | 检测失败（五行回待检测 + 错误详情块） |

> `failed` 不新造为页面态：正典页面级失败态即 `error`（STATE_MACHINE §8 / 场景库「连接失败（error + 错误码）」同口径）；`fail` 仅存在于行级五值。**未新增任何状态**。

### 2.2 实现（app.js:161-196，新增 `诊断行为（PAGE005）` 段）

```js
let DIAG_RUN = 0;                                                /* 诊断运行令牌（防跨运行 tick 窜扰） */
function p005Diagnose(device){
  const s=S.pages.p005;
  if(s.state==='checking'||s.connecting) return;                 /* 检测中防重入 */
  const my=++DIAG_RUN;                                           /* 运行令牌：旧运行残留 tick 一律失效 */
  if(device&&device.deviceId) s.deviceId=device.deviceId;
  s.state='checking'; s.error=null; s.showErr=false; s.connecting=false;
  s.rows=[五项].map(…state:'pending'…);                          /* BLE/Wi-Fi/Hub/控制连接/Ready */
  renderAll();
  const step=(i,st,detail)=>{ if(!s.rows)return; …renderAll(); };
  later(350,()=>{ if(my!==DIAG_RUN)return;
    if(S.shared.diagFail){                                       /* 异常分支（预置注入） */
      DIAG_RUN=0;                                                /* 本运行已终态，残留 tick 全部失效 */
      s.state='error'; s.rows=null;
      s.error={code:'diagnostic_connect_failed',message:'连接超时：请让设备进入配网/恢复模式后重试（READY 设备会关闭蓝牙广播）。'};
      modal({title:'连接失败',content:'请让设备进入配网/恢复模式后重试',confirmText:'知道了',hideCancel:true});
      renderAll(); return; }
    step(0,'active'); });
  later(700/1050/1400/1750,()=>{ 逐项 ok + 下一项 active });      /* 行级推进 */
  later(2100,()=>{ step(4,'ok','HID 已就绪，等待 ControlHub 指令');
    s.state='live'; toast('检测完成 · 五项链路正常',true); renderAll(); });
}
```

设计要点：

1. **调用点零改动**：`p005-run` 的两处既有调用（在线直检 / 离线 modal 确认→connecting 1100ms→再检）原样生效；`device` 参数为统一入口签名，缺省沿用页面 `deviceId`。
2. **异常注入机制**：`S.shared.diagFail` 为 app.js 既有声明字段（shared 初始化即含 `diagFail:null`），语义同 `provFailCode`（P002）/`otaFailPreset`（P006）——场景/测试预置、按钮流读取。错误码 `diagnostic_connect_failed` 与 message 文案逐字取自场景库「连接失败（error + 错误码）」，modal 文案取自 PAGE_SPEC §5 错误态口径，**无一句新造**。
3. **五项明细文案逐字取自场景库「检测完成 · 全正常」**（BLE 链路 RSSI -52 / Home-5G · IP 192.168.1.42 / 192.168.1.8:17892 已配对 / MQTT QoS1 / HID 已就绪）——F024 五项内容、顺序、措辞零变化。
4. **离线守卫不动**：`offline/error` 态点击仍走既有「BLE 未连接」modal（连接并检测 / 取消），取消留在原地；connecting 期间按钮「连接中…」禁用（p005-diagnostics.js 既有渲染，未改）。
5. **并发安全**：`DIAG_RUN` 运行令牌 + `checking/connecting` 防重入 + fail 分支终结核运行 + `step` 判空（来历见 §3）。

## 3. 测试驱动的两处实现修正（首轮 35/36 → 终版 36/36，如实登记）

真实点击测试在交付前暴露了首版实现两个自身缺陷，均已修复并复验：

1. **跨运行 tick 窜扰（A4 错误恢复回路首测失败）**：诊断 #1（350ms 失败终态）残留的 2100ms tick，在「error→立即重检」路径中于 1100ms 连接等待后、诊断 #2 刚置回 `checking` 时被守卫 `state!=='checking'` 放行（状态又变回 checking），把 #2 的新 rows 打成 `pending×4+ok` 并提前置 live。100ms 粒度状态轨迹实测复现。**修复**：`DIAG_RUN` 运行令牌，每次调用自增，旧运行残留 tick 一律失效。
2. **fail 分支残留 tick 空引用（修复 1 引入，PAGEERROR ×4）**：令牌使同运行后续 tick（700-2100ms）在 fail 分支（`rows=null`）后仍持有效令牌执行 `step()` → `s.rows[i]` 空引用。**修复**：fail 分支 `DIAG_RUN=0` 终结核运行 + `step` 判空双保险。

> 教训（与审计 §3 同源）：`later()` 链的生命周期必须与「运行」绑定（令牌），仅靠瞬时状态值守卫挡不住状态回摆；该模式可作 09_test 固化时对其余 `later` 链（p002Submit 等）的复查线索。

## 4. 变更明细与同步

| 文件 | 变更 | 校验 |
|---|---|---|
| `prototype/v1-new/app.js` | +36 行（`诊断行为（PAGE005）` 段：注释 + `DIAG_RUN` + `p005Diagnose`），既有行零改动 | `node --check` OK · MD5 `c4b93b8d836d7543a26bd2d04779649a` |
| `prototype/platform/wechat/high-fi/app.js` | 内核字节重同步 | 同 MD5 ✓ |
| `prototype/platform/app/high-fi/app.js` | 内核字节重同步 | 同 MD5 ✓ |
| `prototype/platform/desktop/high-fi/app.js` | 内核字节重同步 | 同 MD5 ✓ |
| `prototype/v1-new/index.html` | 资源戳 `?v=1.1.5`→`?v=1.1.6`（15 处） | 旧戳残留 0 |
| `prototype/platform/{wechat,app,desktop}/high-fi/index.html` | 资源戳 `?v=1.4.4`→`?v=1.4.5`（各 17 处） | 旧戳残留 0 |
| `prototype/v1-new/README.md` | 修订记录 + v1.0.6 条目 | — |
| `prototype/platform/README.md` | 走查须知戳句子 → 1.4.5 / 1.1.6（M-4 轮） | — |
| web 壳 | **不动**（独立 D3 子集内核，无 P005 页） | — |

未改动：`pages/p005-diagnostics.js`（页面结构）、其余 8 页、components/mock、SCEN 场景库、一切规范文件。

## 5. 验证（Playwright 真实点击，36/36，复跑两遍稳定）

| 组 | 断言（全部真实点击触发） | 结果 |
|---|---|---|
| A1 空闲重新检测（任务五-1） | 进入 P005=尚未检测/五行待检测/按钮可用 → 点击 → **立即 checking**（正在读取实时状态…）→ 行级推进（ble active·wifi pending）→ **live**（实时检测完成）→ 五行全 ok + 明细文案五项逐字 + 页面行词 正常×5 | 9/9 ✅ |
| A2 异常分支 | diagFail 预置 → 点击 → checking → **error**（检测失败）→ modal 连接失败（配网/恢复模式口径）→ 错误详情块（code+message）→ 五行回待检测 → 显示错误码 `diagnostic_connect_failed` | 7/7 ✅ |
| A3 离线连接并检测（任务五-2） | offline → 点击弹「BLE 未连接」→ **取消留在原地** → 再点 → 连接并检测 → **连接中…按钮禁用** → 连接完成→checking → **live 五行 ok** → connecting 复位 | 7/7 ✅ |
| A4 错误恢复回路 | live→预设失败→error→关闭 modal→清除预设→重检仍走连接确认守卫→连接并检测→**回到 live**（§3 缺陷 1 的回归锚点） | 2/2 ✅ |
| B1 P003 真实路径 | P003 场景「正常」→ 运行诊断 → P005 携带 `HID-9F3E2A1C` → 点击检测 → live | 2/2 ✅ |
| B2 P002 恢复路由 | controlhub_unreachable 场景（recovery=diagnostics）→ 运行诊断 → P005 → 点击检测 → live | 2/2 ✅ |
| C 内核回归 | P001→P006 连接复用（M-3 回归）· P007→P006 会话 · **全程 0 PAGEERROR · 0 console error** | 4/4 ✅ |
| D 微信壳抽查 | 壳内 P005 真实点击 → live 五行 ok · 0 PAGEERROR / 0 console error（内核字节同步实证） | 3/3 ✅ |

「日志正确」口径说明：P005 按 PAGE_SPEC §5 页面结构**无日志面板**（①状态行②五项行③操作区④错误详情块），禁止修改页面结构，故以可见诊断输出为日志口径——状态词、五行状态词、明细文案、错误码/错误文案逐字断言 + console 0 error，共覆盖 A1-4/5/6/8/9、A2-3/5/7、A3-5/6 等断言。

## 6. 约束符合性

| 禁止项 | 遵守情况 |
|---|---|
| 修改 F024 产品定义 | ✅ 五项（BLE/Wi-Fi/ControlHub/控制连接/Ready）、顺序、明细文案逐字取自既有场景库；R20 行为链（未连接确认→连接→读实时状态→五项结论→显示错误码）完整落地 |
| 新增诊断能力 | ✅ 无新检查项、无新错误码、无新文案；`diagFail` 为既有声明字段的启用（与 provFailCode 同机制） |
| 修改页面结构 | ✅ `pages/p005-diagnostics.js` 零改动（按钮/状态词/行渲染/错误块全部既有） |
| 修改 Profile 流程 | ✅ P003 分流、P002 配网流、redirectTo/栈感知导航零改动（B1/B2 实证） |

## 7. 遗留与建议

1. **P1-1（M-2）仍待放行**：F020 扫码失败三分类（p002 qrErr 死字段）——本轮未动，需单独任务授权。
2. **09_test 固化建议**（沿用审计 M-4 并扩充）：把本轮 A1/A3（P005 真实点击两路径）+ A4（错误恢复回路）+ P006 三路径会话断言纳入常驻冒烟集；重点 = **必须点击真实按钮**（场景库置状态会绕过动作层，P0-1 正因此存活多轮）。
3. **`later()` 链复查线索**（§3 教训，非缺陷登记）：p002Submit 等既有 `later` 链在「错误→立即重试」快速路径下存在同类跨运行窜扰理论窗口，建议 09_test 固化时一并核查，本轮不扩大改动面。
4. git 提交/推送继续按约定暂缓；全部变更未提交（工作区可 `git diff` 复核）。
