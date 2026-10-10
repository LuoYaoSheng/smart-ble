/* ============================================================
   web.js —— Web 子集原型内核（「已配对设备 GATT 调试器」形态）
   D3=开发暂缓（b）· 原型先行 2026-09-03（原型齐备 ≠ 开发排期）。
   页面集为 Web 平台子集：S1 扫描 / S4 广播 / S2S3 配网 按
   10_platform §3 矩阵显式「不支持 + 指引」（延续基准 P008 U-03 口径）；
   S1b GATT / S5 OTA(BLOCKED 同基准) / S6 单连接 在本原型可用。
   架构同基准 v1-new：S → RENDER → ACTIONS 单向数据流，场景幂等。
   三引用：① 基准 prototype/v1-new ② 10_platform §2.3/§3 ③ §4 差异设计 Web 列。
   系统层（浏览器设备选择器 / 下载条）= assets/web.css 头注豁免。
   ============================================================ */
'use strict';
const SCR = window.SCR = {};
let WSYS_PICK = null;

/* ---------- 状态 ---------- */
const S = window.S = { cur:'home', stack:[], pages:{} };
let TIMERS = [];
function later(ms, fn){ TIMERS.push(setTimeout(fn, ms)); }
function clearTimers(){ TIMERS.forEach(clearTimeout); TIMERS = []; }

/* ---------- 工具（同基准） ---------- */
const $host = () => document.getElementById('pagehost');
function nowT(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; }
function addLog(scope, type, msg){ const p=S.pages[scope]; p.logs.unshift({time:nowT(),type,msg}); if(p.logs.length>40)p.logs.pop(); }
function toast(msg, ok=false){
  const t=document.createElement('div'); t.className='toast';
  t.innerHTML=(ok?'<span class="ok-i">'+C.ic('check','xs')+'</span>':'')+`<span>${msg}</span>`;
  document.getElementById('toasts').appendChild(t); setTimeout(()=>t.remove(),2200);
}
let LAYER_CB = {onConfirm:null,onCancel:null};
function closeLayer(){ document.getElementById('layer').innerHTML=''; LAYER_CB={onConfirm:null,onCancel:null}; WSYS_PICK=null; }
function modal({title,content,confirmText='确定',cancelText='取消',hideCancel=false,onConfirm=null,onCancel=null}){
  LAYER_CB={onConfirm,onCancel};
  document.getElementById('layer').innerHTML=`<div class="mask" data-act="modal-mask">
    <div class="modal"><div class="t">${title}</div><div class="c">${content}</div>
    <div class="btns">${hideCancel?'':C.btn({label:cancelText,tone:'soft',act:'modal-cancel'})}
    ${C.btn({label:confirmText,tone:'primary',act:'modal-ok'})}</div></div></div>`;
}
function sheet(title, bodyHTML){
  document.getElementById('layer').innerHTML=`<div class="mask sheetm" data-act="sheet-close">
    <div class="sheet"><div class="grip"></div><div class="sh-h"><span class="t">${title}</span>
    <button class="back-btn" data-act="sheet-close" style="background:var(--c-fill)">${C.ic('x','sm')}</button></div>
    <div class="sh-b">${bodyHTML}</div></div></div>`;
}

/* ---------- 路由（无 tabBar，栈根 = home） ---------- */
function go(id){ clearTimers(); closeLayer(); if(S.cur!==id) S.stack.push(S.cur); S.cur=id; renderAll(); }
function back(){ clearTimers(); closeLayer(); S.cur = S.stack.length? S.stack.pop() : 'home'; renderAll(); }

/* ---------- 渲染 ---------- */
function renderAll(){
  const sc = SCR[S.cur]; if(!sc) return;
  $host().innerHTML = `<div data-pg="${S.cur}">${sc.render(S.pages[S.cur])}</div>`;
  $host().scrollTop = 0;
  renderReview();
}

/* ---------- 评审桌面 ---------- */
function renderReview(){
  const order=['home','pick','gatt','bcast','prov','about'];
  const scen=(SCEN[S.cur]||[]).map((x,i)=>`<button class="sc-btn" data-act="scen" data-i="${i}">${x.label}</button>`).join('')||'<div style="color:#7C8DA6;font-size:11px;padding:4px 2px">本屏无场景</div>';
  const sc=SCR[S.cur];
  document.getElementById('review').innerHTML=`
    <h1>平台扩展原型 · Web（子集）</h1>
    <div class="sub">D3=开发暂缓（b）· 差异原型 2026-09-03 补齐先行<br>
    形态=「已配对设备 GATT 调试器」子集 · 产品全集 = ../../../../v1-new/<br>
    引用 = 10_platform §2.3/§3/§4 · SOP §10/§11</div>
    <h2>页面（Web 子集）</h2>
    ${order.map(id=>`<button class="pg-btn ${S.cur===id?'on':''}" data-act="jump" data-id="${id}">
      <span>${SCR[id].title}</span><span class="pid">${SCR[id].num}</span></button>`).join('')}
    <h2>场景（当前屏 · 幂等）</h2>${scen}
    <h2>当前引用（SOP §10 三引用）</h2>
    <div class="stackview">屏 ${sc.num} · ${sc.title}<br>① 基准：${sc.ref.base}<br>② 能力/限制：${sc.ref.cap}<br>③ 差异设计行：${sc.ref.diff}</div>
    <div class="note">三查表与候选增强见本目录 README.md · 候选默认不做 · D1 开发首批（微信+App·Android）不变。</div>`;
}

