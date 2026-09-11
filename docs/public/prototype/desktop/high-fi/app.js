/* ============================================================
   app.js —— 内核：S 单一状态源 → RENDER → ACTIONS 单向数据流
   路由语义对齐 uni-app：switchTab / navigateTo / redirectTo / 栈感知
   场景库幂等（QA Q1）：apply 前先复位页面运行态与相关 MOCK
   ============================================================ */
'use strict';
const PAGES = window.PAGES = window.PAGES || {};
const TABS = ['p001','p007','p008','p009'];
const ORIGIN_CONN = JSON.parse(JSON.stringify(MOCK.connected));   /* Q1：断开场景的复位基准 */

/* ---------- 状态 ---------- */
const S = window.S = {
  cur:'p001', stack:[],
  pages:{}, shared:{ currentDevice:null, provFailCode:null, diagFail:null, p007fail:false },
};

/* ---------- 定时器（页面/场景切换即清，防残留渲染） ---------- */
let TIMERS = [];
function later(ms, fn){ TIMERS.push(setTimeout(fn, ms)); }
function clearTimers(){ TIMERS.forEach(clearTimeout); TIMERS = []; }

/* ---------- 工具 ---------- */
const $host = () => document.getElementById('pagehost');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function nowT(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; }
function addLog(scope, type, msg){ const p=S.pages[scope]; p.logs.unshift({time:nowT(),type,msg}); if(p.logs.length>60)p.logs.pop(); }
function toast(msg, ok=false){
  const t=document.createElement('div'); t.className='toast';
  t.innerHTML=(ok?'<span class="ok-i">'+C.ic('check','xs')+'</span>':'')+`<span>${msg}</span>`;
  document.getElementById('toasts').appendChild(t); setTimeout(()=>t.remove(),2200);
}
let LAYER_CB = {onConfirm:null,onCancel:null};
function closeLayer(){ document.getElementById('layer').innerHTML=''; LAYER_CB={onConfirm:null,onCancel:null}; }
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

/* ---------- 路由 ---------- */
function switchTab(id){ clearTimers(); closeLayer(); S.stack=[]; S.cur=id; onPageShow(); renderAll(); }
function go(id, params={}){ clearTimers(); closeLayer(); S.stack.push(S.cur); S.cur=id;
  if(params.reset!==false) S.pages[id]=PAGES[id].defaults();
  Object.assign(S.pages[id], params.props||{});
  onPageShow(); renderAll(); }
function redirect(id, params={}){ clearTimers(); closeLayer(); S.cur=id;
  if(params.reset!==false) S.pages[id]=PAGES[id].defaults();
  Object.assign(S.pages[id], params.props||{});
  onPageShow(); renderAll(); }
function back(){ clearTimers(); closeLayer(); S.cur = S.stack.length? S.stack.pop() : 'p001'; onPageShow(); renderAll(); }
function smartGo(id){ clearTimers();
  const i=S.stack.indexOf(id);
  if(i>=0){ S.stack=S.stack.slice(0,i+1); S.cur=id; onPageShow(); renderAll(); }
  else go(id); }
function onPageShow(){ /* 记录不存在守卫：P003 无设备即弹窗返回 */
  if(S.cur==='p003' && !S.pages.p003.device){
    later(50,()=>modal({title:'提示',content:'该历史设备记录已不存在',confirmText:'知道了',hideCancel:true,
      onConfirm:()=>{ back(); }}));
  }
}

/* ---------- 渲染 ---------- */
function renderAll(){
  const pg = PAGES[S.cur]; if(!pg) return;
  $host().innerHTML = `<div data-pg="${S.cur}">${pg.render(S.pages[S.cur])}</div>`;
  $host().scrollTop = 0;
  /* TabBar */
  const tb=document.getElementById('tabbar');
  tb.style.display = pg.kind==='tab' ? 'flex':'none';
  if(pg.kind==='tab'){
    const cnt = ({p001:0,p007:({multi:3,one:1})[S.pages.p007.mode]||0,p008:0,p009:0});
    let n = cnt.p007 + ((S.pages.p002&&S.pages.p002.provisioning)?1:0);
    tb.innerHTML = [['p001','scan','扫描'],['p007','link','已连接'],['p008','cast','广播'],['p009','info','关于']]
      .map(([id,ic,lb])=>`<button class="tb ${S.cur===id?'on':''}" data-act="tab" data-id="${id}">
        ${C.ic(ic)}<span>${lb}</span>${id==='p007'&&n?`<span class="n">${n}</span>`:''}</button>`).join('');
  }
  renderReview();
}

/* ---------- 评审桌面 ---------- */
function renderReview(){
  const order=['p001','p002','p003','p004','p005','p006','p007','p008','p009','p010'];
  const names={p001:'扫描首页',p002:'SHID 配网向导',p003:'SHID 设备详情',p004:'SHID 历史（已移除）',p005:'SHID 诊断',p006:'GATT 调试',p007:'已连接设备',p008:'BLE 广播',p009:'关于',p010:'版本记录'};
  const scen=(SCEN[S.cur]||[]).map((x,i)=>`<button class="sc-btn" data-act="scen" data-i="${i}">${x.label}</button>`).join('')||'<div style="color:#7C8DA6;font-size:11px;padding:4px 2px">本页无场景（静态页 / 空态在页面内）</div>';
  document.getElementById('review').innerHTML=`
    <h1>BLE Toolkit+ 基准原型 V1</h1>
    <div class="sub">9 页 · 29 功能 · 六态可模拟 · 微信小程序形态（375×812）<br>规范：PRD + PAGE_SPEC + 07_design_system · 全模拟数据 · 无后端</div>
    <h2>页面（PAGE001-010）</h2>
    ${order.map(id=> id==='p004'
      ? `<div class="pg-btn removed"><span>${names[id]}</span><span class="pid">PAGE004 ✕</span></div>`
      : `<button class="pg-btn ${S.cur===id?'on':''}" data-act="jump" data-id="${id}"><span>${names[id]}</span><span class="pid">${PAGES[id].num}</span></button>`).join('')}
    <h2>场景（当前页 · 幂等复位）</h2>${scen}
    <h2>页面栈（uni 语义）</h2>
    <div class="stackview">[${S.stack.map(x=>PAGES[x]?PAGES[x].num:'').join(', ')}] → <b>${PAGES[S.cur].num}</b><br>cur=${S.cur} · kind=${PAGES[S.cur].kind}</div>
    <div class="note">功能编号映射见各页 feats；Q1 场景幂等 / Q2 字段对齐 / Q3 组件单一来源 · 已按 QA 报告整改。U-01 离开确认已扩展至 configure 脏表单。</div>`;
}

/* ---------- 输入桥（受控输入统一入口） ---------- */
document.addEventListener('input', e=>{
  const el=e.target, key=el.dataset.in; if(!key) return;
  const pg=PAGES[S.cur]; if(pg&&pg.inputs&&pg.inputs[key]){ pg.inputs[key](S.pages[S.cur], el.value, el); renderAll(); }
});

