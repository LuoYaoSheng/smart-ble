/**
 * Derive the service panel presentation state for the generic device detail page.
 * @returns {'idle'|'connecting'|'ready'|'empty'|'error'}
 */
export function resolveServicePanelState({
  isConnected = false,
  isInitializing = false,
  isConnecting = false,
  serviceCount = 0,
  hasError = false,
  autoRetryExhausted = false
} = {}) {
  if (isInitializing || isConnecting) return 'connecting';
  if (isConnected && serviceCount > 0) return 'ready';
  if (isConnected && serviceCount === 0) return 'empty';
  if (hasError || autoRetryExhausted) return 'error';
  return 'idle';
}

export function describeServicePanelState(state, { errorMessage = '' } = {}) {
  switch (state) {
    case 'connecting':
      return {
        title: '正在连接并发现服务',
        description: '请靠近设备稍候。完成后这里会展示 GATT 服务树。',
        showRetry: false
      };
    case 'empty':
      return {
        title: '未发现可用服务',
        description: '设备已连接，但当前没有可读的 GATT 服务。可断开后重试，或确认设备已广播服务。',
        showRetry: true
      };
    case 'error':
      return {
        title: '连接或发现服务失败',
        description: errorMessage || '请靠近设备后手动重试。',
        showRetry: true
      };
    case 'idle':
      return {
        title: '尚未连接设备',
        description: '点击上方“连接设备”后，这里会显示服务与特征值。',
        showRetry: false
      };
    default:
      return { title: '', description: '', showRetry: false };
  }
}
