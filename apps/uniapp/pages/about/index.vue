<template>
	<view class="container">
		<view class="header ble-card-hero">
			<view class="logo-box"><image class="logo-img" src="/static/logo.png" mode="aspectFit" /></view>
			<view class="brand-copy">
				<text class="app-name">{{ product.name }}</text>
				<text class="version">Version {{ appVersion }}</text>
				<text class="summary">{{ product.summary }}</text>
				<view class="tech-stack"><text>UniApp · Vue 3</text><text>开源跨平台</text></view>
			</view>
		</view>

		<view class="section promotion-section ble-card">
			<view class="section-title">更多小程序</view>
			<text class="section-caption">同一开发者的实用小程序，点击卡片直接打开。</text>
			<view class="apps-list">
				<app-card v-for="app in otherApps" :key="app.name" :app="app" @select="openApp(app)" />
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
			<view class="subsection-title">支持平台</view>
			<view class="platform-grid"><text v-for="platform in platforms" :key="platform" class="platform-chip">{{ platform }}</text></view>
		</view>

		<view class="section ble-card">
			<view class="section-title">相关链接</view>
			<view class="menu-list">
				<view class="menu-item" hover-class="menu-item-hover" @click="openWebsite"><text>官方网站</text><text class="menu-arrow">›</text></view>
				<view class="menu-item" hover-class="menu-item-hover" @click="goVersion"><text>版本记录</text><text class="menu-arrow">›</text></view>
				<view class="menu-item" hover-class="menu-item-hover" @click="openFeedback"><text>问题反馈</text><text class="menu-arrow">›</text></view>
				<view class="menu-item" hover-class="menu-item-hover" @click="shareApp"><text>分享应用</text><text class="menu-arrow">›</text></view>
			</view>
		</view>

		<view class="footer"><text>© {{ currentYear }} BLE Toolkit+. All rights reserved.</text></view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import AppCard from '../../components/about/app-card.vue';
import {
	PRODUCT_FEATURES,
	PRODUCT_INFO,
	PRODUCT_PLATFORMS,
	RELATED_MINI_PROGRAMS
} from '../../config/product.js';

const product = PRODUCT_INFO;
const features = PRODUCT_FEATURES;
const platforms = PRODUCT_PLATFORMS;
const otherApps = RELATED_MINI_PROGRAMS;
const appVersion = ref(PRODUCT_INFO.versionFallback);
const systemInfo = ref({ platform: 'unknown', system: 'unknown', model: 'unknown' });
const currentYear = new Date().getFullYear();

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

const getAppVersion = () => {
// #ifdef APP-PLUS
	plus.runtime.getProperty(plus.runtime.appid, (widgetInfo) => { appVersion.value = widgetInfo.version; });
// #endif
// #ifdef MP-WEIXIN
	try {
		const accountInfo = uni.getAccountInfoSync();
		appVersion.value = accountInfo.miniProgram.version || PRODUCT_INFO.versionFallback;
	} catch {}
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
// #ifdef MP-WEIXIN
	copyLink(url, copyTitle);
// #endif
};

const openWebsite = () => openExternal(product.website, '网址已复制');
const openFeedback = () => openExternal(product.feedback, '反馈链接已复制');
const goVersion = () => uni.navigateTo({ url: '/pages/about/version' });

