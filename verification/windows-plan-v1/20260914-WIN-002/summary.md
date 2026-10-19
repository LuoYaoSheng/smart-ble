# WIN-002 桌面共享测试恢复全绿

- Date: 2026-09-14
- 变更: `tests/desktop/version-metadata.desktop.test.mjs` M1 断言——平台成员资格从手写四键列表改为消费正典产物 `apps/uniapp/config/release-metadata.generated.json` 的 `public_surfaces`(键序模板保留为页面契约)。

## 执行记录

1. 失败基线:`node --test tests/desktop/*.test.mjs` → 94/95,唯一失败 M1 `actual: ['android','h5','ios'] vs expected: ['android','wechat','h5','ios']`(见 baseline-94of95.txt)。
2. 修改 M1 断言为正典驱动(见 diff);投影层 `version-metadata.js` 本身已是 `platformOrder.filter(surfaces[key])` 元数据驱动,未改实现。
3. 复跑:`node --test tests/desktop/*.test.mjs` → **95/95 pass, exit 0**(见 after-95of95.txt)。
4. 两线 JS 语法:`node --check` Electron/Tauri 全部 34 个 JS 文件 → 0 失败。

## 断言强度说明(非放宽)

旧断言:手写成员快照 `['android','wechat','h5','ios']`。
新断言:`['android','wechat','h5','ios'].filter(k => 正典产物.public_surfaces[k])` 与页面模型输出 deepEqual。
锚点从手写列表迁移到正典产物文件;镜像断言(test 1 逐字节一致 / test 2 生成产物=正典 JSON)全部保留。微信在/不在均跟随 release 管线,不编造、不跳过。

## 依赖说明

计划步骤 1 要求等 MAC-001/MAC-002 定稿;当前 MAC-001 BLOCKED(等用户裁决微信去留)、MAC-002 FAILED。本次改法对裁决**中立**:正典元数据恢复 wechat 则断言自动回四键,维持裁撤则三键,两种结果均全绿、无需返工。未替 Mac 决策、未改动 `release/**`。

## 结论

WIN-002 = **PASS**(95/95,断言未放宽)。观察项:MAC-001 裁决后若正典元数据键集变化,无需改本测试。
