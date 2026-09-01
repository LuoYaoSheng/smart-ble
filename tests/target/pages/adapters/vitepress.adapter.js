// tests/target/pages/adapters/vitepress.adapter.js
const { loadLandingHtml, probeLandingFacts } = require('../fixtures/landing.fixture.js');
function createVitepressAdapter(ctx) {
  return {
    kind: 'vitepress',
    open() {
      const loaded = loadLandingHtml();
      ctx.shell.route = '/';
      ctx.shell.openedAt = Date.now();
      ctx.landing = {
        source: loaded.path,
        facts: probeLandingFacts(loaded.html),
        html_length: loaded.html.length,
      };
      ctx.runtime.trackListener('landing:view');
      ctx.runtime.trackSession('page:WEB-001');
      ctx.runtime.pushNavigation('站内:WEB-001', { route: '/' });
      // sections from probed facts (Actual)，非 behavior expected
      const sections = [];
      if (ctx.landing.facts.has_smart_ble) sections.push('Hero / Smart BLE');
      if (ctx.landing.facts.has_preview) sections.push('PREVIEW 状态区');
      if (ctx.landing.facts.has_version) sections.push('版本 1.0.5');
      if (ctx.landing.facts.has_not_released) sections.push('NOT_RELEASED 卡片');
      if (ctx.landing.facts.has_metadata_link) sections.push('Metadata 链接');
      ctx.shell.sections = sections;
    },
    close() {
      ctx.runtime.untrackListener('landing:view');
      ctx.runtime.endSession('page:WEB-001');
    },
    facts() {
      return ctx.landing?.facts || {};
    },
  };
}

module.exports = { ...module.exports, createVitepressAdapter };
