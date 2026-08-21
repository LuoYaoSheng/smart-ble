const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

/**
 * 单一全局扫描会话控制器。平台 API 由调用方注入，便于各端复用状态语义和单测。
 * completion 永不 reject，调用方必须检查 result.ok，避免无人 await 时产生未处理拒绝。
 */
export function createScanSessionController({ open, start, stop, onState, onBeforeFinish }) {
  let active = null;
  let nextId = 1;

  const finish = async (session, result) => {
    if (session.finished) return session.completion;
    session.finished = true;
    clearTimeout(session.timer);
    try {
      await onBeforeFinish?.(session, result);
    } catch (error) {
      result = { ok: false, reason: 'finish_failed', error };
    }
    if (active === session) active = null;
    onState?.(result.ok ? 'idle' : 'failed', session, result.error || null);
    session.resolve({ ...result, sessionId: session.id });
    return session.completion;
  };

  const stopSession = async (reason = 'user') => {
    const session = active;
    if (!session) return { ok: true, sessionId: null, reason: 'idle' };
    if (session.stopping) return session.completion;
    session.stopping = true;
    session.cancelled = true;
    onState?.('stopping', session, null);
    try {
      await stop();
      return finish(session, { ok: true, reason });
    } catch (error) {
      return finish(session, { ok: false, reason, error });
    }
  };

  const startSession = async ({ owner = 'generic', duration = 5000, discovery = {} } = {}) => {
    if (active) return active.completion;
    const completion = deferred();
    const session = {
      id: nextId++, owner, startedAt: Date.now(), deadline: Date.now() + duration,
      cancelled: false, stopping: false, finished: false, timer: null,
      completion: completion.promise, resolve: completion.resolve
    };
    active = session;
    onState?.('starting', session, null);
    try {
      await open();
      if (session.cancelled) return session.completion;
      await stop().catch(() => {});
      if (session.cancelled) return session.completion;
      await start(discovery);
      if (session.cancelled) {
        await stop().catch(() => {});
        return finish(session, { ok: true, reason: 'cancelled_during_start' });
      }
      onState?.('scanning', session, null);
      session.timer = setTimeout(() => { stopSession('timeout'); }, duration);
    } catch (error) {
      return finish(session, { ok: false, reason: 'start_failed', error });
    }
    return session.completion;
  };

  return {
    start: startSession,
    stop: stopSession,
    snapshot: () => active ? { id: active.id, owner: active.owner, startedAt: active.startedAt, deadline: active.deadline } : null
  };
}
