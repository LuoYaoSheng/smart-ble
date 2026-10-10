# F013 多设备会话管理 —— 双手机方案真机验证汇总（2026-09-07）

## 结论

**U-AND F013 = PASS_WITH_LIMITATION**（E5 真机，双外设=ESP32 fixture + 华为 TAS-AN00 广播者）

- ✅ P007 已连接列表（双设备「2 台设备保持连接」+ 全部断开按钮 + 两卡名称/连接稳定 chip）
- ✅ 单台断开 → 列表仅 1 台（无汇总卡 ∧ 非空 ⇒ N=1，App 渲染不变式）
- ✅ 断开后重连 → 恢复 2 台
- ✅ 全部断开 → 空态（还没有连接中的设备）
- ⚠️ 限制 1：部分失败清单弹窗（summarizeDisconnectAllResults 失败分支）**未能在真机触发**——关蓝牙竞速窗口内列表被 onDisconnect 先行清空；代码路径在册未执行，不得记 PASS。
- ⚠️ 限制 2：第二外设为安卓广播者（Mate 30 5G），存在 EMUI 空闲 GATT 回收（~90s）与 **RPA 地址轮转**（轮转后同一物理设备以新旧两个 deviceId 并存，v4/v28 实测列表出现「3 台保持连接」= ESP32 + 同一部华为的两条目）→ WIN-UAND-001（P3）在册。
- 全断成功 toast「已全部断开」多次真机执行均在 dump 时窗外未被捕获（尽力项，空态断言为主证据）。

F-AND / A-AND 的 F013 复用本夹具待跑（A-AND 有「连接」tab，F-AND 无多设备列表页，适用性待裁）。

## 布景（双手机夹具配方，可复用）

| 角色 | 设备 | 配置 |
|---|---|---|
| 中央 | 三星 SM-G9910（E5，R5CR1284Y7H） | U-AND = HBuilder 标准基座 + `apps/uniapp` |
| 外设 1 | ESP32-S3 fixture（COM12） | `fixture_peripheral_s3`，BLEToolkit-Server，10:B4:1D:CD:23:8D，5 服务（4FAFC201 B/C/D + 1800/1801） |
| 外设 2 | 华为 TAS-AN00（FEC0220629005177，Mate 30 5G，Android 12） | A-AND `com.smartble` 广播 tab → 开始广播（默认 UUID 0000FFF0-…-34FB，connectable，BALANCED/TX_HIGH）；5 权限 pm grant 预授 |

要点：
- 华为 EMUI 的 uiautomator 是变体：Compose 文本节点 `bounds=[0,0]`，真实几何在非标 `xpos` 属性且**不稳定**——底部导航按屏幕几何推算（1080 宽 4 tab，广播=3 号 tab ≈ (675,2168)；开始/停止广播按钮归位后 ≈ (540,1683)，先上滑露出）。
- Mate 30 5G 默认 GATT 实测 **5 个服务**（与 ESP32 同为 5，服务数不能区分两者）；身份判别用**详情页页头设备名（y<350，位置即页别）**+ ESP32 独有 4FAFC201（注意服务面板重进默认折叠，UUID 可能不可见）。

## 证据清单（全部真机执行）

| 验收项 | 工件 | 说明 |
|---|---|---|
| 双外设发现 | `uand-f013-01-two-peripherals.png` | 同屏 BLEToolkit-Server + Mate 30 5G 卡片 |
| 双连接（身份判别） | `uand-f013-02-esp32-connected.png` / `uand-f013-03-huawei-connected.png` + `dump-02-esp32.xml` / `dump-03-huawei.xml`（详情页设备ID 10:B4:1D…） | v28 run |
| P007 列表 N=2 | `f013b-01-connected-list-2.png` + `uand-f013b-all-disconnect-results.json`（b#0 PASS） | f013b run |
| 单台断开 → N=1 | `uand-f013-05-after-single-disconnect.png` + `uand-f013-e5-results.json`（单断后仅 1 台 PASS） | v28 run |
| 重连恢复 N=2 | `uand-f013-06-restored-2.png`（v27 run 15:02）+ v27 控制台 `PASS 重连后恢复 2 台（N=2）`（json 已被 v28 覆盖，以 run 记录+截图为证） | v27 run |
| 全部断开 → 空态 | `f013b-02-disconnect-all-empty.png` + `uand-f013b-all-disconnect-results.json`（b-全断后 n=0 empty=True） | f013b run；v9-run1 亦有一次（控制台 PASS phase7 empty） |
| 部分失败弹窗 | 无 | 未触发（限制 1） |
| 华为侧布景 | `hw-01-broadcast-tab.png` / `hw-02-advertising.png`（停止广播+其他设备可以扫描到此设备） | — |
| 取证原始件 | `dump-bind-fail.xml`（已连接页滚动区整块不暴露 a11y 的实证）、`dump-guard-*.xml` | — |

驱动：`../uand-f013-e5.py`（v1→v28，主链）+ `../uand-f013b-all-disconnect.py`（全断聚焦）。

## 五大根因（驱动侧踩坑全记录，供后续域复用）

1. **P006 详情页进页即自动连接**（initBluetoothAdapter→connectDevice）——任何误触卡片都会放大成真实连接（v4/v28 的「未知设备/3 台」事件源头）。对策：页头 y<350 设备名判别身份 + 连错即断开重试。
2. **底部导航「已连接」文字撞卡片绑定窗口**——卡片沉底时其名字距 tab 栏「已连接」标签仅 Δ~178px，落进 [80,330] 窗口 → 误判「卡已连接」跳过。对策：候选键排除 y≥2150（tab 栏带）+ 沉底卡先滚到屏中。
3. **背景页与前台页文本混入同一份 uiautomator dump**（tab 页常驻）——文本存在性断言一律用 P007/P006 独有文案；N 值用 App 自渲染的「N 台设备保持连接」+ 扫描页头「N 台设备 · M 台已连接」双源。
4. **已连接页 WebView 对 a11y 树只暴露部分区域**（滚动区/汇总卡偶发整块缺失，实例号递增 [1]→[4]）——页面渲染本身正常（几何直点仍生效）。对策：归顶 + 固定几何位兜底（断开 (897,897)/(897,1320)、全部断开 (892,339)）+ 点击后以 N 变化校验效果。
5. **华为 RPA 地址轮转**——旧地址会话未死 + 新地址卡片可连 → 同一物理设备双条目（n=3）；旧卡「已连接」标志仅在下次扫描合并时刷新。对策（驱动侧）：card_action 遍历同名卡优先可操作按钮；（产品侧）登记 WIN-UAND-001。
   另：**连发 switchTab 会打穿 HBuilder WebView 池**（产生空白 connected 页实例）——切 tab 后轮询 8s 等渲染，勿快速重试点。

## 夹具稳定性备注

- 华为广播者单链实测 75s+ 稳定（广播 tab 前台 + stayon true）；多设备长会话（>2min）受 EMUI 空闲回收 + RPA 轮转影响，不适合做长稳场景，适合单轮列表/断开/重连验证。
- ESP32 fixture 全程稳定（5 服务，重连即恢复 5/5）。
