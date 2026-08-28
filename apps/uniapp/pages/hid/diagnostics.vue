<template>
	<view class="container">
		<view class="page-content">
			<view class="card ble-card">
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
						<button class="action-btn primary" :disabled="connecting" @click="refresh">{{ connecting ? '连接中…' : '重新检测' }}</button>
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
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useHidStore } from '../../store/hid';
import { smartHidService } from '../../services/smart-hid/index.js';

const hidStore = useHidStore();
const deviceId = ref('');
const showAdvanced = ref(false);
const connecting = ref(false);
// 会话所有权：只有本页自己建立的连接才允许在卸载时断开，
// 避免杀死配网向导（pages/hid/add）仍在使用的共享会话。
let connectedHere = false;

const diagnosticItems = computed(() => hidStore.diagnostic || [
	{ key: 'ble', label: 'BLE', state: 'pending', detail: '' },
	{ key: 'wifi', label: 'Wi-Fi', state: 'pending', detail: '' },
	{ key: 'hub', label: 'ControlHub', state: 'pending', detail: '' },
	{ key: 'conn', label: '控制连接', state: 'pending', detail: '' },
	{ key: 'usb', label: '设备 Ready 状态', state: 'pending', detail: '' }
]);
const lastError = computed(() => hidStore.lastError);

onLoad((opts) => {
	deviceId.value = opts.deviceId ? decodeURIComponent(opts.deviceId) : '';
});
onUnload(() => {
	if (!connectedHere) return;
	const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
	const provisionOwnerAlive = stack.some((page) => String(page?.route || '').includes('pages/hid/add'));
	if (!provisionOwnerAlive) smartHidService.disconnect().catch(() => {});
});

const stateIcon = (s) => s === 'ok' ? '✓' : s === 'warn' ? '!' : s === 'active' ? '…' : '·';
const stateText = (s) => ({ ok: '正常', warn: '异常', active: '检测中', pending: '待检测', fail: '失败' }[s] || s);

const refresh = async () => {
	// V1：读 Device Info + Provision Status（需 BLE 已连接；未连接时提示从配网向导进入）
	uni.showToast({ title: '检测中…', icon: 'none' });
	try {
		const items = await smartHidService.diagnose();
		if (items[0] && items[0].state === 'fail') {
			uni.showModal({
				title: 'BLE 未连接',
				content: '诊断需要设备处于可发现状态（已完成配置的 READY 设备会关闭蓝牙广播）。是否尝试重新连接？',
				confirmText: '尝试连接',
				success: async (result) => {
					if (!result.confirm || !deviceId.value) return;
					connecting.value = true;
					try {
						await smartHidService.connect(deviceId.value);
						connectedHere = true;
						await smartHidService.diagnose();
					} catch (error) {
						uni.showModal({ title: '连接失败', content: `${error?.message || '无法连接设备。'}\n提示：已完成配置（READY）的设备会关闭蓝牙广播，需先让它进入配网/恢复模式。`, showCancel: false });
					} finally {
						connecting.value = false;
					}
				}
			});
		}
	} catch (e) {
		uni.showToast({ title: e.message || '诊断失败', icon: 'none' });
	}
};

const toggleAdvanced = () => { showAdvanced.value = !showAdvanced.value; };
</script>

<style>
.container { min-height: 100vh; background: transparent; }
.page-content { padding: 28rpx; }
/* 卡片配方（渐变/描边/圆角/阴影）走 ble-card */
.card { padding: 28rpx; display: flex; flex-direction: column; gap: 20rpx; }
.card-title { font-size: 30rpx; font-weight: 700; color: var(--ble-text); padding-bottom: 12rpx; border-bottom: 1rpx solid rgba(20,76,136,.08); }
.diag-row { display: flex; flex-direction: column; gap: 8rpx; padding: 12rpx 0; border-bottom: 1rpx solid rgba(20,76,136,.06); }
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
.action-btn { height: 84rpx; border-radius: 999rpx; font-size: 27rpx; font-weight: 700; border: none; }
.action-btn::after { border: none; }
.action-btn.primary { color: #fff; background: var(--ble-gradient-brand); }
.action-btn.secondary { color: var(--ble-brand); background: rgba(27,109,255,.08); }
.error-detail { background: rgba(242,85,95,.08); border-radius: 24rpx; padding: 20rpx; display: flex; flex-direction: column; gap: 8rpx; border: 1rpx solid rgba(242,85,95,.12); }
.error-title { font-size: 24rpx; color: var(--ble-red); font-weight: 700; }
.error-code { font-size: 23rpx; color: var(--ble-red); font-family: "SF Mono", "Roboto Mono", Menlo, monospace; }
.error-msg { font-size: 23rpx; line-height: 1.55; color: var(--ble-text-subtle); }
</style>
