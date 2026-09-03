/* PAGE010 版本记录 —— F027 构建元数据投影（三个列表空态 + 页脚固定声明） */
PAGES['p010'] = {
  num:'PAGE010', title:'版本记录', kind:'sub',
  feats:['F027'],
  defaults: () => ({ emptyAll:false }),
  render(s){
    const r = MOCK.release;
    const empty = s.emptyAll;
    const st = c => `<span class="stword st-${c}">${c}</span>`;
    const relCard = empty || !r.releases.length
      ? C.empty('doc','暂无正式发布版本','产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。')
      : r.releases.map(x=>`<div class="rel-row"><span>v${x.version} <span class="dt">${x.date}</span></span><span class="v">${x.sha}</span></div>`).join('');
    const prevCard = empty
      ? C.empty('doc','暂无预览记录','')
      : r.previews.map(x=>`<div class="rel-row"><span>v${x.version} <span class="dt">${x.date} · ${x.note}</span></span><span class="v">${x.sha}</span></div>`).join('');
    return `<div class="subnav"><button class="back-btn" data-act="back">${C.ic('chev-r','sm')}</button><span class="t">版本记录</span></div>
    <div class="page">
      <div class="card" style="margin-top:12px">
        <div class="card-t">${C.ic('doc')} 当前版本</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin:6px 0 10px">
          <span style="font-size:var(--fs-display);font-weight:var(--fw-xbold);color:var(--c-primary)">${empty?'dev.unknown':r.displayVersion}</span>
          ${C.chip(r.channel,'primary')}</div>
        ${C.kv('构建',r.buildSha?`v+${r.buildSha}`:'',true)}
        ${C.kv('Release tag','已登记（preview）')}
        <div style="margin-top:10px" class="chip-row">${r.platformStatus.map(p=>C.chip(`${p.name} ${p.rel}`, p.rel==='PREVIEW'?'primary':p.rel==='BLOCKED'?'warning':'neutral')).join('')}</div>
        <div style="margin-top:12px">${C.btn({label:'复制版本信息',tone:'soft',size:'sm',icon:'copy',block:true,act:'p010-copy'})}</div>
      </div>
      <div class="card">
        <div class="card-t">${C.ic('warn')} 当前限制</div>
        ${empty ? '<div class="logempty">暂无已知限制条目</div>'
          : r.limitations.map(l=>`<div style="display:flex;gap:8px;padding:7px 0;font-size:var(--fs-body);color:var(--c-sub);line-height:1.55;border-bottom:1px solid var(--c-line-soft)"><span style="color:var(--c-warning);display:flex;flex-shrink:0;margin-top:2px">${C.ic('warn','xs')}</span>${l}</div>`).join('')}
        <div style="margin-top:8px">${C.note('info','当前无 Artifact，不提供下载入口。')}</div>
      </div>
      <div class="card"><div class="card-t">${C.ic('check')} 正式发布历史</div>${relCard}</div>
      <div class="card"><div class="card-t">${C.ic('dl')} 预览记录</div>${prevCard}</div>
      <div class="foot">本页数据来自 Release Metadata 投影，不是手写版本事实源。</div>
    </div>`;
  },
};
