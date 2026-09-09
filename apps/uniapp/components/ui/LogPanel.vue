<template>
	<view class="log-panel" :class="variant">
		<view class="logbar">
			<view class="bar-title">
				<AppIcon name="log" :size="26" :tone="variant === 'dock' ? 'inkText' : 'sub'" />
				<text>通信日志</text>
			</view>
			<AppButton label="清空" tone="ghost" size="sm" danger-text @tap="$emit('clear')" />
			<AppButton label="导出" tone="ghost" size="sm" icon="copy" @tap="$emit('export')" />
		</view>
		<scroll-view scroll-y class="loglist">
			<view v-if="logs.length === 0" class="logempty">{{ emptyText }}</view>
			<view v-for="(l, i) in logs" :key="i" class="logrow">
				<text class="tm">{{ timeOf(l) }}</text>
				<text class="logchip" :class="'lc-' + keyOf(l.type)">{{ wordOf(l.type) }}</text>
				<text class="msg">{{ msgOf(l) }}</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
// 正典通信日志面板（COMPONENT_CONTRACT C5 · 原型 components.js C.logPanel 单一来源）
// variant: dock（深色 --c-ink，P006 底部）/ card（白卡，P008）· 六色类型 chip · 脱敏由调用侧（F026）完成
// 兼容存量条目形状 {type:中文别名, message, timestamp} 与正典 {type:sys|err|…, msg, time}
import AppIcon from './AppIcon.vue';
import AppButton from './AppButton.vue';

defineProps({
	logs: { type: Array, default: () => [] },
	variant: { type: String, default: 'dock' },
	emptyText: { type: String, default: '暂无日志' }
});
defineEmits(['clear', 'export']);

const TYPE_KEYS = {
	sys: 'sys', err: 'err', read: 'read', write: 'write', recv: 'recv', ok: 'ok',
	'系统': 'sys', '错误': 'err', '读取': 'read', '写入': 'write', '接收': 'recv', '成功': 'ok', '操作': 'write',
	info: 'sys', error: 'err', warning: 'err', success: 'ok', receive: 'recv', send: 'write'
};
const TYPE_WORDS = { sys: '系统', err: '错误', read: '读取', write: '写入', recv: '接收', ok: '成功' };
const keyOf = (t) => TYPE_KEYS[t] || 'sys';
const wordOf = (t) => TYPE_WORDS[keyOf(t)];
const timeOf = (l) => l.timestamp || l.time || '--:--:--';
const msgOf = (l) => l.message || l.msg || '';
</script>

<style scoped>
.log-panel { display: flex; flex-direction: column; border-radius: var(--r-lg); overflow: hidden; }
.log-panel.dock { background: var(--c-ink); color: var(--c-ink-text); }
.log-panel.card { background: var(--c-card); border: 2rpx solid var(--c-line); box-shadow: var(--shadow-1); }
.logbar { display: flex; align-items: center; gap: 16rpx; padding: 18rpx 26rpx; flex-shrink: 0; }
.dock .logbar { border-bottom: 2rpx solid var(--c-ink-line); }
.card .logbar { border-bottom: 2rpx solid var(--c-line-soft); }
.bar-title { display: flex; align-items: center; gap: 12rpx; flex: 1; font-size: var(--fs-cap); font-weight: var(--fw-bold); }
.dock .bar-title { color: var(--c-ink-text); }
.card .bar-title { color: var(--c-sub); }
.loglist { max-height: 440rpx; padding: 12rpx 0; }
.logrow { display: flex; gap: 16rpx; padding: 10rpx 26rpx; font-family: var(--font-mono); font-size: var(--fs-mini); line-height: 1.5; align-items: baseline; }
.tm { color: var(--c-mut); flex-shrink: 0; }
.dock .tm { color: var(--c-review-sub); }
.msg { flex: 1; word-break: break-all; white-space: pre-wrap; }
.dock .msg { color: var(--c-ink-text); }
.card .msg { color: var(--c-sub); }
.logchip { flex-shrink: 0; border-radius: 10rpx; padding: 0 12rpx; font-size: var(--fs-micro); font-weight: var(--fw-bold); line-height: 1.7; }
.lc-sys { background: var(--log-sys-bg); color: var(--log-sys); }
.lc-err { background: var(--log-err-bg); color: var(--log-err); }
.lc-read { background: var(--log-read-bg); color: var(--log-read); }
.lc-write { background: var(--log-write-bg); color: var(--log-write); }
.lc-recv { background: var(--log-recv-bg); color: var(--log-recv); }
.lc-ok { background: var(--log-ok-bg); color: var(--log-ok); }
.dock .lc-sys { background: #1B2536; color: #9FB6D6; }
.dock .lc-err { background: #3A1F26; color: #FF8B94; }
.dock .lc-read { background: #39301C; color: #FFC37E; }
.dock .lc-write { background: #1B2B4A; color: #8FB8FF; }
.dock .lc-recv { background: #2A2344; color: #BBA8FF; }
.dock .lc-ok { background: #14342E; color: #5EE0C4; }
.logempty { padding: 44rpx 26rpx; text-align: center; font-size: var(--fs-cap); color: var(--c-mut); }
.dock .logempty { color: var(--c-review-sub); }
</style>
