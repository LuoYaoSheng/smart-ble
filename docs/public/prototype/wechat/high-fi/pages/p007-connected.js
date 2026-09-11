/* PAGE007 已连接设备 —— F013 多设备会话管理（双空态） */
PAGES['p007'] = {
  num:'PAGE007', title:'已连接', kind:'tab', kicker:'SESSIONS',
  feats:['F013','F006'],
  defaults: () => ({ mode:'multi' }),   /* multi | one | empty-common | empty-prov */
  render(s){
    const provOnline = S.pages.p002 && S.pages.p002.provisioning;
    let body='';
    if(s.mode==='multi'){
      const list = MOCK.connected;
      body = `<div class="sumcard"><div><div class="num">${list.length}</div><div class="lb">台在线 · 全部为内存会话</div></div>
        <div style="flex:1"></div>${C.btn({label:'全部断开',tone:'danger',size:'sm',icon:'x',act:'p007-disconnectall'})}</div>
        ${list.map(d=>C.devCard(d,'conn')).join('')}`;
    } else if(s.mode==='one'){
      body = C.devCard(MOCK.connected[1],'conn');
    } else {
      body = C.empty({ill:'link',title:'还没有连接中的设备',
        desc: s.mode==='empty-prov' ? 'Smart HID 配网连接进行中，这里列出通用调试连接' : '先在「扫描」页找到设备并连接，会话将保存在这里',
        act:{label:'去扫描',icon:'scan',act:'gohome'}});
    }
    return `<div class="navbar"><div class="kicker">${this.kicker}</div>
      <div class="row"><div class="title">已连接</div>
        <div class="bt-chip">${provOnline?C.chip('配网会话在线','warning'):C.chip('通用调试会话','neutral')}</div></div></div>
      <div class="page" style="margin-top:12px">${body}</div>`;
  },
};
