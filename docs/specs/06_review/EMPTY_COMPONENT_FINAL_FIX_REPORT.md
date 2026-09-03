# EMPTY_COMPONENT_FINAL_FIX_REPORT —— Empty 组件 act 缺省空胶囊收尾修复报告

- **修复项**：06_review/EMPTY_COMPONENT_FIX_REPORT.md · **§5.1 遗留观察项**（A-01 附带发现，本轮用户放行修复）
- **修复日期**：2026-09-03
- **修复人**：ZCode
- **范围**：`docs/specs/prototype/v1-new` + `platform/{wechat,app,desktop}`（内核 components.js 字节重同步）+ `platform/web`（独立 components.js 同款修复）
- **结论先行**：✅ **收尾完成**。`empty()` 定义中 act 缺省分支由 `C.btn({label:'',tone:'soft'})`（36×40 空胶囊）改为不渲染 action UI，与 B6 契约「**可选** action」对齐；组件 API / 页面调用 / 产品逻辑零改动；A-01 已有断言集全量复现通过（含其 32 项口径全部内容）+ 本轮新增断言，**Playwright 62/62 全过、console 0 新错误**、MD5 四方一致、视觉核验 2 张。

---

## 0. 总体结论

| 维度 | 结果 |
|---|---|
| 观察项 §5.1 | **关闭**（单行修复，波及 5 份 components.js：内核 4 份字节同步 + web 独立 1 份同款） |
| 组件 API `empty({ill,title,desc,act})` | **未改动**（签名、参数、返回结构中外层均原样；仅 act 缺省内部分支变更） |
| 页面调用 | **零改动**（27 处调用——内核 24 + web 3——一行未动，diff 可证） |
| 受影响空态分支 | 内核 5 分支（p001 筛选无匹配 / p003 记录不存在 / p006 路由无效 / p010×2）+ web 2 分支（W4 广播不支持 / W5 配网不可达），共 7 处不再渲染空胶囊 |
| CTA 保留回归 | p001-A「开始扫描」/ p007「去扫描」/ web W3「去选择设备」/ web W5 卡片真实主按钮——**全部仍在**（act 有值分支行为不变） |
| 验证 | Playwright **62/62**（A-01 断言集复现 33 子项 + 本轮新增 19 项 + console 5 实例 + 戳 5 实例）；MD5 内核四方唯一哈希；`node --check` ×5 全过；视觉核验 2 张 |
| 版本戳 | v1-new `1.1.3→1.1.4` · wechat/app/desktop `1.4.2→1.4.3` · web `1.4.0→1.4.1`（web 本轮有变更故升） |

---

## 1. 问题与修复方案

### 1.1 故障机理（A-01 §5.1 观察项）

`empty()` 定义（修复前，内核与 web 同款）：

```js
empty({ill='box', title, desc='', act=null}){
  return `<div class="empty"><div class="ill">${C.ILL[ill]||C.ILL.box}</div>
    <div class="t">${title}</div>${desc?`<div class="d">${desc}</div>`:''}
    ${act?C.btn({label:act.label,tone:'soft',icon:act.icon||'',act:act.act}) : C.btn({label:'',tone:'soft'})}</div>`;
}
```

act 缺省时兜底渲染 `C.btn({label:'',tone:'soft'})`——一个 36×40、无文案、无 `data-act` 的空胶囊按钮，出现在全部无 action 空态中（内核 5 分支 + web W4/W5）。**07_design_system/COMPONENT.md §B6** 的空态契约为「插图 + 主文案 + 说明 + **可选** action（soft 按钮）」——可选即缺省不渲染，兜底空按钮违反契约且造成视觉残留。

### 1.2 修复（单行，act 有值分支逐字保留）

```diff
-      ${act?C.btn({label:act.label,tone:'soft',icon:act.icon||'',act:act.act}) : C.btn({label:'',tone:'soft'})}</div>`;
+      ${act?C.btn({label:act.label,tone:'soft',icon:act.icon||'',act:act.act}) : ''}</div>`;
```

- **不修改 API**：签名 `empty({ill,title,desc,act})` 与 act 对象结构 `{label,icon,act}` 原样；变更是渲染内部缺省分支，非接口变更。
- **不修改调用**：27 处调用（内核 6×4 + web 3）零改动——git diff 仅 components.js/index.html/README，无任何 pages/web.js 变更。
- **行为**：act 有值 → soft 按钮（不变）；act 缺省 → 空态仅插图+文案（胶囊消失）。

---

## 2. 变更明细

### 2.1 文件清单（git 增量，本轮净增 6 修改文件 + 报告）

