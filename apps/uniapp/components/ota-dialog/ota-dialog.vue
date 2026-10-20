<template>
  <view class="ota-modal" v-if="visible" @touchmove.stop.prevent>
    <view class="ota-modal-content">
      <view class="ota-header">
        <text class="ota-title">固件更新 (OTA)</text>
      </view>

      <!-- P-03 预警（PATTERN §75 / N-MAC·F-MAC 同款逐字） -->
      <view class="ota-warn">
        <AppIcon name="warn" :size="26" tone="warningDeep" />
        <text class="ota-warn-text">仅适用于支持本项目 OTA 协议的设备。请使用匹配硬件的固件和 manifest，升级时保持连接及供电。</text>
      </view>

      <view class="ota-body">
        <view v-if="!isTransmitting" class="ota-prompt">
          <text class="ota-desc">选择固件 (.bin) 和对应 manifest，校验通过后开始传输；重启并核验实际版本后显示升级成功。</text>
          
          <button class="ble-btn ble-btn--secondary ble-btn--lg ble-btn--block" @click="selectFile">选择文件</button>
          <text v-if="fileName" class="ota-filename">已选择: {{fileName}}</text>
          <button class="ble-btn ble-btn--secondary ble-btn--lg ble-btn--block" @click="selectManifest">选择 manifest</button>
          <text v-if="manifestName" class="ota-filename">manifest: {{manifestName}}</text>
        </view>
        
        <view v-else class="ota-progress-container">
          <text class="ota-progress-text">{{progressPercent}}%</text>
          <progress :percent="progressPercent" stroke-width="12" activeColor="#1B6DFF" />
          <text class="ota-progress-detail">{{sentBytes}} / {{totalBytes}} Bytes</text>
        </view>
        
        <text v-if="statusText" class="ota-status-text" :class="statusType">{{statusText}}</text>
      </view>

      <view class="ota-footer">
        <button class="ble-btn ble-btn--ghost ble-btn--lg ble-btn--block" :class="{ 'ble-btn--busy': isTransmitting }" @click="cancel">取消</button>
        <button class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block" :class="{ 'ble-btn--disabled': !packageReady, 'ble-btn--busy': isTransmitting }" @click="startOta" :disabled="!packageReady || isTransmitting">开始升级</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { OtaManager } from '../../utils/ota_manager.js';
import AppIcon from '../ui/AppIcon.vue';
import { chooseFirmwareFile } from '../../services/ota/firmware-file-picker.js';
import { validateFirmwarePackage } from '../../services/ota/package-validator.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  deviceId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['close']);

const fileName = ref('');
const fileBuffer = ref(null);
const manifestJson = ref(null);
const manifestName = ref('');
const packageReady = ref(false);
let revision = 0;
const isTransmitting = ref(false);
const sentBytes = ref(0);
const totalBytes = ref(0);
const statusText = ref('');
const statusType = ref('info'); // info, success, error
let manager = null;
let cleanup = Promise.resolve();

const progressPercent = computed(() => {
  if (totalBytes.value === 0) return 0;
  return statusType.value === 'success' && !isTransmitting.value ? 100 : Math.min(99, Math.floor((sentBytes.value / totalBytes.value) * 100));
});

watch(() => props.visible, (newVal) => {
  if (newVal) reset();
  else if (manager) {
    revision++;
    const previous = manager; manager = null;
    cleanup = cleanup.then(() => previous.cancel()).catch(() => {});
  }
});

const reset = () => {
  revision++;
  manifestJson.value = null;
  manifestName.value = '';
  packageReady.value = false;
  fileName.value = '';
  fileBuffer.value = null;
  isTransmitting.value = false;
  sentBytes.value = 0;
  totalBytes.value = 0;
  statusText.value = '';
  statusType.value = 'info';
  if (manager) {
    const previous = manager; manager = null;
    cleanup = cleanup.then(() => previous.cancel()).catch(() => {});
  }
};

