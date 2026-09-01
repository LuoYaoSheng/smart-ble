// tests/target/pages/driver/navigation-tracker.js
function getNavigationSnapshot(ctx) {
  const events = ctx.runtime.getNavigationEvents();
  const last = events[events.length - 1] || null;
  return {
    page_id: ctx.pageId,
    exit_to: last?.target || (ctx.shell.route ? `站内:${ctx.pageId}` : null),
    history: events.map((e) => e.target),
    events,
  };
}

function recordNavigation(ctx, target, meta = {}) {
  return ctx.runtime.pushNavigation(target, meta);
}

module.exports = { ...module.exports, getNavigationSnapshot, recordNavigation };
