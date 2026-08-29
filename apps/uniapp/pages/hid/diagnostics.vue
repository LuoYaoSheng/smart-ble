<template>
	<view class="container">
		<view class="page-content">
			<view class="card">
				<view class="diagnostic-status">
					<text class="diagnostic-status-label">当前状态</text>
					<text class="diagnostic-status-value">{{ diagnosticStateText }}</text>
				</view>
				<view class="diag-row" v-for="d in diagnosticItems" :key="d.key">
					<view class="diag-head">
						<text :class="['diag-dot', d.state]">{{ stateIcon(d.state) }}</text>
						<text class="diag-label">{{ d.label }}</text>
						<text class="diag-state">{{ stateText(d.state) }}</text>
					</view>
					<text v-if="d.detail" class="diag-detail">{{ d.detail }}</text>
				</view>

				<view class="actions">
					<button class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block" :class="{ 'ble-btn--busy': connecting }" :disabled="connecting" @click="refresh">
						{{ connecting ? '连接中…' : '重新检测' }}
					</button>
					<button class="ble-btn ble-btn--secondary ble-btn--lg ble-btn--block" @click="toggleAdvanced">
						{{ showAdvanced ? '隐藏错误码' : '显示错误码（详细信息）' }}
					</button>
					<button class="ble-btn ble-btn--secondary ble-btn--lg ble-btn--block" @click="goDeviceDetail">返回设备详情</button>
					<button class="ble-btn ble-btn--secondary ble-btn--lg ble-btn--block" @click="reconfigure">重新配网</button>
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
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useHidStore } from '../../store/hid';
import { smartHidService } from '../../services/smart-hid/index.js';
import { buildHidDetailUrl, buildHidProvisionUrl } from '../../services/hid-navigation.js';

const hidStore = useHidStore();
const deviceId = ref('');
const showAdvanced = ref(false);
const connecting = ref(false);
const diagnosticState = ref('idle');
let ownsConnection = false;

const diagnosticItems = computed(() => hidStore.diagnostic || [
	{ key: 'ble', label: 'BLE', state: 'pending', detail: '' },
	{ key: 'wifi', label: 'Wi-Fi', state: 'pending', detail: '' },
	{ key: 'hub', label: 'ControlHub', state: 'pending', detail: '' },
	{ key: 'conn', label: '控制连接', state: 'pending', detail: '' },
	{ key: 'usb', label: '设备 Ready 状态', state: 'pending', detail: '' }
]);
const lastError = computed(() => hidStore.lastError);
const diagnosticStateText = computed(() => ({
	idle: '尚未检测',
	connected: '设备已连接，可开始检测',
	checking: '正在读取实时状态',
	live: '实时检测完成',
	offline: '设备未连接',
	error: '检测失败'
}[diagnosticState.value] || '尚未检测'));

onLoad((opts) => {
	deviceId.value = opts.deviceId ? decodeURIComponent(opts.deviceId) : '';
	hidStore.setDiagnostic(null);
	hidStore.clearError();
	const knownDevice = [hidStore.currentDevice, ...hidStore.knownDevices]
		.filter(Boolean)
		.find((device) => device.deviceId === deviceId.value);
	if (knownDevice) hidStore.setCurrentDevice(knownDevice);
	const sessionState = smartHidService.getSessionState();
	diagnosticState.value = sessionState.connected && sessionState.deviceId === deviceId.value ? 'connected' : 'idle';
});
onUnload(() => {
	if (ownsConnection) smartHidService.disconnect().catch(() => {});
});

const stateIcon = (s) => s === 'ok' ? '✓' : s === 'warn' ? '!' : s === 'active' ? '…' : '·';
const stateText = (s) => ({ ok: '正常', warn: '异常', active: '检测中', pending: '待检测', fail: '失败' }[s] || s);

