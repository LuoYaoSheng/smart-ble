<template>
  <view class="ota-modal" v-if="visible" @touchmove.stop.prevent>
    <view class="ota-modal-content">
      <view class="ota-header">
        <text class="ota-title">固件更新 (OTA)</text>
      </view>
      
      <view class="ota-body">
        <view v-if="!isTransmitting" class="ota-prompt">
          <text class="ota-desc">发现 OTA 升级服务。请选择对应的固件 (.bin) 文件进行刷写。</text>
          
          <button class="ble-btn ble-btn--secondary ble-btn--lg ble-btn--block" @click="selectFile">选择文件</button>
          <text v-if="fileName" class="ota-filename">已选择: {{fileName}}</text>
        </view>
        
        <view v-else class="ota-progress-container">
          <text class="ota-progress-text">{{progressPercent}}%</text>
          <progress :percent="progressPercent" stroke-width="12" activeColor="#1B6DFF" />
          <text class="ota-progress-detail">{{sentBytes}} / {{totalBytes}} Bytes</text>
        </view>
        
        <text v-if="statusText" class="ota-status-text" :class="statusType">{{statusText}}</text>
      </view>

      <view class="ota-footer">
        <button class="ble-btn ble-btn--ghost ble-btn--lg ble-btn--block" :class="{ 'ble-btn--disabled': isTransmitting && progressPercent < 100 }" @click="cancel" :disabled="isTransmitting && progressPercent < 100">取消</button>
        <button class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block" :class="{ 'ble-btn--disabled': !fileBuffer || isTransmitting }" @click="startOta" :disabled="!fileBuffer || isTransmitting">开始升级</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { OtaManager } from '../../utils/ota_manager.js';

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
const isTransmitting = ref(false);
const sentBytes = ref(0);
const totalBytes = ref(0);
const statusText = ref('');
const statusType = ref('info'); // info, success, error
let manager = null;

const progressPercent = computed(() => {
  if (totalBytes.value === 0) return 0;
  return Math.floor((sentBytes.value / totalBytes.value) * 100);
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    reset();
  }
});

const reset = () => {
  fileName.value = '';
  fileBuffer.value = null;
  isTransmitting.value = false;
  sentBytes.value = 0;
  totalBytes.value = 0;
  statusText.value = '';
  statusType.value = 'info';
  if (manager) {
    manager.cancel();
    manager = null;
  }
};

const selectFile = () => {
  // #ifdef MP-WEIXIN
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['.bin'],
    success: (res) => {
      const file = res.tempFiles[0];
      fileName.value = file.name;
      readFile(file.path);
    },
    fail: (err) => {
      console.error("Choose file failed", err);
    }
  });
  // #endif

  // #ifndef MP-WEIXIN
  uni.chooseFile({
    count: 1,
    extension: ['.bin'],
    success: (res) => {
      const file = res.tempFiles[0];
      fileName.value = file.name;
      readFile(res.tempFilePaths[0]);
    }
  });
  // #endif
};

const readFile = (path) => {
  // #ifdef MP-WEIXIN
  wx.getFileSystemManager().readFile({
    filePath: path,
    success: (res) => {
      fileBuffer.value = res.data;
      statusText.value = '文件加载成功，可开始升级';
      statusType.value = 'success';
    },
    fail: (err) => {
      statusText.value = '文件读取失败';
      statusType.value = 'error';
    }
  });
  // #endif
  
  // #ifndef MP-WEIXIN
  uni.getFileSystemManager().readFile({
    filePath: path,
    success: (res) => {
      fileBuffer.value = res.data;
      statusText.value = '文件加载成功，可开始升级';
      statusType.value = 'success';
    },
    fail: (err) => {
      statusText.value = '文件读取失败';
      statusType.value = 'error';
    }
  });
  // #endif
};

const startOta = () => {
  if (!fileBuffer.value) return;
  
  manager = new OtaManager(props.deviceId, (type, msg) => {
    console.log(`[${type}] ${msg}`);
  });

  isTransmitting.value = true;
  statusText.value = '准备刷写...';
  statusType.value = 'info';

  manager.startOta(
    fileBuffer.value,
    (sent, total) => {
      sentBytes.value = sent;
      totalBytes.value = total;
      statusText.value = '正在传输固件...';
    },
    (errMsg) => {
      isTransmitting.value = false;
      statusText.value = `升级失败: ${errMsg}`;
      statusType.value = 'error';
    },
    () => {
      isTransmitting.value = false;
      statusText.value = '升级完毕！';
      statusType.value = 'success';
      setTimeout(() => {
        emit('close');
      }, 2000);
    }
  );
};

const cancel = () => {
  if (manager) {
    manager.cancel();
  }
  emit('close');
};
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
  z-index: 999;
  padding: 32rpx;
}
.ota-modal-content {
  width: 100%;
  background: linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(242,248,255,.96) 100%);
  border-radius: 34rpx;
  overflow: hidden;
  box-shadow: 0 24rpx 60rpx rgba(10,20,35,.18);
}
.ota-header {
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid rgba(20,76,136,.08);
  text-align: center;
}
.ota-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ble-text);
}
.ota-body {
  padding: 30rpx;
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
  font-size: 42rpx;
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
.success { color: #0e9c82; }
.error { color: var(--ble-red); }

.ota-footer {
  display: flex;
  gap: 14rpx;
  padding: 0 30rpx 30rpx;
}
</style>
