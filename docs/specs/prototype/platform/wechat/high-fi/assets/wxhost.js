/* ============================================================
   wxhost.js —— 微信小程序平台覆写层：宿主系统维度（2026-09-03）
   运行于基准内核 app.js 之后，不修改任何基线文件。

   背景（用户走查修正）：微信小程序区分运行宿主——安卓 / iOS 真机、
   开发者工具等；旧代码已有此维度：
   · pages/broadcast/index.vue:276  isWeixinDevTools()
     = wx.getDeviceInfo?.().platform === 'devtools'
     —— 开发者工具不支持 BLE 外围服务（需真机调试广播）
   · pages/about/index.vue:99  uni.getDeviceInfo().osName || platform
     —— 关于页展示宿主系统平台 / 机型
   宿主事实（旧代码口径）：
   · 安卓 / iOS 真机走同一 wx BLE API 路径（MP-WEIXIN 单一实现），行为一致
   · PC 端微信 BLE 支持情况旧代码未覆盖【未知，未验证】——不建模，仅登记

   三引用：① 基准 prototype/v1-new ② 旧代码 apps/uniapp 上述两处
   ③ 10_platform §2.1 宿主系统维度（2026-09-03 补）。
   ============================================================ */
'use strict';
(function(){

const APP = window.APP, S = APP.S;
const H = S.shared.wxhost = { os:'ios' };   /* 默认 iOS 真机 = 基准 mock env 口径 */

const HOSTS = {
  ios:      { n:'微信 · iOS 真机',   short:'iOS 真机',   devtools:false,
              env:{ platform:'微信小程序', system:'iOS 17.5.1', model:'iPhone 15 Pro' } },
  android:  { n:'微信 · 安卓真机',   short:'安卓真机',   devtools:false,
              env:{ platform:'微信小程序', system:'Android 14', model:'Pixel 8' } },
  devtools: { n:'微信开发者工具',     short:'开发者工具', devtools:true,
              env:{ platform:'微信小程序（devtools）', system:'devtools', model:'—' } },
};

function applyHost(){
  const h = HOSTS[H.os];
  Object.assign(MOCK.env, h.env);                    /* P009 当前环境 / 设备型号 动态化 */
  const s8 = S.pages.p008;
  if(s8){
    s8.devtools = h.devtools;
    if(h.devtools){ s8.checked=false; s8.supported=false; }   /* 基准 p008-check 同口径 */
  }
  renderAll();
}

/* ---------- 宿主切换（P009 应用信息卡内入口） ---------- */
APP.ACTIONS['wx-hostsheet'] = function(){
  sheet('宿主系统（微信小程序运行环境）',
    Object.keys(HOSTS).map(k=>`<button class="opt-row ${H.os===k?'on':''}" data-act="wx-host" data-h="${k}">
      <span class="t">${HOSTS[k].n}</span><span class="ck">${C.ic('check','sm')}</span></button>`).join('')
    + `<div class="note info" style="margin-top:10px">旧代码事实：广播页以
      <span class="mono">wx.getDeviceInfo().platform==='devtools'</span> 区分开发者工具（外围服务不可用，真机可用）；
     关于页展示宿主 osName。安卓 / iOS 真机走同一 wx BLE API 路径，行为一致；
      PC 端微信 BLE 支持未验证【未知】。</div>`);
};
APP.ACTIONS['wx-host'] = el=>{
  H.os = el.dataset.h;
  closeLayer(); applyHost();
  toast(`宿主系统切换：${HOSTS[H.os].n}`, true);
};

/* ---------- 开发者工具宿主：拦截启动广播（对齐旧代码 checkWxBleSupport 失败路径） ---------- */
const origStart = APP.ACTIONS['p008-start'];
APP.ACTIONS['p008-start'] = function(){
  if(H.os==='devtools'){
    bLog('err','开发者工具不支持 BLE 外围服务，请使用真机调试广播功能');
    renderAll(); return;
  }
  return origStart.apply(this, arguments);
};

/* ============================================================
   生态能力矩阵卡（11_ecosystem · 平台功能差异矩阵 v1.0，2026-09-03 入库）
   仅评审栏呈现，不改产品逻辑；冲突行（C1/C3）以旧代码实证为准标「待裁决」。
   ============================================================ */
function mxRow(k, v, cls, note){
  return `<div class="mx-row"><span class="k">${k}</span><span class="v ${cls||''}">${v}${note?`<span class="mx-n">${note}</span>`:''}</span></div>`;
}
function mxHtml(){
  return `<h2>生态能力矩阵（11_ecosystem）</h2>
  <div class="rev-mx">
    ${mxRow('蓝牙状态检测','✅','mx-ok')}
    ${mxRow('设备扫描','✅','mx-ok','iOS 无真实 MAC')}
    ${mxRow('设备连接','✅','mx-ok')}
    ${mxRow('GATT 读写/Notify','✅','mx-ok','WWR ⚠️')}
    ${mxRow('广播监听','⚠️','mx-warn','iOS 原始广播受限')}
    ${mxRow('广播发送','❌ vs △','mx-conf','冲突 C1 待裁决：矩阵❌ / 实证△（wx.createBLEPeripheralServer=F014）')}
    ${mxRow('长连接','❌','mx-bad','后台挂起（与现状一致）')}
    ${mxRow('自动重连','⚠️','mx-warn','口径差 C4：产品=前台会话内 F012')}
    ${mxRow('OTA','⚠️','mx-warn','现版 F025 BLOCKED')}
    ${mxRow('多设备','❌ vs ✅','mx-conf','冲突 C3 待裁决：矩阵❌ / F013 已实现')}
  </div>
  <div class="note">来源：Smart_BLE_平台功能差异矩阵 v1.0（11_ecosystem）。冲突清单见其 ALIGNMENT_NOTES §2——实证行为不随矩阵翻转，待用户裁决。</div>`;
}

/* ============================================================
   renderAll 后处理：评审条标注 + P008 平台徽标注宿主 + P009 宿主入口 + 矩阵卡
   ============================================================ */
const _renderAll = renderAll;
renderAll = function(){
  _renderAll();
  const h1=document.querySelector('#review h1'); if(h1) h1.textContent='基准原型 V1 · 微信小程序实例';
  const sub=document.querySelector('#review .sub');
  if(sub && !sub.dataset.wxh){ sub.dataset.wxh='1';
    sub.innerHTML='平台覆写层 wxhost.js 已激活：宿主系统维度（安卓 / iOS 真机 / 开发者工具）<br>'+sub.innerHTML; }

  /* P008：平台徽标注宿主（基准文案「平台：微信」追加宿主短名） */
  if(S.cur==='p008'){
    const chip=document.querySelector('[data-pg="p008"] .bt-chip .chip');
    if(chip) chip.textContent=`平台：微信 · ${HOSTS[H.os].short}`;
  }

  /* P009：应用信息卡注入「宿主系统」入口（点按切换） */
  if(S.cur==='p009' && !document.querySelector('[data-act="wx-hostsheet"]')){
    const envKv=[...document.querySelectorAll('[data-pg="p009"] .kv')].find(k=>k.textContent.includes('当前环境'));
    if(envKv){
      const row=document.createElement('div');
      row.className='menu-row'; row.dataset.act='wx-hostsheet';
      row.innerHTML=`<span style="color:var(--c-mut);display:flex">${C.ic('set')}</span>
        <span class="t">宿主系统 <span style="font-size:var(--fs-mini);color:var(--c-mut)">${HOSTS[H.os].n} · 点按切换</span></span>
        <span class="arr">${C.ic('chev-r','xs')}</span>`;
      envKv.parentNode.insertBefore(row, envKv.nextSibling);
    }
  }

  /* 评审栏尾注入生态能力矩阵卡（11_ecosystem，每次基线重渲染后重挂） */
  const rev=document.getElementById('review');
  if(rev) rev.insertAdjacentHTML('beforeend', mxHtml());
};

/* ---------- 启动：按默认宿主对齐环境与广播支持态 ---------- */
/* P008 defaults 包修：go()/switchTab() 会经 defaults() 重建页面状态，宿主标志
   （devtools）必须随 defaults 重放，否则切页后塌陷（同 android.js platform 教训） */
const _p008d = PAGES['p008'].defaults;
PAGES['p008'].defaults = function(){
  const d = _p008d(); const h = HOSTS[H.os];
  d.devtools = h.devtools;
  if(h.devtools){ d.checked=false; d.supported=false; }
  return d;
};
applyHost();
window.WXH = { H, HOSTS };
})();