/* ---------- 动作桥（事件委托 → ACTIONS 唯一变更入口） ---------- */
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]');
  if(!el || el.disabled) return;
  const fn=ACTIONS[el.dataset.act];
  if(fn){ e.preventDefault(); fn(el); }
});

/* ---------- 扫描 / 广播 行为辅助 ---------- */
function resetScanMock(){ MOCK.scanDevices.forEach(d=>{ d.__hit=false; d.connected=false; }); }
function scanTick(){
  const s=S.pages.p001;
  s.scanned=true; s.scanning=false; s.shown=filterList(s);
  toast(`扫描完成 · 发现 ${s.shown.length} 台设备`, true); renderAll();
}
function bLog(type,msg){ addLog('p008',type,msg); }

/* ---------- 配网流程 ---------- */
function p002Connect(){
  const s=S.pages.p002; s.phase='connect'; s.connecting=true; s.connError=null; renderAll();
  later(1200,()=>{ s.connecting=false; s.phase='configure'; renderAll(); });
}
function p002Submit(){
  const s=S.pages.p002; s.phase='status'; s.provisioning=true; s.done=false; s.err=null;
  s.progress={wifi:'active',hub:'pending',conn:'pending',usb:'pending'}; renderAll();
  later(900,()=>{ s.progress.wifi='done'; s.progress.hub='active'; renderAll(); });
  later(1900,()=>{ s.progress.hub='done'; s.progress.conn='active'; renderAll(); });
  later(2900,()=>{
    const fail=S.shared.provFailCode;
    if(fail){ const e=MOCK.provErrors[fail];
      s.progress[e.row==='conn'?'conn':e.row]='fail'; if(e.row==='hub')s.progress.hub='done';
      s.provisioning=false; s.err={code:fail,msg:e.msg,row:e.row,recovery:e.recovery}; renderAll(); return; }
    s.progress.conn='done'; s.progress.usb='active'; renderAll();
  });
  later(4100,()=>{ if(S.shared.provFailCode)return;
    s.progress.usb='done'; s.provisioning=false; s.done=true;
    S.shared.currentDevice={deviceId:s.device.deviceId,name:s.device.name,protocol:'V1',firmware:'1.1.1',lastWifi:s.ssid,lastHub:s.hub};
    addLog('p006','sys',`配网会话 token=***（已脱敏）`); renderAll(); });
}
function p002LeaveConfirm(){
  const s=S.pages.p002;
  if(s.provisioning){ modal({title:'离开确认',content:'离开将取消本次配置等待，确定离开吗？',confirmText:'离开',cancelText:'继续配置',
    onConfirm:()=>{ p002Cleanup(); back(); }}); return; }
  if(s.phase==='configure'&&(s.ssid||s.hub||s.token)){ modal({title:'离开确认',content:'已填写的配网信息与配对令牌将全部清空（隐私约定：不写入本地）。确定离开吗？',confirmText:'离开并清空',cancelText:'继续填写',
    onConfirm:()=>{ p002Cleanup(); back(); }}); return; }
  p002Cleanup(); back();
}
function p002Cleanup(){ const s=S.pages.p002; s.pwd=''; s.token=null; }

/* ---------- 扫码面板（PAGE002 · F020） ---------- */
/* M-2 扫码状态机（QR_ERROR_STATE_FIX）：补齐 F020 失败三分类——PAGE_SPEC §2 按钮表「失败按
   取消/权限/失败分类提示」· PRD F020/R16 · v0-old「模拟扫码弹窗四分支」迁移回 v1-new（审计
   P1-1：qrErr 死字段、p002-qr 恒成功）。状态：idle →（点扫码卡）scanning（模拟扫码面板）→
   success（成功语义逐字保留：token 生成/hub 回填/toast/badge）或 error（qrErr.reason =
   cancel/permission/invalid）。真机为系统扫码界面（uni.scanCode），原型以模拟面板演示四种
   结果；关闭面板（X/遮罩）= 用户取消（真机退出相机同义，PAGE_SPEC「扫码取消·不算错误」）。 */
function qrScanSheet(){
  document.getElementById('layer').innerHTML=`<div class="mask sheetm" data-act="p002-qrclose">
    <div class="sheet"><div class="grip"></div><div class="sh-h"><span class="t">扫描 ControlHub 配对码</span>
    <button class="back-btn" data-act="p002-qrclose" style="background:var(--c-fill)">${C.ic('x','sm')}</button></div>
    <div class="sh-b">
      <div class="note info" style="margin:0 0 10px">真机为系统扫码界面（uni.scanCode）· 本面板为原型演示，展示四种扫码结果（F020 分类：成功 / 取消 / 权限 / 无效）。</div>
      <div style="border:1.5px dashed var(--c-line);border-radius:12px;padding:26px 14px;text-align:center;margin-bottom:12px">
        ${C.ic('qr','lg')}
        <div style="margin-top:8px;font-size:var(--fs-body);font-weight:var(--fw-bold)">正在扫描…</div>
        <div class="mono" style="font-size:var(--fs-mini);color:var(--c-mut);margin-top:4px">shid://pair · ControlHub 屏显二维码</div>
      </div>
      ${C.btn({label:'识别成功（演示）',tone:'primary',icon:'qr',block:true,act:'p002-qr-ok'})}
      <div style="display:flex;gap:9px;margin-top:9px">
        ${C.btn({label:'用户取消',tone:'soft',size:'sm',act:'p002-qr-cancel'})}
        ${C.btn({label:'权限拒绝',tone:'soft',size:'sm',act:'p002-qr-perm'})}
        ${C.btn({label:'二维码无效',tone:'soft',size:'sm',act:'p002-qr-invalid'})}
      </div>
    </div></div></div>`;
}
function qrFail(reason){
  const s=S.pages.p002; closeLayer();
  s.qrState='error'; s.qrErr={reason};
  toast(({cancel:'已取消扫码（不算错误）',permission:'扫码权限被拒绝',invalid:'未识别到有效配对码'})[reason]);
  renderAll();
}

/* ---------- 诊断行为（PAGE005） ---------- */
/* M-1 统一诊断入口（P005_DIAGNOSE_FIX）：补齐 p005-run 两处调用的 p005Diagnose 定义。
   状态机 = STATE_MACHINE §8 / STATE_MODEL #8 既有页面六值（idle/connected/checking/live/
   offline/error）+ 行级五值（pending/active/ok/warn/fail），不新增状态：
   idle/live 点击 → checking（行级 pending→active 逐项推进）→ live（五行 ok 结论）；
   异常分支（S.shared.diagFail 预置，注入机制同 provFailCode / otaFailPreset）→
   error（检测失败）+ 错误详情 + modal「请让设备进入配网/恢复模式后重试」（PAGE_SPEC P005
   错误态口径）。五项与明细文案逐字取自场景库「检测完成 · 全正常」，F024 五项不变。 */
