/* PAGE002 Smart HID 配网向导 —— F019 三阶段 / F020 扫码 / F021 下发 / F022 错误恢复 + U-01 离开确认扩展 */
PAGES['p002'] = {
  num:'PAGE002', title:'配置 Smart HID', kind:'sub',
  feats:['F018','F019','F020','F021','F022'],
  defaults: () => ({
    device:null, guard:false,
    phase:'connect', phaseIdx:0, connecting:true, connError:null, lost:false,
    ssid:'', pwd:'', hub:'', showPwd:false, token:null, qrErr:null, qrState:'idle',
    provisioning:false, done:false, err:null, progress:{wifi:'pending',hub:'pending',conn:'pending',usb:'pending'},
  }),
  inputs:{
    'pv-ssid': (s,v)=>{ s.ssid = v.slice(0,32); },
    'pv-pwd':  (s,v)=>{ s.pwd = v.slice(0,64); },
    'pv-hub':  (s,v)=>{ s.hub = v; },
  },
  render(s){
    if(!s.device) return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button><span class="t">配置 Smart HID</span></div>
      <div class="page"><div class="guard" style="padding-top:120px">${C.op({mode:'warn',title:'缺少设备上下文',desc:'请从扫描页的 Smart HID 设备卡进入配网流程。'})}
      <div style="margin-top:16px">${C.btn({label:'去扫描',tone:'soft',icon:'scan',act:'gohome'})}</div></div></div>`;
    const dev = s.device;
    const stepIdx = s.phase==='connect'?0:s.phase==='configure'?1:2;
    let body = '';
    if(s.phase==='connect'){
      body = s.connecting
        ? C.op({mode:'loading',title:'连接并确认设备中…',desc:`正在建立 GATT 连接 · ${dev.name}`})
        : s.connError
          ? `<div style="margin-bottom:12px">${C.ebanner({code:'identity_failed',message:s.connError,retry:'p002-reconnect'})}</div>
             <div style="display:flex;gap:9px">${C.btn({label:'重新连接',tone:'primary',icon:'refresh',act:'p002-reconnect'})}
             ${C.btn({label:'返回设备列表',tone:'soft',act:'gohome'})}</div>`
          : '';
    }
    if(s.phase==='configure'){
      const can = s.ssid.trim() && s.hub.trim() && s.token && !s.provisioning;
      body = `
      ${s.lost ? `<div style="margin-bottom:12px">${C.ebanner({code:'connection_lost',message:'设备连接已断开。已填写的配网信息不会丢失，重新连接后可继续。',retry:'p002-rejoin'})}</div>` : ''}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        ${C.badge(s.lost?'已断开':'已连接', s.lost?'err':'on')}
        <span class="mono" style="font-size:var(--fs-mini);color:var(--c-mut)">${dev.deviceId}</span></div>
      <div class="card">
        <div class="field"><label>Wi-Fi 名称 <span class="req">*</span></label>
          <div class="inp"><input maxlength="32" placeholder="家庭 / 办公 2.4G Wi-Fi" value="${s.ssid}" data-in="pv-ssid"></div></div>
        <div class="field"><label>Wi-Fi 密码</label>
          <div class="inp"><input type="${s.showPwd?'text':'password'}" maxlength="64" placeholder="无密码可留空" value="${s.pwd}" data-in="pv-pwd">
            <button class="eye" data-act="p002-eye">${C.ic(s.showPwd?'eye-off':'eye','sm')}</button></div></div>
        <div class="field"><label>ControlHub 地址 <span class="req">*</span></label>
          <div class="inp"><input class="mono" placeholder="192.168.1.8:17892" value="${s.hub}" data-in="pv-hub"></div></div>
      </div>
      <div class="bigact ${s.token?'got':''}" data-act="p002-qr">
        ${C.ic('qr','lg')}
        <div style="flex:1"><div class="t">${s.token?'重新扫描配对码':'扫描 ControlHub 配对码'}</div>
          <div class="d">${s.token?'token 已获取（内存会话，不落盘）':'扫码解析 shid://pair 自动回填地址与令牌'} ${s.token?`<span class="chip success" style="margin-left:6px">已获取</span>`:`<span class="chip warning" style="margin-left:6px">必需</span>`}</div></div>
      </div>
      ${s.qrErr ? `
      <div style="margin-top:10px">${C.op({mode:s.qrErr.reason==='cancel'?'warn':'err',
        title:({cancel:'扫码取消',permission:'权限拒绝',invalid:'二维码无效'})[s.qrErr.reason],
        desc:({cancel:'未完成扫码（用户取消，不算错误）。已填写的配置信息不受影响，可重新扫描。',
               permission:'扫码权限被拒绝。请在系统设置中允许相机权限后重试。',
               invalid:'未识别到有效配对码（非 shid://pair 或缺少参数）。请对准 ControlHub 屏显二维码重试。'})[s.qrErr.reason]})}</div>
      <div style="display:flex;gap:9px;margin-top:10px">
        ${s.qrErr.reason==='permission'
          ? C.btn({label:'去设置',tone:'soft',icon:'set',act:'p002-qrsetting'})
            + C.btn({label:'重新扫码',tone:'primary',icon:'qr',act:'p002-qr'})
          : C.btn({label:'重新扫码',tone:'primary',icon:'qr',block:true,act:'p002-qr'})}
      </div>` : ''}
      ${C.note('info','Wi-Fi 密码和配对凭据只用于本次下发，<b>不写入日志或本地存储</b>。')}
      <div style="margin-top:16px">${C.btn({label:'下发配置',tone:'primary',block:true,icon:'send',disabled:!can,act:'p002-submit'})}</div>`;
    }
    if(s.phase==='status'){
      const rows = [['wifi','Wi-Fi 连接'],['hub','ControlHub 配对'],['conn','MQTT 控制链路'],['usb','USB HID Ready']]
        .map(([k,t])=>`<div class="prow ${s.progress[k]}"><span class="st-i">${s.progress[k]==='done'?'✓':s.progress[k]==='fail'?'✕':'·'}</span><span class="t">${t}</span>
          ${s.err&&s.err.row===k?`<span class="dt mono">${s.err.code}</span>`:''}</div>`).join('');
      const recBtn = s.err ? ({ form:['返回表单修改','p002-backform','set'], pairing:['重新扫描配对码','p002-repairing','qr'],
                       diagnostics:['运行诊断','p002-godiag','pulse'], retry:['重新下发','p002-submit','send'] }[s.err.recovery]||[]) : [];
      body = s.done ? `
        <div class="card" style="text-align:center;padding-top:26px">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--c-success-weak);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#0E9A80">${C.ic('check','lg')}</div>
          <div style="font-size:var(--fs-h1);font-weight:var(--fw-xbold)">配置成功 · 设备 READY</div>
          <div style="font-size:var(--fs-body);color:var(--c-mut);margin:8px 0 4px">HID 控制请通过 ControlHub 下发</div>
          <div style="margin-top:16px">${C.btn({label:'查看设备',tone:'primary',icon:'chev-r',act:'p002-view'})}</div></div>`
        : s.err ? `
        <div style="margin-bottom:12px">${C.ebanner({code:s.err.code,message:s.err.msg,retry:'p002-backform'})}</div>
        <div class="card">${rows}</div>
        ${recBtn.length?`<div style="margin-top:16px">${C.btn({label:recBtn[0],tone:'primary',icon:recBtn[2],act:recBtn[1]})}</div>`:''}`
        : `<div class="card">${rows}</div>
           <div style="margin-top:16px">${C.btn({label:'取消等待',tone:'soft',act:'p002-cancelwait'})}</div>`;
    }
    return `<div class="subnav"><button class="back-btn" data-act="p002-back">${C.ic('chev-r','sm')}</button><span class="t">配置 Smart HID</span></div>
    <div class="page">
      ${C.stepper(['连接设备','填写配置','下发状态'],stepIdx)}
      <div class="card" style="display:flex;gap:11px;align-items:center;padding:12px 16px;margin-bottom:12px">
        <div class="ava shid" style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#D9F6F0,#E2F8F4);color:#0E9A80;display:flex;align-items:center;justify-content:center;font-weight:800">${(dev.name||'S')[0]}</div>
        <div><div style="font-size:var(--fs-h2);font-weight:var(--fw-bold)">${dev.name||'Smart HID 设备'}</div>
        <div class="mono" style="font-size:var(--fs-micro);color:var(--c-mut)">${dev.deviceId} · Device Info 已验证</div></div></div>
      ${body}
    </div>`;
  },
};
