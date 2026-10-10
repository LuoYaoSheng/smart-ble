/* PAGE008 BLE 广播 —— F014/F015 平台分支 + F016 31B 预算 + U-03 禁用解释 */
PAGES['p008'] = {
  num:'PAGE008', title:'广播', kind:'tab', kicker:'PERIPHERAL',
  feats:['F014','F015','F016'],
  defaults: () => ({
    platform:'weixin', checked:false, supported:true, advertising:false, state:'idle',
    btOff:false, permMissing:false, devtools:false, activeConn:false,
    form:{ name:'SmartBLE', uuid:'FFE0', mfgId:'0001', mfgData:'BLE' }, uuidErr:false,
    logs:[],
  }),
  inputs:{
    'bv-name': (s,v)=>{ s.form.name=v; },
    'bv-uuid': (s,v)=>{ s.form.uuid=v.trim(); s.uuidErr = v.trim() && !/^([0-9a-fA-F]{4}|[0-9a-fA-F]{8}|[0-9a-fA-F]{36})$/.test(v.trim()); },
    'bv-mfgid': (s,v)=>{ s.form.mfgId=v.trim(); },
    'bv-mfgdata': (s,v)=>{ s.form.mfgData=v; },
  },
  render(s){
    const platWord = { weixin:'微信', android:'Android', ios:'iOS', web:'Web' }[s.platform];
    const badge = s.advertising ? C.badge('广播中','on') 
      : s.state==='failed' ? C.badge('失败','err')
      : s.platform==='web'||(!s.checked&&s.devtools) ? C.badge('不支持','dim',false)
      : s.checked&&s.supported&&!s.advertising&&s.state==='stopped' ? C.badge('已停止','dim',false)
      : s.checked&&s.supported ? C.badge('已就绪','warn') : C.badge('未就绪','dim',false);
    const f = s.form;
    const bytes = { name: f.name?2+f.name.length:0, uuid: f.uuid?2+f.uuid.length/2:0, mfg: (f.mfgId||f.mfgData)?4+f.mfgData.length:0 };
    const total = bytes.name+bytes.uuid+bytes.mfg;
    const over = total>31;
    const dis = s.advertising;
    return `<div class="navbar"><div class="kicker">${this.kicker}</div>
      <div class="row"><div class="title">广播</div>
        <div class="bt-chip">${C.chip(`平台：${platWord}`,'neutral')} ${badge}</div></div></div>
    <div class="page">
      ${s.platform==='web' ? C.note('warn','<b>当前平台不支持 BLE 广播</b>：浏览器未提供外围模式 API，请使用微信小程序或 App（U-03）。') : ''}
      ${s.devtools&&!s.checked ? C.note('warn','开发者工具不支持 BLE 外围服务，请使用<b>真机调试</b>广播功能。') : ''}
      ${s.activeConn ? C.note('warn','无法切换外围模式：当前有活动 BLE 连接，请先在「已连接」页断开。') : ''}
      <div class="card" style="margin-top:12px">
        <div class="field"><label>设备名称 ${dis?'<span class="chip neutral">广播中禁用</span>':''}</label>
          <div class="inp"><input maxlength="20" value="${f.name}" ${dis?'disabled':''} data-in="bv-name">
            ${s.platform==='android'?`<span style="font-size:var(--fs-micro);color:var(--c-mut);white-space:nowrap">实际用系统蓝牙名</span>`:''}</div></div>
        <div class="field"><label>服务 UUID</label>
          <div class="inp"><input class="mono" maxlength="36" placeholder="4 / 8 / 36 位 HEX" value="${f.uuid}" ${dis?'disabled':''} data-in="bv-uuid"></div>
          ${s.uuidErr?'<div class="err-line">'+C.ic('warn','xs')+'UUID 需为 4 / 8 / 36 位十六进制</div>':''}</div>
        ${s.platform==='android'?`
        <div class="field"><label>广播模式</label><div class="picker">平衡（默认）<span class="arr">${C.ic('chev-d','sm')}</span></div></div>
        <div class="field"><label>发射功率</label><div class="picker">高功率（默认）<span class="arr">${C.ic('chev-d','sm')}</span></div></div>`:''}
        <div class="field"><label>厂商 ID（HEX）</label>
          <div class="inp"><input class="mono" maxlength="4" placeholder="0001" value="${f.mfgId}" ${dis?'disabled':''} data-in="bv-mfgid"></div></div>
        <div class="field"><label>厂商数据（ASCII）</label>
          <div class="inp"><input maxlength="26" value="${f.mfgData}" ${dis?'disabled':''} data-in="bv-mfgdata"></div></div>
        <div class="bytebar ${over?'over':''}">
          <span class="bt">ADV 负载预算</span>
          <span class="num">${total}</span><span class="cap">/ 31 字节</span></div>
        <div class="budget">
          <div class="b-r ${bytes.name>31?'over':''}"><span>完整名称 (0x09)</span><span>${bytes.name} B</span></div>
          <div class="b-r"><span>服务 UUID (0x03/0x07)</span><span>${bytes.uuid} B</span></div>
          <div class="b-r"><span>厂商块 (0xFF = 2+2+${f.mfgData.length})</span><span>${bytes.mfg} B</span></div>
          <div class="b-r tot ${over?'over':''}"><span>合计 ${over?'· 超限，启动将被拦截（不静默截断）':''}</span><span>${total} / 31 B</span></div>
        </div>
        <div style="display:flex;gap:9px;margin-top:14px">
          ${C.btn({label:s.advertising?'停止广播':'开始广播',tone:s.advertising?'danger':'primary',icon:s.advertising?'stop':'cast',flex:'',act:s.advertising?'p008-stop':'p008-start',cls:'p008-main',disabled:over||s.uuidErr})}
          ${C.btn({label:'检查支持',tone:'soft',icon:'refresh',act:'p008-check',disabled:dis})}
        </div>
      </div>
      <div style="margin-top:2px">${C.logPanel(s.logs,{variant:'cardv',emptyText:'暂无日志 · 开始广播或检查支持后，操作记录会显示在这里',scope:'p008'})}</div>
    </div>`;
  },
};