/* ---------- 输入桥 / 动作桥（同基准） ---------- */
document.addEventListener('input', e=>{
  const el=e.target, key=el.dataset.in; if(!key) return;
  const sc=SCR[S.cur]; if(sc&&sc.inputs&&sc.inputs[key]){ sc.inputs[key](S.pages[S.cur], el.value, el); renderAll(); }
});
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]');
  if(!el || el.disabled) return;
  const fn=ACTIONS[el.dataset.act];
  if(fn){ e.preventDefault(); fn(el); }
});

/* ============================================================
   浏览器系统层构建器（平台还原图层 · web.css）
   ============================================================ */
const DEVS = [['Smart HID 主机','SHID-9F3E2A1C · 匹配名称前缀',true],
              ['SmartBLE-A','00:1A:7D:DA:71:13 · 匹配名称前缀',false],
              ['未命名 BLE 设备','C8:3E:99:AF:20:17 · 匹配服务 UUID',false]];

/* 设备卡（结构对齐基准 C1 devCard · 2026-09-03 用户修正：特殊设备是标准设备的扩展——
   SHID 卡保留标准「GATT 工作台」入口，叠加 profile「配网」入口，RSSI 缺失显式标注） */
function webDevCard(p){
  const [name,idRaw,shid]=p, id=idRaw.split(' · ')[0];
  const matchChip = shid ? C.chip('Smart HID · 强匹配','primary') : '';
  return `<div class="dev">
    <div class="top"><div class="ava ${shid?'shid':''}">${((name||id).trim()[0]||'?').toUpperCase()}</div>
      <div class="mid"><div class="nm">${name||'未命名 BLE 设备'} ${matchChip}</div>
      <div class="id mono">${id}</div>
      <div class="meta"><span class="dbm">RSSI —</span></div></div></div>
    <div class="acts">
      ${C.btn({label:'进入 GATT 工作台',tone:'primary',size:'sm',icon:'link',act:'pick-gatt'})}
      ${shid?C.btn({label:'Smart HID 配网',tone:'soft',size:'sm',icon:'hid',act:'jump-prov'}):''}
    </div></div>`;
}
function wsysChooser(filterLabel, onPick){
  document.getElementById('layer').innerHTML=`<div class="wsys-scrim">
    <div class="wsys-dlg">
      <div class="wsys-t">选择蓝牙设备</div>
      <div class="wsys-d">Web Bluetooth · requestDevice（浏览器渲染，页面不可定制样式）<br>过滤条件：${filterLabel} · 选择一台即获得 GATT 连接授权</div>
      ${DEVS.map((d,i)=>`<button class="wsys-dev" data-act="wsys-pick" data-v="${i}">
        <span class="ico">${C.ic('bt')}</span><span><span class="nm">${d[0]}</span><div class="id">${d[1]}</div></span></button>`).join('')}
      <button class="wsys-cancel" data-act="wsys-pick" data-v="cancel">取消</button>
    </div></div>`;
  WSYS_PICK=v=>onPick(v);
}
function wsysDownload(){
  document.getElementById('layer').innerHTML=`<div class="wsys-dlbar">
    <span class="ico">${C.ic('doc')}</span>
    <div><div class="t">ble-toolkit-log-20260903.txt</div><div class="d">日志已下载（演示 · 浏览器下载条）</div></div>
    <button class="wsys-x" data-act="wsys-close">${C.ic('x','sm')}</button></div>`;
}

/* ---------- 域可用性（10_platform §3 矩阵 Web 列） ---------- */
const st = (cls,label)=>`<span class="stword st-${cls}">${label}</span>`;
function domRows(s){
  const ok = s.secure && (s.browser==='chrome'||s.browser==='edge');
  if(!ok) return [
    ['安全上下文 / 浏览器', st('UNSUPPORTED','环境不满足')],
    ['S1a 连续扫描发现', st('UNSUPPORTED','仅选择器')],
    ['S1b GATT 读写监听日志', st('UNSUPPORTED','环境不满足')],
    ['S4 广播发射', st('UNSUPPORTED','无稳定 API')],
    ['S2/S3 配网+诊断', st('UNSUPPORTED','依赖扫描发现')],
    ['S5 OTA / S6 多会话', st('UNSUPPORTED','环境不满足')],
  ];
  return [
    ['S1a 连续扫描发现', st('UNSUPPORTED','仅选择器')],
    ['S1b GATT 读写监听日志', st('VERIFIED','✅ 可用')],
    ['S4 广播发射', st('UNSUPPORTED','无稳定 API')],
    ['S2/S3 配网+诊断', st('UNSUPPORTED','依赖扫描发现')],
    ['S5 OTA（BLOCKED 状态不变）', st('BLOCKED','同基准 P-03')],
    ['S6 多设备会话', st('PREVIEW','单连接为主 · 待验证')],
  ];
}
const BROWSERS={
  chrome:{n:'Chrome（桌面）',cls:'VERIFIED',d:'Web Bluetooth 支持完整（选择器 + GATT）'},
  edge:{n:'Edge（桌面）',cls:'VERIFIED',d:'同 Chromium 内核，支持完整'},
  firefox:{n:'Firefox',cls:'UNSUPPORTED',d:'不支持 Web Bluetooth（navigator.bluetooth 缺失）'},
  safari:{n:'Safari（桌面）',cls:'PREVIEW',d:'支持有限【待验证：开发期核实】'},
  ios:{n:'iOS 全系浏览器',cls:'UNSUPPORTED',d:'iOS 平台限制，全系不支持（含 Safari/Chrome）'},
};