let DIAG_RUN = 0;                                                /* 诊断运行令牌（防跨运行 tick 窜扰） */
function p005Diagnose(device){
  const s=S.pages.p005;
  if(s.state==='checking'||s.connecting) return;                 /* 检测中防重入 */
  const my=++DIAG_RUN;                                           /* 运行令牌：旧运行残留 tick 一律失效（防跨运行窜扰） */
  if(device&&device.deviceId) s.deviceId=device.deviceId;
  s.state='checking'; s.error=null; s.showErr=false; s.connecting=false;
  s.rows=[['ble','BLE 链路'],['wifi','Wi-Fi 连接'],['hub','ControlHub'],['conn','控制连接'],['usb','设备 Ready 状态']]
    .map(([key,label])=>({key,label,state:'pending'}));
  renderAll();
  const step=(i,st,detail)=>{ if(!s.rows)return; s.rows[i].state=st; if(detail)s.rows[i].detail=detail; renderAll(); };
  later(350,()=>{ if(my!==DIAG_RUN)return;
    if(S.shared.diagFail){
      DIAG_RUN=0;                                                /* 本运行已终态（error），残留 tick 全部失效 */
      s.state='error'; s.rows=null; s.showErr=false;
      s.error={code:'diagnostic_connect_failed',message:'连接超时：请让设备进入配网/恢复模式后重试（READY 设备会关闭蓝牙广播）。'};
      modal({title:'连接失败',content:'请让设备进入配网/恢复模式后重试',confirmText:'知道了',hideCancel:true});
      renderAll(); return; }
    step(0,'active'); });
  later(700,()=>{ if(my!==DIAG_RUN)return; step(0,'ok','GATT 连接保持 · RSSI -52 dBm'); step(1,'active'); });
  later(1050,()=>{ if(my!==DIAG_RUN)return; step(1,'ok','Home-5G · IP 192.168.1.42'); step(2,'active'); });
  later(1400,()=>{ if(my!==DIAG_RUN)return; step(2,'ok','192.168.1.8:17892 · 已配对'); step(3,'active'); });
  later(1750,()=>{ if(my!==DIAG_RUN)return; step(3,'ok','MQTT 已建立 · QoS1'); step(4,'active'); });
  later(2100,()=>{ if(my!==DIAG_RUN)return; step(4,'ok','HID 已就绪，等待 ControlHub 指令');
    s.state='live'; toast('检测完成 · 五项链路正常',true); renderAll(); });
}

/* ---------- GATT 行为 ---------- */
function p006Connect(){
  const s=S.pages.p006; s.connecting=true; s.panel='connecting'; s.connected=false; renderAll();
  later(1400,()=>{ s.connecting=false; s.connected=true; s.panel='ready'; s.logs=[];
    addLog('p006','sys',`连接成功 · 服务发现完成（4 服务 / 7 特征）`);
    addLog('p006','sys','MTU 协商 185 · 会话已就绪'); renderAll(); });
}
function findChar(uuid){ for(const sv of MOCK.gattTree) for(const ch of sv.chars) if(ch.uuid===uuid) return ch; return null; }
/* M-3 统一入口（P006_SESSION_STATE_FIX）：P001/P003/P007 三路径进入 P006 一律读唯一
   会话注册表 MOCK.connected——命中=连接复用（已连接 · ready），未命中=走既有连接流
   （连接中 → 已连接）。显示映射沿用 p006 既有三元：已连接/连接中/未连接（不新增状态）。 */
function p006Enter(d){
  const s=S.pages.p006;
  if(MOCK.connected.some(x=>x.deviceId===d.deviceId)){
    s.connected=true; s.connecting=false; s.panel='ready'; s.logs=[];
    addLog('p006','sys','连接复用 · 已有会话（READY）· 服务发现完成（4 服务 / 7 特征）');
    addLog('p006','sys','MTU 协商 185 · 会话已就绪');
    renderAll();
  } else p006Connect();
}
function hexToText(hex){ try{ return hex.trim().split(/\s+/).map(h=>String.fromCharCode(parseInt(h,16))).join(''); }catch(e){ return ''; } }

/* ---------- OTA 相位 ---------- */
function otaRun(fail){
  const s=S.pages.p006; const set=(ph,pct)=>{ s.otaDlg.phase=ph; s.otaDlg.pct=pct; renderAll(); };
  set('validating',0);
  later(900,()=>{ if(fail){ s.otaDlg.phase='failed'; s.otaDlg.err='OTA_HASH_MISMATCH · sha256 校验不符（本地预检）'; addLog('p006','err','OTA 校验失败：OTA_HASH_MISMATCH'); renderAll(); return; }
    set('transferring',12); addLog('p006','sys','OTA 传输开始 · 分包 244B');
    const t=setInterval(()=>{ if(S.cur!=='p006'){clearInterval(t);return;}
      s.otaDlg.pct=Math.min(100,s.otaDlg.pct+17);
      if(s.otaDlg.pct>=100){ clearInterval(t); set('committing',100);
        later(800,()=>{ set('verifying',100); addLog('p006','sys','版本回读一致 · 1.2.0'); });
        later(1600,()=>{ s.otaDlg.phase='success'; addLog('p006','ok','OTA 升级成功 · 1.1.1 → 1.2.0'); renderAll();
          later(2000,()=>{ s.otaDlg=null; renderAll(); }); });
      } else renderAll(); },420);
  });
}

