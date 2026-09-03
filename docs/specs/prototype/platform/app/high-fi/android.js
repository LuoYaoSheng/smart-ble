/* ============================================================
   android.js —— App·Android 平台覆写层（2026-09-03 重构版）
   运行于基准内核 app.js 之后，不修改任何基线文件：
   · APP.ACTIONS 运行时覆写（权限链 / 系统配对 / 分享导出）
   · renderAll 后处理注入（广播 Android 增强表单 + 开关感知预算）
   基线文件全部与 v1-new 字节一致（见 ../README.md 资源清单）。
   三引用：① 基准 prototype/v1-new ② 10_platform §2.2/§3 ③ §4 差异设计 App 列。
   系统层还原样式 = assets/android.css（头注豁免声明）。
   ============================================================ */
'use strict';
(function(){

const APP = window.APP, S = APP.S;

/* ---------- Android 会话态（挂 shared，不污染基线 defaults） ---------- */
const A = S.shared.andr = {
  permLoc:'none', reqN:0,          /* FINE_LOCATION：none/granted/never */
  permAd:false, permConn:false,    /* BLUETOOTH_ADVERTISE / CONNECT */
  paired:false, pairRetried:false, /* 系统配对（首次加密写触发） */
  mode:'BALANCED', power:'HIGH', connectable:true, incName:true, incUuid:true,
};
const MODE_W = {LOW:'低功耗',BALANCED:'平衡',LOW_LATENCY:'低延迟'};
const POWER_W = {ULTRA_LOW:'超低功率',LOW:'低功率',MID:'中功率',HIGH:'高功率'};

/* 三开关感知的 31B 预算（基准 P008 口径 + 开关参与） */
function bBytes(){
  const f = S.pages.p008.form;
  const name = A.incName && f.name ? 2+f.name.length : 0;
  const uuid = A.incUuid && f.uuid ? 2+f.uuid.length/2 : 0;
  const mfg  = (f.mfgId||f.mfgData) ? 4+f.mfgData.length : 0;
  return { name, uuid, mfg, total:name+uuid+mfg };
}

/* ============================================================
   Android 系统层构建器（平台还原图层 · android.css）
   ============================================================ */
let ASYS_PICK = null;
function asysDialog({ico='lock', app='BLE Toolkit+', title, desc='', pin='', sub='', btns=[]}){
  document.getElementById('layer').innerHTML=`<div class="asys-scrim">
    <div class="asys-dlg">
      <div class="asys-app">${app}</div>
      <div class="asys-ico">${C.ic(ico)}</div>
      <div class="asys-t">${title}</div>
      ${desc?`<div class="asys-d">${desc}</div>`:''}
      ${pin?`<div class="asys-pin">${pin}</div><div class="asys-sub">${sub}</div>`:''}
      <div class="asys-btns">${btns.map(b=>`<button class="asys-btn" data-act="asys-pick" data-v="${b.v}">${b.label}</button>`).join('')}</div>
    </div></div>`;
}
/* 运行时权限弹窗：kind ∈ location / advertise / connect */
function asysPerm(kind, onPick){
  const M={
    location:{ ico:'set', title:'想要获取此设备的位置信息',
      desc:'Android ≤11 的 BLE 扫描需要位置权限（FINE_LOCATION）。此为系统弹窗示意，实际文案以设备为准。',
      btns:[{label:'不允许',v:'deny'},{label:'仅此一次',v:'grant'},{label:'使用应用时',v:'grant'}]},
    advertise:{ ico:'cast', title:'想要通过附近设备进行广播',
      desc:'BLE 外围广播需要「附近设备」权限（BLUETOOTH_ADVERTISE，Android 12 / SDK≥31）。',
      btns:[{label:'不允许',v:'deny'},{label:'允许',v:'grant'}]},
    connect:{ ico:'link', title:'想要连接到附近设备',
      desc:'BLE 连接需要「附近设备」权限（BLUETOOTH_CONNECT，Android 12 / SDK≥31）。',
      btns:[{label:'不允许',v:'deny'},{label:'允许',v:'grant'}]},
  }[kind];
  asysDialog({...M});
  ASYS_PICK=v=>onPick(v);
}
/* 系统蓝牙配对弹窗（加密写首次触发） */
function asysPair(onPick){
  asysDialog({ico:'bt', title:'系统蓝牙配对请求',
    desc:'SHID-9F3E2A1C 想要与您的手机配对。请确认设备屏幕显示的配对码：',
    pin:'385204', sub:'配对码（演示）· 仅首次加密写需要',
    btns:[{label:'取消',v:'cancel'},{label:'配对',v:'pair'}]});
  ASYS_PICK=v=>onPick(v);
}
/* 系统分享面板：kind ∈ app / log（log 带候选文件行，未决策拦截） */
function asysShare(kind){
  const isLog = kind==='log';
  const tg=[['微','#07C160','wx'],['朋友圈','#F5A623','moments'],['QQ','#12B7F5','qq'],['钉','#1E7FFF','ding']];
  document.getElementById('layer').innerHTML=`<div class="asys-scrim bottom">
    <div class="asys-sheet">
      <div class="asys-sh-t">${isLog?'分享日志文本（系统分享面板 · 演示）':'分享应用（系统分享面板 · 演示）'}</div>
      <div class="asys-targets">${tg.map(([n,c,v])=>`<button class="asys-tg" data-act="asys-pick" data-v="${v}">
        <span class="asys-ava" style="background:${c}">${n}</span>微信${({'moments':'朋友圈','qq':'','ding':'钉钉'})[v]||''}</button>`).join('')}</div>
      <div class="asys-hr"></div>
      ${isLog?`
      <button class="asys-mrow" data-act="asys-pick" data-v="copy"><span class="ico">${C.ic('copy','sm')}</span><span class="t">复制到剪贴板</span></button>
      <button class="asys-mrow" data-act="asys-pick" data-v="file"><span class="ico">${C.ic('doc','sm')}</span><span class="t">保存为日志文件</span><span class="tag">候选 · 未决策</span></button>`
      :`<button class="asys-mrow" data-act="asys-pick" data-v="copy"><span class="ico">${C.ic('copy','sm')}</span><span class="t">复制链接</span></button>`}
    </div></div>`;
  ASYS_PICK=v=>{
    if(v==='file'){ closeLayer(); toast('候选能力：保存为文件未决策，暂不提供（10_platform §2.2）'); return; }
    closeLayer();
    if(v==='copy'){ toast(isLog?'日志文本已复制到剪贴板':'链接已复制到剪贴板',true); return; }
    toast(isLog?'日志文本已通过系统分享发出（演示）':'系统分享成功（演示）',true);
  };
}
/* 系统设置 · 应用权限页（去设置目的地） */
function asysPermSettings(onAllow){
  document.getElementById('layer').innerHTML=`<div class="asys-page">
    <div class="asys-ph">${C.ic('chev-r','sm')} 应用 › BLE Toolkit+ › 权限</div>
    <div style="padding:6px 0">
      <div class="asys-row"><span class="mid">位置<div class="d">允许扫描 BLE 设备（FINE_LOCATION）</div></span>
        <button class="asys-btn" data-act="asys-pick" data-v="allow-loc">允许</button></div>
      <div class="asys-row"><span class="mid">附近设备 · 广播<div class="d">BLUETOOTH_ADVERTISE（SDK≥31）</div></span>
        <button class="asys-btn" data-act="asys-pick" data-v="allow-adv">允许</button></div>
      <div class="asys-row"><span class="mid">附近设备 · 连接<div class="d">BLUETOOTH_CONNECT（SDK≥31）</div></span>
        <button class="asys-btn" data-act="asys-pick" data-v="allow-conn">允许</button></div>
    </div>
    <div style="padding:10px 18px;font-size:var(--fs-mini);color:#5F6368;">系统设置页示意（演示）· 授权后自动返回应用</div>
    <button class="asys-btn" data-act="asys-close" style="align-self:flex-start;margin:4px 12px;">返回应用</button>
  </div>`;
  ASYS_PICK=v=>onAllow(v);
}
/* 系统蓝牙设置页（Intent 目的地） */
function asysBTSettings(onOn){
  document.getElementById('layer').innerHTML=`<div class="asys-page">
    <div class="asys-ph">${C.ic('chev-r','sm')} 设置 › 连接设备 › 蓝牙</div>
    <div class="asys-row"><span class="mid">使用蓝牙<div class="d">${C.ic('bt','xs')} 关闭中 → 点击开启（演示）</div></span>
      <button class="asw" data-act="asys-pick" data-v="on"></button></div>
    <div style="padding:10px 18px;font-size:var(--fs-mini);color:#5F6368;">系统蓝牙设置（Intent 引导目的地 · 演示）</div>
  </div>`;
  ASYS_PICK=()=>onOn();
}
/* 系统浏览器（外链差异：App 拉起浏览器 vs 微信复制） */
function asysBrowser(url){
  document.getElementById('layer').innerHTML=`<div class="asys-web">
    <div class="asys-wb">
      <button class="back-btn" data-act="asys-close" style="background:#fff;width:28px;height:28px;">${C.ic('x','sm')}</button>
      <div class="asys-url"><span class="lk">${C.ic('lock','xs')}</span>${url}</div>
      <span class="asys-dot3">⋮</span>
    </div>
    <div class="asys-wbody">
      <div style="font-size:20px;font-weight:var(--fw-bold);color:#202124;margin-bottom:6px;">Smart BLE · 开源 BLE 工具链</div>
      <div style="font-size:var(--fs-cap);color:#5F6368;margin-bottom:16px;">${url}（系统浏览器 · 演示页面）</div>
      <div class="skel" style="width:88%"></div><div class="skel" style="width:70%"></div>
      <div class="skel" style="width:80%"></div><div class="skel" style="width:52%"></div>
      <button class="asys-btn" data-act="asys-close" style="margin-top:18px;border:1px solid #DADCE0;">返回应用</button>
    </div>
  </div>`;
}

/* ============================================================
   新增动作注册（覆写层自有）
   ============================================================ */
Object.assign(APP.ACTIONS, {
  'asys-pick': el=>{ const v=el.dataset.v; const f=ASYS_PICK; ASYS_PICK=null; f&&f(v); },
  'asys-close': ()=>closeLayer(),

  /* P008 广播模式 / 发射功率 picker（基线渲染为静态默认值 → 覆写层激活） */
  'andr-mode': ()=>{ sheet('广播模式（仅 Android）', ['LOW','BALANCED','LOW_LATENCY'].map(m=>
    `<button class="opt-row ${A.mode===m?'on':''}" data-act="andr-setmode" data-m="${m}"><span class="t">${MODE_W[m]}${m==='BALANCED'?'（默认）':''}</span><span class="ck">${C.ic('check','sm')}</span></button>`).join('')); },
  'andr-setmode': el=>{ A.mode=el.dataset.m; closeLayer(); renderAll(); },
  'andr-power': ()=>{ sheet('发射功率（仅 Android）', ['ULTRA_LOW','LOW','MID','HIGH'].map(p=>
    `<button class="opt-row ${A.power===p?'on':''}" data-act="andr-setpower" data-p="${p}"><span class="t">${POWER_W[p]}${p==='HIGH'?'（默认）':''}</span><span class="ck">${C.ic('check','sm')}</span></button>`).join('')); },
  'andr-setpower': el=>{ A.power=el.dataset.p; closeLayer(); renderAll(); },
  'andr-tg': el=>{ A[el.dataset.k]=!A[el.dataset.k]; renderAll(); },
});

/* ============================================================
   基线动作覆写（保留原函数引用，权限链通过后回调原逻辑）
   ============================================================ */
const orig = {
  'p001-scan': APP.ACTIONS['p001-scan'],
  'p008-start': APP.ACTIONS['p008-start'],
  'p002-submit': APP.ACTIONS['p002-submit'],
  'p006-logexport': APP.ACTIONS['p006-logexport'],
  'p008-logexport': APP.ACTIONS['p008-logexport'],
};

/* --- P001 扫描入口：FINE_LOCATION 运行时权限链（10_platform §4 权限模型 App 列） --- */
APP.ACTIONS['p001-scan'] = function(){
  const s = S.pages.p001;
  if(s.bt==='off'){
    modal({title:'系统蓝牙已关闭', content:'扫描需要系统蓝牙开启。\n点击「去设置」跳转系统蓝牙设置（Intent）。',
      confirmText:'去设置', cancelText:'取消',
      onConfirm:()=>asysBTSettings(()=>{ s.bt='on'; closeLayer(); toast('系统蓝牙已开启 · 已返回应用',true); renderAll(); later(300,()=>orig['p001-scan']()); })});
    return;
  }
  if(s.bt==='unsupported'){ orig['p001-scan'](); return; }
  if(A.permLoc==='granted'){ orig['p001-scan'](); return; }
  if(A.permLoc==='never'){ permNeverGuide(); return; }
  asysPerm('location', v=>{
    if(v==='grant'){ A.permLoc='granted'; A.reqN=0; s.scanError=null; toast('已授权位置权限（演示）',true); renderAll(); orig['p001-scan'](); return; }
    A.reqN++;
    if(A.reqN>=2){ A.permLoc='never'; }
    s.scanError={code:'bluetooth_permission_denied',
      message: A.permLoc==='never' ? '系统已不再询问位置权限。请到「应用详情 → 权限」手动开启后重试。'
                                    : '扫描 BLE 设备需要位置权限（FINE_LOCATION）。请在系统弹窗中允许，或到系统设置开启。'};
    renderAll();
  });
};
function permNeverGuide(){
  modal({title:'位置权限已关闭', content:'系统不再询问该权限。\n请到「应用详情 → 权限」手动开启位置权限。',
    confirmText:'去设置', cancelText:'取消',
    onConfirm:()=>asysPermSettings(v=>{
      if(v==='allow-loc'){ A.permLoc='granted'; A.reqN=0; const s=S.pages.p001; s.scanError=null; closeLayer();
        toast('位置权限已开启（演示）',true); renderAll(); later(300,()=>orig['p001-scan']()); }
      else{ closeLayer(); toast('已返回应用（未变更）'); } }),
    onCancel:()=>toast('已取消')});
}

/* --- P008 广播启动：Android 权限链（ADVERTISE→CONNECT 逐项）+ Intent + 开关预算 --- */
APP.ACTIONS['p008-start'] = function(){
  const s = S.pages.p008;
  s.platform = 'android';
  if(s.btOff){
    modal({title:'系统蓝牙已关闭', content:'广播需要系统蓝牙开启。\n点击「去设置」跳转系统蓝牙设置（Intent）。',
      confirmText:'去设置', cancelText:'取消',
      onConfirm:()=>asysBTSettings(()=>{ s.btOff=false; closeLayer(); bLog('sys','系统蓝牙已开启 · 继续权限检查');
        toast('系统蓝牙已开启 · 已返回应用',true); renderAll(); later(400,()=>andrPermChain()); })});
    return;
  }
  const b = bBytes();
  if(b.total>31){ bLog('err',`ADV 负载超限：${b.total}/31 B · 启动已拦截（不静默截断）`); renderAll(); return; }
  andrPermChain();
};
function andrPermChain(){
  const s = S.pages.p008;
  const finish=()=>{ orig['p008-start']();
    bLog('sys',`mode=${A.mode} power=${A.power} connectable=${A.connectable} · LysBlePeripheral`); renderAll(); };
  const stepConn=()=>{ if(A.permConn){ finish(); return; }
    asysPerm('connect', v=>{ if(v!=='grant'){ closeLayer(); permSummary(); return; }
      A.permConn=true; renderAll(); finish(); }); };
  if(!A.permAd){
    asysPerm('advertise', v=>{ if(v!=='grant'){ closeLayer(); permSummary(); return; }
      A.permAd=true; renderAll(); stepConn(); });
    return; }
  stepConn();
}
function permSummary(){
  const miss=[!A.permAd&&'BLUETOOTH_ADVERTISE（广播）', !A.permConn&&'BLUETOOTH_CONNECT（连接）'].filter(Boolean);
  if(!miss.length) return;
  bLog('err','权限缺失：'+miss.join(' / ')); renderAll();
  modal({title:'缺少必要权限', content:'以下权限未授权，无法广播：\n· '+miss.join('\n· ')+'\n\n请在系统设置中手动开启。',
    confirmText:'去设置', cancelText:'取消',
    onConfirm:()=>asysPermSettings(v=>{
      if(v==='allow-adv')A.permAd=true; if(v==='allow-conn')A.permConn=true;
      if(v==='allow-adv'||v==='allow-conn'){ closeLayer(); toast('权限已开启（演示）',true); renderAll(); }
      else{ closeLayer(); toast('已返回应用（未变更）'); } })});
}

/* --- P002 下发配置：首次加密写触发系统配对（取消自动 2s 重试一次 · 现状） --- */
APP.ACTIONS['p002-submit'] = function(){
  if(A.paired){ orig['p002-submit'](); return; }
  asysPair(v=>{
    if(v==='pair'){ A.paired=true; A.pairRetried=false; toast('系统配对完成 · 继续分帧加密写（演示）',true); orig['p002-submit'](); return; }
    closeLayer();
    if(!A.pairRetried){
      A.pairRetried=true; toast('配对被取消 · 2s 后自动重试一次（现状）');
      later(2000, ()=>{ if(S.cur!=='p002')return; APP.ACTIONS['p002-submit'](); });
      return; }
    A.pairRetried=false;
    modal({title:'系统配对未完成', content:'配对两次被取消，加密写未完成。\n请确认设备处于配网模式后重新下发。（二次取消后的策略旧实现文档未记载，标【未知】）',
      confirmText:'重新下发', cancelText:'取消',
      onConfirm:()=>APP.ACTIONS['p002-submit']()});
  });
};

/* --- 日志导出：系统分享面板（P006 / P008） --- */
APP.ACTIONS['p006-logexport'] = ()=>{ const s=S.pages.p006; s.logs.length?asysShare('log'):toast('暂无日志'); };
APP.ACTIONS['p008-logexport'] = ()=>{ const s=S.pages.p008; s.logs.length?asysShare('log'):toast('暂无日志'); };

/* --- P009 外链 / 分享：系统浏览器 / 系统分享面板 --- */
APP.ACTIONS['p009-openweb'] = el=>asysBrowser(el.dataset.k==='web'?'smartble.example.com':'feedback.example.com/ble-toolkit');
APP.ACTIONS['p009-shareapp'] = ()=>asysShare('app');

/* --- P009 推广卡：非微信渠道承接（用户指示 2026-09-03）---
   App 无 navigateToMiniProgram（仅微信可用）→ 打开落地页（旧代码实证 plus.runtime.openURL）
   + 出示小程序码（微信扫码可达 · 静态预生成资源，零后端） */
const PROMO_LAND = ['lightble.example.com','esp-config.example.com']; /* 脱敏演示域；真值=旧代码 config/product.js RELATED_MINI_PROGRAMS.url */
function qrDemo(seed){ /* 确定性伪二维码（示意图形 · 非真实可扫码） */
  let h=2166136261>>>0; for(let i=0;i<seed.length;i++){ h^=seed.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
  const rnd=()=>{ h^=h<<13; h>>>=0; h^=h>>>17; h^=h<<5; h>>>=0; return h/4294967296; };
  const n=21,c=6,dots=[];
  const fin=(x,y)=>`<rect x="${x*c}" y="${y*c}" width="${7*c}" height="${7*c}"/><rect x="${(x+1)*c}" y="${(y+1)*c}" width="${5*c}" height="${5*c}" fill="#fff"/><rect x="${(x+2)*c}" y="${(y+2)*c}" width="${3*c}" height="${3*c}"/>`;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    if((x<8&&y<8)||(x>=n-8&&y<8)||(x<8&&y>=n-8)) continue;
    if(rnd()<.44) dots.push(`<rect x="${x*c}" y="${y*c}" width="${c}" height="${c}"/>`); }
  return `<svg style="width:128px;height:128px" viewBox="0 0 ${n*c} ${n*c}" fill="#111" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${fin(0,0)}${fin(n-7,0)}${fin(0,n-7)}${dots.join('')}</svg>`;
}
APP.ACTIONS['p009-promo'] = function(el){
  const i=+el.dataset.i, p=MOCK.promo[i]; A.land=PROMO_LAND[i]||'';
  sheet(`${p.name} · 推广详情`, `
    <div style="margin:0 0 10px">${C.note('info','非微信渠道承接（用户指示 2026-09-03）：App 无法直跳微信小程序 → <b>打开落地页</b>（旧代码实证 <span class="mono">plus.runtime.openURL</span>）+ 出示<b>小程序码</b>，微信扫码可达。')}</div>
    <div style="display:flex;justify-content:center;padding:14px;background:#fff;border-radius:12px">${qrDemo(p.name)}</div>
    <div style="text-align:center;font-size:var(--fs-mini);color:var(--c-mut);margin-top:6px">小程序码（示意图形 · 实机为静态预生成资源，零后端）· 落地页 <span class="mono">${A.land}</span></div>
    <div style="display:flex;gap:9px;margin-top:12px;flex-wrap:wrap">
      ${C.btn({label:'打开落地页',tone:'primary',icon:'ext',act:'andr-promoland'})}
      ${C.btn({label:'保存小程序码（演示）',tone:'soft',act:'andr-promoqr'})}
    </div>`);
};
APP.ACTIONS['andr-promoland'] = ()=>{ closeLayer(); asysBrowser(A.land||'example.com'); };
APP.ACTIONS['andr-promoqr'] = ()=>toast('演示环境：小程序码为示意图形（实机长按识别 / 保存）');

/* ============================================================
   renderAll 后处理：P008 Android 增强表单注入 + 预算重算
   （基线已含 platform==='android' 的模式/功率静态字段 → 激活为交互）
   ============================================================ */
/* ============================================================
   生态能力矩阵卡（11_ecosystem · 平台功能差异矩阵 v1.0，2026-09-03 入库）
   仅评审栏呈现，不改产品逻辑；UNI-APP-AND 行 + iOS 待开发标注。
   ============================================================ */
function mxRow(k, v, cls, note){
  return `<div class="mx-row"><span class="k">${k}</span><span class="v ${cls||''}">${v}${note?`<span class="mx-n">${note}</span>`:''}</span></div>`;
}
function mxHtml(){
  return `<h2>生态能力矩阵（11_ecosystem）</h2>
  <div class="rev-mx">
    ${mxRow('蓝牙状态检测','✅','mx-ok')}
    ${mxRow('设备扫描','✅','mx-ok','需位置/附近设备权限')}
    ${mxRow('设备连接','✅','mx-ok')}
    ${mxRow('GATT 读写/Notify','✅','mx-ok','WWR ⚠️')}
    ${mxRow('广播监听','✅','mx-ok')}
    ${mxRow('广播发送','✅','mx-ok','LysBlePeripheral 插件（F015）')}
    ${mxRow('长连接','✅','mx-ok','后台保连=候选不做')}
    ${mxRow('自动重连','✅','mx-ok','F012 前台会话内')}
    ${mxRow('OTA','⚠️','mx-warn','uni-app App 行 · 现版 F025 BLOCKED')}
    ${mxRow('多设备','✅','mx-ok','F013')}
    ${mxRow('iOS（UNI-APP-IOS）','待开发','','NOT_RELEASED · 随 App 线评估')}
  </div>
  <div class="note">来源：Smart_BLE_平台功能差异矩阵 v1.0（11_ecosystem）。本项目实证与矩阵一致项直接吸收；冲突清单见其 ALIGNMENT_NOTES §2（微信侧 C1/C3 标注于 wechat 实例）。</div>`;
}

const _renderAll = renderAll;
renderAll = function(){
  _renderAll();
  /* 评审条标注 */
  const h1=document.querySelector('#review h1'); if(h1) h1.textContent='基准原型 V1 · App/Android 实例';
  const sub=document.querySelector('#review .sub');
  if(sub && !sub.dataset.andr){ sub.dataset.andr='1';
    sub.innerHTML='平台覆写层 android.js 已激活：权限链 / 系统配对 / 广播增强 / 系统分享<br>'+sub.innerHTML; }

  /* 评审栏尾注入生态能力矩阵卡（11_ecosystem，每次基线重渲染后重挂） */
  const rev=document.getElementById('review');
  if(rev) rev.insertAdjacentHTML('beforeend', mxHtml());

  if(S.cur!=='p008') return;
  const s=S.pages.p008; if(s.platform!=='android') return;   /* 场景切微信/Web 时不注入 */
  const host=document.querySelector('[data-pg="p008"]'); if(!host) return;
  const dis = s.advertising;

  /* 1) 激活模式 / 功率 picker（基线静态默认值 → 绑定覆写层状态） */
  host.querySelectorAll('.field').forEach(f=>{
    const lb=f.querySelector('label'); if(!lb) return;
    if(lb.textContent.startsWith('广播模式')){
      const pk=f.querySelector('.picker');
      pk.innerHTML=`${MODE_W[A.mode]}${A.mode==='BALANCED'?C.chip('默认','neutral'):''}<span class="arr">${C.ic('chev-d','sm')}</span>`;
      dis?pk.removeAttribute('data-act'):pk.setAttribute('data-act','andr-mode');
    }
    if(lb.textContent.startsWith('发射功率')){
      const pk=f.querySelector('.picker');
      pk.innerHTML=`${POWER_W[A.power]}${A.power==='HIGH'?C.chip('默认','neutral'):''}<span class="arr">${C.ic('chev-d','sm')}</span>`;
      dis?pk.removeAttribute('data-act'):pk.setAttribute('data-act','andr-power');
      /* 2) 三开关字段（插在功率字段之后，每次基线重渲染后重新注入） */
      if(!host.querySelector('.andr-opts')) f.insertAdjacentHTML('afterend', swBlock());
    }
  });

  /* 3) 开关感知预算重算（覆写基线数值展示） */
  const b=bBytes();
  const bb=host.querySelector('.bytebar'), bg=host.querySelector('.budget');
  if(bb){ bb.classList.toggle('over', b.total>31); const n=bb.querySelector('.num'); if(n) n.textContent=b.total; }
  if(bg){ const rows=bg.querySelectorAll('.b-r');
    if(rows.length===4){
      rows[0].innerHTML=`<span>完整名称 (0x09) ${A.incName?'':'· 已关闭'}</span><span>${b.name} B</span>`;
      rows[1].innerHTML=`<span>服务 UUID (0x03/0x07) ${A.incUuid?'':'· 已关闭'}</span><span>${b.uuid} B</span>`;
      rows[3].innerHTML=`<span>合计 ${b.total>31?'· 超限，启动将被拦截（不静默截断）':''}</span><span>${b.total} / 31 B</span>`;
      rows[3].classList.toggle('over', b.total>31); } }

  /* 4) 启动按钮禁用态随开关预算 */
  const main=host.querySelector('.p008-main');
  if(main) main.disabled = b.total>31 || s.uuidErr || s.advertising;
};
function swBlock(){
  const sw=(k,t,d)=>`<div class="swrow"><div class="mid"><div class="t">${t}</div><div class="d">${d}</div></div>
    <button class="switch ${A[k]?'on':''}" ${S.pages.p008.advertising?'disabled':''} data-act="andr-tg" data-k="${k}"></button></div>`;
  return `<div class="field andr-opts"><label>Android 选项（实时参与预算）</label>
    ${sw('connectable','可连接（connectable）','ADV 头标志位 · 不占 31B 预算')}
    ${sw('incName','包含设备名称','关闭后名称不计入负载')}
    ${sw('incUuid','添加服务 UUID','关闭后 UUID 不计入负载')}</div>`;
}

/* ---------- 启动：P008 defaults 固定为 Android 实例（go/switchTab/场景复位后仍保持） ---------- */
const _p008d = PAGES['p008'].defaults;
PAGES['p008'].defaults = function(){ const d=_p008d(); d.platform='android'; return d; };
S.pages.p008 = PAGES['p008'].defaults();
renderAll();
window.ANDR = { A, bBytes };
})();
