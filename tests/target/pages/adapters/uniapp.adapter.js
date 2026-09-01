// tests/target/pages/adapters/uniapp.adapter.js
/** UniApp 页面适配：基于 FakeRuntime / shell，不读 Vue 源码、不访问 uni 全局。 */

function createUniappAdapter(ctx) {
  return {
    kind: 'uniapp',
    open(route) {
      ctx.shell.route = route;
      ctx.shell.openedAt = Date.now();
      ctx.runtime.trackListener('page:show');
      ctx.runtime.trackSession(`page:${ctx.pageId}`);
      ctx.runtime.pushNavigation(`站内:${ctx.pageId}`, { route });
    },
    close() {
      ctx.runtime.untrackListener('page:show');
      ctx.runtime.endSession(`page:${ctx.pageId}`);
    },
  };
}

module.exports = { ...module.exports, createUniappAdapter };
