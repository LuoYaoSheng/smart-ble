// tests/target/pages/driver/cleanup-tracker.js
function getCleanupSnapshot(ctx) {
  const snap = ctx.runtime.getCleanupSnapshot();
  // 必须反映真实追踪；禁止固定 { listeners:0, sessions:0 }
  return {
    pageId: ctx.pageId,
    listeners: snap.listeners,
    sessions: snap.sessions,
    timers: snap.timers,
    tracked: snap.tracked,
    resources: snap.resources,
    notes: snap.notes || [],
  };
}

function markCleanup(ctx, note) {
  ctx.runtime.noteCleanup(note);
}

module.exports = { ...module.exports, getCleanupSnapshot, markCleanup };
