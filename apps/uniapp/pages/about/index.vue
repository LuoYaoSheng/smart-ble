<template>
	<view class="ble-shell about-shell">
		<AppNavbar kicker="ABOUT" title="关于">
			<template #status>
				<AppChip :text="appVersion" tone="mono" />
			</template>
		</AppNavbar>

		<view class="ble-content page-content">
		<scroll-view scroll-y class="page-scroll">
		<view class="container">
		<view class="header">
			<view class="logo-box"><AppIcon name="bt" :size="36" tone="card" /></view>
		<view class="brand-copy">
			<text class="app-name">{{ product.name }}</text>
			<text class="version">{{ appVersion }} · 零后端 · 零本地持久化</text>
		</view>
	</view>

		<view class="section ble-card">
			<view class="section-title">应用信息</view>
			<view class="subsection-title">当前环境</view>
			<view class="info-list">
				<view class="info-item"><text class="info-label">系统平台</text><text class="info-value">{{ systemInfo.platform }}</text></view>
				<view class="info-item"><text class="info-label">系统版本</text><text class="info-value">{{ systemInfo.system }}</text></view>
				<view class="info-item"><text class="info-label">设备型号</text><text class="info-value">{{ systemInfo.model }}</text></view>
			</view>
			<view class="subsection-title">功能特性</view>
			<view class="feature-grid">
				<view v-for="(feature, index) in features" :key="feature" class="feature-chip"><text class="feature-index">{{ index + 1 }}</text><text>{{ feature }}</text></view>
			</view>
			<view class="subsection-title">平台与公开状态</view>
			<view class="platform-grid">
				<view v-for="platform in platforms" :key="platform.key" class="platform-chip">
					<text class="platform-name">{{ platform.name }}</text>
					<text class="platform-status">{{ platformStatusLabel(platform) }}</text>
				</view>
			</view>
		</view>

		<view class="section ble-card">
			<view class="section-title">相关链接</view>
			<view class="menu-list">
				<view class="menu-item" hover-class="menu-item-hover" @click="openWebsite"><text>官方网站</text><AppIcon name="chev-r" :size="28" tone="primary" class="menu-arrow" /></view>
				<view class="menu-item" hover-class="menu-item-hover" @click="goVersion"><text>版本记录</text><AppIcon name="chev-r" :size="28" tone="primary" class="menu-arrow" /></view>
				<view class="menu-item" hover-class="menu-item-hover" @click="openFeedback"><text>问题反馈</text><AppIcon name="chev-r" :size="28" tone="primary" class="menu-arrow" /></view>
				<view class="menu-item" hover-class="menu-item-hover" @click="shareApp"><text>分享应用</text><AppIcon name="chev-r" :size="28" tone="primary" class="menu-arrow" /></view>
			</view>
		</view>

		<view class="footer"><text>© {{ currentYear }} BLE Toolkit+. All rights reserved.</text></view>
		</view>
		</scroll-view>
		</view>

		<!-- 问题反馈弹窗：GitHub Issues 引导（2026-09-11 小程序反馈通道裁撤） -->
		<view v-if="feedbackVisible" class="feedback-mask" @click="closeFeedback">
			<view class="feedback-sheet" @click.stop>
				<view class="feedback-head">
					<text class="feedback-title">问题反馈</text>
					<view class="feedback-close" hover-class="feedback-close-hover" @click="closeFeedback"><AppIcon name="x" :size="30" tone="mut" /></view>
				</view>
				<view class="feedback-desc">
					<text class="feedback-line">通过 GitHub Issues 提交问题反馈，描述复现步骤与环境信息即可。</text>
					<text class="feedback-line">反馈链接：{{ product.feedback }}</text>
				</view>
				<view class="feedback-actions">
					<button class="ble-btn ble-btn--sm feedback-btn feedback-btn--soft" @click="copyFeedbackLink">复制反馈链接</button>
					<button class="ble-btn ble-btn--sm feedback-btn feedback-btn--primary" @click="closeFeedback">我知道了</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
