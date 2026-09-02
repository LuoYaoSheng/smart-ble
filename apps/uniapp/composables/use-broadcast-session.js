import { onHide, onUnload } from '@dcloudio/uni-app';
import { computed, ref, shallowRef } from 'vue';
import {
  createBroadcastSession,
  BROADCAST_STATE,
  BROADCAST_OWNER,
  createBroadcastAdapter,
  buildBroadcastPayload,
} from '../services/broadcast/index.js';

/**
 * PAGE-008 Broadcast Workflow composable.
 * Page UI reads session state; platform start/stop go through adapter → session.
 */
export function useBroadcastSession(options = {}) {
  const maxLogs = options.maxLogs ?? 80;
  const owner = options.owner || { type: BROADCAST_OWNER.PAGE, id: 'PAGE-008' };

  const adapter = options.adapter || createBroadcastAdapter({
    platform: options.platform || 'page',
    startAdvertising: options.startAdvertising || (async () => ({})),
    stopAdvertising: options.stopAdvertising || (async () => ({})),
    getState: options.getState,
  });

  const sessionApi = options.session || createBroadcastSession({ adapter });
  const sessionSnap = shallowRef(sessionApi.getSession());
  const logs = ref([]);
  const isSupported = ref(Boolean(options.supported ?? false));

  sessionApi.subscribe((snap) => {
    sessionSnap.value = snap;
  });

  const advertising = computed(() => sessionSnap.value.state === BROADCAST_STATE.ADVERTISING);
  const broadcastState = computed(() => sessionSnap.value.state);
  const pageState = computed(() => {
    const state = sessionSnap.value.state;
    if (state === BROADCAST_STATE.ADVERTISING || state === BROADCAST_STATE.STARTING) return 'Advertising';
    if (state === BROADCAST_STATE.FAILED) return 'Error';
    if (state === BROADCAST_STATE.STOPPED) return 'Stopped';
    return 'Idle';
  });

  const broadcastStateText = computed(() => {
    if (advertising.value) return '广播中';
    if (sessionSnap.value.state === BROADCAST_STATE.FAILED) return '失败';
    if (sessionSnap.value.state === BROADCAST_STATE.STOPPED) return '已停止';
    if (isSupported.value) return '已就绪';
    return '未检测';
  });

  const addLog = (type, message) => {
    logs.value.unshift({
      type,
      message: String(message || ''),
      time: new Date().toLocaleTimeString(),
    });
    if (logs.value.length > maxLogs) logs.value.length = maxLogs;
  };

  const clearLogs = () => {
    logs.value = [];
  };

  const reportBroadcastError = (message) => {
    const text = String(message || '广播操作失败');
    addLog('错误', text);
    if (typeof uni !== 'undefined' && uni?.showToast) {
      uni.showToast({ title: text.slice(0, 40), icon: 'none' });
    }
  };

  const markSupported = (supported) => {
    isSupported.value = Boolean(supported);
  };

  /** @deprecated prefer startBroadcast/stopBroadcast — kept for transitional callers */
  const setAdvertising = (value) => {
    if (!value && advertising.value) {
      return stopBroadcast().catch(() => {});
    }
    return undefined;
  };

  async function startBroadcast(payloadInput, startOptions = {}) {
    try {
      const snap = await sessionApi.startBroadcast(payloadInput, {
        owner,
        ...startOptions,
      });
      addLog('成功', '广播启动成功');
      return snap;
    } catch (error) {
      reportBroadcastError(error?.message || error?.errMsg || '广播启动失败');
      throw error;
    }
  }

  async function stopBroadcast(stopOptions = {}) {
    try {
      const snap = await sessionApi.stopBroadcast({ owner, ...stopOptions });
      addLog('系统', '广播已停止');
      return snap;
    } catch (error) {
      reportBroadcastError(error?.message || error?.errMsg || '停止广播失败');
      throw error;
    }
  }

  async function cleanup() {
    return sessionApi.cleanup({ owner });
  }

  const stopOnLeave = (stopFn) => {
    const runStop = stopFn || (() => cleanup());
    onHide(() => {
      if (!advertising.value) return;
      Promise.resolve()
        .then(() => runStop())
        .catch((error) => reportBroadcastError(error?.message || error?.errMsg || '离开页面时停止广播失败'));
    });
    onUnload(() => {
      if (!advertising.value && sessionSnap.value.state !== BROADCAST_STATE.STARTING) return;
      Promise.resolve()
        .then(() => runStop())
        .catch(() => {});
    });
  };

  return {
    advertising,
    isSupported,
    logs,
    broadcastStateText,
    broadcastState,
    pageState,
    session: sessionApi,
    sessionSnap,
    owner,
    addLog,
    clearLogs,
    reportBroadcastError,
    markSupported,
    setAdvertising,
    stopOnLeave,
    startBroadcast,
    stopBroadcast,
    cleanup,
    buildBroadcastPayload,
    getBroadcastState: () => sessionApi.getBroadcastState(),
    getBroadcastPayload: () => sessionApi.getBroadcastPayload(),
    updatePayload: (input, opts) => sessionApi.updatePayload(input, opts),
    ingestObserverEvent: (event) => sessionApi.ingestObserverEvent(event),
    BROADCAST_STATE,
    BROADCAST_OWNER,
  };
}