/* ---------- 动作注册表 ---------- */
const ACTIONS = {
  /* 全局 */
  tab: el=>switchTab(el.dataset.id),
  jump: el=>{ const id=el.dataset.id; TABS.includes(id)?switchTab(id):go(id); },
  back: ()=>back(),
  gohome: ()=>switchTab('p001'),
  scen: el=>{ clearTimers(); (SCEN[S.cur]||[])[+el.dataset.i].apply(); renderAll(); },
  'modal-ok': ()=>{ const cb=LAYER_CB.onConfirm; closeLayer(); cb&&cb(); },
  'modal-cancel': ()=>{ const cb=LAYER_CB.onCancel; closeLayer(); cb&&cb(); },
  'sheet-close': ()=>closeLayer(),

  /* PAGE001 */
  'p001-scan': ()=>{ const s=S.pages.p001;
    if(s.bt==='off'){ modal({title:'提示',content:'请先打开系统蓝牙',confirmText:'去开启',hideCancel:true}); return; }
    if(s.bt==='unsupported'){ toast('当前平台不支持 BLE'); return; }
    resetScanMock(); s.scanning=true; s.scanned=false; s.scanError=null; s.shown=[]; renderAll();
    later(800,()=>{ if(S.cur!=='p001')return; MOCK.scanDevices[0].__hit=true;MOCK.scanDevices[1].__hit=true; s.shown=filterList(s); renderAll(); });
    later(1600,()=>{ if(S.cur!=='p001')return; MOCK.scanDevices[2].__hit=true;MOCK.scanDevices[3].__hit=true; s.shown=filterList(s); renderAll(); });
    later(2400,()=>{ if(S.cur!=='p001')return; MOCK.scanDevices.forEach(d=>d.__hit=true); scanTick(); }); },
  'p001-stop': ()=>{ const s=S.pages.p001; s.scanning=false; toast('已停止扫描（reason=user）'); renderAll(); },
  'p001-retry-scan': ()=>ACTIONS['p001-scan'](),
  'p001-filter': ()=>{ const s=S.pages.p001; s.filterOpen=!s.filterOpen; renderAll(); },
  'p001-preset': el=>{ const s=S.pages.p001; s.filter.rssi=+el.dataset.v; s.shown=filterList(s); renderAll(); },
  'p001-hidenoname': ()=>{ const s=S.pages.p001; s.filter.hideNoName=!s.filter.hideNoName; s.shown=filterList(s); renderAll(); },
  'p001-reset': ()=>{ const s=S.pages.p001; s.filter={rssi:-100,prefix:'',hideNoName:false}; s.shown=filterList(s); renderAll(); },
  'p001-connect': el=>{ const d=MOCK.scanDevices.find(x=>x.deviceId===el.dataset.id); if(!d)return;
    const s=S.pages.p001; if(s.scanning){ s.scanning=false; }
    d.connected=true; toast(`连接 ${d.name||'设备'} · 暂存路由上下文`);
    go('p006',{props:{device:{deviceId:d.deviceId,name:d.name||'未命名 BLE 设备',RSSI:d.RSSI}}});
    p006Enter(d); },
  'p001-config': el=>{ const d=MOCK.scanDevices.find(x=>x.deviceId===el.dataset.id); if(!d)return;
    S.shared.currentDevice=d; S.shared.provFailCode=null;
    go('p002',{props:{device:{deviceId:d.deviceId,name:d.name,RSSI:d.RSSI}}});
    p002Connect(); },
  /* 广播数据弹窗（F004 · R04 口径）：设备 ID/名称/RSSI/profileMatch + Service UUIDs +
     AD 结构逐段（COMPONENT C2）+ 整包 hex + Manufacturer Data + Service Data；
     单字段缺失逐项标注「本轮平台 API 未提供此字段」；adStructures 为 mock 预置分段展示数据，非运行时解析 */
  'p001-advdlg': el=>{ const d=MOCK.scanDevices.find(x=>x.deviceId===el.dataset.id); if(!d)return;
    const a=d.advertisement, su=a&&a.serviceUuids, sd=a&&a.serviceData, segs=a&&a.adStructures;
    const miss='<div class="miss">本轮平台 API 未提供此字段</div>';
    const field=(label,right,inner)=>`<div class="ad-sec"><div class="hd"><span>${label}</span><span>${right||''}</span></div>${inner}</div>`;
    sheet(`广播数据 · ${d.name||d.deviceId.slice(-6)}`,`
      <div class="kv"><span class="k">设备 ID</span><span class="v mono">${d.deviceId}</span></div>
      <div class="kv"><span class="k">名称</span><span class="v">${d.name||'（未命名）'}</span></div>
      <div class="kv"><span class="k">RSSI</span><span class="v mono">${d.RSSI} dBm</span></div>
      <div class="kv"><span class="k">profileMatch</span><span class="v mono">${d.profileMatch?`${d.profileMatch.level} · ${d.profileMatch.profileId}`:'—'}</span></div>
      ${field('Service UUIDs', su&&su.length?`${su.length} 项`:'—', su&&su.length?su.map(u=>`<div class="hex">${u}</div>`).join(''):miss)}
      ${a.present?`
      ${field(`AD 结构 · 逐段（${segs&&segs.length?segs.length+' 段':'—'}）`, `advertisement.hex ${a.byteLength} B`,
        (segs&&segs.length?segs.map(g=>`<div class="hd" style="margin-top:5px"><span>${g.type} · ${g.name}</span><span>${g.len} B</span></div><div class="hex">${g.hex}</div>`).join(''):miss)
        +`<div class="hd" style="margin-top:7px"><span>整包 hex</span><span>${a.length} B</span></div><div class="hex">${a.hex}</div>`)}
      ${a.manufacturerId?`<div class="kv"><span class="k">厂商 ID（Manufacturer Data）</span><span class="v mono">0x${a.manufacturerId}</span></div>`
        :field('Manufacturer Data','—',miss)}
      ${field('Service Data', sd&&sd.present?`${sd.uuid} · ${sd.byteLength} B`:'—',
        sd&&sd.present?`<div class="hex">${sd.hex}</div>`:miss)}`
      :`<div class="note info" style="margin-top:8px">本轮平台 API 未提供此字段（advertisement 不存在）</div>`}
      ${a.present&&a.byteLength===0?'<div class="note warn">字段存在但长度为 0</div>':''}
      <div style="display:flex;gap:9px;margin-top:14px">
        ${C.btn({label:'复制数据',tone:'primary',size:'sm',icon:'copy',act:'p001-advcopy'})}
        ${C.btn({label:'关闭',tone:'soft',size:'sm',act:'sheet-close'})}</div>`); },
  'p001-advcopy': ()=>{ closeLayer(); toast('已复制',true); },

  /* PAGE002 */
  'p002-back': ()=>p002LeaveConfirm(),
  'p002-reconnect': ()=>p002Connect(),
  'p002-rejoin': ()=>{ const s=S.pages.p002; s.lost=false; toast('已重新连接 · 表单已保留',true); renderAll(); },
  'p002-eye': ()=>{ const s=S.pages.p002; s.showPwd=!s.showPwd; renderAll(); },
  'p002-qr': ()=>{ const s=S.pages.p002; s.qrErr=null; s.qrState='scanning'; renderAll(); qrScanSheet(); },
  'p002-qr-ok': ()=>{ const s=S.pages.p002; closeLayer();
    s.qrState='success'; s.qrErr=null; s.token='tok-3f9a7c1e'+Math.random().toString(16).slice(2,10);
    if(!s.hub) s.hub='192.168.1.8:17892'; toast('配对码已解析 · 地址与令牌已回填',true); renderAll(); },
  'p002-qr-cancel': ()=>qrFail('cancel'),
  'p002-qr-perm': ()=>qrFail('permission'),
  'p002-qr-invalid': ()=>qrFail('invalid'),
  'p002-qrclose': ()=>qrFail('cancel'),                        /* 关闭扫码面板 = 用户取消（真机退出相机同义） */
  'p002-qrsetting': ()=>toast('已跳转系统设置（演示）'),
  'p002-submit': ()=>{ S.shared.provFailCode=null; p002Submit(); },
  'p002-cancelwait': ()=>{ const s=S.pages.p002; const e=MOCK.provErrors.timeout;
    s.provisioning=false; s.err={code:'timeout',msg:e.msg,row:'conn',recovery:'retry'}; renderAll(); },
  'p002-backform': ()=>{ const s=S.pages.p002; S.shared.provFailCode=null;
    s.phase='configure'; s.err=null; s.provisioning=false; s.progress={wifi:'pending',hub:'pending',conn:'pending',usb:'pending'}; renderAll(); },
  'p002-repairing': ()=>{ const s=S.pages.p002; s.token=null; s.qrState='idle'; s.qrErr=null; s.phase='configure'; s.err=null; renderAll(); },
  'p002-godiag': ()=>smartGo('p005'),
  'p002-view': ()=>{ const s=S.pages.p002;
    redirect('p003',{props:{device:{deviceId:s.device.deviceId,name:s.device.name,protocol:'V1',firmware:'1.1.1',lastWifi:s.ssid,lastHub:s.hub}}}); },

  /* PAGE003 */
  'p003-reconfig': ()=>{ const s=S.pages.p003; const d=S.shared.currentDevice||s.device;
    S.shared.provFailCode=null;
    go('p002',{props:{device:{deviceId:s.device.deviceId,name:s.device.name,RSSI:-52}}}); p002Connect(); },
  'p003-diag': ()=>go('p005',{props:{deviceId:S.pages.p003.device.deviceId}}),
  'p003-gatt': ()=>{ const s=S.pages.p003;
    const dv={deviceId:s.device.deviceId,name:s.device.name,RSSI:-52};
    go('p006',{props:{device:dv}}); p006Enter(dv); },

  /* PAGE005 */
  'p005-run': ()=>{ const s=S.pages.p005;
    if(s.state==='offline'||s.state==='error'){
      modal({title:'BLE 未连接',content:'设备当前未连接，是否连接并检测？',confirmText:'连接并检测',cancelText:'取消',
        onConfirm:()=>{ s.connecting=true; renderAll();
          later(1100,()=>{ s.connecting=false; p005Diagnose(); }); },
        onCancel:()=>toast('已取消')}); return; }
    p005Diagnose(); },
  'p005-toggleerr': ()=>{ const s=S.pages.p005; s.showErr=!s.showErr; renderAll(); },
  'p005-godetail': ()=>smartGo('p003'),
  'p005-reprov': ()=>modal({title:'重新配网',content:'READY 设备已关闭蓝牙广播。\n请先让设备进入配网/恢复模式（长按配对键 5s），确认后继续。',confirmText:'已进入配网模式',cancelText:'取消',
    onConfirm:()=>smartGo('p002'), onCancel:()=>toast('已取消')}),

  /* PAGE006 */
  'p006-connect': ()=>p006Connect(),
  'p006-disconnect': ()=>{ const s=S.pages.p006; s.connected=false; s.panel='idle'; s.notifying={};
    addLog('p006','sys','已主动断开（不触发自动重连）');
    const d=MOCK.scanDevices.find(x=>x.deviceId===s.device.deviceId); if(d)d.connected=false;
    const i=MOCK.connected.findIndex(x=>x.deviceId===s.device.deviceId); if(i>=0)MOCK.connected.splice(i,1);  /* 会话注册表同步清理（M-3） */
    toast('已断开'); renderAll(); },
  'p006-retry': ()=>{ const s=S.pages.p006;
    addLog('p006','sys','手动重连 · manualRetryConnection'); p006Connect(); },
  'p006-fold': el=>{ const s=S.pages.p006; const i=+el.dataset.i; s.expanded[i]=!s.expanded[i]; renderAll(); },
  'p006-expand': ()=>{ const s=S.pages.p006; s.expanded={0:true,1:true,2:true,3:true}; renderAll(); },
  'p006-collapse': ()=>{ const s=S.pages.p006; s.expanded={}; renderAll(); },
  'p006-read': el=>{ const ch=findChar(el.dataset.u); addLog('p006','sys',`读取 ${ch.name}…（3s 超时）`);
    later(600,()=>{ const hex=ch.value||'48 65 6C 6C 6F';
      addLog('p006','recv',`HEX: ${hex}\nTEXT: ${hexToText(hex)||'（解码失败，省略）'}`); renderAll(); }); },
  'p006-write': el=>{ const s=S.pages.p006; const ch=findChar(el.dataset.u);
    s.writeDlg={uuid:ch.uuid,name:ch.name,mode:'TEXT',val:''}; renderAll(); },
  'p006-notify': el=>{ const s=S.pages.p006; const u=el.dataset.u; const ch=findChar(u);
    s.notifying[u]=!s.notifying[u];
    addLog('p006','sys',`${s.notifying[u]?'开始监听':'停止监听'} ${ch.name}${s.notifying[u]?' · 防抖去重 300ms':''}`);
    renderAll();
    if(s.notifying[u]){ let n=0; const t=setInterval(()=>{ if(!s.notifying[u]||S.cur!=='p006'||n>=2){clearInterval(t);return;}
      n++; addLog('p006','recv',`HEX: 53 48 49 44 2D 30${n}\nTEXT: SHID-0${n}`); renderAll(); },1300); } },
  'p006-logclear': ()=>{ const s=S.pages.p006; s.logs=[]; renderAll(); },
  'p006-logexport': ()=>{ const s=S.pages.p006; s.logs.length?toast('日志已复制（格式化纯文本）',true):toast('暂无日志'); },
  'p006-wd-mode': el=>{ const s=S.pages.p006; s.writeDlg.mode=el.dataset.m; renderAll(); },
  'p006-wd-confirm': ()=>{ const s=S.pages.p006; const w=s.writeDlg; const v=(w.val||'').trim();
    if(!v){ toast('请输入数据'); return; }
    if(w.mode==='HEX' && !/^([0-9a-fA-F]{2}\s*)+$/.test(v)){ toast('HEX 格式非法：应为「01 A2 FF」形式'); return; }
    const ch=findChar(w.uuid); s.writeDlg=null;
    later(500,()=>{ addLog('p006','write',`${w.mode}: ${v}`); toast('写入成功',true); renderAll(); }); },
  'p006-wd-cancel': ()=>{ const s=S.pages.p006; s.writeDlg=null; renderAll(); },
  'p006-ota': ()=>{ const s=S.pages.p006; s.otaDlg={phase:'pick',pct:0,err:null}; renderAll(); },
  'p006-ota-pick': ()=>otaRun(S.pages.p006.otaFailPreset),
  'p006-ota-cancel': ()=>{ const s=S.pages.p006; s.otaDlg=null; addLog('p006','sys','OTA 已取消 · abort 已发送'); renderAll(); },
  'p006-ota-close': ()=>{ const s=S.pages.p006; s.otaDlg=null; renderAll(); },

  /* PAGE007 */
  'p007-open': el=>{ const d=MOCK.connected.find(x=>x.deviceId===el.dataset.id)||{deviceId:el.dataset.id,profileId:null};
    if(d.profileId==='smart-hid'){
      const snap=S.shared.currentDevice;
      go('p003', snap?{props:{device:snap}}:{});
    } else { const dv={deviceId:d.deviceId,name:d.name,RSSI:d.RSSI};
      go('p006',{props:{device:dv}}); p006Enter(dv); } },
  'p007-disconnect': el=>{ const i=MOCK.connected.findIndex(x=>x.deviceId===el.dataset.id);
    if(i>=0)MOCK.connected.splice(i,1); toast('已断开'); renderAll(); },
  'p007-disconnectall': ()=>{
    if(S.shared.p007fail){ const keep=MOCK.connected[0]; MOCK.connected.length=0; if(keep)MOCK.connected.push(keep);
      S.pages.p007.mode = MOCK.connected.length===0?'empty-common':'one';
      modal({title:'部分设备未能断开',content:`失败设备：${keep?keep.name:'—'}（errCode 10009）`,confirmText:'知道了',hideCancel:true}); renderAll(); return; }
    MOCK.connected.length=0; S.pages.p007.mode='empty-common'; toast('已全部断开',true); renderAll(); },

  /* PAGE008 */
  'p008-start': ()=>{ const s=S.pages.p008;
    if(s.platform==='web'){ toast('当前平台不支持 BLE 广播'); return; }
    if(s.btOff){ modal({title:'提示',content:'请先开启系统蓝牙',confirmText:'去开启',cancelText:'取消'}); return; }
    if(s.permMissing){ modal({title:'权限请求',content:'需要蓝牙广播、连接、扫描和位置权限，请在系统设置中手动开启',confirmText:'去设置',cancelText:'取消'}); return; }
    if(s.activeConn){ bLog('err','无法切换外围模式：请先断开已连接设备（active_connections）'); renderAll(); return; }
    s.advertising=true; s.state='idle'; bLog('ok','广播已启动 · powerLevel=high'); renderAll(); },
  'p008-stop': ()=>{ const s=S.pages.p008; s.advertising=false; s.state='stopped'; bLog('sys','广播已停止'); renderAll(); },
  'p008-check': ()=>{ const s=S.pages.p008;
    if(s.platform==='web'){ s.supported=false; bLog('sys','当前平台不支持 BLE 广播，请使用微信小程序或 App。'); renderAll(); return; }
    if(s.devtools){ s.supported=false; bLog('sys','开发者工具不支持 BLE 外围服务，请使用真机调试'); renderAll(); return; }
    s.checked=true; s.supported=true; bLog('sys',s.platform==='android'?'原生插件 LysBlePeripheral 已加载 · 支持广播':'蓝牙从机模式已就绪 · 支持 peripheral 广播');
    renderAll(); },
  'p008-logclear': ()=>{ const s=S.pages.p008; s.logs=[]; renderAll(); },
  'p008-logexport': ()=>{ const s=S.pages.p008; s.logs.length?toast('日志已复制',true):toast('暂无日志'); },

  /* PAGE009 */
  'p009-openweb': el=>toast(el.dataset.k==='web'?'网址已复制':'反馈链接已复制',true),
  'p009-versions': ()=>go('p010'),
  'p009-shareapp': ()=>toast('请点击右上角 · 分享给朋友或朋友圈'),

  /* PAGE010 */
  'p010-copy': ()=>toast('版本已复制',true),
};