| 文件 | 变更 | 说明 |
|---|---|---|
| v1-new/components/components.js | 单行 | 修复源 |
| platform/{wechat,app,desktop}/high-fi/components/components.js | 字节复制 | 内核同步（`cp`，沿用 v1.0.1 起流程） |
| platform/web/high-fi/components/components.js | 同款单行 | web 独立内核（不参与字节同步合同），同等修复 |
| v1-new/index.html | 戳 `1.1.3→1.1.4`（15 处） | components.js 变更 |
| platform/{wechat,app,desktop}/high-fi/index.html | 戳 `1.4.2→1.4.3`（各 17 处） | 同步的 components.js 变更 |
| platform/web/high-fi/index.html | 戳 `1.4.0→1.4.1`（6 处） | web components.js 本轮有变更 |
| v1-new/README.md | 修订记录 + **v1.0.4** 条目 | v1.0.3 遗留句同步标注「已于 v1.0.4 修复」 |
| platform/README.md | 走查须知戳说明 → 1.4.3 / 1.4.1 / 1.1.4 | 三壳+web+v1-new 当前态 |

### 2.2 同步校验（MD5）

| 文件 | v1-new / wechat / app / desktop | web（独立，不入同步合同） |
|---|---|---|
| components.js | **1 个唯一哈希** `249152b89af8125c97350a7e9ba08ffa` ✅ | `1c80dd1ce0811e1c0431f4ec8722ea68`（独立文件，同款修复） |

- 残留扫描：`grep "C\.btn({label:''"` 全 prototype 目录 = **0 命中**（空胶囊兜底模式彻底清除）。
- `node --check`：5 份 components.js 语法全过。
- 27 处调用方复核：内核 24 处（6×4，A-01 迁移结果）+ web 3 处（web.js:263 带 act / 303、336 不带）——全部不动、无需动。

---

## 3. 校验记录

### 3.1 Playwright（62/62 全过，一次通过零复验）

运行环境：v1-new @ `http://127.0.0.1:8941`，平台壳 @ `http://127.0.0.1:8952/{wechat,app,desktop,web}/high-fi/`。

**① 既有断言集复现（A-01 §3.2 全部内容，33 子项）——任务要求 4「保持已有 32 项断言」：**

| 组 | 子项 | 结果 |
|---|---|---|
| v1-new 空态 A（未扫描） | 标题/说明全等 · radar(circle) · CTA data-act=p001-scan 存在 · CTA 文案「开始扫描」 | 5/5 ✅ |
| v1-new 空态 B（筛选无匹配） | 标题/说明全等 · link(M46 40a12 且无 circle) · 无 CTA | 4/4 ✅ |
| v1-new p007 常规空 | 标题/说明全等 · CTA 去扫描(data-act=gohome) | 3/3 ✅ |
| v1-new p007 配网空 | desc 变体「Smart HID 配网连接进行中…」 | 1/1 ✅ |
| v1-new p003 空设备 | 标题 · 说明含「快照已随会话结束释放」 · box(M59 22l24 12) · 守卫弹窗同现 · 确认后返回 p001 | 5/5 ✅ |
| v1-new p006 错误态 | 标题「路由参数无效」 · 说明含「缺少有效的设备标识」 · box | 3/3 ✅ |
| v1-new p010 双空态 | 两处标题 · 仅 1 条 .d（desc:'' 不渲染） · doc(M64 12v12) | 3/3 ✅ |
| wechat | 戳 v=1.4.3 · p001 A/B 标题 · p007 标题 · 去扫描 CTA · p010 两处空态 | 6/6 ✅ |
| desktop | 戳 v=1.4.3 · p001 空态 A · p006 路由无效 | 3/3 ✅ |
| app | 戳 v=1.4.3 · p007 空态标题 · 去扫描 CTA + 说明完整 | 3/3 ✅ |

> 口径说明（如实）：A-01 报告以分组计数记 32 项（v1-new 18 + 壳 14）；本轮按子检查粒度复现其 §3.2 表格**全部断言内容**为 33 子项（差异为分组口径，非内容增删——如 wechat「p010 两处空态」A-01 记 2 项、本轮按一行标题对合并记 1 项；app「CTA + 说明完整」A-01 记 2 项、本轮合并记 1 项）。三壳戳断言按本轮实际值 1.4.3 复核（1.4.2→1.4.3 为本轮预期变更）。

**② 本轮新增断言（19 项）——任务要求 3「act 为空时不渲染 action UI」正反两面：**

