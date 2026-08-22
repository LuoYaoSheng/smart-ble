import { computed, ref } from 'vue';
import { useHidStore } from '../store/hid';
import { smartHidService } from '../services/smart-hid/index.js';
import {
  buildProvisionFormCandidate,
  formatControlHubAddress
} from '../services/smart-hid/provision-form.js';
import {
  describeSmartHidStatus,
  smartHidRecoveryAction
} from '../services/smart-hid/workflow.js';

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
  let disposed = false;
  const phase = ref('connect');
  const connecting = ref(false);
  const connectionError = ref('');
  const deviceInfoSummary = ref('');
  const wifiSsid = ref('');
  const wifiPassword = ref('');
  const hubAddress = ref('');
  const provisioning = ref(false);
  const provisionDone = ref(false);
  const errorMessage = ref('');
  const recoveryAction = ref('');

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
    } catch (error) {
      if (disposed) return;
      connectionError.value = error?.message || '连接失败，请靠近设备后重试。';
    } finally {
      connecting.value = false;
    }
  };

  const initialize = async (options = {}) => {
    disposed = false;
    hidStore.startProvisionSession();
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
      fail: () => {}
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
    try {
      const { ok, status } = await smartHidService.provisionAndWait(candidate, 60000);
      provisioning.value = false;
      if (ok) {
        provisionDone.value = true;
        rememberConfiguredDevice();
      } else {
        errorMessage.value = describeSmartHidStatus(status);
        recoveryAction.value = smartHidRecoveryAction(status);
      }
    } catch (error) {
      provisioning.value = false;
      const code = hidStore.lastError?.code || error?.kind || '';
      errorMessage.value = error?.message || '配网失败';
      recoveryAction.value = smartHidRecoveryAction(code);
    }
  };

  const recoveryLabel = computed(() => ({
    diagnostics: '进入诊断',
    pairing: '重新扫码',
    form: '修改配置',
    retry: '重新下发'
  }[recoveryAction.value] || '重试'));

  const runRecovery = () => {
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
    provision();
  };

  const goDetail = () => {
    uni.redirectTo({ url: `/pages/hid/detail?deviceId=${encodeURIComponent(currentDevice.value?.deviceId || '')}` });
  };

  const goDevices = () => uni.switchTab({ url: '/pages/index/index' });

  const dispose = () => {
    disposed = true;
    wifiPassword.value = '';
    hidStore.endProvisionSession();
    smartHidService.disconnect().catch(() => {});
  };

  return {
    steps: STEPS,
    phase,
    currentStep,
    connecting,
    connectionError,
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
    initialize,
    connectDevice,
    scanControlHubQr,
    provision,
    runRecovery,
    goDetail,
    goDevices,
    dispose
  };
}