/* ---------- 写入弹窗 / OTA 弹窗（PAGE006 渲染后处理） ---------- */
const _renderAll = renderAll;
renderAll = function(){
  _renderAll();
  const s=S.pages.p006;
  if(S.cur!=='p006'||!s) return;
  if(s.writeDlg){ const w=s.writeDlg;
    document.getElementById('layer').innerHTML=`<div class="mask">
      <div class="modal"><div class="t">写入 · ${w.name}</div>
      <div class="mono" style="font-size:var(--fs-micro);color:var(--c-mut);text-align:center;margin:-6px 0 12px;word-break:break-all">${w.uuid}</div>
      <div class="seg" style="margin-bottom:12px">
        <button class="${w.mode==='TEXT'?'on':''}" data-act="p006-wd-mode" data-m="TEXT">TEXT</button>
        <button class="${w.mode==='HEX'?'on':''}" data-act="p006-wd-mode" data-m="HEX">HEX</button></div>
      <textarea class="ta" placeholder="${w.mode==='HEX'?'01 A2 FF':'Hello BLE'}" data-wd="1">${esc(w.val)}</textarea>
      <div class="btns" style="margin-top:14px">${C.btn({label:'取消',tone:'soft',act:'p006-wd-cancel'})}
      ${C.btn({label:'确认写入',tone:'primary',icon:'send',act:'p006-wd-confirm'})}</div></div></div>`;
    const ta=document.querySelector('[data-wd]');
    ta&&(ta.oninput=()=>{ s.writeDlg.val=ta.value; });
  } else if(s.otaDlg){ const o=s.otaDlg;
    const ph={pick:['选择固件包','选择 .bin 文件后开始（微信 chooseMessageFile）'],
      validating:['校验固件','sha256 / 长度校验中…'],
      transferring:['传输中','通过 OTA 数据特征分包下发'],
      committing:['提交','通知设备切换新固件'],
      verifying:['版本回读','校验新版本号'],
      success:['升级成功','1.1.1 → 1.2.0 · 2s 后自动关闭'],
      failed:['升级失败','']}[o.phase];
    document.getElementById('layer').innerHTML=`<div class="mask">
      <div class="modal"><div class="t">固件更新</div>
      ${C.note('warn','<b>端到端链路 BLOCKED</b>：固件侧暂未开放升级通道，本流程为演示（P-03）。')}
      <div style="text-align:center;margin:12px 0 4px">
        <div style="font-size:var(--fs-h2);font-weight:var(--fw-bold)">${ph[0]}</div>
        <div style="font-size:var(--fs-cap);color:var(--c-mut);margin-top:3px">${o.err||ph[1]}</div>
        ${o.phase!=='pick'&&o.phase!=='success'&&o.phase!=='failed'?`
        <div class="ota-bar ${o.phase==='failed'?'err':o.phase==='success'?'ok':''}" style="margin-top:12px"><i style="width:${o.pct}%"></i></div>
        <div class="mono" style="font-size:var(--fs-mini);color:var(--c-mut);margin-top:5px">${o.phase==='transferring'?o.pct+'%':'…'}</div>`:''}
        ${o.phase==='success'?`<div style="width:52px;height:52px;border-radius:50%;background:var(--c-success-weak);color:#0E9A80;display:flex;align-items:center;justify-content:center;margin:12px auto 0">${C.ic('check','lg')}</div>`:''}
        ${o.phase==='failed'?`<div style="width:52px;height:52px;border-radius:50%;background:var(--c-danger-weak);color:var(--c-danger);display:flex;align-items:center;justify-content:center;margin:12px auto 0">${C.ic('x','lg')}</div>`:''}
      </div>
      <div class="btns" style="margin-top:14px">
        ${o.phase==='pick'?C.btn({label:'选择文件（.bin）',tone:'primary',icon:'doc',act:'p006-ota-pick'}):''}
        ${o.phase==='failed'?C.btn({label:'关闭',tone:'soft',act:'p006-ota-close'}):''}
        ${['pick','validating','transferring'].includes(o.phase)?C.btn({label:o.phase==='pick'?'取消':'中止（abort）',tone:'soft',act:'p006-ota-cancel'}):''}
      </div></div></div>`;
  }
};

