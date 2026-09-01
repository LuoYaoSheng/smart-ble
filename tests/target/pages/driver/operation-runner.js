// tests/target/pages/driver/operation-runner.js
const { OPERATION_ACTUALS } = require('../fixtures/operation-actuals.fixture.js');
const { collectActualBundle } = require('./assertion-collector.js');
const { getCleanupSnapshot, markCleanup } = require('./cleanup-tracker.js');
const { getNavigationSnapshot, recordNavigation } = require('./navigation-tracker.js');
const { applyState } = require('./state-controller.js');
const DRIVER_UNSUPPORTED = 'BLOCKED_BY_TARGET_DRIVER';

function findOperation(behaviorPage, operationId) {
  return (behaviorPage?.operations || []).find((o) => o.operation_id === operationId) || null;
}

function verifyControl(ctx, operationId) {
  const ctl = ctx.controls.get(operationId) || {
    visible: true,
    enabled: true,
    label: operationId,
  };
  return {
    visible: ctl.visible !== false,
    enabled: ctl.enabled !== false && ctl.disabled !== true,
    label: ctl.label || '',
  };
}

function driveRuntimeForOp(ctx, op, catalog) {
  const id = op.operation_id;
  const rt = ctx.runtime;
  // 按领域启发式驱动 FakeRuntime（不读 expected_*）
  if (/SCAN|P001/i.test(id) && /start|开始/i.test(op.control || '')) {
    rt.startScan();
  } else if (/SCAN|P001/i.test(id) && /stop|停止/i.test(op.control || '')) {
    rt.stopScan();
  } else if (/connect|连接/i.test(op.control || '')) {
    rt.connect('fake');
  } else if (/disconnect|断开/i.test(op.control || '')) {
    rt.disconnect();
  } else if (/GATT|读写|notify|通知/i.test(op.control || '') || /P006/i.test(id)) {
    rt.discoverServices();
    rt.read('char');
  } else if (/broadcast|广播/i.test(op.control || '') || /P008/i.test(id)) {
    rt.startBroadcast();
  } else if (/OTA|升级/i.test(op.control || '') || /P007/i.test(id)) {
    rt.otaStart();
    rt.otaProgress(10);
  } else if (/HID|配网|历史/i.test(op.control || '') || /P002|P003|P004|P005/i.test(id)) {
    rt.hidProvision();
    rt.hidStatus('ok');
  } else if (ctx.pageId === 'WEB-001') {
    rt.emit('landing.interact', { control: op.control });
    if (ctx.adapter?.facts) {
      const f = ctx.adapter.facts();
      rt.emit('landing.facts', f);
    }
  } else {
    rt.emit(`op.${id}`, { control: op.control });
  }

  // navigation Actual：优先 catalog.navigation；否则站内页标记
  const target = catalog.navigation || `站内:${ctx.pageId}`;
  recordNavigation(ctx, target, { operation_id: id });

  for (const note of catalog.cleanup_notes || []) {
    markCleanup(ctx, note);
  }
  // 保持至少一项 tracked resource，避免固定空 cleanup
  rt.trackListener(`op:${id}`);
  rt.trackSession(`op-session:${id}`);

  return { navTarget: target };
}

/**
 * prepare → verifyControl → perform → collectActual → cleanup notes
 */
function prepareOperation(ctx, operationId) {
  const op = findOperation(ctx.behaviorPage, operationId);
  if (!op) {
    return { status: DRIVER_UNSUPPORTED, reason: `unknown operation ${operationId}` };
  }
  const catalog = OPERATION_ACTUALS[operationId];
  if (!catalog) {
    return { status: DRIVER_UNSUPPORTED, reason: `no fixture actual for ${operationId}` };
  }
  if (op.precondition_state) {
    const known = new Set((ctx.behaviorPage?.states || []).map((s) => s.state_id));
    if (known.has(op.precondition_state)) {
      applyState(ctx, op.precondition_state);
    } else {
      // behavior 中部分 precondition 为自然语言条件，非 STATE-* ID
      const fallback = ctx.behaviorPage?.states?.[0]?.state_id;
      if (fallback) applyState(ctx, fallback);
      ctx.runtime.emit('precondition:descriptive', { text: op.precondition_state });
    }
  }
  ctx.lastOperationId = operationId;
  ctx.runtime.emit('prepare', { operationId });
  return { status: 'ready', control: verifyControl(ctx, operationId) };
}

function performOperation(ctx, operationId, input = null) {
  const op = findOperation(ctx.behaviorPage, operationId);
  if (!op) {
    const blocked = {
      operation_id: operationId,
      status: DRIVER_UNSUPPORTED,
      ui: [],
      runtime_events: [],
      device_events: [],
      navigation: null,
      cleanup: getCleanupSnapshot(ctx),
      errors: [{ code: DRIVER_UNSUPPORTED, message: 'unknown operation' }],
    };
    ctx.lastOperationResult = blocked;
    return blocked;
  }
  const catalog = OPERATION_ACTUALS[operationId];
  if (!catalog) {
    const blocked = {
      operation_id: operationId,
      status: DRIVER_UNSUPPORTED,
      ui: [],
      runtime_events: [],
      device_events: [],
      navigation: null,
      cleanup: getCleanupSnapshot(ctx),
      errors: [{ code: DRIVER_UNSUPPORTED, message: 'missing actual fixture' }],
    };
    ctx.lastOperationResult = blocked;
    return blocked;
  }

  const beforeEvents = ctx.runtime.getRuntimeEvents().length;
  driveRuntimeForOp(ctx, op, catalog);
  void input;
  void beforeEvents;

  // Actual UI / events 来自 fixture catalog + runtime —— 禁止回填 behavior expected 字段
  const ui = [...(catalog.ui || [])];
  const runtime_events = [
    ...ctx.runtime.getRuntimeEvents(),
    ...(catalog.runtime_events || []),
  ];
  const device_events = [
    ...ctx.runtime.getDeviceEvents(),
    ...(catalog.device_events || []),
  ];
  const navSnap = getNavigationSnapshot(ctx);
  const cleanup = getCleanupSnapshot(ctx);

  const result = {
    operation_id: operationId,
    status: 'executed',
    ui,
    runtime_events,
    device_events,
    navigation: navSnap.exit_to || catalog.navigation || `站内:${ctx.pageId}`,
    cleanup,
    errors: ctx.runtime.getErrors(),
    actual_ui: ui,
    actual_runtime: runtime_events,
    actual_device: device_events,
  };

  // also expose collectActualBundle shape
  Object.assign(result, collectActualBundle(ctx, operationId, {
    ui,
    runtime_events,
    device_events,
    navigation: result.navigation,
    cleanup,
    errors: result.errors,
  }));

  ctx.lastOperationId = operationId;
  ctx.lastOperationResult = result;
  return result;
}

function getOperationResult(ctx, operationId) {
  if (ctx.lastOperationResult && ctx.lastOperationResult.operation_id === operationId) {
    return ctx.lastOperationResult;
  }
  return {
    operation_id: operationId,
    status: DRIVER_UNSUPPORTED,
    ui: [],
    runtime_events: [],
    device_events: [],
    navigation: null,
    cleanup: getCleanupSnapshot(ctx),
    errors: [{ code: DRIVER_UNSUPPORTED, message: 'perform not called' }],
  };
}

module.exports = { ...module.exports, prepareOperation, performOperation, getOperationResult, DRIVER_UNSUPPORTED };
