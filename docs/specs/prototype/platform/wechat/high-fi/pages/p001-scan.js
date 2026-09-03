/* PAGE001 扫描首页 —— F001 扫描 / F002 权限前置 / F003 筛选 / F004 广播数据 / F005 名称 fallback */
PAGES['p001'] = {
  num:'PAGE001', title:'扫描', kind:'tab', kicker:'BLE TOOLKIT+',
  feats:['F001','F002','F003','F004','F005'],
  defaults: () => ({
    bt:'on', scanning:false, scanned:false, scanError:null, shown:[],
    filter:{ rssi:-100, prefix:'', hideNoName:false }, filterOpen:false,
  }),
  inputs:{
    'f-rssi': (s,v)=>{ s.filter.rssi = +v; s.shown = filterList(s); },
    'f-prefix': (s,v)=>{ s.filter.prefix = v; s.shown = filterList(s); },
  },
  render(s){
    const btWord = s.bt==='on'?'蓝牙就绪':s.bt==='off'?'蓝牙未开启':'平台不支持';
    const scanLb = s.scanning ? '<span class="live"></span>扫描中 · 5s 会话'
      : s.scanned ? `扫描完成 · 发现 ${s.shown.length} 台` : '待开始扫描';
    const listHtml = s.scanError ? '' :
      s.shown.length ? s.shown.map(d=>C.devCard(d,'scan')).join('')
      : C.empty(s.filtered===false&&s.scanned ? 'link' : 'radar',
          s.scanned&&s.filtered===false ? '当前没有匹配设备' : '还没有扫描结果',
          s.scanned&&s.filtered===false ? '调整筛选条件试试' : '点上方按钮开始扫描附近 BLE 设备',
          s.scanned?null:{label:'开始扫描',icon:'scan',act:'p001-scan'});
    return `
    <div class="navbar"><div class="kicker">${this.kicker}</div>
      <div class="row"><div class="title">扫描</div>
        <div class="bt-chip"><i class="bt-dot ${s.bt==='on'?'on':s.bt==='off'?'off':''}"></i>${btWord}</div></div></div>
    <div class="page">
      ${s.scanError ? C.ebanner(s.scanError) : ''}
      <div class="scantool">
        <div class="lb">${scanLb}</div>
        ${C.btn({label:s.scanning?'停止扫描':'开始扫描', tone:s.scanning?'danger':'primary', icon:s.scanning?'stop':'scan',
          loading:false, act:s.scanning?'p001-stop':'p001-scan'})}
      </div>
      <div class="sec-t"><div class="t">${C.ic('chip')} 附近设备 ${s.shown.length?`<span class="chip neutral">${s.shown.length}</span>`:''}</div>
        ${C.txtlink(s.filterOpen?'收起筛选':'筛选','p001-filter')}</div>
      ${s.filterOpen ? `
      <div class="filter">
        <div class="row"><span class="lb">最弱信号</span>
          ${[['-40','强 [-40]'],['-60','较好 [-60]'],['-70','一般 [-70]'],['-85','弱 [-85]']].map(p=>
            `<button class="pre ${s.filter.rssi===+p[0]?'on':''}" data-act="p001-preset" data-v="${p[0]}">${p[1]}</button>`).join('')}
        </div>
        <div class="row"><span class="lb">阈值 ${s.filter.rssi} dBm</span><input type="range" class="slider" min="-100" max="-40" step="5" value="${s.filter.rssi}" data-in="f-rssi"></div>
        <div class="row"><span class="lb">名称前缀</span><input style="flex:1;background:var(--c-fill);border:none;border-radius:8px;height:34px;padding:0 10px;font-family:var(--font);outline:none" placeholder="如 SHID / LightBLE" value="${s.filter.prefix}" data-in="f-prefix"></div>
        <div class="row"><span class="lb">隐藏无名</span><button class="switch ${s.filter.hideNoName?'on':''}" data-act="p001-hidenoname"></button>
          <div style="flex:1"></div>${C.btn({label:'重置过滤',tone:'soft',size:'sm',act:'p001-reset'})}</div>
      </div>` : ''}
      ${listHtml}
    </div>`;
  },
};

function filterList(s){
  const all = MOCK.scanDevices.filter(d=>d.__hit);
  const f = s.filter;
  const out = all.filter(d => d.RSSI >= f.rssi
    && (!f.prefix || (d.name||'').toUpperCase().startsWith(f.prefix.toUpperCase()))
    && (!f.hideNoName || d.name));
  s.filtered = out.length===0 && all.length>0 ? false : undefined;
  return out;
}