/* ---------- 场景库（QA Q1：apply 前幂等复位） ---------- */
function scenReset(id){
  clearTimers(); closeLayer();
  S.pages[id]=PAGES[id].defaults();
  if(id==='p001') resetScanMock();
  if(id==='p007'){ MOCK.connected=JSON.parse(JSON.stringify(ORIGIN_CONN)); }
  if(id==='p006'){ S.shared.provFailCode=null; }
}
function scen(id,label,fn){ (SCEN[id]=SCEN[id]||[]).push({label,apply(){ scenReset(id); fn&&fn(); }}); }
const SCEN = window.SCEN = {};

/* P001 ×5（六态：默认/加载在页内/失败横幅/两种空态/权限） */
scen('p001','默认（蓝牙就绪 · 已扫描）',()=>{ const s=S.pages.p001; MOCK.scanDevices.forEach(d=>d.__hit=true); s.bt='on'; s.scanned=true; s.shown=filterList(s); });
scen('p001','未扫描（空态 A）');
scen('p001','筛选无匹配（空态 B）',()=>{ const s=S.pages.p001; MOCK.scanDevices.forEach(d=>d.__hit=true); s.scanned=true; s.filter.rssi=-50; s.shown=filterList(s); });
scen('p001','扫描失败（横幅+重试）',()=>{ const s=S.pages.p001; s.scanError={code:'scan_failed',message:'扫描启动失败：蓝牙适配器初始化超时（已自动重试 3 次：1s/2s/4s）。请在系统设置确认蓝牙已开启后重试。'}; });
scen('p001','权限：蓝牙未开（10001 modal）',()=>{ const s=S.pages.p001; s.bt='off'; modal({title:'提示',content:'请先打开系统蓝牙',confirmText:'去开启',hideCancel:true}); });
scen('p001','权限：平台不支持',()=>{ const s=S.pages.p001; s.bt='unsupported'; });

