/** Smart HID Provision Status 的业务解释；Workflow 引擎见 workflow-engine.js。 */

import { PROVISIONING_ERROR_HINTS } from '../../../../core/protocols/hid-provisioning-protocol.ts';
import { runProvisionTransaction } from '../provisioning/orchestrator.js';

export { runProvisionTransaction as runSmartHidProvisionTransaction };

export {
  PROVISION_STATE,
  PROVISION_EVENT,
  TOKEN_TTL_MS,
  createMemoryTokenStore,
  createDeviceProfileStore,
  createSmartHidWorkflow,
  runDiagnostic,
  HID_ERROR_CODE,
  createHidError,
} from './workflow-engine.js';

export function classifySmartHidStatus(status) {
  if (!status?.state) return { phase: 'unknown', terminal: false };
  if (status.error) return { phase: 'error', terminal: true, error: status.error };
  if (status.state === 'ready') return { phase: 'ready', terminal: true };
  if (status.state === 'recovery' || status.state === 'error') {
    return { phase: status.state, terminal: true };
  }
  return { phase: status.step || status.state, terminal: false };
}

export function smartHidRecoveryAction(status) {
  const code = typeof status === 'string' ? status : status?.error;
  switch (code) {
    case 'wifi_failed':
    case 'invalid_payload':
      return 'form';
    case 'pairing_invalid':
    case 'pairing_expired':
    case 'pairing_used':
    case 'controlhub_unreachable':
      return 'pairing';
    case 'mqtt_invalid':
      return 'diagnostics';
    default:
      return 'retry';
  }
}

export function describeSmartHidStatus(status) {
  if (!status) return '配网失败';
  if (status.error) return PROVISIONING_ERROR_HINTS[status.error] || `配网失败：${status.error}`;
  if (status.state === 'recovery') return '设备进入恢复模式，请检查配置后重试';
  return `配网未完成（${status.state || 'unknown'}）`;
}

export function createSmartHidStatusWaiters(options = {}) {
  const setTimer = options.setTimer || setTimeout;
  const clearTimer = options.clearTimer || clearTimeout;
  const waiters = new Set();

  const remove = (waiter) => {
    if (!waiters.delete(waiter)) return false;
    clearTimer(waiter.timer);
    return true;
  };

  const waitFor = (predicate, timeoutMs = 60000) => {
    if (typeof predicate !== 'function') throw new Error('status predicate must be a function');
    let waiter;
    const promise = new Promise((resolve, reject) => {
      waiter = { predicate, resolve, reject, timer: null };
      waiter.timer = setTimer(() => {
        if (!remove(waiter)) return;
        reject(new Error(`等待设备状态超时（${timeoutMs}ms）`));
      }, timeoutMs);
      waiters.add(waiter);
    });
    promise.cancel = (reason = '等待已取消') => {
      if (!remove(waiter)) return;
      waiter.reject(new Error(reason));
    };
    promise.catch(() => {});
    return promise;
  };

  const emit = (status) => {
    for (const waiter of [...waiters]) {
      let matched = false;
      try {
        matched = waiter.predicate(status);
      } catch {
        matched = false;
      }
      if (!matched || !remove(waiter)) continue;
      waiter.resolve(status);
    }
  };

  const failAll = (reason) => {
    for (const waiter of [...waiters]) {
      if (!remove(waiter)) continue;
      waiter.reject(new Error(reason));
    }
  };

  return {
    waitFor,
    emit,
    failAll,
    get size() {
      return waiters.size;
    }
  };
}
