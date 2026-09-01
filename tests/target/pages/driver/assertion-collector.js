// tests/target/pages/driver/assertion-collector.js
/** 收集 Actual 侧断言素材（不做 PASS 判定；判定在 Playwright expect）。 */

function collectActualBundle(ctx, operationId, extras = {}) {
  return {
    operation_id: operationId,
    actual_ui: extras.ui || [],
    actual_runtime: extras.runtime_events || ctx.runtime.getRuntimeEvents(),
    actual_device: extras.device_events || ctx.runtime.getDeviceEvents(),
    navigation: extras.navigation ?? null,
    cleanup: extras.cleanup || null,
    errors: extras.errors || ctx.runtime.getErrors(),
  };
}

module.exports = { ...module.exports, collectActualBundle };