/* P002 ×7（三阶段 + 断线 + 三错误码） */
scen('p002','重新走完整流程（连接成功）',()=>{ const s=S.pages.p002; s.device={deviceId:'SHID-9F3E2A1C',name:'SHID-9F3E2A1C'}; p002Connect(); });
scen('p002','连接失败（身份验证）',()=>{ const s=S.pages.p002; s.device={deviceId:'SHID-9F3E2A1C',name:'SHID-9F3E2A1C'}; s.phase='connect'; s.connecting=false; s.connError='设备身份验证失败：Device Info 返回 product≠smart-hid，已断开连接。'; });
scen('p002','表单断线（可续填）',()=>{ const s=S.pages.p002; s.device={deviceId:'SHID-9F3E2A1C',name:'SHID-9F3E2A1C'}; s.phase='configure'; s.lost=true; s.ssid='Home-5G'; s.hub='192.168.1.8:17892'; s.token='simulated-token-32hex'; });
scen('p002','配网成功（READY）',()=>{ const s=S.pages.p002; s.device={deviceId:'SHID-9F3E2A1C',name:'SHID-9F3E2A1C'}; s.phase='status'; s.done=true; s.progress={wifi:'done',hub:'done',conn:'done',usb:'done'}; });
scen('p002','错误 wifi_failed → 回表单',()=>{ const s=S.pages.p002; s.device={deviceId:'SHID-9F3E2A1C',name:'SHID-9F3E2A1C'}; s.phase='configure'; s.ssid='Home-5G'; s.hub='192.168.1.8:17892'; s.token='tok'; S.shared.provFailCode='wifi_failed'; p002Submit(); });
scen('p002','错误 pairing_expired → 重新扫码',()=>{ const s=S.pages.p002; s.device={deviceId:'SHID-9F3E2A1C',name:'SHID-9F3E2A1C'}; s.phase='configure'; s.ssid='Home-5G'; s.hub='192.168.1.8:17892'; s.token='tok'; S.shared.provFailCode='pairing_expired'; p002Submit(); });
scen('p002','错误 controlhub_unreachable → 诊断',()=>{ const s=S.pages.p002; s.device={deviceId:'SHID-9F3E2A1C',name:'SHID-9F3E2A1C'}; s.phase='configure'; s.ssid='Home-5G'; s.hub='192.168.1.8:17892'; s.token='tok'; S.shared.provFailCode='controlhub_unreachable'; p002Submit(); });

/* P003 ×3 */
scen('p003','正常（会话快照）',()=>{ const s=S.pages.p003; s.device={deviceId:'HID-9F3E2A1C',name:'SHID-9F3E2A1C',protocol:'V1',firmware:'1.1.1',lastWifi:'Home-5G',lastHub:'192.168.1.8:17892'}; });
scen('p003','记录不存在（弹窗返回）',()=>{ S.pages.p003.device=null;
  later(50,()=>modal({title:'提示',content:'该历史设备记录已不存在',confirmText:'知道了',hideCancel:true,onConfirm:()=>back()})); });
scen('p003','字段缺失（显示 —）',()=>{ const s=S.pages.p003; s.device={deviceId:'HID-9F3E2A1C',name:'SHID-9F3E2A1C',protocol:'',firmware:'',lastWifi:'',lastHub:''}; });

/* P005 ×5 */
scen('p005','尚未检测（五行 pending）');
scen('p005','检测完成 · 全正常',()=>{ const s=S.pages.p005; s.state='live'; s.rows=[
  {key:'ble',label:'BLE 链路',state:'ok',detail:'GATT 连接保持 · RSSI -52 dBm'},
  {key:'wifi',label:'Wi-Fi 连接',state:'ok',detail:'Home-5G · IP 192.168.1.42'},
  {key:'hub',label:'ControlHub',state:'ok',detail:'192.168.1.8:17892 · 已配对'},
  {key:'conn',label:'控制连接',state:'ok',detail:'MQTT 已建立 · QoS1'},
  {key:'usb',label:'设备 Ready 状态',state:'ok',detail:'HID 已就绪，等待 ControlHub 指令'}]; });
scen('p005','检测完成 · Wi-Fi 异常',()=>{ const s=S.pages.p005; s.state='live'; s.rows=[
  {key:'ble',label:'BLE 链路',state:'ok'},{key:'wifi',label:'Wi-Fi 连接',state:'warn',detail:'SSID 可见但未连接（wifi_failed）'},
  {key:'hub',label:'ControlHub',state:'pending'},{key:'conn',label:'控制连接',state:'pending'},{key:'usb',label:'设备 Ready 状态',state:'pending'}];
  s.error={code:'wifi_failed',message:'设备侧报告 Wi-Fi 连接失败，请核对 SSID 与密码。'}; });