/* ---------- GATT 演示服务树（演示值；基准服务树见 v1-new P006） ---------- */
const GTREE=[
  ['FFF0','HID 配置服务（演示）',[['FFF1','写'],['FFF2','通知'],['FFF3','读']]],
  ['180F','电量服务（演示）',[['2A19','读']]],
  ['180A','设备信息（演示）',[['2A29','读'],['2A26','读']]],
];

/* ============================================================
   页面注册（每屏携带 SOP §10 三引用）
   ============================================================ */

/* ---- W1 首页 · 能力门禁 ---- */
SCR.home = { num:'W1', title:'首页 · 能力门禁', defaults:()=>({secure:true, browser:'chrome', avail:true}),
ref:{base:'v1-new PAGE001 首页（Web 形态替代）',cap:'10_platform §2.3 限制（HTTPS/兼容分化）',diff:'§4 权限模型 Web 列（chooser+HTTPS）'},
render(s){
  const B=BROWSERS[s.browser];
  return `<div class="navbar"><div class="kicker">WEB · SUBSET</div>
    <div class="row"><div class="title">BLE Toolkit+ · Web</div>${C.chip('GATT 调试器子集','primary')}</div></div>
    <div class="page">
      <div class="refbar">${C.chip('① 基准：PAGE001 形态替代','primary')}${C.chip('② 限制：HTTPS+兼容分化','neutral')}${C.chip('③ 差异：chooser 即授权','neutral')}</div>
      ${s.secure?'':C.ebanner({code:'insecure_context',message:'当前为 HTTP 不安全上下文：Web Bluetooth 仅在安全上下文（HTTPS / localhost）可用。请通过 HTTPS 访问。',retry:'home-secure'})}
      ${C.note('info','<b>子集形态</b>（D3=暂缓 · 原型先行）：S1 扫描与 S4 广播两条核心旅程在浏览器断裂，本实例只承载「已知设备的 GATT 调试器」；缺失域显式标注并指引发小程序/App（10_platform §7 检查 1）。')}
      <div class="card" style="margin-top:12px">
        <div class="card-t">${C.ic('lock')} 环境门禁</div>
        <div class="kv"><span class="k">安全上下文</span><span class="v mono">${s.secure?'https ✓（见地址栏）':'http ✗ 不安全'}</span></div>
        <div class="kv"><span class="k">浏览器</span><span class="v">${B.n} ${st(B.cls,({VERIFIED:'✅',UNSUPPORTED:'✗',PREVIEW:'△ 待验证'})[B.cls])}</span></div>
        <div class="kv"><span class="k">navigator.bluetooth</span><span class="v">${s.avail&&B.cls!=='UNSUPPORTED'?'可用（getAvailability=true · 演示）':'不可用'}</span></div>
        <div class="kv"><span class="k">说明</span><span class="v">${B.d}</span></div>
        <div style="margin-top:10px;display:flex;gap:9px">
          ${C.btn({label:'切换演示环境',tone:'soft',icon:'set',act:'home-env'})}
          ${C.btn({label:'重新检测',tone:'soft',icon:'refresh',act:'home-check'})}
        </div>
      </div>
      <div class="card">
        <div class="card-t">${C.ic('chip')} 域可用性（10_platform §3 · Web 列）</div>
        ${domRows(s).map(([k,v])=>`<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}
      </div>
      <div class="card">
        <div class="card-t">${C.ic('ext')} 入口</div>
        <div class="difrow" data-act="jump" data-id="pick"><div style="flex:1"><div class="t">选择设备（requestDevice）</div>
          <div class="d">过滤条件 → 系统选择器单选 → 选择即授权</div></div><span class="arr">${C.ic('chev-r','sm')}</span></div>
        <div class="difrow" data-act="jump" data-id="gatt"><div style="flex:1"><div class="t">GATT 工作台</div>
          <div class="d">读写 / 监听 / 日志 / OTA（BLOCKED 同基准）</div></div><span class="arr">${C.ic('chev-r','sm')}</span></div>
        <div class="difrow" data-act="jump" data-id="bcast"><div style="flex:1"><div class="t">广播发射 ${st('UNSUPPORTED','✗')}</div>
          <div class="d">不支持指引（去小程序/App）</div></div><span class="arr">${C.ic('chev-r','sm')}</span></div>
        <div class="difrow" data-act="jump" data-id="prov"><div style="flex:1"><div class="t">Smart HID 配网 ${st('UNSUPPORTED','✗')}</div>
          <div class="d">不可达指引（依赖扫描发现）</div></div><span class="arr">${C.ic('chev-r','sm')}</span></div>
        <div class="difrow" data-act="jump" data-id="about"><div style="flex:1"><div class="t">关于与导出</div>
          <div class="d">版本投影回退 / 复制 URL / 日志下载</div></div><span class="arr">${C.ic('chev-r','sm')}</span></div>
      </div>
      <div class="foot">D3=暂缓（b）· 原型先行 2026-09-03<br>三查表见本目录 README.md</div>
    </div>`;
} };

/* ---- W2 选择设备（requestDevice 选择器） ---- */
SCR.pick = { num:'W2', title:'选择设备', defaults:()=>({phase:'idle', filter:'name', picked:null, logs:[]}),
ref:{base:'v1-new PAGE001 连续扫描列表（Web 不可实现）',cap:'10_platform §2.3：仅 requestDevice 选择器',diff:'§4 设备发现交互 Web 列'},
render(s){
  const fw = {name:'按名称前缀（SmartBLE-）',uuid:'按服务 UUID（0xFFE0）'}[s.filter];
  return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button>
    <div class="t">选择设备</div>${C.chip('基准 P001 替代','neutral')}</div>
    <div class="page">
      <div class="refbar">${C.chip('① 基准：P001 扫描列表不可实现','primary')}${C.chip('② 限制：选择器模式','neutral')}${C.chip('③ 差异：过滤→单选','neutral')}</div>
      ${C.note('info','Web Bluetooth 只有 <b>requestDevice 选择器</b>模式：过滤条件 → 浏览器弹窗单选一台 → 选择即授权。基准 P001 的「连续扫描 + RSSI 筛选 + 列表」整域不可实现（watchAdvertisements 为实验性 API【待验证】）。已选设备按基准 C1 设备卡呈现：<b>特殊设备（Smart HID）是标准设备的扩展</b>——保留标准 GATT 入口，叠加配网入口（配网域 Web 可用性见 W5 指引）。')}
      <div class="card" style="margin-top:12px">
        <div class="card-t">${C.ic('scan')} 过滤与发起</div>
        <div class="field"><label>过滤条件（requestDevice filters）</label>
          <div class="picker" data-act="pick-filter">${fw}<span class="arr">${C.ic('chev-d','sm')}</span></div></div>
        <div style="display:flex;gap:9px;margin-top:12px">
          ${C.btn({label:s.picked?'重新选择设备':'打开系统选择器',tone:'primary',icon:'scan',act:'pick-open'})}
        </div>
      </div>
      ${s.picked?`<div class="card">
        <div class="card-t">${C.ic('chip')} 已选中设备（单台 · 卡片口径同基准 C1）</div>
        ${webDevCard(s.picked)}
        <div class="kv" style="margin-top:6px"><span class="k">授权</span><span class="v">chooser 选择即授权（无运行时权限弹窗）</span></div>
        <div class="kv"><span class="k">RSSI</span><span class="v">—（选择器不提供；watchAdvertisements 实验性【待验证】）</span></div>
      </div>`:''}
      ${C.logPanel(s.logs,{variant:'cardv',emptyText:'暂无日志 · 选择过程记录在此',scope:'pick'})}
    </div>`;
} };

