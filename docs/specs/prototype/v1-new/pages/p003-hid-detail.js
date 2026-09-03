/* PAGE003 Smart HID 设备详情 —— 会话级内存快照页（2026-09-02 决策后无落档；P-02 说明行） */
PAGES['p003'] = {
  num:'PAGE003', title:'Smart HID 设备详情', kind:'sub',
  feats:['F018','F021'],
  defaults: () => ({ device:null, tried:false }),
  render(s){
    return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button><span class="t">Smart HID 设备详情</span></div>
    <div class="page">${s.device ? `
      <div class="card" style="margin-top:12px;display:flex;gap:13px;align-items:center">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#D9F6F0,#E2F8F4);color:#0E9A80;display:flex;align-items:center;justify-content:center">${C.ic('hid','lg')}</div>
        <div style="flex:1;min-width:0"><div style="font-size:var(--fs-h1);font-weight:var(--fw-xbold)">${s.device.name||'Smart HID 设备'}</div>
          <div style="margin-top:4px">${C.badge('配置成功 · READY','on')}</div></div></div>
      <div class="card">
        <div class="card-t">${C.ic('chip')} 设备身份</div>
        ${C.kv('Device ID',s.device.deviceId,true)}
        ${C.kv('协议版本',s.device.protocol?`Smart HID ${s.device.protocol}`:'',false)}
        ${C.kv('固件版本',s.device.firmware,true)}
        ${s.device.protocol? '' : `<div style="margin-top:8px">${C.chip('协议未记录','neutral')}</div>`}
      </div>
      <div class="card">
        <div class="card-t">${C.ic('wifi')} 最近配置</div>
        ${C.kv('Wi-Fi',s.device.lastWifi)}
        ${C.kv('ControlHub',s.device.lastHub,true)}
      </div>
      ${C.note('info','本页为<b>本次配网会话的内存快照</b>，退出小程序后不再可见（零本地持久化）。重新配置前需让设备进入配网模式。')}
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:9px">
        ${C.btn({label:'重新配置',tone:'primary',block:true,icon:'refresh',act:'p003-reconfig'})}
        <div style="display:flex;gap:9px">
          ${C.btn({label:'运行诊断',tone:'soft',icon:'pulse',act:'p003-diag',cls:'p003-diag-btn'})}
          ${C.btn({label:'高级 BLE 调试',tone:'soft',icon:'set',act:'p003-gatt'})}
        </div>
      </div>`
    : C.empty({ill:'box',title:'设备记录不存在',desc:'该设备快照已随会话结束释放，请重新配网后查看。'})}</div>`;
  },
};