const shareApp = () => {
// #ifdef MP-WEIXIN
	uni.showShareMenu({
		withShareTicket: true,
		menus: ['shareAppMessage', 'shareTimeline'],
		success: () => uni.showToast({ title: '请点击右上角分享', icon: 'none' })
	});
// #endif
// #ifdef APP-PLUS
	uni.share({
		provider: 'system',
		type: 0,
		title: `${product.name} - 多平台 BLE 工具`,
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

const openApp = (app) => {
// #ifdef MP-WEIXIN
	if (!app.miniProgram?.appId) {
		uni.showToast({ title: '该小程序暂未配置跳转', icon: 'none' });
		return;
	}
	uni.navigateToMiniProgram({
		appId: app.miniProgram.appId,
		path: app.miniProgram.path,
		envVersion: app.miniProgram.envVersion,
		fail: () => uni.showModal({
			title: `暂时无法打开${app.name}`,
			content: '请确认微信版本和小程序跳转权限，稍后重试。',
			showCancel: false
		})
	});
// #endif
// #ifdef APP-PLUS
	plus.runtime.openURL(app.url);
// #endif
// #ifdef H5
	window.open(app.url, '_blank');
// #endif
};

onLoad(() => { getSystemInfo(); getAppVersion(); });

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({ title: 'BLE Toolkit+ - 开源跨平台 BLE 工具', path: '/pages/about/index' }));
onShareTimeline(() => ({ title: 'BLE Toolkit+ - 开源跨平台 BLE 工具', query: '', imageUrl: '/static/logo.png' }));
// #endif
</script>

<style scoped>
.container { min-height: 100vh; padding: 28rpx; background: transparent; }
.header, .section { margin-bottom: 22rpx; border: 1rpx solid rgba(20, 76, 136, 0.08); border-radius: 32rpx; background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 248, 255, 0.95)); box-shadow: 0 18rpx 40rpx rgba(17, 43, 78, 0.06); }
.header { display: flex; align-items: center; gap: 24rpx; padding: 30rpx; }
.logo-box { display: flex; align-items: center; justify-content: center; width: 112rpx; height: 112rpx; flex-shrink: 0; border: 1rpx solid rgba(21, 93, 255, 0.12); border-radius: 30rpx; background: linear-gradient(135deg, rgba(21, 93, 255, 0.14), rgba(123, 224, 255, 0.18)); }
.logo-img { width: 78rpx; height: 78rpx; }
.brand-copy { min-width: 0; flex: 1; }
.app-name { display: block; color: var(--ble-text); font-size: 36rpx; font-weight: 800; }
.version { display: block; margin-top: 4rpx; color: var(--ble-text-muted); font-size: 22rpx; }
.summary { display: block; margin-top: 12rpx; color: var(--ble-text-subtle); font-size: 22rpx; line-height: 1.55; }
.tech-stack { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; color: var(--ble-brand); font-size: 19rpx; font-weight: 700; }
.tech-stack text { padding: 5rpx 10rpx; border-radius: 999rpx; background: rgba(27, 109, 255, 0.08); }
.section { padding: 28rpx; }
.section-title { color: var(--ble-text); font-size: 30rpx; font-weight: 800; }
.section-caption { display: block; margin: 8rpx 0 20rpx; color: var(--ble-text-muted); font-size: 22rpx; line-height: 1.5; }
.promotion-section { border-color: rgba(27, 109, 255, 0.13); }
.apps-list { display: flex; flex-direction: column; gap: 16rpx; }
.subsection-title { margin: 24rpx 0 12rpx; color: var(--ble-text-muted); font-size: 21rpx; font-weight: 800; }
.info-list, .menu-list { display: flex; flex-direction: column; gap: 12rpx; }
.info-item, .menu-item { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 18rpx 20rpx; border-radius: 22rpx; background: rgba(255, 255, 255, 0.82); }
.info-label { color: var(--ble-text-muted); font-size: 23rpx; }
.info-value { color: var(--ble-text); font-size: 23rpx; font-weight: 700; text-align: right; }
.feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; }
.feature-chip { display: flex; align-items: center; gap: 10rpx; min-width: 0; padding: 14rpx 16rpx; border-radius: 18rpx; color: var(--ble-text); background: rgba(255, 255, 255, 0.82); font-size: 22rpx; font-weight: 700; }
.feature-index { display: flex; align-items: center; justify-content: center; width: 34rpx; height: 34rpx; flex-shrink: 0; border-radius: 10rpx; color: var(--ble-brand); background: rgba(27, 109, 255, 0.09); font-size: 18rpx; }
.platform-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; }
.platform-chip { padding: 14rpx 8rpx; border-radius: 18rpx; color: var(--ble-brand); background: rgba(27, 109, 255, 0.08); font-size: 21rpx; font-weight: 700; text-align: center; }
.menu-item { color: var(--ble-text); font-size: 25rpx; font-weight: 650; }
.menu-item-hover { transform: translateY(2rpx); opacity: 0.92; }
.menu-arrow { color: var(--ble-brand); font-size: 34rpx; }
.footer { padding: 8rpx 0 28rpx; color: var(--ble-text-muted); font-size: 21rpx; text-align: center; }
</style>
