import { computed, nextTick, ref } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { useBleStore } from '../store/ble';
import { logger } from '../../../core/ble-core/utils/logger';
import {
  connectDevice as connectBleDevice,
  openAdapter as openBleAdapter
} from '../services/ble-runtime/index.js';
import { OTA_UUIDS } from '../utils/ota_manager.js';
import { resolveServicePanelState } from '../services/device-session-ui.js';
import { resolveDeviceRouteContext } from '../services/device-route-context.js';

/**
 * Generic GATT device detail session orchestration.
 * Pages keep UI dialogs / characteristic ops; this owns connect/retry/bind/state.
 */
export function useDeviceSession(options = {}) {
  const maxRetryCount = options.maxRetryCount ?? 3;
  const bleStore = useBleStore();

  const isInitializing = ref(false);
  const isConnecting = ref(false);
  const lastConnectError = ref('');
  const connectionRetryCount = ref(0);
  const autoRetryExhausted = ref(false);
  const isUserDisconnected = ref(false);
  const hasOtaService = ref(false);
  const logScrollTop = ref(0);
  const deviceId = ref('');
  const logs = ref([]);

  let unsubLogger = null;
  let bleSession = null;
  let reconnectTimer = null;
  let pageDisconnectUnsubscribe = null;
  let pageActive = true;

  const storeDevice = computed(() => bleStore.connectedDevicesMap[deviceId.value] || {});
  const deviceInfo = computed(() => storeDevice.value);
  const isConnected = computed(() => Boolean(storeDevice.value.isConnected));
  const services = computed(() => storeDevice.value.services || []);
  const servicePanelState = computed(() => resolveServicePanelState({
    isConnected: isConnected.value,
    isInitializing: isInitializing.value,
    isConnecting: isConnecting.value,
    serviceCount: services.value.length,
    hasError: Boolean(lastConnectError.value),
    autoRetryExhausted: autoRetryExhausted.value
  }));

  const addLog = (type, message) => {
    bleStore.addDeviceLog(deviceId.value, type, message);
    nextTick(() => { logScrollTop.value = 99999; });
  };

  const describeServices = (session) => session.services.map((service) => ({
    ...service,
    characteristics: service.characteristics || []
  }));

  const bindPageSession = (session, { announceConnected = false, announceResume = false } = {}) => {
    bleSession = session;
    const srvs = describeServices(session);
    hasOtaService.value = srvs.some((service) => String(service.uuid).toLowerCase() === OTA_UUIDS.SERVICE_OTA);
    bleStore.bindConnectedSession(
      {
        deviceId: deviceId.value,
        name: deviceInfo.value.name || '未知设备',
        RSSI: deviceInfo.value.RSSI || 0
      },
      session,
      srvs
    );

    pageDisconnectUnsubscribe?.();
    pageDisconnectUnsubscribe = session.onDisconnect(() => {
      if (bleSession !== session) return;
      bleSession = null;
      if (!pageActive) return;
      if (isUserDisconnected.value) {
        addLog('系统', '已手动断开连接');
        return;
      }
      addLog('系统', '设备已断开连接');
      retryConnection();
    });

    connectionRetryCount.value = 0;
    if (announceConnected) {
      addLog('系统', `获取到 ${srvs.length} 个服务`);
      addLog('系统', '设备连接成功');
    }
    if (announceResume) addLog('系统', '已恢复现有连接');
  };

  const connectDevice = async ({ autoRetry = true } = {}) => {
    if (isConnecting.value) return;
    isConnecting.value = true;
    try {
      const existingSession = bleStore.getRuntimeSession(deviceId.value);
      if (existingSession && !existingSession.dead) {
        isUserDisconnected.value = false;
        lastConnectError.value = '';
        autoRetryExhausted.value = false;
        bindPageSession(existingSession, { announceResume: true });
        return;
      }
      addLog('系统', '正在连接...');
      const session = await connectBleDevice(deviceId.value, { timeout: 10000 });
      isUserDisconnected.value = false;
      lastConnectError.value = '';
      autoRetryExhausted.value = false;
      connectionRetryCount.value = 0;
      bindPageSession(session, { announceConnected: true });
    } catch (error) {
      const message = error?.errMsg || error?.message || '未知错误';
      lastConnectError.value = '连接失败: ' + message;
      addLog('错误', lastConnectError.value);
      bleStore.updateDeviceConnectionStatus(deviceId.value, false);
      if (autoRetry) retryConnection();
      else autoRetryExhausted.value = true;
    } finally {
      isConnecting.value = false;
    }
  };

  const retryConnection = () => {
    if (connectionRetryCount.value >= maxRetryCount) {
      autoRetryExhausted.value = true;
      addLog('错误', '自动重连次数达上限，请手动重试');
      return;
    }
    connectionRetryCount.value += 1;
    const delay = connectionRetryCount.value * 2000;
    addLog('系统', `设备断线，将在 ${delay / 1000}s 后进行第 ${connectionRetryCount.value}/${maxRetryCount} 次重连...`);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectDevice({ autoRetry: true });
    }, delay);
  };

  const manualRetryConnection = () => {
    if (isInitializing.value || isConnecting.value) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    connectionRetryCount.value = 0;
    autoRetryExhausted.value = false;
    lastConnectError.value = '';
    isUserDisconnected.value = false;
    connectDevice({ autoRetry: false });
  };

  const initBluetoothAdapter = async () => {
    if (isInitializing.value) return;
    const existingSession = bleStore.getRuntimeSession(deviceId.value);
    if (existingSession && !existingSession.dead) {
      isUserDisconnected.value = false;
      lastConnectError.value = '';
      autoRetryExhausted.value = false;
      bindPageSession(existingSession);
      return;
    }
    isInitializing.value = true;
    lastConnectError.value = '';
    try {
      addLog('系统', '正在初始化蓝牙...');
      await openBleAdapter();
      await connectDevice({ autoRetry: true });
    } catch (error) {
      const message = error?.errMsg || error?.message || '未知错误';
      lastConnectError.value = '蓝牙初始化失败: ' + message;
      addLog('错误', lastConnectError.value);
      retryConnection();
    } finally {
      isInitializing.value = false;
    }
  };

  const toggleConnection = () => {
    if (isConnected.value) {
      isUserDisconnected.value = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      lastConnectError.value = '';
      autoRetryExhausted.value = false;
      bleStore.disconnectConnectedDevice(deviceId.value, { remove: false })
        .catch((error) => {
          isUserDisconnected.value = false;
          addLog('错误', '断开失败: ' + (error?.errMsg || error?.message || '未知错误'));
        });
    } else {
      manualRetryConnection();
    }
  };

  const clearLogs = () => {
    logger.clear(deviceId.value);
    logs.value = [];
    logScrollTop.value = 0;
    addLog('系统', '日志已清除');
  };

  const openFromRoute = (routeOptions = {}) => {
    const parsedDevice = resolveDeviceRouteContext(routeOptions);
    if (!parsedDevice?.deviceId) {
      uni.showModal({
        title: '无法打开设备',
        content: routeOptions?.device ? '设备参数无效，请返回扫描页重新选择。' : '缺少设备参数，请返回扫描页重新选择。',
        showCancel: false,
        success: () => uni.navigateBack()
      });
      return false;
    }

    deviceId.value = parsedDevice.deviceId;
    bleStore.initConnectedDevice(parsedDevice);
    const existingSession = bleStore.getRuntimeSession(deviceId.value);
    if (existingSession && !existingSession.dead) {
      isUserDisconnected.value = false;
      bindPageSession(existingSession, { announceResume: true });
    } else {
      if (storeDevice.value.isConnected) {
        bleStore.updateDeviceConnectionStatus(deviceId.value, false);
      }
      initBluetoothAdapter();
    }

    logs.value = [...logger.getHistory(deviceId.value)];
    unsubLogger = logger.subscribe((entry) => {
      logs.value.unshift(entry);
      nextTick(() => { logScrollTop.value = 99999; });
    }, deviceId.value);
    return true;
  };

  onLoad((routeOptions) => {
    openFromRoute(routeOptions || {});
  });

  onShow(() => {
    pageActive = true;
    if (!deviceId.value) return;
    const existingSession = bleStore.getRuntimeSession(deviceId.value);
    if (existingSession && !existingSession.dead && bleSession !== existingSession) {
      bindPageSession(existingSession);
    }
  });

  onUnload(() => {
    pageActive = false;
    unsubLogger?.();
    unsubLogger = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    pageDisconnectUnsubscribe?.();
    pageDisconnectUnsubscribe = null;
    bleSession = null;
  });

  return {
    deviceId,
    deviceInfo,
    isConnected,
    services,
    servicePanelState,
    isInitializing,
    isConnecting,
    lastConnectError,
    hasOtaService,
    logs,
    logScrollTop,
    getSession: () => bleSession,
    addLog,
    clearLogs,
    toggleConnection,
    manualRetryConnection,
    isPageActive: () => pageActive
  };
}
