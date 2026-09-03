/* ============================================================
   desktop.js —— Desktop 平台覆写层（2026-09-03）
   运行于基准内核 app.js 之后，不修改任何基线文件：
   · 操作系统维度（2026-09-03 用户走查追加）：macOS / Windows / Linux 三宿主
     —— 原生层区分 CoreBluetooth / WinRT / BlueZ（10_platform §2.4）；
     窗口 chrome 随系统形态切换（os-mac/os-win/os-linux，还原层）；
     Linux 广播外围受 BlueZ/内核权限影响【待验证】显式提示；
     D2 spike 未启动，能力细节不预判。
   · P002 配对码 = 摄像头扫码为主 / 粘贴·手输兜底（2026-09-03 用户修正：
     配对码通过扫描二维码获取，粘贴仅为兜底，10_platform §2.4 已同步）
   · P006 三栏重排（SOP §12 布局调整，产品逻辑不变）
   · 日志导出 / 分享 → 复制 + 候选文件（未决策拦截）
   · 窗口关闭 → 退出确认（§4 生命周期：常驻，退出确认）
   D2 技术选型（Electron vs Tauri + BLE 原生层）spike 未启动，
   本层只表现桌面平台形态，不预判实现技术。
   三引用：① 基准 prototype/v1-new ② 10_platform §2.4/§3 ③ §4 差异设计 Desktop 列。
   ============================================================ */
