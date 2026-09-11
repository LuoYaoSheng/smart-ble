<template>
	<view class="subpage">
		<AppSubnav title="版本记录" />
		<view class="container">
			<view class="card current-card">
				<view class="card-kicker">当前版本</view>
				<view class="current-row">
					<text class="current-version version-name">{{ model.current.version || model.current.display_version }}</text>
				<text class="status-pill">{{ model.current.status }}</text>
			</view>
			<view class="meta-row">
				<text class="meta-label">渠道</text>
				<text class="meta-value">{{ model.current.channel_label }}</text>
			</view>
			<view v-if="model.current.has_release_tag" class="meta-row">
				<text class="meta-label">Release tag</text>
				<text class="meta-value">已登记</text>
			</view>
			<view class="subsection-title">平台状态</view>
			<view class="platform-list">
				<view v-for="p in model.current.platforms" :key="p.key" class="platform-row">
					<text class="platform-name">{{ p.name }}</text>
					<text class="platform-status">{{ formatPlatformStatus(p) }}</text>
				</view>
			</view>
			<view class="action-row" hover-class="action-row-hover" @click="copyVersion">
				<text>复制版本信息</text>
			</view>
		</view>

		<view class="card">
			<view class="card-kicker">当前限制</view>
			<view v-if="model.current.limitations.length" class="limit-list">
				<text v-for="(item, idx) in model.current.limitations" :key="idx" class="limit-item">· {{ item }}</text>
			</view>
			<text v-else class="empty-note">暂无已知限制条目。</text>
		</view>

		<view class="card">
			<view class="card-kicker">正式发布历史</view>
			<view v-if="model.history.releases.length" class="history-list">
				<view v-for="(item, idx) in model.history.releases" :key="'r-' + idx" class="history-item">
					<text class="history-title">{{ item.tag || item.version }}</text>
					<text class="history-sub">{{ item.status }} · {{ item.channel }}</text>
				</view>
			</view>
			<AppEmpty v-else ill="doc" title="暂无正式发布版本" description="产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。" />
			<text v-if="!model.current.has_artifacts" class="empty-note subtle">当前无 Artifact，不提供下载入口。</text>
		</view>

		<view class="card">
			<view class="card-kicker">预览记录</view>
			<view v-if="model.history.previews.length" class="history-list">
				<view v-for="(item, idx) in model.history.previews" :key="'p-' + idx" class="history-item">
					<text class="history-title">{{ item.label }}</text>
					<text class="history-sub">{{ item.status }} · {{ item.channel }}</text>
				</view>
			</view>
			<AppEmpty v-else ill="doc" title="暂无预览记录" />
		</view>

		<view class="footer-note">
			<text>本页数据来自 Release Metadata 投影，不是手写版本事实源。</text>
		</view>
		</view>
	</view>
</template>

<script setup>
import { onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app';
// UI-G2：P010 改挂正典组件层（AppSubnav + AppEmpty）
import AppSubnav from '../../components/ui/AppSubnav.vue';
import AppEmpty from '../../components/ui/AppEmpty.vue';
import { getVersionPageModel } from '../../services/version-metadata.js';

const model = getVersionPageModel();

const formatPlatformStatus = (platform) => {
	if (platform.role === 'REFERENCE') return 'REFERENCE';
	const cap = platform.capability_status;
	const rel = platform.release_status;
	if (cap && rel && cap !== rel) return `${cap} / ${rel}`;
	return platform.display_status || rel || cap || 'NOT_RELEASED';
};

const copyVersion = () => {
	const text = model.current.display_version || model.current.version || 'dev.unknown';
	uni.setClipboardData({
		data: text,
		success: () => uni.showToast({ title: '版本已复制', icon: 'none' }),
		fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
	});
};

onShow(() => uni.pageScrollTo({ scrollTop: 0, duration: 0 }));

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: 'BLE Toolkit+ 版本记录',
	path: '/pages/about/version',
	imageUrl: '/static/logo.png',
}));

onShareTimeline(() => ({
	title: 'BLE Toolkit+ 版本记录',
	query: '',
	imageUrl: '/static/logo.png',
}));
// #endif
</script>

<style>
.container {
	padding: 24rpx;
	background: transparent;
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.card {
	padding: 26rpx;
	border: 1rpx solid var(--ble-line-soft);
	border-radius: 32rpx;
	background: var(--ble-gradient-surface);
	box-shadow: var(--ble-shadow-soft);
}

.card-kicker {
	margin-bottom: 12rpx;
	color: var(--ble-text-muted);
	font-size: 22rpx;
	font-weight: 800;
}

.current-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 12rpx;
}

.current-version {
	color: var(--ble-text);
	font-size: 40rpx;
	font-weight: 800;
}

.status-pill {
	padding: 6rpx 14rpx;
	border-radius: var(--r-round);
	background: rgba(27, 109, 255, 0.1);
	color: var(--ble-brand);
	font-size: 20rpx;
	font-weight: 800;
}

.meta-row,
.platform-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding: 10rpx 0;
}

.meta-label,
.platform-name {
	color: var(--ble-text-muted);
	font-size: 24rpx;
}

.meta-value,
.platform-status {
	color: var(--ble-text);
	font-size: 24rpx;
	font-weight: 700;
	text-align: right;
}

.subsection-title {
	margin: 18rpx 0 8rpx;
	color: var(--ble-text-muted);
	font-size: 22rpx;
	font-weight: 800;
}

.platform-list,
.limit-list,
.history-list {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.limit-item {
	color: var(--ble-text-subtle);
	font-size: 24rpx;
	line-height: 1.5;
}

.history-item {
	padding: 14rpx 0;
	border-top: 1rpx solid rgba(27, 109, 255, 0.08);
}

.history-item:first-child {
	border-top: none;
}

.history-title {
	display: block;
	color: var(--ble-text);
	font-size: 30rpx;
	font-weight: 800;
}

.history-sub {
	display: block;
	margin-top: 4rpx;
	color: var(--ble-text-muted);
	font-size: 22rpx;
}

.empty-note {
	display: block;
	color: var(--ble-text-muted);
	font-size: 24rpx;
	line-height: 1.5;
}

.empty-note.subtle {
	margin-top: 10rpx;
	font-size: 22rpx;
}

.action-row {
	margin-top: 18rpx;
	padding: 16rpx 18rpx;
	border-radius: 18rpx;
	background: rgba(27, 109, 255, 0.08);
	color: var(--ble-brand);
	font-size: 24rpx;
	font-weight: 700;
	text-align: center;
}

.action-row-hover {
	opacity: 0.9;
}

.footer-note {
	padding: 8rpx 6rpx 28rpx;
	color: var(--ble-text-muted);
	font-size: 20rpx;
	text-align: center;
	line-height: 1.5;
}
</style>