const refresh = async () => {
	const sessionState = smartHidService.getSessionState();
	if (!sessionState.connected || sessionState.deviceId !== deviceId.value) {
		diagnosticState.value = 'offline';
		uni.showModal({
			title: 'BLE 未连接',
			content: '诊断需要重新连接当前设备。请让设备保持可发现状态后继续。',
			confirmText: '连接并检测',
			success: async (result) => {
				if (!result.confirm || !deviceId.value) return;
				connecting.value = true;
				diagnosticState.value = 'checking';
				try {
					await smartHidService.connect(deviceId.value);
					ownsConnection = true;
					await smartHidService.diagnose();
					diagnosticState.value = 'live';
				} catch (error) {
					diagnosticState.value = 'error';
					hidStore.setLastError({ code: error?.kind || 'diagnostic_connect_failed', message: error?.message || '连接失败' });
					uni.showModal({ title: '连接失败', content: error?.message || '请让设备进入配网/恢复模式后重试。', showCancel: false });
				} finally {
					connecting.value = false;
				}
			}
		});
		return;
	}

	connecting.value = true;
	diagnosticState.value = 'checking';
	try {
		await smartHidService.diagnose();
		diagnosticState.value = 'live';
	} catch (e) {
		diagnosticState.value = 'error';
		uni.showToast({ title: e.message || '诊断失败', icon: 'none' });
	} finally {
		connecting.value = false;
	}
};

const toggleAdvanced = () => { showAdvanced.value = !showAdvanced.value; };

// 页面栈感知导航：向导/详情页已在栈中时回退复用，避免叠加新页面实例
const stackHas = (route) => {
	const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
	return stack.some((page) => String(page?.route || '').includes(route));
};

const goDeviceDetail = () => {
	if (!deviceId.value) return;
	if (stackHas('pages/hid/detail')) {
		uni.navigateBack();
		return;
	}
	uni.navigateTo({ url: buildHidDetailUrl(deviceId.value) });
};

const reconfigure = () => {
	uni.showModal({
		title: '重新配网',
		content: '已完成配置（READY）的设备会关闭蓝牙广播。请先让设备进入配网/恢复模式（参考设备说明书），确认后再继续。',
		confirmText: '已进入配网模式',
		cancelText: '取消',
		success: (result) => {
			if (!result.confirm || !deviceId.value) return;
			if (stackHas('pages/hid/add')) {
				uni.navigateBack();
				return;
			}
			uni.navigateTo({ url: buildHidProvisionUrl(deviceId.value) });
		}
	});
};
</script>

<style>
.container { min-height: 100vh; background: transparent; }
.page-content { padding: 20rpx; }
.card { background: var(--ble-gradient-surface); border-radius: var(--ble-radius-lg); padding: 22rpx; display: flex; flex-direction: column; gap: 14rpx; border: 1rpx solid var(--ble-line-soft); box-shadow: var(--ble-shadow-soft); }
.diagnostic-status { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 4rpx 0 12rpx; border-bottom: 1rpx solid var(--ble-line-faint); }
.diagnostic-status-label { color: var(--ble-text-muted); font-size: 22rpx; }
.diagnostic-status-value { color: var(--ble-brand); font-size: 23rpx; font-weight: 700; }
.diag-row { display: flex; flex-direction: column; gap: 8rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--ble-line-faint); }
.diag-row:last-of-type { border-bottom: none; }
.diag-head { display: flex; align-items: center; gap: 16rpx; }
.diag-dot { width: 42rpx; height: 42rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; }
.diag-dot.ok { background: rgba(23,199,168,.18); color: #0e9c82; }
.diag-dot.warn { background: rgba(255,159,67,.18); color: #d37a12; }
.diag-dot.fail { background: rgba(242,85,95,.16); color: var(--ble-red); }
.diag-dot.active { background: rgba(27,109,255,.12); color: var(--ble-brand); }
.diag-dot.pending { background: rgba(96,117,141,.08); color: var(--ble-text-muted); }
.diag-label { flex: 1; font-size: 27rpx; color: var(--ble-text); font-weight: 600; }
.diag-state { font-size: 23rpx; color: var(--ble-text-muted); }
.diag-detail { font-size: 23rpx; line-height: 1.55; color: var(--ble-text-subtle); padding-left: 58rpx; }
.actions { display: flex; flex-direction: column; gap: 14rpx; margin-top: 10rpx; }
.error-detail { background: rgba(242,85,95,.08); border-radius: 24rpx; padding: 20rpx; display: flex; flex-direction: column; gap: 8rpx; border: 1rpx solid rgba(242,85,95,.12); }
.error-title { font-size: 24rpx; color: var(--ble-red); font-weight: 700; }
.error-code { font-size: 23rpx; color: var(--ble-red); font-family: "SF Mono", "Roboto Mono", Menlo, monospace; }
.error-msg { font-size: 23rpx; line-height: 1.55; color: var(--ble-text-subtle); }
</style>
