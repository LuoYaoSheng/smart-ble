/* PAGE005 Smart HID 诊断 —— F024 五项链路 + 栈感知导航 */
PAGES['p005'] = {
  num:'PAGE005', title:'SHID 诊断', kind:'sub',
  feats:['F024'],
  defaults: () => ({
    deviceId:'SHID-9F3E2A1C', state:'idle', rows:null, error:null, connecting:false, showErr:false,
  }),
  render(s){
    const word = { idle:'尚未检测', connected:'设备已连接可开始检测', checking:'正在读取实时状态…', live:'实时检测完成', offline:'设备未连接', error:'检测失败' }[s.state];
    const tone = s.state==='live'?'on':s.state==='error'||s.state==='offline'?'err':'dim';
    const rows = (s.rows || [['ble','BLE 链路'],['wifi','Wi-Fi 连接'],['hub','ControlHub'],['conn','控制连接'],['usb','设备 Ready 状态']]
      .map(([k,label])=>({key:k,label,state:'pending'}))).map(r=>`
      <div class="diag ${r.state}"><span class="ico">${r.state==='ok'?C.ic('check','sm'):r.state==='warn'?C.ic('warn','sm'):r.state==='fail'?C.ic('x','sm'):r.state==='active'?'·':'·'}</span>
        <div style="flex:1"><div style="display:flex;align-items:center"><span class="t">${r.label}</span>
          <span class="word">${({pending:'待检测',active:'检测中',ok:'正常',warn:'异常',fail:'失败'})[r.state]}</span></div>
          ${r.detail?`<div class="dt">${r.detail}</div>`:''}</div></div>`).join('');
    return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button><span class="t">SHID 诊断</span></div>
    <div class="page">
      <div class="card" style="margin-top:12px;display:flex;align-items:center;gap:10px">
        ${C.badge(word,tone)}
        <span class="mono" style="font-size:var(--fs-mini);color:var(--c-mut)">${s.deviceId}</span></div>
      <div class="card">${rows}</div>
      ${s.error ? `
      <div style="margin-bottom:12px">${C.op({mode:s.state==='error'?'err':'warn',title:'错误详情',desc:`${s.error.message}`})}</div>
      ${C.btn({label:s.showErr?'隐藏错误码':'显示错误码（详细信息）',tone:'ghost',size:'sm',block:true,act:'p005-toggleerr'})}
      ${s.showErr?`<div class="ad-sec" style="margin-top:10px"><div class="hd"><span>code</span></div><div class="hex" style="color:#FF8B94">${s.error.code}</div></div>`:''}` : ''}
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:9px">
        ${C.btn({label:s.connecting?'连接中…':'重新检测',tone:'primary',block:true,icon:'refresh',loading:s.connecting,disabled:s.connecting,act:'p005-run'})}
        <div style="display:flex;gap:9px">
          ${C.btn({label:'返回设备详情',tone:'soft',icon:'chev-r',act:'p005-godetail'})}
          ${C.btn({label:'重新配网',tone:'soft danger-t',icon:'refresh',act:'p005-reprov'})}
        </div>
      </div>
    </div>`;
  },
};
