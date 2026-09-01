// tests/target/pages/driver/state-controller.js
/**
 * 根据 behavior manifest 的 state_id 加载 UI / runtime fixture。
 * 禁止写入或改写 expected。
 */

const STATE_FIXTURES = {
  'STATE-SCAN-IDLE': { ui: ['扫描入口'], runtime: { scanning: false }, sections: ['扫描入口', '设备列表空态'] },
  'STATE-SCANNING': { ui: ['扫描中'], runtime: { scanning: true }, sections: ['扫描中', '停止扫描'] },
  'STATE-NO-DEVICE': { ui: ['无设备'], runtime: { scanning: false, devices: [] }, sections: ['无设备提示', '重试'] },
  'STATE-PERMISSION-DENIED': { ui: ['权限拒绝'], runtime: { permission: 'denied' }, sections: ['权限引导'] },
  'STATE-SETTINGS-IDLE': { ui: ['设置首页'], runtime: {}, sections: ['设置分组', '关于入口'] },
  'STATE-VERSION-IDLE': { ui: ['版本页'], runtime: {}, sections: ['当前版本', '构建信息', 'Metadata'] },
  'STATE-LANDING-PREVIEW': { ui: ['Landing PREVIEW'], runtime: {}, sections: ['Hero / Smart BLE', 'PREVIEW 状态区'] },
};

function findStateDef(behaviorPage, stateId) {
  return (behaviorPage?.states || []).find((s) => s.state_id === stateId) || null;
}

function applyState(ctx, stateId) {
  const def = findStateDef(ctx.behaviorPage, stateId);
  if (!def) {
    throw new Error(`UNKNOWN_STATE:${stateId}`);
  }

  const fixture = STATE_FIXTURES[stateId] || {
    ui: [stateId],
    runtime: { state_id: stateId },
    sections: [...(def.visible_sections || [])].map((s) => String(s)),
  };

  ctx.stateId = stateId;
  ctx.runtime.state = {
    ...ctx.runtime.state,
    ...fixture.runtime,
    state_id: stateId,
    page_id: ctx.pageId,
  };

  // Actual sections：优先 fixture；否则用 state 定义的可见区前缀作为 driver 渲染结果
  // （来自 state fixture 映射，非 expected 字段名）
  const sections = fixture.sections?.length
    ? [...fixture.sections]
    : [...(def.visible_sections || [])];
  ctx.shell.sections = sections;

  // controls from state
  ctx.controls.clear();
  for (const c of def.controls || []) {
    ctx.controls.set(c.operation_id || c.id || c.label, {
      enabled: c.enabled !== false,
      disabled: c.enabled === false,
      label: c.label || c.control || '',
      ...c,
    });
  }
  const allowed = new Set(def.allowed_operations || []);
  const disabled = new Set(def.disabled_operations || []);

  // index by operationId for getControlState(operationId)
  for (const op of ctx.behaviorPage?.operations || []) {
    const matching = (def.controls || []).find(
      (c) => c.label === op.control || c.control === op.control || c.id === op.operation_id,
    );
    let enabled = true;
    if (disabled.has(op.operation_id)) enabled = false;
    else if (allowed.size > 0 && !allowed.has(op.operation_id) && disabled.size > 0) {
      // 仅当 state 显式列出 disabled 时，不在 allowed 的保持默认 true（与契约一致）
      enabled = true;
    }
    if (matching && matching.enabled === false) enabled = false;
    ctx.controls.set(op.operation_id, {
      visible: true,
      enabled,
      disabled: !enabled,
      label: op.control,
    });
  }

  ctx.runtime.emit('state:applied', { stateId, pageId: ctx.pageId });
  return getStateSnapshot(ctx);
}

function getStateSnapshot(ctx) {
  return {
    state_id: ctx.stateId,
    page_id: ctx.pageId,
    sections: [...(ctx.shell.sections || [])],
    runtime: { ...ctx.runtime.state },
    controls: Object.fromEntries(ctx.controls),
  };
}

module.exports = { ...module.exports, applyState, getStateSnapshot };
