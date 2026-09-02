import { computed, ref } from 'vue';
import { useHidStore } from '../store/hid';
import { useBleStore } from '../store/ble';
import { smartHidService } from '../services/smart-hid/index.js';
import {
  buildProvisionFormCandidate,
  formatControlHubAddress
} from '../services/smart-hid/provision-form.js';
import {
  createSmartHidWorkflow,
  PROVISION_STATE,
} from '../services/smart-hid/workflow-engine.js';
import {
  describeSmartHidStatus,
  smartHidRecoveryAction,
} from '../services/smart-hid/workflow.js';
import { describeScanCodeFailure } from '../services/smart-hid/scan-code-feedback.js';

const STEPS = [
  { key: 'connect', label: '连接' },
  { key: 'configure', label: '填写配置' },
  { key: 'status', label: '查看状态' }
];

const PROGRESS_LABELS = {
  wifi: 'Wi-Fi 连接',
  hub: 'ControlHub 配对',
  conn: 'MQTT 连接',
  usb: '设备控制链路就绪'
};

export function useSmartHidProvisioning() {
  const hidStore = useHidStore();
  const bleStore = useBleStore();
  let disposed = false;
  let keepSessionOnDispose = false;
  let activeWorkflow = null;
  const phase = ref('connect');
  const connecting = ref(false);
  const connectionError = ref('');
  const connectionLost = ref(false);
  const deviceInfoSummary = ref('');
  const wifiSsid = ref('');
  const wifiPassword = ref('');
  const hubAddress = ref('');
  const provisioning = ref(false);
  const provisionDone = ref(false);
  const errorMessage = ref('');
  const recoveryAction = ref('');
  /** PAGE-002 provision state is owned by Smart HID Workflow. */
  const workflowState = ref(PROVISION_STATE.IDLE);

  const currentDevice = computed(() => hidStore.currentDevice);
  const hubInfo = computed(() => hidStore.hubInfo);
  const currentStep = computed(() => Math.max(0, STEPS.findIndex((step) => step.key === phase.value)));
  const progressRows = computed(() => Object.entries(hidStore.progress).map(([key, state]) => ({
    key,
    state,
    label: PROGRESS_LABELS[key] || key
  })));
  const canSubmit = computed(() => Boolean(
    wifiSsid.value.trim() &&
    hubAddress.value.trim() &&
    hubInfo.value?.token &&
    !provisioning.value
  ));
  const pairingReady = computed(() => Boolean(hubInfo.value?.token));

  const resetResult = () => {
    provisioning.value = false;
    provisionDone.value = false;
    errorMessage.value = '';
    recoveryAction.value = '';
    hidStore.resetProgress();
  };

  const connectDevice = async () => {
    const deviceId = currentDevice.value?.deviceId;
    if (!deviceId) {
      connectionError.value = '未选择设备，请返回首页扫描并选择 Smart HID。';
      return;
    }
    phase.value = 'connect';
    connecting.value = true;
    connectionError.value = '';
    try {
      const { info } = await smartHidService.connect(deviceId);
      if (disposed) {
        await smartHidService.disconnect().catch(() => {});
        return;
      }
      deviceInfoSummary.value = info
        ? `${info.device_id} · fw ${info.firmware} · ${info.state}`
        : deviceId;
      phase.value = 'configure';
      connectionLost.value = false;
      bleStore.updateDeviceConnectionStatus(deviceId, true);
    } catch (error) {
      if (disposed) return;
      connectionError.value = error?.message || '连接失败，请靠近设备后重试。';
    } finally {
      connecting.value = false;
    }
  };

  const stopDisconnectWatch = smartHidService.onSessionDisconnect(() => {
    bleStore.updateDeviceConnectionStatus(currentDevice.value?.deviceId, false);
    if (disposed || phase.value !== 'configure') return;
    connectionLost.value = true;
    uni.showToast({ title: '设备连接已断开，请重新连接后再下发', icon: 'none' });
  });

  const initialize = async (options = {}) => {
    disposed = false;
    hidStore.startProvisionSession();
    connectionLost.value = false;
    workflowState.value = PROVISION_STATE.IDLE;
    let requestedId = '';
    try { requestedId = options.deviceId ? decodeURIComponent(options.deviceId) : ''; } catch { requestedId = ''; }
    const requestedDevice = hidStore.smartDevices.find((device) => device.deviceId === requestedId)
      || hidStore.knownDevices.find((device) => device.deviceId === requestedId)
      || (hidStore.currentDevice?.deviceId === requestedId || !requestedId ? hidStore.currentDevice : null);
    if (requestedDevice) hidStore.setCurrentDevice(requestedDevice);
    await connectDevice();
  };

  const scanControlHubQr = () => {
    uni.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (result) => {
        if (disposed) return;
        const payload = smartHidService.parsePairingQrPayload(result.result);
        if (!payload) {
          uni.showModal({
            title: '无法识别配对码',
            content: '请扫描 ControlHub 控制台显示的一次性 Smart HID 配对二维码。',
            showCancel: false
          });
          return;
        }
        hidStore.setHubInfo(payload);
        hubAddress.value = formatControlHubAddress(payload);
      },
      fail: (error) => {
        if (disposed) return;
        const feedback = describeScanCodeFailure(error);
        if (feedback.kind === 'cancel') {
          uni.showToast({ title: feedback.title, icon: 'none' });
          return;
        }
        uni.showModal({
          title: feedback.title,
          content: feedback.content,
          showCancel: false
        });
      }
    });
  };

  const rememberConfiguredDevice = () => {
    const device = currentDevice.value || {};
    hidStore.commitKnownDevice({
      ...device,
      lastWifi: wifiSsid.value,
      lastHub: hubAddress.value
    });
  };

  const provision = async () => {
    if (!hubInfo.value?.token) {
      uni.showToast({ title: '请先扫描 ControlHub 配对码', icon: 'none' });
      return;
    }

    let candidate;
    try {
      candidate = buildProvisionFormCandidate({
        wifiSsid: wifiSsid.value,
        wifiPassword: wifiPassword.value,
        hubAddress: hubAddress.value,
        token: hubInfo.value.token
      });
    } catch (error) {
      uni.showToast({ title: error?.message || '请检查配网信息', icon: 'none' });
      return;
    }

    resetResult();
    phase.value = 'status';
    provisioning.value = true;

    const run = createSmartHidWorkflow({
      discover: async () => {
        const id = currentDevice.value?.deviceId;
        if (!id) throw new Error('未选择设备');
        return { deviceId: id, name: currentDevice.value?.name || 'Smart HID' };
      },
      pair: async () => ({ deviceId: currentDevice.value?.deviceId, paired: true }),
      verify: async () => {
        const { ok, status } = await smartHidService.provisionAndWait(candidate, 60000);
        if (!ok) {
          const err = new Error(describeSmartHidStatus(status));
          err.status = status;
          throw err;
        }
        return {
          deviceId: currentDevice.value?.deviceId,
          verified: true,
          status,
          capabilities: ['provisioning'],
        };
      },
    });
    activeWorkflow = run;
    run.onProvisionEvent(() => {
      workflowState.value = run.getProvisionState();
    });

    try {
      await run.startProvision({
        deviceId: currentDevice.value?.deviceId,
        name: currentDevice.value?.name,
        token: hubInfo.value.token,
        saveProfile: true,
      });
      provisioning.value = false;
      provisionDone.value = true;
      rememberConfiguredDevice();
      workflowState.value = run.getProvisionState();
    } catch (error) {
      provisioning.value = false;
      workflowState.value = run.getProvisionState();
      const message = error?.message || '配网失败';
      if (/取消|页面已关闭/.test(message)) {
        phase.value = 'configure';
        resetResult();
        if (!disposed) uni.showToast({ title: '已取消等待', icon: 'none' });
        return;
      }
      if (error?.status) {
        errorMessage.value = describeSmartHidStatus(error.status);
        recoveryAction.value = smartHidRecoveryAction(error.status);
        return;
      }
      const code = hidStore.lastError?.code || error?.kind || error?.code || '';
      errorMessage.value = message;
      recoveryAction.value = smartHidRecoveryAction(code);
    }
  };

  const cancelWaiting = () => {
    if (!provisioning.value) return;
    activeWorkflow?.cancelProvision?.();
    smartHidService.cancelProvisionWait('用户已取消等待');
    provisioning.value = false;
    phase.value = 'configure';
    resetResult();
    workflowState.value = activeWorkflow?.getProvisionState?.() || PROVISION_STATE.CANCELLED;
    uni.showToast({ title: '已取消等待', icon: 'none' });
  };

  const confirmLeaveIfNeeded = () => new Promise((resolve) => {
    if (!provisioning.value) {
      resolve(true);
      return;
    }
    uni.showModal({
      title: '配网进行中',
      content: '离开将取消等待设备状态。确定离开吗？',
      success: (result) => {
        if (result.confirm) {
          cancelWaiting();
          resolve(true);
          return;
        }
        resolve(false);
      },
      fail: () => resolve(true)
    });
  });

  const recoveryLabel = computed(() => ({
    diagnostics: '进入诊断',
    pairing: '重新扫码',
    form: '修改配置',
    retry: '重新下发'
  }[recoveryAction.value] || '重试'));

  const runRecovery = async () => {
    if (recoveryAction.value === 'diagnostics') {
      uni.navigateTo({ url: `/pages/hid/diagnostics?deviceId=${encodeURIComponent(currentDevice.value?.deviceId || '')}` });
      return;
    }
    if (recoveryAction.value === 'pairing') {
      hidStore.setHubInfo(null);
      phase.value = 'configure';
      resetResult();
      scanControlHubQr();
      return;
    }
    if (recoveryAction.value === 'form') {
      phase.value = 'configure';
      resetResult();
      return;
    }
    if (!smartHidService.isConnected()) {
      resetResult();
      await connectDevice();
      if (phase.value !== 'configure') return;
    }
    provision();
  };

  const goDetail = () => {
    keepSessionOnDispose = true;
    uni.redirectTo({ url: `/pages/hid/detail?deviceId=${encodeURIComponent(currentDevice.value?.deviceId || '')}` });
  };

  const goDevices = async () => {
    const allowed = await confirmLeaveIfNeeded();
    if (!allowed) return;
    uni.switchTab({ url: '/pages/index/index' });
  };

  const dispose = () => {
    disposed = true;
    stopDisconnectWatch();
    bleStore.updateDeviceConnectionStatus(currentDevice.value?.deviceId, false);
    if (provisioning.value) {
      activeWorkflow?.cancelProvision?.();
      smartHidService.cancelProvisionWait('页面已关闭');
    }
    wifiPassword.value = '';
    hidStore.endProvisionSession();
    if (!keepSessionOnDispose) {
      smartHidService.disconnect().catch(() => {});
    }
    keepSessionOnDispose = false;
  };

  return {
    steps: STEPS,
    phase,
    currentStep,
    connecting,
    connectionError,
    connectionLost,
    deviceInfoSummary,
    currentDevice,
    wifiSsid,
    wifiPassword,
    hubAddress,
    pairingReady,
    provisioning,
    provisionDone,
    errorMessage,
    progressRows,
    canSubmit,
    recoveryLabel,
    workflowState,
    provisionState: workflowState,
    initialize,
    connectDevice,
    scanControlHubQr,
    provision,
    cancelWaiting,
    confirmLeaveIfNeeded,
    runRecovery,
    goDetail,
    goDevices,
    dispose
  };
}