// UI-G2：P009 改挂正典导航层（AppNavbar + 版本 chip）
import AppNavbar from '../../components/ui/AppNavbar.vue';
import AppChip from '../../components/ui/AppChip.vue';
import AppIcon from '../../components/ui/AppIcon.vue'; // UI-PARITY-G0 正典图标入口
import {
	PRODUCT_FEATURES,
	PRODUCT_INFO
} from '../../config/product.js';
import {
	buildVersionString,
	getPlatformPublicStatuses,
	getProductVersion,
	getReleaseMetadata
} from '../../services/version-metadata.js';

const release = getReleaseMetadata();
const metadataVersionLabel = buildVersionString({
	version: getProductVersion(),
	commit: release.commit,
	channel: release.channel
});

const product = PRODUCT_INFO;
const features = PRODUCT_FEATURES;
const platforms = getPlatformPublicStatuses();
const appVersion = ref(metadataVersionLabel);
const systemInfo = ref({ platform: 'unknown', system: 'unknown', model: 'unknown' });
const currentYear = new Date().getFullYear();

const platformStatusLabel = (platform) => {
	if (platform.role === 'REFERENCE') return 'REFERENCE';
	return platform.capability_status || platform.release_status || 'NOT_RELEASED';
};

const getSystemInfo = () => {
	try {
		const info = uni.getDeviceInfo?.() || {};
		systemInfo.value = {
			platform: info.osName || info.platform || 'unknown',
			system: info.system || 'unknown',
			model: info.model || 'unknown'
		};
	} catch {}
};

const applyRuntimeVersion = (value) => {
	const next = typeof value === 'string' ? value.trim() : '';
	if (next) appVersion.value = next;
	else appVersion.value = metadataVersionLabel;
};

const getAppVersion = () => {
// #ifdef APP-PLUS
	plus.runtime.getProperty(plus.runtime.appid, (widgetInfo) => {
		applyRuntimeVersion(widgetInfo?.version);
	});
// #endif
};

const copyLink = (url, title) => {
	uni.setClipboardData({ data: url, success: () => uni.showToast({ title, icon: 'none' }) });
};

const openExternal = (url, copyTitle) => {
// #ifdef APP-PLUS
	plus.runtime.openURL(url);
// #endif
// #ifdef H5
	window.open(url, '_blank');
// #endif
};

const openWebsite = () => openExternal(product.website, '网址已复制');
// 问题反馈：GitHub Issues 引导弹窗（小程序反馈通道已裁撤）
const feedbackVisible = ref(false);
const openFeedback = () => { feedbackVisible.value = true; };
const closeFeedback = () => { feedbackVisible.value = false; };
const copyFeedbackLink = () => copyLink(product.feedback, '反馈链接已复制');
const goVersion = () => uni.navigateTo({ url: '/pages/about/version' });

const shareApp = () => {
// #ifdef APP-PLUS
	uni.share({
		provider: 'system',
		type: 0,
		title: `${product.name} - BLE 调试与验证工具`,
		summary: product.summary,
		href: product.website,
		imageUrl: '/static/share.png',
		fail: () => copyLink(product.website, '分享链接已复制')
	});
// #endif
// #ifdef H5
	if (navigator.share) {
		navigator.share({ title: product.name, text: product.summary, url: product.website }).catch(() => copyLink(product.website, '分享链接已复制'));
	} else {
		copyLink(product.website, '分享链接已复制');
	}
// #endif
};

onLoad(() => { getSystemInfo(); getAppVersion(); });
</script>

