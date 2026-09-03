/* PAGE006 GATT 调试（IA-01：标题「GATT 调试」，与 P003 区分）—— F006-F012 + F025 OTA（P-03 受限预警） */
PAGES['p006'] = {
  num:'PAGE006', title:'GATT 调试', kind:'sub',
  feats:['F006','F007','F008','F009','F010','F011','F012','F025'],
  defaults: () => ({
    device:null, invalid:false,
    init:true, connecting:false, connected:false,
    panel:'idle', connError:null, expanded:{0:true}, notifying:{},
    logs:[], writeDlg:null, otaDlg:null, otaFailPreset:false,
  }),
  render(s){
    if(s.invalid) return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button><span class="t">GATT 调试</span></div>
      <div class="page">${C.empty('box','路由参数无效','缺少有效的设备标识，请从扫描页或已连接页进入。')}</div>`;
    const d = s.device||{name:'未命名设备',deviceId:'—',RSSI:-70};
    const hasOta = MOCK.gattTree.some(sv=>sv.ota);
    const stCls = s.connected?'on':s.connecting?'mid':'';
    const stWord = s.connected?'已连接':s.connecting?'连接中':'未连接';
    const panel = {
      idle: C.op({mode:'loading',title:'未初始化',desc:'点击「连接设备」建立 GATT 会话。'}),
      connecting: C.op({mode:'loading',title:'连接中…',desc:`正在连接 ${d.name}（10s 超时 · 失败自动重试 3 次）`}),
      ready: (()=>{ const tree = MOCK.gattTree.map((sv,i)=>`
        <div class="svc ${s.expanded[i]?'open':''}">
          <div class="svc-h" data-act="p006-fold" data-i="${i}">
            ${sv.ota?`<span style="color:var(--c-danger);display:flex">${C.ic('dl','sm')}</span>`:'<span style="color:var(--c-primary);display:flex">'+C.ic('chip','sm')+'</span>'}
            <span class="nm">${sv.name}</span>${C.chip(sv.uuid.slice(0,8)+'…','neutral mono')}
            <span class="chev">${C.ic('chev-r','sm')}</span></div>
          <div class="svc-b">${sv.chars.map(ch=>`
            <div class="char"><div class="r1"><span class="nm">${ch.name}</span>
              ${ch.props.read?C.chip('read','primary'):''}${ch.props.write?C.chip('write','success'):''}${ch.props.notify?C.chip('notify','warning'):''}</div>
              <div class="r2">
                ${ch.props.read?C.btn({label:'读取',tone:'soft',size:'sm',act:'p006-read',data:`data-u="${ch.uuid}"`}):''}
                ${ch.props.write?C.btn({label:'写入',tone:'soft',size:'sm',act:'p006-write',data:`data-u="${ch.uuid}"`}):''}
                ${ch.props.notify?C.btn({label:s.notifying[ch.uuid]?'停止监听':'开始监听',tone:'ghost',size:'sm',act:'p006-notify',data:`data-u="${ch.uuid}"`}):''}
              </div></div>`).join('')}</div></div>`).join('');
        return `<div class="sec-t" style="margin-top:12px"><div class="t">${C.ic('log')} 服务与特征 <span class="chip neutral">4 服务 / 7 特征</span></div>
          <span style="display:flex;gap:4px">${C.txtlink('全部展开','p006-expand')}${C.txtlink('全部收起','p006-collapse')}</span></div>${tree}`;
      })(),
      empty: C.op({mode:'warn',title:'服务发现完成 · 列表为空',desc:'该设备未暴露任何 GATT 服务（或权限受限）。'}),
      error: C.op({mode:'err',title:'连接失败',desc:s.connError||'连接超时（10s），已自动重试 3 次仍未成功。',retry:'p006-retry'}),
    }[s.panel];
    return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button><span class="t">GATT 调试</span>
      ${hasOta&&s.panel==='ready'?C.btn({label:'固件更新',tone:'ghost danger-t',size:'sm',icon:'dl',act:'p006-ota'}):''}</div>
    <div class="page">
      <div class="devhead">
        <div class="r1"><span class="st ${stCls}"></span>
          <div style="flex:1;min-width:0"><div style="font-size:var(--fs-h1);font-weight:var(--fw-bold)">${d.name}</div>
            <div class="mono" style="font-size:var(--fs-micro);color:var(--c-mut);margin-top:2px">${d.deviceId} · ${stWord}</div></div></div>
        <div class="acts">
          ${C.btn({label:s.connecting?'连接中…':s.connected?'断开连接':'连接设备',
            tone:s.connected?'danger':'primary',icon:s.connected?'x':'link',
            loading:s.connecting,disabled:s.connecting,act:s.connected?'p006-disconnect':'p006-connect'})}
        </div>
      </div>
      ${s.panel==='ready'?C.note('warn','<b>OTA 端到端链路 BLOCKED</b>（固件侧暂未开放）：右上「固件更新」可演示完整流程，正式使用前需固件配合。'):''}
      <div style="margin-top:12px">${panel}</div>
      <div class="logdock">${C.logPanel(s.logs,{variant:'dock',scope:'p006'})}</div>
    </div>`;
  },
};