/* ---- W3 GATT 工作台 ---- */
SCR.gatt = { num:'W3', title:'GATT 工作台', defaults:()=>({dev:null, notifyOn:false, hidden:false, logs:[]}),
ref:{base:'v1-new PAGE006 GATT 调试（S1b 域 ✅ 迁移）',cap:'10_platform §2.3：read/write/startNotifications 完整',diff:'§4 生命周期 Web 列（页签可见性守则）'},
render(s){
  if(!s.dev){
    return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button>
      <div class="t">GATT 工作台</div>${C.chip('基准 P006','neutral')}</div>
      <div class="page">${C.empty({ill:'radar',title:'尚未选择设备',desc:'Web 经 requestDevice 选择器获得单台设备后进入（连接与授权一次完成）。',
        act:{label:'去选择设备',icon:'scan',act:'jump-gopick'}})}</div>`;
  }
  return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button>
    <div class="t">GATT 工作台</div>${C.chip('基准 P006','neutral')}</div>
    <div class="page">
      <div class="refbar">${C.chip('① 基准：P006 读写监听日志','primary')}${C.chip('② 能力：GATT 域可用','neutral')}${C.chip('③ 差异：页签可见性守则','neutral')}</div>
      ${s.hidden?C.note('warn','<b>页签不可见</b>（visibilitychange=hidden · 演示）：连接保持，恢复可见后继续接收 notify。守则：不可见时暂停 UI 渲染，不静默断开（10_platform §4 生命周期 Web 列）。'):''}
      <div class="card" style="margin-top:12px">
        <div class="card-t">${C.ic('link')} 会话</div>
        <div class="kv"><span class="k">设备</span><span class="v">${s.dev[0]} <span class="mono" style="font-size:var(--fs-micro)">${s.dev[1].split(' · ')[0]}</span></span></div>
        <div class="kv"><span class="k">上下文</span><span class="v mono">https ✓ · chooser 授权</span></div>
        <div class="kv"><span class="k">多连接</span><span class="v">单连接为主【多连接待验证】（10_platform §3 S6）</span></div>
      </div>
      <div class="card">
        <div class="card-t">${C.ic('chip')} 服务与特征（演示树 · 基准见 v1-new P006）</div>
        ${GTREE.map(([u,n,chs])=>`<div style="padding:8px 0;border-bottom:1px solid var(--c-line-soft)">
          <div class="mono" style="font-size:var(--fs-cap);font-weight:var(--fw-med)">${u} · ${n}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">${chs.map(([cu,p])=>C.chip(`${cu} ${p}`,'neutral')).join('')}</div></div>`).join('')}
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:14px">
          ${C.btn({label:'读取 FFF3',tone:'soft',icon:'eye',act:'gatt-read'})}
          ${C.btn({label:'写入 FFF1',tone:'primary',icon:'send',act:'gatt-write'})}
          ${C.btn({label:s.notifyOn?'停止监听 FFF2':'监听 FFF2',tone:s.notifyOn?'danger':'soft',icon:'pulse',act:'gatt-notify'})}
          ${C.btn({label:s.hidden?'恢复页签可见':'模拟页签失焦',tone:'ghost',icon:'eye-off',act:s.hidden?'gatt-show':'gatt-hide'})}
          ${C.btn({label:'固件更新（BLOCKED）',tone:'ghost',icon:'doc',act:'gatt-ota'})}
        </div>
      </div>
      ${C.logPanel(s.logs,{variant:'cardv',emptyText:'暂无日志 · 读写监听记录在此（F008–F011 子集）',scope:'gatt'})}
    </div>`;
} };

/* ---- W4 广播 · 不支持指引 ---- */
SCR.bcast = { num:'W4', title:'广播（不支持）', defaults:()=>({}),
ref:{base:'v1-new PAGE008 广播（U-03 Web 分支口径）',cap:'10_platform §2.3：LE Advertising 无稳定 API',diff:'§3 S4 行 Web 列 ✗'},
render(){
  return `<div class="navbar"><div class="kicker">PERIPHERAL</div>
    <div class="row"><div class="title">广播发射</div>${C.chip('平台：Web','neutral')}</div></div>
    <div class="page">
      <div class="refbar">${C.chip('① 基准：P008 U-03 口径','primary')}${C.chip('② 限制：无外围 API','neutral')}${C.chip('③ 差异：✗ + 指引','neutral')}</div>
      <div class="card" style="margin-top:12px">
        ${C.empty({ill:'cast',title:'当前平台不支持 BLE 广播',desc:'浏览器未提供外围模式 API（LE Advertising 无稳定 API【实验性，2026 状态待验证】——10_platform §2.3）。'})}
        <div style="display:flex;gap:9px;margin-top:4px">
          ${C.btn({label:'广播验证请使用小程序 / App',tone:'primary',icon:'ext',act:'bcast-guide'})}
        </div>
      </div>
      <div class="card">
        <div class="card-t">${C.ic('info')} 平台对比（10_platform §3 S4 行 · 实证口径）</div>
        <div class="kv"><span class="k">微信小程序</span><span class="v">△ 能力有限（wx.createBLEPeripheralServer · 功率三档映射）</span></div>
        <div class="kv"><span class="k">App·Android</span><span class="v">✅ 原生插件（LysBlePeripheral）</span></div>
        <div class="kv"><span class="k">Web</span><span class="v">✗ 无稳定 API【实验性，待验证】</span></div>
        <div class="kv"><span class="k">Desktop</span><span class="v">△～✅ 取决于原生层【待 spike】</span></div>
      </div>
      <div class="card">
        <div class="card-t">${C.ic('doc')} 生态矩阵对照（11_ecosystem v1.0 · 第二口径）</div>
        <div class="kv"><span class="k">微信小程序</span><span class="v">❌（矩阵）vs △（实证 F014）· 冲突 C1 待裁决</span></div>
        <div class="kv"><span class="k">App·Android</span><span class="v">✅</span></div>
        <div class="kv"><span class="k">Windows</span><span class="v">⚠️ WinRT 外围</span></div>
        <div class="kv"><span class="k">macOS</span><span class="v">❌【待验证 C2：CoreBluetooth 外围公开存在】</span></div>
        <div class="kv"><span class="k">Linux</span><span class="v">⚠️ BlueZ / 内核权限【待验证】</span></div>
        <div class="kv"><span class="k">Web</span><span class="v">矩阵未收录（C5）——以 10_platform §3 + W1 实测门禁为准</span></div>
      </div>
    </div>`;
} };

/* ---- W5 配网 · 不可达指引 ---- */
SCR.prov = { num:'W5', title:'配网（不可达）', defaults:()=>({}),
ref:{base:'v1-new PAGE002 配网向导（S2 起点为扫描发现）',cap:'10_platform §3：S2/S3 依赖扫描发现 → ✗',diff:'§3 S2/S3 行 Web 列'},
render(){
  return `<div class="navbar"><div class="kicker">PROFILE</div>
    <div class="row"><div class="title">Smart HID 配网</div>${C.chip('平台：Web','neutral')}</div></div>
    <div class="page">
      <div class="refbar">${C.chip('① 基准：P002 向导起点=扫描发现','primary')}${C.chip('② 限制：S2 依赖扫描','neutral')}${C.chip('③ 差异：✗ + 指引','neutral')}</div>
      <div class="card" style="margin-top:12px">
        ${C.empty({ill:'link',title:'配网链路在 Web 不可达',desc:'S2/S3 旅程以「扫描发现 Smart HID 设备」为起点（10_platform §3：依赖扫描发现 → ✗）。浏览器选择器虽可选单台，但配网全链路（扫码配对码 → 分帧明文写 → 状态跟踪 → 诊断）以微信小程序 / App 为准。'})}
        <div style="display:flex;gap:9px;margin-top:4px">
          ${C.btn({label:'配网请使用小程序 / App',tone:'primary',icon:'ext',act:'prov-guide'})}
        </div>
      </div>
      ${C.note('warn','watchAdvertisements（连续广播监听）为实验性 API【待验证】——即便未来可用，配网域纳入仍需回写 10_platform §4 并补三查（L3 圈外差异流程）。')}
    </div>`;
} };

/* ---- W6 关于与导出 ---- */
SCR.about = { num:'W6', title:'关于与导出', defaults:()=>({copied:false}),
ref:{base:'v1-new PAGE009 关于 / P006 日志导出',cap:'10_platform §4：分享=复制 URL · 日志=剪贴板/下载',diff:'§4 分享 / 日志导出 Web 列'},
render(s){
  return `<div class="navbar"><div class="kicker">ABOUT</div>
    <div class="row"><div class="title">关于与导出</div>${C.chip('基准 P009','neutral')}</div></div>
    <div class="page">
      <div class="refbar">${C.chip('① 基准：P009 分享 / P006 日志','primary')}${C.chip('② 差异：复制 URL + 下载','neutral')}${C.chip('③ 增强候选未决策','neutral')}</div>
      <div class="card" style="margin-top:12px">
        <div class="card-t">${C.ic('info')} 版本</div>
        <div class="kv"><span class="k">产品</span><span class="v">BLE Toolkit+ 1.0.5（PREVIEW）</span></div>
        <div class="kv"><span class="k">形态</span><span class="v">Web 子集实例（GATT 调试器）</span></div>
        <div class="kv"><span class="k">版本投影（F027）</span><span class="v">小程序 release-metadata 通道不可用 → 回退构建内置（对标基准 P009 verFallback 场景）</span></div>
      </div>
      <div class="card">
        <div class="card-t">${C.ic('share')} 出口（F029 / F011）</div>
        <div class="menu-row" data-act="web-copyurl"><span style="color:var(--c-primary);display:flex">${C.ic('copy')}</span>
          <span class="t">复制页面 URL <span style="font-size:var(--fs-mini);color:var(--c-mut)">分享 = 复制 URL（无社交面板）</span></span><span class="arr">${C.ic('chev-r','sm')}</span></div>
        <div class="menu-row" data-act="web-dllog"><span style="color:var(--c-primary);display:flex">${C.ic('dl')}</span>
          <span class="t">下载日志文件 <span style="font-size:var(--fs-mini);color:var(--c-mut)">F011 · 剪贴板/下载（演示）</span></span><span class="arr">${C.ic('chev-r','sm')}</span></div>
        <div class="menu-row" data-act="web-copylog"><span style="color:var(--c-primary);display:flex">${C.ic('log')}</span>
          <span class="t">复制日志文本 <span style="font-size:var(--fs-mini);color:var(--c-mut)">F011 · 剪贴板（同基准）</span></span><span class="arr">${C.ic('chev-r','sm')}</span></div>
      </div>
      <div class="card">
        <div class="card-t">${C.ic('warn')} 候选增强（未决策 · 默认不做）</div>
        <div class="kv"><span class="k">URL 参数预填配网信息</span><span class="v dim">候选（10_platform §2.3）· 需先回写 §4 并补三查</span></div>
        <div style="margin-top:10px">${C.btn({label:'试一下（将拦截）',tone:'ghost',icon:'ext',act:'web-prefill'})}</div>
      </div>
      <div class="card">
        <div class="card-t">${C.ic('info')} 分享对比（同口径）</div>
        <div class="kv"><span class="k">微信</span><span class="v">社交卡片 / 右上角菜单</span></div>
        <div class="kv"><span class="k">App·Android</span><span class="v">系统分享面板</span></div>
        <div class="kv"><span class="k">Web</span><span class="v">复制 URL（本页出口）</span></div>
      </div>
    </div>`;
} };

/* ============================================================
   ACTIONS（唯一变更入口）
   ============================================================ */
const ACTIONS = {
  jump: el=>go(el.dataset.id),
  'jump-gopick': ()=>go('pick'),
  'jump-prov': ()=>go('prov'),
  back: ()=>back(),
  'modal-ok': ()=>{ const cb=LAYER_CB.onConfirm; closeLayer(); cb&&cb(); },
  'modal-cancel': ()=>{ const cb=LAYER_CB.onCancel; closeLayer(); cb&&cb(); },
  'sheet-close': ()=>closeLayer(),
  scen: el=>{ clearTimers(); closeLayer(); (SCEN[S.cur]||[])[+el.dataset.i].apply(); renderAll(); },
  'wsys-pick': el=>{ const v=el.dataset.v; const f=WSYS_PICK; WSYS_PICK=null; f&&f(v); },
  'wsys-close': ()=>closeLayer(),

  /* W1 */
  'home-env': ()=>sheet('切换演示环境（浏览器 / 上下文）', [
    ['secure','HTTPS 安全上下文（默认）'],['insecure','HTTP 不安全上下文'],
  ].map(([v,t])=>`<button class="opt-row ${S.pages.home.secure===(v==='secure')?'on':''}" data-act="home-setenv" data-e="${v}"><span class="t">${t}</span><span class="ck">${C.ic('check','sm')}</span></button>`).join('')
    + '<div style="height:8px"></div>'
    + Object.keys(BROWSERS).map(k=>`<button class="opt-row ${S.pages.home.browser===k?'on':''}" data-act="home-setbrowser" data-b="${k}"><span class="t">${BROWSERS[k].n}</span><span class="ck">${C.ic('check','sm')}</span></button>`).join('')),
  'home-setenv': el=>{ const s=S.pages.home; s.secure = el.dataset.e==='secure';
    const bar=document.querySelector('.wbr-url'); if(bar){ bar.classList.toggle('bad',!s.secure); bar.lastChild.textContent = s.secure?'https://ble.smartble.example.com':'http://ble.smartble.example.com'; }
    closeLayer(); renderAll(); },
  'home-setbrowser': el=>{ S.pages.home.browser=el.dataset.b; closeLayer(); renderAll(); },
  'home-check': ()=>{ const s=S.pages.home; const B=BROWSERS[s.browser];
    toast(s.secure&&B.cls!=='UNSUPPORTED'?'navigator.bluetooth.getAvailability() → true（演示）':B.cls==='UNSUPPORTED'?`${B.n}：Web Bluetooth 不可用`:'不安全上下文：API 不可用', s.secure&&B.cls!=='UNSUPPORTED'); },
  'home-secure': ()=>{ const s=S.pages.home; s.secure=true;
    const bar=document.querySelector('.wbr-url'); if(bar){ bar.classList.remove('bad'); bar.lastChild.textContent='https://ble.smartble.example.com'; }
    renderAll(); },

  /* W2 */
  'pick-filter': ()=>sheet('过滤条件（requestDevice filters）', [
    ['name','按名称前缀（SmartBLE-）'],['uuid','按服务 UUID（0xFFE0）'],
  ].map(([v,t])=>`<button class="opt-row ${S.pages.pick.filter===v?'on':''}" data-act="pick-setfilter" data-f="${v}"><span class="t">${t}</span><span class="ck">${C.ic('check','sm')}</span></button>`).join('')),
  'pick-setfilter': el=>{ S.pages.pick.filter=el.dataset.f; closeLayer(); renderAll(); },
  'pick-open': ()=>{ const s=S.pages.pick; s.phase='picking'; renderAll();
    wsysChooser(s.filter==='name'?'名称前缀 SmartBLE-':'服务 UUID 0xFFE0', v=>{
      if(v==='cancel'){ s.phase='idle'; closeLayer(); toast('已取消选择（用户主动 · 非错误）'); renderAll(); return; }
      s.phase='picked'; s.picked=DEVS[+v]; closeLayer();
      addLog('pick','ok','requestDevice 选择成功 · 已获得 GATT 授权'); renderAll(); }); },
  'pick-gatt': ()=>{ const s=S.pages.pick; S.pages.gatt.dev=s.picked;
    addLog('gatt','sys',`已连接 ${s.picked[0]} · chooser 授权`); go('gatt'); },
  'pick-logclear': ()=>{ S.pages.pick.logs=[]; renderAll(); },
  'pick-logexport': ()=>toast('日志导出见「关于与导出」（复制 / 下载）'),

  /* W3 */
  'gatt-read': ()=>{ addLog('gatt','read','FFF3 → 0x76 31 2E 30 2E 35（"v1.0.5" · 演示值）'); renderAll(); },
  'gatt-write': ()=>{ addLog('gatt','write','FFF1 ← 01 A2（演示帧）'); toast('写入成功',true); renderAll(); },
  'gatt-notify': ()=>{ const s=S.pages.gatt; s.notifyOn=!s.notifyOn;
    addLog('gatt','sys',s.notifyOn?'开始监听 FFF2 · startNotifications':'停止监听 FFF2');
    if(s.notifyOn){ addLog('gatt','recv','HEX: 53 48 49 44 2D 30 31\nTEXT: SHID-01'); }
    renderAll(); },
  'gatt-hide': ()=>{ const s=S.pages.gatt; s.hidden=true; addLog('gatt','sys','visibilitychange → hidden · 连接保持'); renderAll(); },
  'gatt-show': ()=>{ const s=S.pages.gatt; s.hidden=false; addLog('gatt','sys','visibilitychange → visible · 继续接收'); renderAll(); },
  'gatt-ota': ()=>modal({title:'固件更新',content:'<b>端到端链路 BLOCKED</b>：固件侧暂未开放升级通道，本流程为演示（同基准 P-03）。Web 端 GATT 事务本身可用（10_platform §3 S5：✅，BLOCKED 状态不变）。',confirmText:'知道了',hideCancel:true}),
  'gatt-logclear': ()=>{ S.pages.gatt.logs=[]; renderAll(); },
  'gatt-logexport': ()=>modal({title:'导出日志（Web）',content:'复制到剪贴板，或下载为 .txt 文件（10_platform §4 日志导出 Web 列：剪贴板/下载）。',confirmText:'复制到剪贴板',cancelText:'下载 .txt',
    onConfirm:()=>toast('日志文本已复制（navigator.clipboard · 演示）',true),
    onCancel:()=>{ closeLayer(); wsysDownload(); }}),

  /* W4 / W5 */
  'bcast-guide': ()=>toast('请使用微信小程序或 App 进行广播验证（指引 · 演示）'),
  'prov-guide': ()=>toast('请使用微信小程序或 App 完成配网（指引 · 演示）'),

  /* W6 */
  'web-copyurl': ()=>{ S.pages.about.copied=true; toast('页面 URL 已复制（navigator.clipboard · 演示）',true); renderAll(); },
  'web-dllog': ()=>wsysDownload(),
  'web-copylog': ()=>toast('日志文本已复制（同基准 F011 剪贴板 · 演示）',true),
  'web-prefill': ()=>toast('候选能力：URL 参数预填未决策，暂不提供（10_platform §2.3）'),

};

/* ---------- 场景库（幂等复位） ---------- */
function scenReset(id){ clearTimers(); closeLayer(); S.pages[id]=SCR[id].defaults(); }
function scen(id,label,fn){ (SCEN[id]=SCEN[id]||[]).push({label,apply(){ scenReset(id); fn&&fn(); }}); }
const SCEN = window.SCEN = {};

scen('home','HTTPS · Chrome（默认）');
scen('home','HTTP 不安全上下文',()=>{ S.pages.home.secure=false; });
scen('home','Firefox（不支持 Web Bluetooth）',()=>{ S.pages.home.browser='firefox'; });

scen('pick','未选择（默认）');
scen('pick','选择器弹窗中',()=>{ S.pages.pick.phase='picking'; later(60,()=>wsysChooser('名称前缀 SmartBLE-',()=>{})); });
scen('pick','已选中单台（SHID · 标准+扩展双入口）',()=>{ const s=S.pages.pick; s.phase='picked'; s.picked=DEVS[0];
  addLog('pick','ok','requestDevice 选择成功 · 已获得 GATT 授权'); });
scen('pick','已选中单台（标准设备）',()=>{ const s=S.pages.pick; s.phase='picked'; s.picked=DEVS[1];
  addLog('pick','ok','requestDevice 选择成功 · 已获得 GATT 授权'); });

scen('gatt','未选设备（默认）');
scen('gatt','已连接 · 监听中',()=>{ const s=S.pages.gatt; s.dev=DEVS[0]; s.notifyOn=true;
  addLog('gatt','sys','已连接 Smart HID 主机 · chooser 授权');
  addLog('gatt','recv','HEX: 53 48 49 44 2D 30 31\nTEXT: SHID-01'); });
scen('gatt','页签不可见（演示）',()=>{ const s=S.pages.gatt; s.dev=DEVS[0]; s.hidden=true;
  addLog('gatt','sys','visibilitychange → hidden · 连接保持'); });

scen('bcast','默认（不支持指引）');
scen('prov','默认（不可达指引）');
scen('about','默认');
scen('about','已复制 URL',()=>{ S.pages.about.copied=true; });

/* ---------- 启动 ---------- */
Object.keys(SCR).forEach(id=>{ S.pages[id]=SCR[id].defaults(); });
renderAll();
window.WEBP={S,ACTIONS,go,back,toast,modal,sheet};
