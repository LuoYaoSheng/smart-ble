import { onHide, onUnload } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

/**
 * Shared broadcast page helpers that stay platform-agnostic.
 * Platform start/stop APIs remain in the page (#ifdef).
 */
export function useBroadcastSession(options = {}) {
  const maxLogs = options.maxLogs ?? 80;
  const advertising = ref(false);
  const isSupported = ref(false);
  const logs = ref([]);

  const broadcastStateText = computed(() => {
    if (advertising.value) return '广播中';
    if (isSupported.value) return '已就绪';
    return '未检测';
  });

  const addLog = (type, message) => {
    logs.value.unshift({
      type,
      message: String(message || ''),
      time: new Date().toLocaleTimeString()
    });
    if (logs.value.length > maxLogs) logs.value.length = maxLogs;
  };

  const clearLogs = () => {
    logs.value = [];
  };

  const reportBroadcastError = (message) => {
    const text = String(message || '广播操作失败');
    addLog('错误', text);
    uni.showToast({ title: text.slice(0, 40), icon: 'none' });
  };

  const markSupported = (supported) => {
    isSupported.value = Boolean(supported);
  };

  const setAdvertising = (value) => {
    advertising.value = Boolean(value);
  };

  const stopOnLeave = (stopFn) => {
    onHide(() => {
      if (!advertising.value) return;
      Promise.resolve()
        .then(() => stopFn?.())
        .catch((error) => reportBroadcastError(error?.message || error?.errMsg || '离开页面时停止广播失败'));
    });
    onUnload(() => {
      if (!advertising.value) return;
      Promise.resolve()
        .then(() => stopFn?.())
        .catch(() => {});
    });
  };

  return {
    advertising,
    isSupported,
    logs,
    broadcastStateText,
    addLog,
    clearLogs,
    reportBroadcastError,
    markSupported,
    setAdvertising,
    stopOnLeave
  };
}