scen('p005','设备未连接（offline → 连接确认）',()=>{ const s=S.pages.p005; s.state='offline'; });
scen('p005','连接失败（error + 错误码）',()=>{ const s=S.pages.p005; s.state='error'; s.error={code:'diagnostic_connect_failed',message:'连接超时：请让设备进入配网/恢复模式后重试（READY 设备会关闭蓝牙广播）。'}; });

/* P006 ×8 */
scen('p006','未连接（idle）',()=>{ const s=S.pages.p006; s.device={deviceId:'D8:A6:3A:41:F2:09',name:'Mi Smart Band 8',RSSI:-66}; });
scen('p006','连接成功（服务树 ready）',()=>{ const s=S.pages.p006; s.device={deviceId:'D8:A6:3A:41:F2:09',name:'Mi Smart Band 8',RSSI:-66}; s.connected=true; s.panel='ready'; s.logs=[{time:nowT(),type:'sys',msg:'连接成功 · 服务发现完成（4 服务 / 7 特征）'},{time:nowT(),type:'sys',msg:'MTU 协商 185 · 会话已就绪'}]; });
scen('p006','连接失败（error + 重试）',()=>{ const s=S.pages.p006; s.device={deviceId:'EF:6B:12:0C:AA:77',name:'未命名 BLE 设备',RSSI:-78}; s.panel='error'; s.connError='连接超时（10s），已自动重试 3 次（2s/4s/6s 退避）仍未成功。'; });
scen('p006','服务列表为空',()=>{ const s=S.pages.p006; s.device={deviceId:'EF:6B:12:0C:AA:77',name:'未命名 BLE 设备',RSSI:-78}; s.connected=true; s.panel='empty'; });
scen('p006','被动断线 → 自动重连',()=>{ const s=S.pages.p006; s.device={deviceId:'D8:A6:3A:41:F2:09',name:'Mi Smart Band 8',RSSI:-66}; s.connected=true; s.panel='ready';
  addLog('p006','err','连接已断开（远端丢失），写队列已中止：2 个未发事务取消');
  addLog('p006','sys','自动重连中（1/3）· 1s backoff');
  later(1500,()=>{ addLog('p006','ok','已重新连接 · 会话恢复（READY）'); renderAll(); }); });
scen('p006','示例日志（含脱敏）',()=>{ const s=S.pages.p006; s.device={deviceId:'D8:A6:3A:41:F2:09',name:'Mi Smart Band 8',RSSI:-66}; s.connected=true; s.panel='ready';
  s.logs=[{time:'10:21:03',type:'sys',msg:'连接成功 · 服务发现完成（4 服务 / 7 特征）'},
    {time:'10:21:20',type:'recv',msg:'HEX: 53 48 49 44 2D 41 31\nTEXT: SHID-A1'},
    {time:'10:21:45',type:'write',msg:'TEXT: Hello BLE'},
    {time:'10:22:10',type:'sys',msg:'配网会话 token=***（已脱敏）'}]; });
scen('p006','OTA 预设：校验失败',()=>{ const s=S.pages.p006; s.device={deviceId:'D8:A6:3A:41:F2:09',name:'Mi Smart Band 8',RSSI:-66}; s.connected=true; s.panel='ready'; s.otaFailPreset=true; toast('已预设：下次选包将在校验阶段失败'); });
scen('p006','OTA 预设：成功流程',()=>{ const s=S.pages.p006; s.device={deviceId:'D8:A6:3A:41:F2:09',name:'Mi Smart Band 8',RSSI:-66}; s.connected=true; s.panel='ready'; s.otaFailPreset=false; });

/* P007 ×4 + 批量失败 */
scen('p007','3 台连接（含 SHID）',()=>{ S.pages.p007.mode='multi'; });
scen('p007','1 台连接（无汇总卡）',()=>{ S.pages.p007.mode='one'; });
scen('p007','空态 · 常规',()=>{ S.pages.p007.mode='empty-common'; });
scen('p007','空态 · 配网会话在线',()=>{ S.pages.p007.mode='empty-prov'; });
scen('p007','批量断开部分失败',()=>{ S.pages.p007.mode='multi'; S.shared.p007fail=true; toast('已预设：全部断开将有 1 台失败'); });

/* P008 ×9（含 U-03 Web 禁用解释） */
scen('p008','微信 · 就绪',()=>{ const s=S.pages.p008; s.platform='weixin'; s.checked=true; s.supported=true; bLog('sys','蓝牙从机模式已就绪'); });
scen('p008','Android · 插件就绪',()=>{ const s=S.pages.p008; s.platform='android'; s.checked=true; s.supported=true; bLog('sys','原生插件 LysBlePeripheral 已加载'); });
scen('p008','Web · 不支持（U-03 解释）',()=>{ const s=S.pages.p008; s.platform='web'; s.supported=false; bLog('sys','当前平台不支持 BLE 广播，请使用微信小程序或 App。'); });
scen('p008','微信 · 开发者工具',()=>{ const s=S.pages.p008; s.platform='weixin'; s.devtools=true; s.supported=false; bLog('sys','开发者工具不支持 BLE 外围服务，请使用真机调试'); });
scen('p008','微信 · 活动连接冲突',()=>{ const s=S.pages.p008; s.platform='weixin'; s.activeConn=true; bLog('err','无法切换外围模式：请先断开已连接设备（active_connections）'); });
scen('p008','Android · 蓝牙未开',()=>{ const s=S.pages.p008; s.platform='android'; s.btOff=true; });
scen('p008','Android · 权限缺失',()=>{ const s=S.pages.p008; s.platform='android'; s.permMissing=true; });
scen('p008','广播中（全部输入禁用）',()=>{ const s=S.pages.p008; s.platform='weixin'; s.checked=true; s.supported=true; s.advertising=true; bLog('ok','广播已启动 · powerLevel=high'); });
scen('p008','预填超限（>31B 拦截）',()=>{ const s=S.pages.p008; s.form.mfgData='LIGHTBLE-BROADCAST-DEMO-2026'; });
scen('p008','启动失败（FAILED）',()=>{ const s=S.pages.p008; s.state='failed'; bLog('err','广播启动失败：errCode 10001 系统当前蓝牙不可用'); });

/* P009 ×2 / P010 ×1 */
scen('p009','版本回退（release-metadata）',()=>{ const s=S.pages.p009; s.verFallback=true; });
scen('p009','推广卡跳转失败（仅失败才弹窗）',()=>{ modal({title:'暂时无法打开「ESP32 快速配网」',
  content:'请确认微信版本和小程序跳转权限，稍后重试。（实证 openApp fail 分支；正常路径为点击直接跳转，无确认弹窗）',
  confirmText:'知道了', hideCancel:true}); });
scen('p010','三个列表全空态',()=>{ const s=S.pages.p010; s.emptyAll=true; });

/* ---------- 启动 ---------- */
Object.keys(PAGES).forEach(id=>{ S.pages[id]=PAGES[id].defaults(); });
resetScanMock();
renderAll();
window.APP={S,ACTIONS,go,back,switchTab,redirect,smartGo,toast,modal,sheet};
