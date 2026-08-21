<template>
	<view class="container">
		<view class="page-content">
			<view class="card">
				<view class="card-title">诊断</view>

				<view class="diag-row" v-for="d in diagnosticItems" :key="d.key">
					<view class="diag-head">
						<text :class="['diag-dot', d.state]">{{ stateIcon(d.state) }}</text>
						<text class="diag-label">{{ d.label }}</text>
						<text class="diag-state">{{ stateText(d.state) }}</text>
					</view>
					<text v-if="d.detail" class="diag-detail">{{ d.detail }}</text>
				</view>

				<view class="actions">
					<button class="action-btn primary" @click="refresh">重新检测</button>
					<button class="action-btn secondary" @click="toggleAdvanced">
						{{ showAdvanced ? '隐藏错误码' : '显示错误码（详细信息）' }}
					</button>
				</view>

				<view v-if="showAdvanced && lastError" class="error-detail">
					<text class="error-title">最近错误</text>
					<text class="error-code">code: {{ lastError.code || '—' }}</text>
					<text class="error-msg">{{ lastError.message || '—' }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useHidStore } from '../../store/hid';
import { smartHidService } from '../../services/smart-hid/index.js';

const hidStore = useHidStore();
const deviceId = ref('');
const showAdvanced = ref(false);

const diagnosticItems = computed(() => hidStore.diagnostic || [
	{ key: 'ble', label: 'BLE', state: 'pending', detail: '' },
	{ key: 'wifi', label: 'Wi-Fi', state: 'pending', detail: '' },
	{ key: 'hub', label: 'ControlHub', state: 'pending', detail: '' },
	{ key: 'conn', label: '控制连接', state: 'pending', detail: '' },
	{ key: 'usb', label: 'USB HID', state: 'pending', detail: '' }
]);
const lastError = computed(() => hidStore.lastError);

onLoad((opts) => {
	deviceId.value = opts.deviceId ? decodeURIComponent(opts.deviceId) : '';
});

const stateIcon = (s) => s === 'ok' ? '✓' : s === 'warn' ? '!' : s === 'active' ? '…' : '·';
const stateText = (s) => ({ ok: '正常', warn: '异常', active: '检测中', pending: '待检测', fail: '失败' }[s] || s);

const refresh = async () => {
	// V1：读 Device Info + Provision Status（需 BLE 已连接；未连接时提示从配网向导进入）
	uni.showToast({ title: '检测中…', icon: 'none' });
	try {
		const items = await smartHidService.diagnose();
		if (items[0] && items[0].state === 'fail') {
			uni.showModal({ title: 'BLE 未连接', content: '诊断需要 BLE 连接。请返回配网向导重新连接设备后再试。', showCancel: false });
		}
	} catch (e) {
		uni.showToast({ title: e.message || '诊断失败', icon: 'none' });
	}
};

const toggleAdvanced = () => { showAdvanced.value = !showAdvanced.value; };
</script>

<style>
.container { height: 100vh; display: flex; flex-direction: column; background-color: #f7f8fa; }
.page-content { flex: 1; display: flex; flex-direction: column; padding: 30rpx; }
.card { background-color: #fff; border-radius: 16rpx; padding: 24rpx 30rpx; display: flex; flex-direction: column; gap: 20rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; padding-bottom: 12rpx; border-bottom: 2rpx solid #f5f5f5; }
.diag-row { display: flex; flex-direction: column; gap: 6rpx; padding: 10rpx 0; }
.diag-head { display: flex; align-items: center; gap: 16rpx; }
.diag-dot { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: bold; }
.diag-dot.ok { background-color: #34C759; color: #fff; }
.diag-dot.warn { background-color: #FF9500; color: #fff; }
.diag-dot.fail { background-color: #FF3B30; color: #fff; }
.diag-dot.active { background-color: #007AFF; color: #fff; }
.diag-dot.pending { background-color: #eee; color: #999; }
.diag-label { flex: 1; font-size: 28rpx; color: #333; }
.diag-state { font-size: 24rpx; color: #999; }
.diag-detail { font-size: 24rpx; color: #999; padding-left: 56rpx; }
.actions { display: flex; flex-direction: column; gap: 16rpx; margin-top: 10rpx; }
.action-btn { height: 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 500; border: none; }
.action-btn::after { border: none; }
.action-btn.primary { color: #fff; background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%); }
.action-btn.secondary { color: #007AFF; background-color: #E5F1FF; }
.error-detail { background-color: #FFF5F5; border-radius: 12rpx; padding: 20rpx; display: flex; flex-direction: column; gap: 6rpx; }
.error-title { font-size: 24rpx; color: #FF3B30; font-weight: 600; }
.error-code { font-size: 24rpx; color: #FF3B30; font-family: monospace; }
.error-msg { font-size: 24rpx; color: #999; }
</style>
