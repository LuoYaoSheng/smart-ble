<template>
  <view class="ota-modal" v-if="visible" @touchmove.stop.prevent>
    <view class="ota-modal-content">
      <view class="ota-header">
        <text class="ota-title">固件更新 (OTA)</text>
      </view>
      
      <view class="ota-body">
        <view v-if="!isTransmitting" class="ota-prompt">
          <text class="ota-desc">发现 OTA 升级服务。请选择对应的固件 (.bin) 文件进行刷写。</text>
          
          <button class="ota-select-btn" @click="selectFile">选择文件</button>
          <text v-if="fileName" class="ota-filename">已选择: {{fileName}}</text>
        </view>
        
        <view v-else class="ota-progress-container">
          <text class="ota-progress-text">{{progressPercent}}%</text>
          <progress :percent="progressPercent" stroke-width="12" activeColor="#007AFF" />
          <text class="ota-progress-detail">{{sentBytes}} / {{totalBytes}} Bytes</text>
        </view>
        
        <text v-if="statusText" class="ota-status-text" :class="statusType">{{statusText}}</text>
      </view>

      <view class="ota-footer">
        <button class="ota-btn cancel" @click="cancel" :disabled="isTransmitting && progressPercent < 100">取消</button>
        <button class="ota-btn confirm" type="primary" @click="startOta" :disabled="!fileBuffer || isTransmitting">开始升级</button>
      </view>
    </view>
  </view>
</template>

<script>
import { OtaManager } from '../../utils/ota_manager.js';

export default {
  name: 'OtaDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    deviceId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      fileName: '',
      fileBuffer: null,
      isTransmitting: false,
      sentBytes: 0,
      totalBytes: 0,
      statusText: '',
      statusType: 'info', // info, success, error
      manager: null
    };
  },
  computed: {
    progressPercent() {
      if (this.totalBytes === 0) return 0;
      return Math.floor((this.sentBytes / this.totalBytes) * 100);
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.reset();
      }
    }
  },
  methods: {
    reset() {
      this.fileName = '';
      this.fileBuffer = null;
      this.isTransmitting = false;
      this.sentBytes = 0;
      this.totalBytes = 0;
      this.statusText = '';
      this.statusType = 'info';
      if (this.manager) {
        this.manager.cancel();
        this.manager = null;
      }
    },
    
    selectFile() {
      // #ifdef MP-WEIXIN
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['.bin'],
        success: (res) => {
          const file = res.tempFiles[0];
          this.fileName = file.name;
          this.readFile(file.path);
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
          this.fileName = file.name;
          this.readFile(res.tempFilePaths[0]);
        }
      });
      // #endif
    },
    
    readFile(path) {
      // #ifdef MP-WEIXIN
      wx.getFileSystemManager().readFile({
        filePath: path,
        success: (res) => {
          this.fileBuffer = res.data;
          this.statusText = '文件加载成功，可开始升级';
          this.statusType = 'success';
        },
        fail: (err) => {
          this.statusText = '文件读取失败';
          this.statusType = 'error';
        }
      });
      // #endif
      
      // #ifndef MP-WEIXIN
      uni.getFileSystemManager().readFile({
        filePath: path,
        success: (res) => {
          this.fileBuffer = res.data;
          this.statusText = '文件加载成功，可开始升级';
          this.statusType = 'success';
        },
        fail: (err) => {
          this.statusText = '文件读取失败';
          this.statusType = 'error';
        }
      });
      // #endif
    },

    startOta() {
      if (!this.fileBuffer) return;
      
      this.manager = new OtaManager(this.deviceId, (type, msg) => {
        console.log(`[${type}] ${msg}`);
      });

      this.isTransmitting = true;
      this.statusText = '准备刷写...';
      this.statusType = 'info';

      this.manager.startOta(
        this.fileBuffer,
        (sent, total) => {
          this.sentBytes = sent;
          this.totalBytes = total;
          this.statusText = '正在传输固件...';
        },
        (errMsg) => {
          this.isTransmitting = false;
          this.statusText = `升级失败: ${errMsg}`;
          this.statusType = 'error';
        },
        () => {
          this.isTransmitting = false;
          this.statusText = '升级完毕！';
          this.statusType = 'success';
          setTimeout(() => {
            this.$emit('close');
          }, 2000);
        }
      );
    },

    cancel() {
      if (this.manager) {
        this.manager.cancel();
      }
      this.$emit('close');
    }
  }
}
</script>

<style scoped>
.ota-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}
.ota-modal-content {
  width: 85%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.ota-header {
  padding: 16px;
  background-color: #f8f8f8;
  border-bottom: 1px solid #eee;
  text-align: center;
}
.ota-title {
  font-size: 16px;
  font-weight: bold;
}
.ota-body {
  padding: 20px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.ota-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
  display: block;
}
.ota-select-btn {
  background-color: #f0f0f0;
  color: #333;
  font-size: 14px;
}
.ota-filename {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  word-break: break-all;
  display: block;
}
.ota-progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ota-progress-text {
  font-size: 24px;
  font-weight: bold;
  color: #007AFF;
  margin-bottom: 10px;
}
.ota-progress-detail {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
.ota-status-text {
  font-size: 13px;
  margin-top: 15px;
  text-align: center;
  display: block;
}
.info { color: #007AFF; }
.success { color: #4caf50; }
.error { color: #f44336; }

.ota-footer {
  display: flex;
  border-top: 1px solid #eee;
}
.ota-btn {
  flex: 1;
  border-radius: 0;
  border: none;
  font-size: 15px;
}
.ota-btn::after {
  border: none;
}
.cancel {
  background-color: #fff;
  color: #666;
}
.confirm {
  background-color: #007AFF;
  color: #fff;
}
button[disabled] {
  opacity: 0.5;
}
</style>
