/* PAGE009 关于 —— F026 脱敏演示 / F027 版本元数据 / F029 分享（F028 推广跳转 2026-09-10 移除） */
PAGES['p009'] = {
  num:'PAGE009', title:'关于', kind:'tab', kicker:'ABOUT',
  feats:['F026','F027','F029'],
  defaults: () => ({ verFallback:false }),
  render(s){
    const ver = s.verFallback ? 'dev.unknown' : MOCK.release.displayVersion;
    const st = c => `<span class="stword st-${c}">${c}</span>`;
    return `<div class="navbar"><div class="kicker">${this.kicker}</div>
      <div class="row"><div class="title">关于</div><div class="bt-chip">${C.chip(ver,'neutral mono')}</div></div></div>
    <div class="page">
      <div class="card" style="margin-top:12px;display:flex;align-items:center;gap:11px">
        <div style="width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#0E4FC4,#1B6DFF);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">${C.ic('bt','sm')}</div>
        <div style="flex:1;min-width:0"><div style="font-size:var(--fs-h2);font-weight:var(--fw-bold)">BLE Toolkit+</div>
          <div style="font-size:var(--fs-micro);color:var(--c-mut);margin-top:2px">v${ver} · ${MOCK.release.channel} · 零后端 · 零本地持久化</div></div>
      </div>
      <div class="sec-t"><div class="t">${C.ic('info')} 应用信息</div></div>
      <div class="card">
        ${C.kv('当前环境',`${MOCK.env.platform} · ${MOCK.env.system}`)}
        ${C.kv('设备型号',MOCK.env.model)}
        ${C.kv('构建',MOCK.release.buildSha?`v+${MOCK.release.buildSha}（Release Metadata 投影）`:'',true)}
        <div style="margin-top:10px" class="chip-row">${MOCK.release.features.map(f=>C.chip(f,'primary')).join('')}</div>
      </div>
      <div class="card">
        ${MOCK.release.platformStatus.map(p=>`<div class="rel-row"><span>${p.name}
          ${p.cap!==p.rel?`${st(p.cap)} ${st(p.rel)}`:st(p.cap)}</span></div>`).join('')}
      </div>
      <div class="card" style="padding-top:8px;padding-bottom:8px">
        <div class="menu-row" data-act="p009-openweb" data-k="web"><span style="color:var(--c-mut);display:flex">${C.ic('ext')}</span><span class="t">官方网站</span><span class="arr">${C.ic('chev-r','xs')}</span></div>
        <div class="menu-row" data-act="p009-openweb" data-k="feedback"><span style="color:var(--c-mut);display:flex">${C.ic('send')}</span><span class="t">问题反馈</span><span class="arr">${C.ic('chev-r','xs')}</span></div>
        <div class="menu-row" data-act="p009-versions"><span style="color:var(--c-mut);display:flex">${C.ic('doc')}</span><span class="t">版本记录</span><span class="arr">${C.ic('chev-r','xs')}</span></div>
        <div class="menu-row" data-act="p009-shareapp"><span style="color:var(--c-mut);display:flex">${C.ic('share')}</span><span class="t">分享应用</span><span class="arr">${C.ic('chev-r','xs')}</span></div>
      </div>
      <div class="foot">日志全局脱敏：敏感凭据显示为 token=***<br>BLE Toolkit+ · Smart BLE 产品家族 · 微信小程序 wxf6c58b1dcac4c82d</div>
    </div>`;
  },
};