| 组 | 断言 | 结果 |
|---|---|---|
| v1-new 空胶囊消失 | p001-B / p003 / p006-invalid / p010 正式版空 / p010 预览空：`.empty` 内 **0 按钮** | 5/5 ✅ |
| v1-new CTA 保留 | p001-A 与 p007 常规空：`.empty` 内**恰 1 按钮**（act 有值分支不变） | 2/2 ✅ |
| wechat | p001-B 0 按钮 · p010 双空态均 0 按钮 | 2/2 ✅ |
| desktop | p006 invalid 0 按钮 | 1/1 ✅ |
| app | p007 空态恰 1 按钮（CTA） | 1/1 ✅ |
| web（独立内核） | 戳 v=1.4.1 · W3 未选设备标题 + 恰 1 按钮 + 文案「去选择设备」（act 保留） · W4 标题 + 0 按钮 · W5 标题 + 0 按钮 + 卡片真实主按钮「配网请使用小程序 / App」保留 | 8/8 ✅ |

**③ console（5 实例）**：v1-new / wechat / desktop / app / web 监听窗口内 **0 新错误**（favicon 404 为存量已知，不属本轮范围）。

### 3.2 视觉核验（2 张）

- **p001 筛选无匹配（act 缺省代表态）**：空状态三要素（link 插图 / 标题 / 说明）齐全居中，无空胶囊、无重叠、无 undefined。备注（如实）：视觉模型一度将 link 插图的断链横杆（SVG `path 70×0`，两链环之间的连杆，插图本身的设计元素）误报为「横线状胶囊」——DOM 复核 `.empty` 仅 `ill`/`t`/`d` 三节点、0 button，以 DOM 证据为准，非缺陷。
- **web W5 配网不可达（act 缺省 + 真实按钮并存态）**：空状态干净无胶囊、卡片下方主操作按钮完整、排版正常。备注：视觉模型对顶栏 kicker 读串为「PERIPHERAL」（W4 的 kicker）；代码事实 W5 为 `PROFILE`（web.js），且 W5 专属标题断言已过，非缺陷。

### 3.3 任务指定四态验证映射

| 任务验证项 | 落点 | 证据 |
|---|---|---|
| P001 空设备 | p001 空态 A（未扫描）+ B（筛选无匹配） | A：CTA 保留恰 1；B：0 按钮 §3.1①/② |
| P003 空连接 | p003 记录不存在（守卫弹窗 + 返回回归） | §3.1① 5/5 + 0 按钮 |
| P006 空服务 | p006 路由参数无效（错误空态；服务树空态 panel='empty' 不经 C.empty，非本轮范围） | §3.1① 3/3 + 0 按钮 |
| 错误态 | p006 invalid 即错误态空态（+ p001 扫描失败横幅为 ebanner 组件，不经 C.empty，A-01 已界定范围） | 同上 |

---

## 4. 约束符合性自查

| 任务要求 | 自查 | 证据 |
|---|---|---|
| 1. 不修改 C.empty API | ✅ | 签名/参数结构/调用约定零改动；diff 仅 act 缺省内部分支 1 行（§1.2） |
| 2. 不修改页面调用 | ✅ | git 增量无任何 pages/*.js 与 web.js；27 处调用逐数复核（§2.2） |
| 3. act 为空时不渲染 action UI | ✅ | 7 个 act 缺省分支 `.empty` 0 按钮；CTA 分支恰 1 按钮不受影响（§3.1②） |
| 4. 保持已有 32 项断言 | ✅ | A-01 §3.2 全部断言内容复现 33 子项全过（分组口径差异见 §3.1①说明） |
| 5. 同步所有内核拷贝 | ✅ | 内核四方 MD5 唯一哈希；web 独立份同款修复（不参与字节同步合同但同等对待）；全仓空胶囊模式 grep 0 残留 |
| 验证：P001 空设备 / P003 空连接 / P006 空服务 / 错误态 | ✅ | §3.3 映射表 |
| （延续）禁止修改产品逻辑/页面流程/新增功能 | ✅ | 纯渲染缺省分支收口；文案/路由/场景库/mock 零改动 |

---

## 5. 遗留与建议

1. **09_test 冒烟空态断言固化（A-01 §5.2 建议，延续开放）**：本轮与 A-01 两轮共 80+ 项空态断言仍为一次性执行；建议将「空态文案全等 + CTA 存在性/不存在性 + 插图语义」固化进 09_test 冒烟清单（未获 09_test 修改授权，不动）。
2. **P2 审计项与生态裁断（延续开放）**：A-03/A-04/A-05/A-06/A-08/A-09 与 C1（微信广播）/ C3（多设备连接）待用户另行放行。
3. **A-01 全链终态**：调用契约（24 处对象参数迁移）→ 组件缺省行为（本轮空胶囊收口）两级修复均完成，empty 组件与 B6 契约完全一致；v1-new 修订记录 v1.0.1→v1.0.4、平台壳戳 1.4.0→1.4.3（web）/1.4.3（三壳）留痕完整。

---

—— 修复完成。修复人：ZCode（2026-09-03，A-01 遗留观察项 §5.1 关闭）。本报告为 06_review 第 11 份审查文件；至此 A-01（P1）在调用侧与组件侧双双闭环。