'use strict';
(function(){

const APP = window.APP, S = APP.S;
S.shared.dtk = { raw:'', os:'mac' };   /* os ∈ mac | win | linux */

/* ---------- 操作系统注册表（原生层口径 = 10_platform §2.4） ---------- */
const OSES = {
  mac:   { n:'macOS',   layer:'CoreBluetooth', env:{ platform:'Desktop', system:'macOS 15（演示）',    model:'Mac' } },
  win:   { n:'Windows', layer:'WinRT',         env:{ platform:'Desktop', system:'Windows 11（演示）',  model:'PC'  } },
  linux: { n:'Linux',   layer:'BlueZ',         env:{ platform:'Desktop', system:'Linux · GNOME（演示）', model:'—' } },
};
const DT = S.shared.dtk;

/* ---------- 生态能力矩阵（11_ecosystem · 随 OS 切换的三系差异行） ---------- */
const MX_DTK = {
  mac:   [ ['广播监听','⚠️','mx-warn','macOS 原始广播数据受限'],
           ['广播发送','❌【待验证】','mx-bad','冲突 C2：CoreBluetooth 外围能力公开存在，以 D2 实测为准'],
           ['多设备','⚠️','mx-warn',''] ],
  win:   [ ['广播监听','⚠️','mx-warn','WinRT'],
           ['广播发送','⚠️','mx-warn','WinRT 外围'],
           ['多设备','✅','mx-ok',''] ],
  linux: [ ['广播监听','✅','mx-ok','BlueZ'],
           ['广播发送','⚠️','mx-warn','BlueZ / 内核权限【待验证】'],
           ['多设备','✅','mx-ok',''] ],
};
function mxRow(k, v, cls, note){
  return `<div class="mx-row"><span class="k">${k}</span><span class="v ${cls||''}">${v}${note?`<span class="mx-n">${note}</span>`:''}</span></div>`;
}
function mxHtml(){
  return `<h2>生态能力矩阵（11_ecosystem · ${OSES[DT.os].n}）</h2>
  <div class="rev-mx">
    ${mxRow('蓝牙状态检测','✅','mx-ok')}
    ${mxRow('设备扫描','✅','mx-ok','Linux 依赖 BlueZ')}
    ${mxRow('设备连接','✅','mx-ok')}
    ${mxRow('GATT 读写/Notify','✅','mx-ok')}
    ${MX_DTK[DT.os].map(r=>mxRow(r[0],r[1],r[2],r[3])).join('')}
    ${mxRow('长连接','✅','mx-ok','常驻形态（§4）')}
    ${mxRow('自动重连','✅','mx-ok','')}
    ${mxRow('OTA','✅','mx-ok','现版 F025 BLOCKED 不变')}
  </div>
  <div class="note">来源：Smart_BLE_平台功能差异矩阵 v1.0（11_ecosystem）· 桌面行 WIN/MAC/LINUX；与 10_platform §2.4 三系原生层一致。能力细节待 D2 spike 实测后回写；本卡随 P009 操作系统切换随动。</div>`;
}

function applyOS(){
  Object.assign(MOCK.env, OSES[DT.os].env);          /* P009 当前环境 / 设备型号 随动 */
  const dwin=document.querySelector('.dwin');
  if(dwin){ dwin.classList.remove('os-mac','os-win','os-linux'); dwin.classList.add('os-'+DT.os); }
  renderAll();
}

/* ---------- 操作系统切换（P009 应用信息卡入口） ---------- */
APP.ACTIONS['dtk-ossheet'] = function(){
  sheet('操作系统（桌面宿主）',
    Object.keys(OSES).map(k=>`<button class="opt-row ${DT.os===k?'on':''}" data-act="dtk-os" data-o="${k}">
      <span class="t">${OSES[k].n} <span style="font-size:var(--fs-mini);color:var(--c-mut)">原生层 ${OSES[k].layer}</span></span>
      <span class="ck">${C.ic('check','sm')}</span></button>`).join('')
    + `<div class="note info" style="margin-top:10px">桌面操作系统区分原生 BLE 层（10_platform §2.4）：
       macOS CoreBluetooth / Windows WinRT / Linux BlueZ。D2 技术选型 spike 未启动——能力细节不预判；
       <b>Linux 广播外围受 BlueZ / 内核权限影响【待验证】</b>。窗口 chrome 随系统形态切换（系统还原层）。</div>`);
};
APP.ACTIONS['dtk-os'] = el=>{
  DT.os = el.dataset.o;
  closeLayer(); applyOS();
  toast(`操作系统切换：${OSES[DT.os].n}（原生层 ${OSES[DT.os].layer}）`, true);
};
APP.ACTIONS['dwin-demo'] = ()=>toast('窗口控件由操作系统渲染（演示 · 还原层）');

/* ---------- P008：检查/启动 原生层口径覆写（状态逻辑仍走基线） ---------- */
const origCheck8 = APP.ACTIONS['p008-check'];
APP.ACTIONS['p008-check'] = function(){
  origCheck8.apply(this, arguments);
  const s=S.pages.p008;
  if(s.supported){
    bLog('sys',`桌面原生层 ${OSES[DT.os].layer}（${OSES[DT.os].n}）——能力判定待 D2 spike（10_platform §2.4）`);
    if(DT.os==='linux') bLog('err','Linux：广播外围受 BlueZ / 内核权限影响【待验证】——实际能力以 D2 spike 为准');
    renderAll();
  }
};
const origStart8 = APP.ACTIONS['p008-start'];
APP.ACTIONS['p008-start'] = function(){
  const before = S.pages.p008.advertising;
  origStart8.apply(this, arguments);
  if(DT.os==='linux' && S.pages.p008.advertising && !before){
    bLog('sys','Linux：广播外围受 BlueZ / 内核权限影响【待验证】——演示继续，实际能力待 D2 spike');
    renderAll();
  }
};

/* ---------- P002：扫描配对码（主路径 · 摄像头读 ControlHub 屏显二维码） ---------- */
let vfTimer = null;
function dtkOk(){ const s=S.pages.p002;
  s.token='tok-3f9a7c1e'; if(!s.hub) s.hub='192.168.1.8:17892';
  clearTimeout(vfTimer); closeLayer(); toast('配对码已识别 · 地址与令牌已回填',true); renderAll(); }
APP.ACTIONS['p002-qr'] = function(){
  sheet('扫描 ControlHub 配对码', `
    <div class="note info" style="margin:0 0 10px">配对码通过<b>扫描二维码</b>获取（产品统一口径 · F020）：
      摄像头读取 ControlHub 屏显 <span class="mono">shid://pair</span> 二维码，识别后自动回填地址与令牌。
      桌面端与微信 / App 同口径（2026-09-03 用户修正）。</div>
    <div class="dtk-vf" data-vf="1">
      <span class="c c1"></span><span class="c c2"></span><span class="c c3"></span><span class="c c4"></span>
      <span class="ln"></span>
      <div class="vf-ic">${C.ic('qr','lg')}</div>
      <div class="vf-t">取景识别中…（摄像头 · 演示）</div>
    </div>
    <div style="display:flex;gap:9px;margin-top:12px;align-items:center;flex-wrap:wrap">
      ${C.btn({label:'立即识别成功（演示）',tone:'primary',icon:'qr',act:'dtk-vfok'})}
      <button class="dtk-fb" data-act="dtk-paste">无法扫码？粘贴 / 手输配对码 →</button>
    </div>`);
  clearTimeout(vfTimer);
  vfTimer = setTimeout(()=>{ if(document.querySelector('[data-vf]')) dtkOk(); }, 1600);
};
APP.ACTIONS['dtk-vfok'] = ()=>dtkOk();

/* ---------- P002：粘贴 / 手输兜底（无摄像头或无法扫码时 · 10_platform §2.4） ---------- */
APP.ACTIONS['dtk-paste'] = function(){
  sheet('粘贴 / 手输配对码（兜底）', `
    <div class="note info" style="margin:0 0 10px">兜底路径：无摄像头或无法扫码时，粘贴
      <span class="mono">shid://pair</span> 内容直接解析（纯前端可解，10_platform §2.4）。</div>
    <div class="field"><label>配对码内容</label>
      <div class="inp"><input class="mono" placeholder="shid://pair?hub=…&t=…" data-dpaste="1"></div></div>
    <div style="display:flex;gap:9px;margin-top:12px">
      ${C.btn({label:'解析并回填',tone:'primary',icon:'qr',act:'dtk-parse'})}
      ${C.btn({label:'填入示例',tone:'soft',act:'dtk-sample'})}
    </div>`);
  const inp=document.querySelector('[data-dpaste]');
  inp&&(inp.oninput=()=>{ S.shared.dtk.raw=inp.value; });
};
APP.ACTIONS['dtk-sample'] = ()=>{ const i=document.querySelector('[data-dpaste]');
  if(i){ i.value='shid://pair?hub=192.168.1.8:17892&t=tok-3f9a7c1e'; S.shared.dtk.raw=i.value; } };
APP.ACTIONS['dtk-parse'] = ()=>{ const raw=S.shared.dtk.raw||'';
  const m=/t=([A-Za-z0-9\-]{4,})/.exec(raw), h=/hub=([^&\s]+)/.exec(raw);
  if(!m){ toast('未识别配对码（需包含 t=… 令牌）'); return; }
  const s=S.pages.p002; s.token=m[1]; if(!s.hub&&h) s.hub=h[1];
  closeLayer(); toast('配对码已解析 · 地址与令牌已回填',true); renderAll(); };

/* ---------- 日志导出：复制为主 + 文件候选拦截（P006 / P008） ---------- */
['p006','p008'].forEach(sc=>{
  const orig=APP.ACTIONS[sc+'-logexport'];
  APP.ACTIONS[sc+'-logexport']=function(){
    const s=S.pages[sc]; if(!s.logs.length){ toast('暂无日志'); return; }
    modal({title:'导出日志（桌面）',
      content:'复制到剪贴板，或保存为日志文件。\n（文件流导出为候选增强，未决策——10_platform §2.4）',
      confirmText:'复制到剪贴板', cancelText:'保存为文件（候选）',
      onConfirm:()=>orig(),
      onCancel:()=>toast('候选能力：文件流导出未决策，暂不提供（10_platform §2.4）')});
  };
});

/* ---------- P009：外链 → 系统浏览器；分享 → 导出文本 ---------- */
APP.ACTIONS['p009-openweb'] = el=>{
  const url = el.dataset.k==='web' ? 'smartble.example.com' : 'feedback.example.com/ble-toolkit';
  modal({title:'在系统浏览器打开', content:url+'\n（桌面端默认浏览器 · 演示）',
    confirmText:'打开', cancelText:'复制网址',
    onConfirm:()=>toast('已打开系统浏览器（演示）',true),
    onCancel:()=>toast('网址已复制',true)});
};
APP.ACTIONS['p009-shareapp'] = ()=>modal({title:'分享应用（桌面）',
  content:'桌面无社交分享面板 → 导出介绍文本。\n（导出文本文件为候选增强，未决策——10_platform §2.4）',
  confirmText:'复制介绍文本', cancelText:'保存文本文件（候选）',
  onConfirm:()=>toast('介绍文本已复制',true),
  onCancel:()=>toast('候选能力：文本文件导出未决策，暂不提供')});

/* ---------- P009 推广卡：非微信渠道承接（用户指示 2026-09-03）----------
   Desktop 无 navigateToMiniProgram → 浏览器打开落地页 + 小程序码（可下载，微信扫码可达） */
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
  const i=+el.dataset.i, p=MOCK.promo[i]; DT.land=PROMO_LAND[i]||'';
  sheet(`${p.name} · 推广详情`, `
    <div style="margin:0 0 10px">${C.note('info','非微信渠道承接（用户指示 2026-09-03）：Desktop 无法直跳微信小程序 → <b>浏览器打开落地页</b> + 出示<b>小程序码</b>（微信扫码可达 · 可下载）。')}</div>
    <div style="display:flex;justify-content:center;padding:14px;background:#fff;border-radius:12px">${qrDemo(p.name)}</div>
    <div style="text-align:center;font-size:var(--fs-mini);color:var(--c-mut);margin-top:6px">小程序码（示意图形 · 实机为静态预生成资源，零后端）· 落地页 <span class="mono">${DT.land}</span></div>
    <div style="display:flex;gap:9px;margin-top:12px;flex-wrap:wrap">
      ${C.btn({label:'打开落地页',tone:'primary',icon:'ext',act:'dtk-promoland'})}
      ${C.btn({label:'下载小程序码',tone:'soft',icon:'dl',act:'dtk-promoqr'})}
    </div>`);
};
APP.ACTIONS['dtk-promoland'] = ()=>{ closeLayer(); toast(`已在系统浏览器打开落地页（演示）· ${DT.land||''}`,true); };
APP.ACTIONS['dtk-promoqr'] = ()=>toast('小程序码已保存到下载目录（演示）',true);

/* ---------- 窗口关闭：退出确认（常驻运行 · 断开会话提示） ---------- */
APP.ACTIONS['dwin-quit'] = ()=>{
  const s6=S.pages.p006, s8=S.pages.p008;
  const busy=(s6&&s6.connected)||(s8&&s8.advertising);
  modal({title:'退出确认',
    content: busy ? '有 BLE 会话正在运行（连接/广播）。\n确认退出将断开会话并停止监听。'
                  : '桌面端为常驻运行。确认退出？\n（10_platform §4 生命周期：常驻，退出确认）',
    confirmText:'退出', cancelText:'继续使用',
    onConfirm:()=>{
      if(s8&&s8.advertising){ s8.advertising=false; s8.state='stopped'; bLog('sys','广播已停止 · 应用退出'); }
      if(s6&&s6.connected){ APP.ACTIONS['p006-disconnect'](); }
      renderAll(); toast('已退出（演示）· BLE 会话已断开'); },
    onCancel:()=>toast('继续运行')});
};

/* ============================================================
   renderAll 后处理：OS 徽标/提示 + P006 三栏重排 + P009 入口 + 评审条
   ============================================================ */
const _renderAll = renderAll;
renderAll = function(){
  _renderAll();
  const h1=document.querySelector('#review h1'); if(h1) h1.textContent='基准原型 V1 · Desktop 实例';
  const sub=document.querySelector('#review .sub');
  if(sub && !sub.dataset.dtk){ sub.dataset.dtk='1';
    sub.innerHTML='平台覆写层 desktop.js 已激活：宿主 OS 维度（mac/win/linux）+ 配对码扫码为主+粘贴兜底 / P006 三栏 / 文件导出候选 / 退出确认<br>'+sub.innerHTML; }

  /* P008：平台徽标注操作系统 + 原生层提示注入（chip 基线文案为平台枚举，桌面经 DOM 后处理改写） */
  if(S.cur==='p008'){
    const chip=document.querySelector('[data-pg="p008"] .bt-chip .chip');
    if(chip) chip.textContent=`平台：Desktop · ${OSES[DT.os].n}`;
    const pgEl=document.querySelector('[data-pg="p008"] .page');
    if(pgEl && !pgEl.querySelector('#dtk-osnote')){
      const div=document.createElement('div'); div.id='dtk-osnote';
      div.innerHTML = DT.os==='linux'
        ? C.note('warn','<b>Linux</b>：广播外围受 BlueZ / 内核权限影响【待验证】（10_platform §2.4）——实际能力以 D2 spike 为准。')
        : C.note('info',`桌面原生层 <b>${OSES[DT.os].layer}</b>（${OSES[DT.os].n}）：扫描 / GATT / 广播外围 △～✅（10_platform §2.4），技术选型待 D2 spike，不预判。`);
      pgEl.insertBefore(div, pgEl.firstChild);
    }
  }

  /* P009：应用信息卡注入「操作系统」入口（点按切换） */
  if(S.cur==='p009' && !document.querySelector('[data-act="dtk-ossheet"]')){
    const envKv=[...document.querySelectorAll('[data-pg="p009"] .kv')].find(k=>k.textContent.includes('当前环境'));
    if(envKv){
      const row=document.createElement('div');
      row.className='menu-row'; row.dataset.act='dtk-ossheet';
      row.innerHTML=`<span style="color:var(--c-mut);display:flex">${C.ic('set')}</span>
        <span class="t">操作系统 <span style="font-size:var(--fs-mini);color:var(--c-mut)">${OSES[DT.os].n} · ${OSES[DT.os].layer} · 点按切换</span></span>
        <span class="arr">${C.ic('chev-r','xs')}</span>`;
      envKv.parentNode.insertBefore(row, envKv.nextSibling);
    }
  }

  /* P006：DOM 重排为两栏（左主区 / 右日志常驻） */
  if(S.cur==='p006'){
    const pgEl=document.querySelector('[data-pg="p006"] .page');
    if(pgEl && !pgEl.querySelector('.dcol1')){
      const kids=[...pgEl.children];
      const left=document.createElement('div'); left.className='dcol1';
      pgEl.prepend(left);
      kids.filter(k=>!k.classList.contains('logdock')).forEach(k=>left.appendChild(k));
      const right=document.createElement('div'); right.className='dcol2';
      right.innerHTML='<div class="dnote">桌面布局（SOP §12 圈内调整）：右栏日志常驻 · 左区设备/服务/操作，流程与数据模型同基准。</div>';
      const ld=pgEl.querySelector('.logdock'); if(ld) right.appendChild(ld);
      pgEl.appendChild(right);
    }
  }

  /* 评审栏尾注入生态能力矩阵卡（11_ecosystem，随 OS 切换随动，每次基线重渲染后重挂） */
  const rev=document.getElementById('review');
  if(rev) rev.insertAdjacentHTML('beforeend', mxHtml());
};
/* ---------- 启动：按默认操作系统对齐（chrome 形态 + 环境信息 + 首渲染） ---------- */
applyOS();
window.DTK = { S, DT, OSES };
})();
