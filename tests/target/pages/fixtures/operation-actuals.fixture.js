/* Auto-generated fixture catalog for Page Driver Actuals (TEST-PAGE-DRIVER-001).
 * Runtime must load THIS file — never echo live operation.expected_* from behavior.
 */
const OPERATION_ACTUALS = {
  "OP-P001-01": {
    "page_id": "PAGE-001",
    "control": "开始扫描按钮",
    "ui": [
      "列表增量出现，状态=扫描中"
    ],
    "runtime_events": [
      "Composable→Store→ScanSession→Runtime.startDiscovery"
    ],
    "device_events": [
      "device_effect_from_call_chain:Composable→Store→ScanSession→Runtime.startDiscovery"
    ],
    "navigation": null,
    "cleanup_notes": [
      "进入扫描前确保旧会话已停"
    ]
  },
  "OP-P001-02": {
    "page_id": "PAGE-001",
    "control": "停止扫描按钮",
    "ui": [
      "状态=已完成，列表保留"
    ],
    "runtime_events": [
      "Store.stopScan(user)"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "停发现+清计时器"
    ]
  },
  "OP-P001-03": {
    "page_id": "PAGE-001",
    "control": "超时自动停止",
    "ui": [
      "状态=已完成（视为正常完成）"
    ],
    "runtime_events": [
      "计时器→stopScan(timeout)"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "同上"
    ]
  },
  "OP-P001-04": {
    "page_id": "PAGE-001",
    "control": "hide/unload 停止",
    "ui": [
      "无声（后台不扫描）"
    ],
    "runtime_events": [
      "生命周期→stopScan(page_hide/unload)"
    ],
    "device_events": [
      "device_effect_from_call_chain:生命周期→stopScan(page_hide/unload)"
    ],
    "navigation": null,
    "cleanup_notes": [
      "同上+页面订阅"
    ]
  },
  "OP-P001-05": {
    "page_id": "PAGE-001",
    "control": "第二轮扫描",
    "ui": [
      "列表重建"
    ],
    "runtime_events": [
      "新 generation start"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "旧 generation 事件作废"
    ]
  },
  "OP-P001-06": {
    "page_id": "PAGE-001",
    "control": "设备卡点击",
    "ui": [
      "弹窗展示结构化字段+原始字节"
    ],
    "runtime_events": [
      "打开广播弹窗（不连接）"
    ],
    "device_events": [
      "device_effect_from_call_chain:打开广播弹窗（不连接）"
    ],
    "navigation": null,
    "cleanup_notes": [
      "弹窗关闭无残留"
    ]
  },
  "OP-P001-07": {
    "page_id": "PAGE-001",
    "control": "连接按钮（卡上）",
    "ui": [
      "PAGE-006 连接中"
    ],
    "runtime_events": [
      "prepareConnect(停扫)→跳 PAGE-006 并发起连接"
    ],
    "device_events": [
      "device_effect_from_call_chain:prepareConnect(停扫)→跳 PAGE-006 并发起连接"
    ],
    "navigation": "→PAGE-006",
    "cleanup_notes": [
      "停止本轮扫描"
    ]
  },
  "OP-P001-08": {
    "page_id": "PAGE-001",
    "control": "Profile 动作（Smart HID 配网）",
    "ui": [
      "PAGE-002 自动连接"
    ],
    "runtime_events": [
      "设定 Profile 当前设备→跳 PAGE-002"
    ],
    "device_events": [
      "device_effect_from_call_chain:设定 Profile 当前设备→跳 PAGE-002"
    ],
    "navigation": "→PAGE-002",
    "cleanup_notes": [
      "停止本轮扫描"
    ]
  },
  "OP-P001-09": {
    "page_id": "PAGE-001",
    "control": "筛选控件",
    "ui": [
      "列表即时更新"
    ],
    "runtime_events": [
      "纯函数过滤→M 更新"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P001-10": {
    "page_id": "PAGE-001",
    "control": "复制广播字段",
    "ui": [
      "toast 已复制"
    ],
    "runtime_events": [
      "剪贴板"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P001-11": {
    "page_id": "PAGE-001",
    "control": "历史紧凑-查看",
    "ui": [
      "详情页打开"
    ],
    "runtime_events": [
      "→PAGE-003"
    ],
    "device_events": [],
    "navigation": "→PAGE-003",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P001-13": {
    "page_id": "PAGE-001",
    "control": "历史紧凑-全部历史",
    "ui": [
      "历史页打开"
    ],
    "runtime_events": [
      "→PAGE-004"
    ],
    "device_events": [],
    "navigation": "→PAGE-004",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P001-14": {
    "page_id": "PAGE-001",
    "control": "失败重试横幅按钮",
    "ui": [
      "恢复扫描"
    ],
    "runtime_events": [
      "重新 start（新 generation）"
    ],
    "device_events": [
      "device_effect_from_call_chain:重新 start（新 generation）"
    ],
    "navigation": null,
    "cleanup_notes": [
      "同 OP-P001-01"
    ]
  },
  "OP-P001-15": {
    "page_id": "PAGE-001",
    "control": "分享（微信菜单）",
    "ui": [
      "分享面板"
    ],
    "runtime_events": [
      "shareApp"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P002-01": {
    "page_id": "PAGE-002",
    "control": "自动连接（进入触发）",
    "ui": [
      "身份通过进入表单"
    ],
    "runtime_events": [
      "SmartHidService.connect→发现→读 INFO"
    ],
    "device_events": [
      "device_effect_from_call_chain:SmartHidService.connect→发现→读 INFO"
    ],
    "navigation": null,
    "cleanup_notes": [
      "半初始化失败必须断开"
    ]
  },
  "OP-P002-02": {
    "page_id": "PAGE-002",
    "control": "重新连接按钮",
    "ui": [
      "同上"
    ],
    "runtime_events": [
      "同上"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "同上"
    ]
  },
  "OP-P002-03": {
    "page_id": "PAGE-002",
    "control": "返回设备列表",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "navigateBack"
    ],
    "device_events": [],
    "navigation": "→来源页",
    "cleanup_notes": [
      "释放连接"
    ]
  },
  "OP-P002-04": {
    "page_id": "PAGE-002",
    "control": "表单输入",
    "ui": [
      "下发按钮随完整性启用"
    ],
    "runtime_events": [
      "本地校验（纯函数）"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P002-05": {
    "page_id": "PAGE-002",
    "control": "密码显示开关",
    "ui": [
      "明文/掩码"
    ],
    "runtime_events": [
      "本地"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P002-06": {
    "page_id": "PAGE-002",
    "control": "扫码",
    "ui": [
      "\"已获取\"状态+host 回填"
    ],
    "runtime_events": [
      "parsePairingQrPayload"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "相机会话关闭"
    ]
  },
  "OP-P002-07": {
    "page_id": "PAGE-002",
    "control": "下发配置",
    "ui": [
      "进入状态阶段"
    ],
    "runtime_events": [
      "buildCandidate→先注册 STATUS waiter→分帧写 INPUT"
    ],
    "device_events": [
      "device_effect_from_call_chain:buildCandidate→先注册 STATUS waiter→分帧写 INPUT"
    ],
    "navigation": null,
    "cleanup_notes": [
      "waiter 取消能力"
    ]
  },
  "OP-P002-08": {
    "page_id": "PAGE-002",
    "control": "取消等待",
    "ui": [
      "回表单（保留输入）"
    ],
    "runtime_events": [
      "取消 waiter+（可选）CTRL 无——本协议无 abort 特征，取消即断开连接"
    ],
    "device_events": [
      "device_effect_from_call_chain:取消 waiter+（可选）CTRL 无——本协议无 abort 特征，取消即断开连接"
    ],
    "navigation": null,
    "cleanup_notes": [
      "断开连接+退订"
    ]
  },
  "OP-P002-09": {
    "page_id": "PAGE-002",
    "control": "错误恢复按钮",
    "ui": [
      "进入对应阶段"
    ],
    "runtime_events": [
      "按 `13` 恢复映射（form/pairing/diagnostics/retry）"
    ],
    "device_events": [],
    "navigation": "可→PAGE-005",
    "cleanup_notes": [
      "按动作清理"
    ]
  },
  "OP-P002-10": {
    "page_id": "PAGE-002",
    "control": "查看设备",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "写历史→跳详情"
    ],
    "device_events": [
      "device_effect_from_call_chain:写历史→跳详情"
    ],
    "navigation": "→PAGE-003",
    "cleanup_notes": [
      "释放配网连接（REQ-051）"
    ]
  },
  "OP-P002-11": {
    "page_id": "PAGE-002",
    "control": "返回键（拦截）",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "确认后取消+离开"
    ],
    "device_events": [],
    "navigation": "→来源页",
    "cleanup_notes": [
      "同 OP-P002-08"
    ]
  },
  "OP-P003-01": {
    "page_id": "PAGE-003",
    "control": "重新配置",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "设定 Profile 当前设备→PAGE-002"
    ],
    "device_events": [],
    "navigation": "→PAGE-002",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P003-02": {
    "page_id": "PAGE-003",
    "control": "运行诊断",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "→PAGE-005"
    ],
    "device_events": [],
    "navigation": "→PAGE-005",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P003-03": {
    "page_id": "PAGE-003",
    "control": "高级 BLE 调试",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "构建设备上下文→PAGE-006"
    ],
    "device_events": [],
    "navigation": "→PAGE-006",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P003-04": {
    "page_id": "PAGE-003",
    "control": "返回",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "navigateBack"
    ],
    "device_events": [],
    "navigation": "→来源页",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P004-01": {
    "page_id": "PAGE-004",
    "control": "卡片点击",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "→PAGE-003"
    ],
    "device_events": [],
    "navigation": "→PAGE-003",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P004-02": {
    "page_id": "PAGE-004",
    "control": "移除按钮",
    "ui": [
      "toast+列表更新"
    ],
    "runtime_events": [
      "删除 DATA-006 记录"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P004-03": {
    "page_id": "PAGE-004",
    "control": "确认框取消",
    "ui": [
      "无变化"
    ],
    "runtime_events": [
      "关闭确认"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P004-04": {
    "page_id": "PAGE-004",
    "control": "空态去扫描",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "switchTab"
    ],
    "device_events": [],
    "navigation": "→PAGE-001",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P004-05": {
    "page_id": "PAGE-004",
    "control": "返回",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "navigateBack"
    ],
    "device_events": [],
    "navigation": "→PAGE-001",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P005-01": {
    "page_id": "PAGE-005",
    "control": "进入自动诊断",
    "ui": [
      "五项刷新+时间戳"
    ],
    "runtime_events": [
      "diagnose() 一次"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无（borrowed 不动连接）"
    ]
  },
  "OP-P005-02": {
    "page_id": "PAGE-005",
    "control": "重新检测",
    "ui": [
      "同上"
    ],
    "runtime_events": [
      "diagnose()"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "同上"
    ]
  },
  "OP-P005-03": {
    "page_id": "PAGE-005",
    "control": "连接设备（确认）",
    "ui": [
      "进入检测"
    ],
    "runtime_events": [
      "connect（owned）→diagnose()"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "owned 连接离页断开"
    ]
  },
  "OP-P005-04": {
    "page_id": "PAGE-005",
    "control": "显示/隐藏错误码",
    "ui": [
      "折叠区展开"
    ],
    "runtime_events": [
      "本地切换"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P005-05": {
    "page_id": "PAGE-005",
    "control": "返回设备详情",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "navigateBack（栈感知，无栈则 redirectTo 详情）"
    ],
    "device_events": [],
    "navigation": "→PAGE-003",
    "cleanup_notes": [
      "owned 清理"
    ]
  },
  "OP-P005-06": {
    "page_id": "PAGE-005",
    "control": "重新配网",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "设定上下文→PAGE-002"
    ],
    "device_events": [],
    "navigation": "→PAGE-002",
    "cleanup_notes": [
      "owned 清理"
    ]
  },
  "OP-P006-01": {
    "page_id": "PAGE-006",
    "control": "连接",
    "ui": [
      "服务面板 ready"
    ],
    "runtime_events": [
      "use-device-session.connect（attempt 去重）"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "失败关半开连接"
    ]
  },
  "OP-P006-02": {
    "page_id": "PAGE-006",
    "control": "主动断开",
    "ui": [
      "状态=已断开，Registry 更新"
    ],
    "runtime_events": [
      "disconnect(主动标记，不重连)"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "会话注销"
    ]
  },
  "OP-P006-03": {
    "page_id": "PAGE-006",
    "control": "服务发现重试",
    "ui": [
      "ready"
    ],
    "runtime_events": [
      "重新 discoverServices"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "失败关连接"
    ]
  },
  "OP-P006-04": {
    "page_id": "PAGE-006",
    "control": "Read",
    "ui": [
      "值展示+日志"
    ],
    "runtime_events": [
      "readValue(3s 超时)"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "一次性 listener 移除"
    ]
  },
  "OP-P006-05": {
    "page_id": "PAGE-006",
    "control": "TEXT 写",
    "ui": [
      "设备响应+日志"
    ],
    "runtime_events": [
      "encodeWritePayload(text) UTF-8"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "队列出队"
    ]
  },
  "OP-P006-06": {
    "page_id": "PAGE-006",
    "control": "HEX 写",
    "ui": [
      "同上"
    ],
    "runtime_events": [
      "严格偶数+字符校验→字节"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "同上"
    ]
  },
  "OP-P006-07": {
    "page_id": "PAGE-006",
    "control": "开启订阅（Characteristic Subscription，DEC-017）",
    "ui": [
      "推送流+日志；Registry subscription_count +1"
    ],
    "runtime_events": [
      "Runtime 按平台能力启用 Characteristic Value Change"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "关闭时远程+本地双关"
    ]
  },
  "OP-P006-08": {
    "page_id": "PAGE-006",
    "control": "关闭订阅",
    "ui": [
      "推送停止；subscription_count −1"
    ],
    "runtime_events": [
      "setNotifyEnabled(false)（远程+本地双断）"
    ],
    "device_events": [
      "device_effect_from_call_chain:setNotifyEnabled(false)（远程+本地双断）"
    ],
    "navigation": null,
    "cleanup_notes": [
      "退订+UI 摘除"
    ]
  },
  "OP-P006-10": {
    "page_id": "PAGE-006",
    "control": "清空日志",
    "ui": [
      "toast+面板清空"
    ],
    "runtime_events": [
      "logger.clear(deviceId)"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P006-11": {
    "page_id": "PAGE-006",
    "control": "导出日志",
    "ui": [
      "导出成功"
    ],
    "runtime_events": [
      "脱敏→格式化→导出/复制"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "文件句柄关闭"
    ]
  },
  "OP-P006-12": {
    "page_id": "PAGE-006",
    "control": "选择 OTA 固件包",
    "ui": [
      "显示 target/硬件/目标版本/SHA 摘要"
    ],
    "runtime_events": [
      "FEAT-081 六项校验（格式/target/hardware/version/size/SHA256）"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P006-13": {
    "page_id": "PAGE-006",
    "control": "开始 OTA",
    "ui": [
      "进度→success→版本一致=成功"
    ],
    "runtime_events": [
      "OTA 事务（第 0 步后 10 步正典，`12`；start 携带 target/sha256）"
    ],
    "device_events": [
      "device_effect_from_call_chain:OTA 事务（第 0 步后 10 步正典，`12`；start 携带 target/sha256）"
    ],
    "navigation": null,
    "cleanup_notes": [
      "事务资源释放"
    ]
  },
  "OP-P006-14": {
    "page_id": "PAGE-006",
    "control": "取消 OTA",
    "ui": [
      "取消完成回就绪"
    ],
    "runtime_events": [
      "CTRL abort→设备回 idle"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "同上"
    ]
  },
  "OP-P006-15": {
    "page_id": "PAGE-006",
    "control": "返回",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "navigateBack"
    ],
    "device_events": [],
    "navigation": "→来源页",
    "cleanup_notes": [
      "页面级订阅摘除（会话保留，DEC-009）"
    ]
  },
  "OP-P007-01": {
    "page_id": "PAGE-007",
    "control": "卡片点击",
    "ui": [
      "打开 PAGE-006/003 且复用会话"
    ],
    "runtime_events": [
      "按 Profile 路由携稳定身份"
    ],
    "device_events": [],
    "navigation": "→PAGE-006/003",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P007-02": {
    "page_id": "PAGE-007",
    "control": "单独断开",
    "ui": [
      "toast+条目消失"
    ],
    "runtime_events": [
      "统一断开入口（含 Smart HID service 通知）→Registry 移除"
    ],
    "device_events": [
      "device_effect_from_call_chain:统一断开入口（含 Smart HID service 通知）→Registry 移除"
    ],
    "navigation": null,
    "cleanup_notes": [
      "会话注销+订阅清理"
    ]
  },
  "OP-P007-03": {
    "page_id": "PAGE-007",
    "control": "全部断开",
    "ui": [
      "toast 汇总"
    ],
    "runtime_events": [
      "对全部会话统一断开（同一入口，含 HID；allSettled）"
    ],
    "device_events": [
      "device_effect_from_call_chain:对全部会话统一断开（同一入口，含 HID；allSettled）"
    ],
    "navigation": null,
    "cleanup_notes": [
      "同上逐台"
    ]
  },
  "OP-P007-04": {
    "page_id": "PAGE-007",
    "control": "空态去扫描",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "switchTab"
    ],
    "device_events": [],
    "navigation": "→PAGE-001",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P007-05": {
    "page_id": "PAGE-007",
    "control": "查看重连进度",
    "ui": [
      "条目显示\"重连中 n/3\""
    ],
    "runtime_events": [
      "展示型（无点击链路）"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P008-01": {
    "page_id": "PAGE-008",
    "control": "检查支持",
    "ui": [
      "状态芯片更新"
    ],
    "runtime_events": [
      "能力探测（含插件存在性）"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P008-02": {
    "page_id": "PAGE-008",
    "control": "编辑字段",
    "ui": [
      "预算即时更新"
    ],
    "runtime_events": [
      "校验+预算重算"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P008-03": {
    "page_id": "PAGE-008",
    "control": "开始广播",
    "ui": [
      "状态=广播中（实际成功后）"
    ],
    "runtime_events": [
      "Owner 获取→平台广播启动"
    ],
    "device_events": [
      "device_effect_from_call_chain:Owner 获取→平台广播启动"
    ],
    "navigation": null,
    "cleanup_notes": [
      "失败释放 Owner"
    ]
  },
  "OP-P008-04": {
    "page_id": "PAGE-008",
    "control": "停止广播",
    "ui": [
      "状态=已就绪；Observer 观测消失（E5）"
    ],
    "runtime_events": [
      "平台停止+Server 关闭"
    ],
    "device_events": [
      "device_effect_from_call_chain:平台停止+Server 关闭"
    ],
    "navigation": null,
    "cleanup_notes": [
      "Owner 释放"
    ]
  },
  "OP-P008-05": {
    "page_id": "PAGE-008",
    "control": "清空操作日志",
    "ui": [
      "toast"
    ],
    "runtime_events": [
      "本地清空"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P008-06": {
    "page_id": "PAGE-008",
    "control": "hide/unload 释放",
    "ui": [
      "无声"
    ],
    "runtime_events": [
      "自动停止+释放"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "同 OP-04"
    ]
  },
  "OP-P008-07": {
    "page_id": "PAGE-008",
    "control": "复制 Observer 校验信息",
    "ui": [
      "toast"
    ],
    "runtime_events": [
      "复制当前 payload 摘要（供比对）"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-01": {
    "page_id": "PAGE-009",
    "control": "打开官网",
    "ui": [
      "打开/复制 toast"
    ],
    "runtime_events": [
      "App openURL / H5 window.open / 微信复制链接"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-02": {
    "page_id": "PAGE-009",
    "control": "版本记录",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "navigate"
    ],
    "device_events": [],
    "navigation": "→PAGE-010",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-03": {
    "page_id": "PAGE-009",
    "control": "开发文档",
    "ui": [
      "同上"
    ],
    "runtime_events": [
      "同 OP-01"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-04": {
    "page_id": "PAGE-009",
    "control": "GitHub 仓库",
    "ui": [
      "同上"
    ],
    "runtime_events": [
      "同 OP-01"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-05": {
    "page_id": "PAGE-009",
    "control": "ESP32 教程",
    "ui": [
      "同上"
    ],
    "runtime_events": [
      "同 OP-01"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-06": {
    "page_id": "PAGE-009",
    "control": "问题反馈",
    "ui": [
      "打开/复制"
    ],
    "runtime_events": [
      "Issue 入口（DEC-011 仓库角色）"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-07": {
    "page_id": "PAGE-009",
    "control": "隐私声明",
    "ui": [
      "打开"
    ],
    "runtime_events": [
      "文档站隐私页"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-08": {
    "page_id": "PAGE-009",
    "control": "安全披露",
    "ui": [
      "打开"
    ],
    "runtime_events": [
      "SECURITY.md 入口"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-09": {
    "page_id": "PAGE-009",
    "control": "开源许可",
    "ui": [
      "打开"
    ],
    "runtime_events": [
      "LICENSE 展示"
    ],
    "device_events": [],
    "navigation": "弹窗/外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-10": {
    "page_id": "PAGE-009",
    "control": "分享应用",
    "ui": [
      "分享面板"
    ],
    "runtime_events": [
      "微信 share / App uni.share / H5 Web Share→复制"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P009-11": {
    "page_id": "PAGE-009",
    "control": "跳转其他小程序",
    "ui": [
      "跳转"
    ],
    "runtime_events": [
      "navigateToMiniProgram"
    ],
    "device_events": [],
    "navigation": "外部小程序",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P010-01": {
    "page_id": "PAGE-010",
    "control": "查看条目（滚动）",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "静态渲染"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P010-02": {
    "page_id": "PAGE-010",
    "control": "复制版本信息",
    "ui": [
      "toast"
    ],
    "runtime_events": [
      "复制\"版本+shortsha\""
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P010-03": {
    "page_id": "PAGE-010",
    "control": "分享本页",
    "ui": [
      "分享面板"
    ],
    "runtime_events": [
      "shareApp（本 path）"
    ],
    "device_events": [],
    "navigation": null,
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-P010-04": {
    "page_id": "PAGE-010",
    "control": "返回",
    "ui": [
      "—"
    ],
    "runtime_events": [
      "navigateBack"
    ],
    "device_events": [],
    "navigation": "→PAGE-009",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-01": {
    "page_id": "WEB-001",
    "control": "主 CTA（体验）",
    "ui": [
      "到达目标"
    ],
    "runtime_events": [
      "锚点/打开原型"
    ],
    "device_events": [],
    "navigation": "#quickstart/原型",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-02": {
    "page_id": "WEB-001",
    "control": "次 CTA（GitHub）",
    "ui": [
      "打开仓库"
    ],
    "runtime_events": [
      "外链"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-03": {
    "page_id": "WEB-001",
    "control": "下载 Android APK",
    "ui": [
      "下载开始"
    ],
    "runtime_events": [
      "产物 URL"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-04": {
    "page_id": "WEB-001",
    "control": "微信小程序码",
    "ui": [
      "进入小程序"
    ],
    "runtime_events": [
      "码图"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-05": {
    "page_id": "WEB-001",
    "control": "固件下载",
    "ui": [
      "下载"
    ],
    "runtime_events": [
      "产物 URL"
    ],
    "device_events": [],
    "navigation": "外部",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-06": {
    "page_id": "WEB-001",
    "control": "查看证据",
    "ui": [
      "打开证据"
    ],
    "runtime_events": [
      "EVID 链接"
    ],
    "device_events": [],
    "navigation": "外部/站内",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-07": {
    "page_id": "WEB-001",
    "control": "查看已知限制",
    "ui": [
      "定位"
    ],
    "runtime_events": [
      "#evidence 锚点"
    ],
    "device_events": [],
    "navigation": "锚点",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-08": {
    "page_id": "WEB-001",
    "control": "导航锚点",
    "ui": [
      "定位"
    ],
    "runtime_events": [
      "平滑滚动"
    ],
    "device_events": [],
    "navigation": "锚点",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-09": {
    "page_id": "WEB-001",
    "control": "快速开始三选一",
    "ui": [
      "打开"
    ],
    "runtime_events": [
      "到达对应教程（Quick Start，前置条件声明在区块开头）"
    ],
    "device_events": [],
    "navigation": "站内",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-10": {
    "page_id": "WEB-001",
    "control": "Smart HID 区链接",
    "ui": [
      "打开"
    ],
    "runtime_events": [
      "详情/教程"
    ],
    "device_events": [],
    "navigation": "站内",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  },
  "OP-W001-11": {
    "page_id": "WEB-001",
    "control": "30 分钟 Clean Machine 入口",
    "ui": [
      "打开"
    ],
    "runtime_events": [
      "到达 Clean Machine 教程（`19` 2.2：clone→依赖→build→flash→install→scan→connect→write→notify）"
    ],
    "device_events": [
      "device_effect_from_call_chain:到达 Clean Machine 教程（`19` 2.2：clone→依赖→build→flash→install→scan→connect→write→not"
    ],
    "navigation": "站内",
    "cleanup_notes": [
      "无本页额外清理"
    ]
  }
};
module.exports.default = OPERATION_ACTUALS;
module.exports = { ...module.exports, OPERATION_ACTUALS };