<style scoped>
.page-content { height: calc(100vh - 2rpx); }
.page-scroll { height: 100%; }
.container { min-height: 100%; padding: 32rpx; background: transparent; box-sizing: border-box; }
.header, .section { margin-bottom: 22rpx; border: 1rpx solid var(--ble-line-soft); border-radius: var(--ble-radius-lg); background: var(--ble-gradient-surface); box-shadow: var(--ble-shadow-soft); }
.header { display: flex; align-items: center; gap: 20rpx; padding: 32rpx; }
.logo-box { display: flex; align-items: center; justify-content: center; width: 76rpx; height: 76rpx; flex-shrink: 0; border-radius: var(--ble-radius-sm); background: linear-gradient(135deg, var(--c-primary-deep), var(--c-primary)); }
.brand-copy { min-width: 0; flex: 1; }
.app-name { display: block; color: var(--ble-text); font-size: 30rpx; font-weight: 800; }
.version { display: block; margin-top: 4rpx; color: var(--ble-text-muted); font-size: 20rpx; }
.section { padding: 32rpx; }
.section-title { color: var(--ble-text); font-size: 30rpx; font-weight: 800; }
.section-caption { display: block; margin: 8rpx 0 20rpx; color: var(--ble-text-muted); font-size: 22rpx; line-height: 1.5; }
.subsection-title { margin: 24rpx 0 12rpx; color: var(--ble-text-muted); font-size: 22rpx; font-weight: 800; }
.info-list, .menu-list { display: flex; flex-direction: column; gap: 12rpx; }
.info-item, .menu-item { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 18rpx 20rpx; border-radius: var(--ble-radius-sm); background: rgba(255, 255, 255, 0.82); }
.info-label { color: var(--ble-text-muted); font-size: 24rpx; }
.info-value { color: var(--ble-text); font-size: 24rpx; font-weight: 700; text-align: right; }
.feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; }
.feature-chip { display: flex; align-items: center; gap: 10rpx; min-width: 0; padding: 14rpx 16rpx; border-radius: 18rpx; color: var(--ble-text); background: rgba(255, 255, 255, 0.82); font-size: 22rpx; font-weight: 700; }
.feature-index { display: flex; align-items: center; justify-content: center; width: 34rpx; height: 34rpx; flex-shrink: 0; border-radius: 10rpx; color: var(--ble-brand); background: rgba(27, 109, 255, 0.09); font-size: 20rpx; }
.platform-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10rpx; }
.platform-chip { display: flex; flex-direction: column; gap: 6rpx; padding: 14rpx 10rpx; border-radius: 18rpx; color: var(--ble-brand); background: rgba(27, 109, 255, 0.08); text-align: center; }
.platform-name { font-size: 20rpx; font-weight: 700; line-height: 1.3; }
.platform-status { font-size: 20rpx; font-weight: 800; opacity: 0.85; }
.menu-item { color: var(--ble-text); font-size: 26rpx; font-weight: 600; }
.menu-item-hover { transform: translateY(2rpx); opacity: 0.92; }
.menu-arrow { margin-left: auto; }

/* 问题反馈弹窗（mask + 居中卡片） */
.feedback-mask {
	position: fixed;
	inset: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 48rpx;
	background: rgba(9, 18, 33, 0.55);
}
.feedback-sheet {
	width: 560rpx;
	max-height: 82vh;
	overflow-y: auto;
	padding: 32rpx;
	border-radius: var(--ble-radius-lg);
	background: #FFFFFF;
	box-shadow: var(--ble-shadow-soft);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}
.feedback-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}
.feedback-title { color: var(--ble-text); font-size: 30rpx; font-weight: 800; }
.feedback-close {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56rpx;
	height: 56rpx;
	border-radius: var(--ble-radius-sm);
	background: rgba(96, 117, 141, 0.10);
}
.feedback-close-hover { opacity: 0.8; }
.feedback-desc { display: flex; flex-direction: column; gap: 6rpx; }
.feedback-line { color: var(--ble-text-subtle); font-size: 24rpx; line-height: 1.55; }
.feedback-actions { display: flex; gap: 16rpx; }
/* 挂正典 ble-btn 基座（UI 契约）；feedback-btn 只做弹窗内布局尺寸覆写 */
.feedback-btn { flex: 1; height: 76rpx; padding: 0 18rpx; }
.feedback-btn--soft { background: rgba(27, 109, 255, 0.08); color: var(--ble-brand); }
.feedback-btn--primary { background: var(--c-primary); color: #FFFFFF; }
.footer { padding: 8rpx 0 28rpx; color: var(--ble-text-muted); font-size: 22rpx; text-align: center; }
</style>
