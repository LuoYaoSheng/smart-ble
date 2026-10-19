/* ============================================================
   MOCK —— 模拟数据（结构对齐 REVERSE_ANALYSIS §7 · QA Q2 整改）
   字段口径：RSSI 大写 / advertisement 嵌套 / profileMatch
   UUID 全部真实（1800/180F/4FAFC201/FFE0）
   2026-09-03 A-02 整改（F004/R04 广播弹窗字段补齐）：
   · advertisement 增 serviceUuids / serviceData / adStructures 示例——
     字段名对齐 REVERSE §7.1 旧代码真实结构（advertisServiceUUIDs /
     serviceData 为平台 API 独立字段，不依赖 hex 内嵌）；adStructures
     为「预置分段展示数据」（COMPONENT C2 AD 结构逐段），非运行时解析。
   · hex 重排为 AD 结构自洽帧（长度字节=段长-1），adStructures 各段
     与整包 hex 字节严格对齐；serviceUuids 未内嵌 31B 包的设备（D1）
     演示「平台解析字段独立于原始 hex」的真实形态。
   ============================================================ */
window.MOCK = {

  /* 扫描结果（PAGE001）——真实结构设备对象 */
  scanDevices: [
    { deviceId:'SHID-9F3E2A1C', name:'SHID-9F3E2A1C', RSSI:-52, connected:false,
      profileMatch:{ level:'STRONG', profileId:'smart-hid' },
      advertisement:{ state:'received', present:true, byteLength:31, length:31,
        hex:'02 01 06 0E 09 53 48 49 44 2D 39 46 33 45 32 41 31 43 09 FF 4C 00 10 05 09 0A 18 00 02 0A 04',
        manufacturerId:'4C00',
        serviceUuids:['9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'],
        serviceData:null,
        adStructures:[
          { type:'0x01', name:'FLAGS', len:3, hex:'02 01 06' },
          { type:'0x09', name:'完整本地名称', len:15, hex:'0E 09 53 48 49 44 2D 39 46 33 45 32 41 31 43' },
          { type:'0xFF', name:'厂商数据', len:10, hex:'09 FF 4C 00 10 05 09 0A 18 00' },
          { type:'0x0A', name:'发射功率', len:3, hex:'02 0A 04' },
        ] } },
    { deviceId:'D8:A6:3A:41:F2:09', name:'Mi Smart Band 8', RSSI:-66, connected:false,
      profileMatch:null,
      advertisement:{ state:'received', present:true, byteLength:20, length:20,
        hex:'02 01 06 10 09 4D 69 20 53 6D 61 72 74 20 42 61 6E 64 20 38',
        manufacturerId:null, serviceUuids:null, serviceData:null,
        adStructures:[
          { type:'0x01', name:'FLAGS', len:3, hex:'02 01 06' },
          { type:'0x09', name:'完整本地名称', len:17, hex:'10 09 4D 69 20 53 6D 61 72 74 20 42 61 6E 64 20 38' },
        ] } },
    { deviceId:'EF:6B:12:0C:AA:77', name:'', RSSI:-78, connected:false,
      profileMatch:null,
      advertisement:{ state:'received', present:true, byteLength:11, length:11,
        hex:'02 01 06 02 0A 04 04 FF 64 00 27',
        manufacturerId:'0064', serviceUuids:null, serviceData:null,
        adStructures:[
          { type:'0x01', name:'FLAGS', len:3, hex:'02 01 06' },
          { type:'0x0A', name:'发射功率', len:3, hex:'02 0A 04' },
          { type:'0xFF', name:'厂商数据', len:5, hex:'04 FF 64 00 27' },
        ] } },
    { deviceId:'LightBLE-DevKit', name:'LightBLE-DevKit', RSSI:-59, connected:false,
      profileMatch:{ level:'WEAK', profileId:'smart-hid' },
      advertisement:{ state:'received', present:true, byteLength:30, length:30,
        hex:'02 01 06 10 09 4C 69 67 68 74 42 4C 45 2D 44 65 76 4B 69 74 03 02 E0 FF 05 16 E0 FF 00 01',
        manufacturerId:null,
        serviceUuids:['0000ffe0-0000-1000-8000-00805f9b34fb'],
        serviceData:{ uuid:'FFE0', state:'received', present:true, byteLength:2, length:2, hex:'00 01' },
        adStructures:[
          { type:'0x01', name:'FLAGS', len:3, hex:'02 01 06' },
          { type:'0x09', name:'完整本地名称', len:17, hex:'10 09 4C 69 67 68 74 42 4C 45 2D 44 65 76 4B 69 74' },
          { type:'0x02', name:'16 位 Service UUID 列表', len:4, hex:'03 02 E0 FF' },
          { type:'0x16', name:'Service Data', len:6, hex:'05 16 E0 FF 00 01' },
        ] } },
    { deviceId:'C4:11:9E:02:3B:5F', name:'', RSSI:-85, connected:false,
      profileMatch:null,
      advertisement:{ state:'received', present:false, byteLength:0, length:0, hex:'', manufacturerId:null } },
  ],

  /* 已连接会话（PAGE007）——内存会话，非持久化 */
  connected: [
    { deviceId:'D8:A6:3A:41:F2:09', name:'Mi Smart Band 8', RSSI:-66, profileId:null,  meta:'已连接 · 可进行 GATT 调试' },
    { deviceId:'LightBLE-DevKit',   name:'LightBLE-DevKit', RSSI:-59, profileId:null,  meta:'已连接 · 可进行 GATT 调试' },
    { deviceId:'SHID-9F3E2A1C',     name:'SHID-9F3E2A1C',   RSSI:-52, profileId:'smart-hid', meta:'已连接 · Smart HID 配网会话' },
  ],

  /* GATT 服务树（PAGE006 · 4 服务 7 特征，SIG 标准名） */
  gattTree: [
    { uuid:'00001800-0000-1000-8000-00805f9b34fb', name:'通用访问', chars:[
      { uuid:'00002a00-0000-1000-8000-00805f9b34fb', name:'设备名', props:{read:true},          value:'4C 69 67 68 74 42 4C 45' },
      { uuid:'00002a01-0000-1000-8000-00805f9b34fb', name:'外观',   props:{read:true},          value:'00 00' },
    ]},
    { uuid:'0000180f-0000-1000-8000-00805f9b34fb', name:'电池服务', chars:[
      { uuid:'00002a19-0000-1000-8000-00805f9b34fb', name:'电量',   props:{read:true,notify:true}, value:'64' },
    ]},
    { uuid:'4fafc201-1fb5-459e-914d-914d0cdff40d', name:'OTA 服务', ota:true, chars:[
      { uuid:'beb5483e-36e1-4688-b7f5-ea07361b26c0', name:'OTA 控制', props:{write:true,notify:true} },
      { uuid:'beb5483e-36e1-4688-b7f5-ea07361b26c1', name:'OTA 数据', props:{write:true} },
      { uuid:'beb5483e-36e1-4688-b7f5-ea07361b26c2', name:'版本回读', props:{read:true},          value:'31 2E 32 2E 30' },
    ]},
    { uuid:'0000ffe0-0000-1000-8000-00805f9b34fb', name:'串口透传', chars:[
      { uuid:'0000ffe1-0000-1000-8000-00805f9b34fb', name:'透传通道', props:{read:true,write:true,notify:true}, value:'48 65 6C 6C 6F' },
    ]},
  ],

  /* 关于页（PAGE009）——Release Metadata 投影 */
  release: {
    displayVersion:'1.0.5-preview', buildSha:'f2c2feb', channel:'preview',
    platformStatus:[
      { name:'微信小程序', cap:'VERIFIED',  rel:'PREVIEW' },
      { name:'App · Android', cap:'PREVIEW', rel:'NOT_RELEASED' },
      { name:'App · iOS', cap:'UNSUPPORTED', rel:'NOT_RELEASED' },
      { name:'H5 / Web', cap:'UNSUPPORTED', rel:'NOT_RELEASED' },
      { name:'桌面端', cap:'REFERENCE', rel:'NOT_RELEASED' },
    ],
    features:['01 蓝牙扫描与筛选','02 GATT 读写与监听','03 多设备会话管理','04 BLE 广播发射','05 Smart HID 配网','06 固件升级（受限）'],
    limitations:['OTA 端到端链路 BLOCKED：固件侧暂未开放升级通道','iOS 广播依赖原生插件（当前构建未打包）','H5 平台不支持 BLE 外围模式'],
    releases:[],  /* 空态场景：暂无正式发布版本 */
    previews:[
      { version:'v1.0.5-preview', sha:'f2c2feb', date:'2026-08-30', note:'Smart HID 配网工作流完善；广播字节预算核算' },
      { version:'v1.0.4-preview', sha:'a91e3d7', date:'2026-08-21', note:'Profile 注册表与诊断五项链路' },
    ],
  },
  env: { platform:'微信小程序', system:'iOS 17.5.1', model:'iPhone 15 Pro' },


  /* 配网错误码表（F022 · BUSINESS_FLOW 8 码 → 4 类恢复动作） */
  provErrors: {
    wifi_failed:            { msg:'设备侧报告 Wi-Fi 连接失败，请核对 SSID 与密码后重试。', row:'wifi', recovery:'form' },
    pairing_expired:        { msg:'配对码已过期，请重新扫描 ControlHub 配对码。',           row:'hub',  recovery:'pairing' },
    controlhub_unreachable: { msg:'无法连接 ControlHub（192.168.1.8:17892），请确认主机在线或运行诊断。', row:'conn', recovery:'diagnostics' },
    mqtt_auth_failed:       { msg:'MQTT 认证失败：token 无效或已被吊销。',                  row:'conn', recovery:'pairing' },
    device_busy:            { msg:'设备忙（可能是上一次配网会话未结束），请稍后重试。',      row:'wifi', recovery:'retry' },
    protocol_version:       { msg:'协议版本不兼容（设备 V1 / 期望 ≥V1.1），请升级固件。',    row:'usb',  recovery:'retry' },
    storage_error:          { msg:'设备存储写入失败，请重试或检查设备日志。',                row:'wifi', recovery:'retry' },
    timeout:                { msg:'等待设备确认超时（60s），可重试下发。',                   row:'usb',  recovery:'retry' },
  },

  /* 广播默认值（PAGE008 · 平台分支） */
  advDefaults: {
    weixin:  { name:'SmartBLE',  uuid:'FFE0', mfgId:'0001', mfgData:'BLE' },
    android: { name:'SmartBLE-A', uuid:'FFE0', mfgId:'0001', mfgData:'BLE' },
    ios:     { name:'SmartBLE-I', uuid:'FFE0', mfgId:'0001', mfgData:'BLE' },
  },
};
