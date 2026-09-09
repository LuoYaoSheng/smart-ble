<template>
	<view class="service-panel">
		<!-- 五态：idle / connecting / ready / empty / error -->
		<view v-if="state === 'idle' || state === 'connecting'" class="op">
			<view class="op-spin"></view>
			<view class="op-body">
				<view class="op-t">{{ state === 'idle' ? '未初始化' : '连接中…' }}</view>
				<view class="op-d">{{ state === 'idle' ? idleText : connectingText }}</view>
			</view>
		</view>

		<view v-else-if="state === 'empty'" class="op">
			<AppStatusIcon state="warn" :size="48" />
			<view class="op-body">
				<view class="op-t warn">服务发现完成 · 列表为空</view>
				<view class="op-d">{{ emptyText || '该设备未暴露任何 GATT 服务（或权限受限）。' }}</view>
			</view>
		</view>

		<view v-else-if="state === 'error'" class="op">
			<AppStatusIcon state="fail" :size="48" />
			<view class="op-body">
				<view class="op-t fail">连接失败</view>
				<view class="op-d">{{ errorText || '连接超时（10s），已自动重试 3 次仍未成功。' }}</view>
				<view class="op-act"><AppButton label="重试" tone="ghost" size="sm" icon="refresh" @tap="$emit('retry')" /></view>
			</view>
		</view>

		<view v-else-if="state === 'ready'">
			<view v-for="(sv, i) in services" :key="sv.uuid" class="svc" :class="{ open: isOpen(i) }">
				<view class="svc-h" hover-class="svc-h-hover" :hover-stay-time="80" @click="$emit('toggleService', i)">
					<AppIcon :name="sv.ota ? 'dl' : 'chip'" :size="30" :tone="sv.ota ? 'danger' : 'primary'" />
					<text class="svc-nm">{{ sv.name || '服务 ' + (i + 1) }}</text>
					<AppChip :text="String(sv.uuid).slice(0, 8) + '…'" tone="mono" />
					<view class="chev"><AppIcon name="chev-r" :size="28" tone="mut" :rotate="isOpen(i) ? 90 : 0" /></view>
				</view>
				<view v-if="isOpen(i)" class="svc-b">
					<view v-for="ch in sv.chars" :key="ch.uuid" class="char">
						<view class="char-r1">
							<text class="char-nm">{{ ch.name || '特征值' }}</text>
							<AppChip v-if="ch.props.read" text="read" tone="primary" />
							<AppChip v-if="ch.props.write" text="write" tone="success" />
							<AppChip v-if="ch.props.notify" text="notify" tone="warning" />
						</view>
						<view class="char-r2">
							<AppButton v-if="ch.props.read" label="读取" tone="soft" size="sm" @tap="$emit('read', ch)" />
							<AppButton v-if="ch.props.write" label="写入" tone="soft" size="sm" @tap="$emit('write', ch)" />
							<AppButton v-if="ch.props.notify" :label="notifying[ch.uuid] ? '停止监听' : '开始监听'" tone="ghost" size="sm" @tap="$emit('notify', ch)" />
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
// 正典 GATT 服务树（COMPONENT_CONTRACT C4 · 原型 p006 服务面板五态）
import AppIcon from './AppIcon.vue';
import AppChip from './AppChip.vue';
import AppButton from './AppButton.vue';
import AppStatusIcon from './AppStatusIcon.vue';

const props = defineProps({
	state: { type: String, default: 'idle' }, // idle|connecting|ready|empty|error
	services: { type: Array, default: () => [] },
	expanded: { type: Object, default: () => ({}) },
	notifying: { type: Object, default: () => ({}) },
	errorText: { type: String, default: '' },
	emptyText: { type: String, default: '' },
	idleText: { type: String, default: '点击「连接设备」建立 GATT 会话。' },
	connectingText: { type: String, default: '正在连接设备（10s 超时 · 失败自动重试 3 次）' }
});
defineEmits(['toggleService', 'read', 'write', 'notify', 'retry']);

const isOpen = (i) => !!props.expanded[i];
</script>

<style scoped>
/* op 态卡（B7 op-state 内联化） */
.op { display: flex; gap: 24rpx; align-items: flex-start; background: var(--c-card); border: 2rpx solid var(--c-line); border-radius: var(--r-lg); padding: var(--sp-4); }
.op-spin { width: 40rpx; height: 40rpx; border: 5rpx solid var(--c-primary-weak); border-top-color: var(--c-primary); border-radius: 50%; animation: svc-spin 0.8s linear infinite; flex-shrink: 0; margin-top: 2rpx; }
@keyframes svc-spin { to { transform: rotate(360deg); } }
.op-t { font-size: var(--fs-h2); font-weight: var(--fw-bold); margin-bottom: 6rpx; color: var(--c-text); }
.op-t.warn { color: var(--c-warning-deep); }
.op-t.fail { color: var(--c-danger); }
.op-d { font-size: var(--fs-body); color: var(--c-sub); line-height: 1.55; }
.op-act { margin-top: 20rpx; }

/* 服务树 */
.svc { background: var(--c-card); border: 2rpx solid var(--c-line); border-radius: var(--r-lg); overflow: hidden; box-shadow: var(--shadow-1); margin-bottom: var(--sp-3); }
.svc-h { display: flex; align-items: center; gap: 18rpx; padding: 24rpx 28rpx; }
.svc-h-hover { background: var(--c-bg); }
.svc-nm { font-size: var(--fs-h2); font-weight: var(--fw-bold); flex: 1; color: var(--c-text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chev { display: flex; align-items: center; }
.svc-b { border-top: 2rpx solid var(--c-line-soft); }
.char { padding: 20rpx 28rpx; border-bottom: 2rpx solid var(--c-line-soft); }
.char:last-child { border-bottom: none; }
.char-r1 { display: flex; align-items: center; gap: 16rpx; }
.char-nm { font-size: var(--fs-body); font-weight: var(--fw-med); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--c-text); }
.char-r2 { display: flex; gap: 12rpx; margin-top: 16rpx; }
</style>
