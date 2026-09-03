/* ============================================================
   C —— 组件注册表（COMPONENT.md 单一来源 · QA Q3 整改：
   devCard / logPanel 全局唯一定义，页面禁止重复实现）
   ============================================================ */
window.C = {

  /* ---- B1 基础元件 ---- */
  ic(name, cls=''){ return `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`; },

  chip(text, tone='neutral'){ return `<span class="chip ${tone}">${text}</span>`; },

  badge(text, tone='dim', dot=true){ return `<span class="badge ${tone}">${dot?'<i class="dot"></i>':''}${text}</span>`; },

  btn({label, tone='primary', size='', icon='', disabled=false, act='', data='', loading=false, cls=''}){
    return `<button class="btn ${tone} ${size} ${cls}" ${act?`data-act="${act}"`:''} ${data} ${disabled||loading?'disabled':''}>
      ${loading?'<span class="spin"></span>':(icon?C.ic(icon,'sm'):'')}<span>${label}</span></button>`;
  },

  txtlink(label, act, data=''){ return `<button class="txtlink" data-act="${act}" ${data}>${label}</button>`; },

  /* ---- B6 empty-state（4 幅插图） ---- */
  ILL:{
    radar:`<svg width="118" height="86" viewBox="0 0 118 86" fill="none">
      <circle cx="59" cy="46" r="34" stroke="#E3EAF3" stroke-width="2"/>
      <circle cx="59" cy="46" r="21" stroke="#E3EAF3" stroke-width="2"/>
      <circle cx="59" cy="46" r="8" stroke="#1B6DFF" stroke-width="2"/>
      <path d="M59 46L88 20" stroke="#1B6DFF" stroke-width="2" stroke-linecap="round"/>
      <circle cx="76" cy="54" r="3.5" fill="#17C7A8"/><circle cx="48" cy="34" r="2.5" fill="#9AA8B6"/>
      <path d="M18 78h82" stroke="#E3EAF3" stroke-width="2" stroke-linecap="round"/></svg>`,
    link:`<svg width="118" height="86" viewBox="0 0 118 86" fill="none">
      <path d="M46 40a12 12 0 0017 17l8-8a12 12 0 10-17-17" stroke="#9AA8B6" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M72 46A12 12 0 0055 29l-8 8a12 12 0 1017 17" stroke="#1B6DFF" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M24 74h70" stroke="#E3EAF3" stroke-width="2" stroke-linecap="round"/></svg>`,
    doc:`<svg width="118" height="86" viewBox="0 0 118 86" fill="none">
      <path d="M46 12h18l12 12v46a4 4 0 01-4 4H50a4 4 0 01-4-4V16a4 4 0 014-4z" stroke="#1B6DFF" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M64 12v12h12" stroke="#1B6DFF" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M52 42h16M52 50h16M52 58h9" stroke="#9AA8B6" stroke-width="2" stroke-linecap="round"/>
      <circle cx="88" cy="64" r="5" fill="#17C7A8"/></svg>`,
    box:`<svg width="118" height="86" viewBox="0 0 118 86" fill="none">
      <path d="M59 22l24 12v26L59 72 35 60V34z" stroke="#1B6DFF" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M35 34l24 12 24-12M59 46v26" stroke="#9AA8B6" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="59" cy="12" r="3" fill="#17C7A8"/></svg>`,
  },
  empty({ill='box', title, desc='', act=null}){
    return `<div class="empty"><div class="ill">${C.ILL[ill]||C.ILL.box}</div>
      <div class="t">${title}</div>${desc?`<div class="d">${desc}</div>`:''}
      ${act?C.btn({label:act.label,tone:'soft',icon:act.icon||'',act:act.act}) : C.btn({label:'',tone:'soft'})}</div>`;
  },

  /* ---- B7 op-state ---- */
  op({mode='loading', title, desc='', retry=null}){
    const head = mode==='loading' ? '<span class="spin"></span>'
      : `<span class="ico" style="color:${mode==='ok'?'#0E9A80':mode==='warn'?'#C77E14':'var(--c-danger)'}">${C.ic(mode==='ok'?'check':mode==='warn'?'warn':'x')}</span>`;
    return `<div class="op ${mode==='loading'?'':mode}">${head}<div style="flex:1">
      <div class="t">${title}</div>${desc?`<div class="d">${desc}</div>`:''}
      ${retry?`<div style="margin-top:10px">${C.btn({label:'重试',tone:'ghost',size:'sm',icon:'refresh',act:retry})}</div>`:''}</div></div>`;
  },

  /* ---- B8 error-banner ---- */
  ebanner({code, message, retry='p001-retry-scan'}){
    return `<div class="ebanner"><div class="t">${C.ic('warn','sm')} 扫描失败 <span class="code">${code}</span></div>
      <div class="d">${message}</div>${C.btn({label:'重试',tone:'ghost danger-t',size:'sm',icon:'refresh',act:retry})}</div>`;
  },

  /* ---- B9 banner-note ---- */
  note(kind, html){ return `<div class="note ${kind}"><span class="ic">${C.ic(kind==='warn'?'warn':'info','sm')}</span><div>${html}</div></div>`; },

  /* ---- B4 kv ---- */
  kv(k, v, mono=false){ const dim = v===''||v==null; return `<div class="kv"><span class="k">${k}</span><span class="v ${mono?'mono':''} ${dim?'dim':''}">${dim?'—':v}</span></div>`; },

  /* ---- C1 device-card（单一来源 · scan/conn 两变体） ---- */
  devCard(d, mode='scan'){
    const q = d.RSSI>=-60?4:d.RSSI>=-70?3:d.RSSI>=-80?2:1;
    const sig = `<span class="sig q${q}"><i></i><i></i><i></i><i></i></span><span class="dbm">${d.RSSI} dBm</span>`;
    const id = d.name ? d.deviceId : `${d.deviceId}（未命名）`;
    const isShid = d.profileMatch && d.profileMatch.level;
    const matchChip = isShid
      ? (d.profileMatch.level==='STRONG' ? C.chip('Smart HID · 强匹配','primary') : C.chip('疑似 Smart HID · 弱匹配','warning'))
      : '';
    if(mode==='conn'){
      return `<div class="dev conn" data-act="p007-open" data-id="${d.deviceId}">
        <div class="top"><div class="ava ${isShid?'shid':''}">${(d.name||'B')[0].toUpperCase()}<span class="on">${C.ic('check','xs')}</span></div>
        <div class="mid"><div class="nm">${d.name||'未命名设备'} ${matchChip}</div>
        <div class="id mono">${d.deviceId}</div>
        <div class="meta">${sig}<span style="font-size:var(--fs-mini);color:var(--c-mut)">${d.meta||'已连接 · 可进行 GATT 调试'}</span></div></div>
        <div>${C.btn({label:'断开',tone:'soft danger-t',size:'sm',act:'p007-disconnect',data:`data-id="${d.deviceId}"`})}</div></div></div>`;
    }
    return `<div class="dev" data-act="p001-advdlg" data-id="${d.deviceId}">
      <div class="top"><div class="ava ${isShid?'shid':''}">${((d.name||d.deviceId).trim()[0]||'?').toUpperCase()}</div>
      <div class="mid"><div class="nm">${d.name||'未命名 BLE 设备'} ${matchChip}</div>
      <div class="id mono">${id}</div>
      <div class="meta">${sig}</div></div></div>
      <div class="acts">
        ${isShid
          ? C.btn({label:'配置 Smart HID',tone:'primary',size:'sm',icon:'hid',act:'p001-config',data:`data-id="${d.deviceId}"`,disabled:d.connected})
          : C.btn({label:d.connected?'已连接':'连接',tone:d.connected?'soft':'primary',size:'sm',icon:'link',act:'p001-connect',data:`data-id="${d.deviceId}"`,disabled:d.connected})}
      </div></div>`;
  },

  /* ---- C5 log-panel（单一来源 · dock/card 两变体） ---- */
  logPanel(logs, {variant='dock', emptyText='暂无日志', scope='p006'}={}){
    const rows = logs.length ? logs.map(l=>`<div class="logrow"><span class="tm">${l.time}</span>
      <span class="logchip lc-${l.type}">${({sys:'系统',err:'错误',read:'读取',write:'写入',recv:'接收',ok:'成功'})[l.type]}</span>
      <span class="msg">${l.msg}</span></div>`).join('')
      : `<div class="logempty">${emptyText}</div>`;
    return `<div class="logwrap ${variant==='dock'?'dock':'cardv'}">
      <div class="logbar"><span class="t">${C.ic('log','xs')} 通信日志</span>
        ${C.btn({label:'清空',tone:'ghost danger-t',size:'sm',act:`${scope}-logclear`})}
        ${C.btn({label:'导出',tone:'ghost',size:'sm',icon:'copy',act:`${scope}-logexport`})}</div>
      <div class="loglist">${rows}</div></div>`;
  },

  /* ---- C6 stepper ---- */
  stepper(steps, curIdx){
    return `<div class="stepper">${steps.map((s,i)=>{
      const st = i<curIdx?'done':i===curIdx?'cur':'';
      return `${i>0?`<div class="ln ${i<=curIdx?'done':''}"></div>`:''}
        <div class="st ${st}"><span class="n">${i<curIdx?'✓':i+1}</span><span class="lb">${s}</span></div>`;
    }).join('')}</div>`;
  },

  /* ---- 状态图标行（诊断行内图标） ---- */
  stIcon(state){
    return { ok:C.ic('check'), warn:C.ic('warn'), fail:C.ic('x'), active:'·', pending:'·' }[state]||'·';
  },
};