const validateSelection = async (current) => {
  packageReady.value = false;
  if (!fileBuffer.value || !manifestJson.value) { statusText.value = '请选择固件和对应 manifest'; statusType.value = 'info'; return; }
  const result = await validateFirmwarePackage({ binary: fileBuffer.value, manifest: manifestJson.value });
  if (current !== revision) return;
  packageReady.value = result.valid;
  statusText.value = result.valid ? '包校验通过，可开始升级' : `包校验失败：${result.errors[0]?.message || '无效固件'}`;
  statusType.value = result.valid ? 'info' : 'error';
};
const selectPackageFile = async (extension) => {
  if (isTransmitting.value) return;
  const current = ++revision;
  packageReady.value = false;
  try {
    const selected = await chooseFirmwareFile(extension);
    if (current !== revision) return;
    if (!selected) { await validateSelection(current); return; }
    if (extension === '.bin') { fileBuffer.value = selected.data; fileName.value = selected.name; }
    else { manifestJson.value = JSON.parse(selected.data); manifestName.value = selected.name; }
    await validateSelection(current);
  } catch (error) {
    if (current !== revision) return;
    if (extension === '.json') manifestJson.value = null;
    else fileBuffer.value = null;
    statusText.value = error.message || '文件读取失败'; statusType.value = 'error';
  }
};
const selectFile = () => selectPackageFile('.bin');
const selectManifest = () => selectPackageFile('.json');

const startOta = async () => {
  if (!packageReady.value || isTransmitting.value) return;
  const current = revision;
  isTransmitting.value = true;
  await cleanup;
  if (current !== revision) return;
  manager = new OtaManager(props.deviceId, (type, msg) => {
    console.log(`[${type}] ${msg}`);
  });

  isTransmitting.value = true;
  statusText.value = '准备刷写...';
  statusType.value = 'info';

  manager.startOta(
    { binary: fileBuffer.value, manifest: manifestJson.value },
    (sent, total, meta) => {
      if (current !== revision) return;
      sentBytes.value = sent;
      totalBytes.value = total;
      if (meta?.phase === 'confirm') {
        statusText.value = '传输完成，等待设备确认...';
      } else if (meta?.phase === 'device') {
        statusText.value = '设备正在处理固件...';
      } else {
        statusText.value = '正在传输固件...';
      }
    },
    (errMsg) => {
      if (current !== revision) return;
      isTransmitting.value = false;
      statusText.value = `升级失败: ${errMsg}`;
      statusType.value = 'error';
    },
    () => {
      if (current !== revision) return;
      isTransmitting.value = false;
      statusText.value = '升级完成，实际固件版本已核验';
      statusType.value = 'success';
      setTimeout(() => {
        if (current === revision) emit('close');
      }, 2000);
    }
  );
};

const cancel = () => {
  revision++;
  if (manager) {
    const previous = manager; manager = null;
    cleanup = cleanup.then(() => previous.cancel()).catch(() => {});
  }
  emit('close');
};
watch(() => props.deviceId, () => reset());
onBeforeUnmount(() => { revision++; manager?.cancel(); });
</script>

<style scoped>
.ota-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(10, 20, 35, 0.42);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-modal);
  padding: 32rpx;
}
.ota-modal-content {
  width: 100%;
  background: var(--ble-gradient-surface);
  border-radius: var(--ble-radius-lg);
  overflow: hidden;
  box-shadow: var(--ble-shadow-modal);
}
.ota-warn {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	padding: 14rpx 20rpx;
	border-radius: var(--ble-radius-md, 18rpx);
	background: var(--c-warning-weak);
	color: var(--c-warning-deep);
}

.ota-warn-text {
	flex: 1;
	font-size: 22rpx;
	line-height: 1.5;
}

.ota-header {
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--ble-line-soft);
  text-align: center;
}
.ota-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ble-text);
}
.ota-body {
  padding: 32rpx;
  min-height: 260rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16rpx;
}
.ota-desc {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--ble-text-subtle);
  margin-bottom: 16rpx;
  display: block;
}
.ota-filename {
  font-size: 22rpx;
  color: var(--ble-text-muted);
  margin-top: 8rpx;
  word-break: break-all;
  display: block;
}
.ota-progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ota-progress-text {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--ble-brand);
  margin-bottom: 12rpx;
}
.ota-progress-detail {
  font-size: 22rpx;
  color: var(--ble-text-muted);
  margin-top: 10rpx;
}
.ota-status-text {
  font-size: 22rpx;
  margin-top: 10rpx;
  text-align: center;
  display: block;
}
.info { color: var(--ble-brand); }
.success { color: var(--c-success-deep); } /* #0e9c82 → #0E9A80 圈外值收敛 UI-CONV 2026-09-10 */
.error { color: var(--ble-red); }

.ota-footer {
  display: flex;
  gap: 14rpx;
  padding: 0 32rpx 32rpx;
}
</style>
