<template>
	<view class="app-tabbar">
		<view v-for="tab in tabs" :key="tab.key" class="tb" :class="{ on: active === tab.key }" @click="switchTab(tab)">
			<view class="tb-icon">
				<AppIcon :name="tab.icon" :size="46" :tone="active === tab.key ? 'primary' : 'mut'" />
				<view v-if="tab.key === 'connected' && badge > 0" class="n">{{ badge > 99 ? '99+' : badge }}</view>
			</view>
			<text class="tb-label">{{ tab.label }}</text>
		</view>
	</view>
</template>

<script setup>
// 正典 TabBar（COMPONENT_CONTRACT A3 · prototype pages.css .tabbar）
// U-WX(mp-weixin) 使用 pages.json 原生 tabBar（png 资产对）；本组件用于 APP 端自绘与其他自定义场景。
// 仅 switchTab 语义，无返回。角标口径：通用连接 + SHID 会话在线（PRD）。
import AppIcon from './AppIcon.vue';

defineProps({
	active: { type: String, default: 'scan' },
	badge: { type: Number, default: 0 }
});

const tabs = [
	{ key: 'scan', label: '扫描', icon: 'scan', url: '/pages/index/index' },
	{ key: 'connected', label: '已连接', icon: 'link', url: '/pages/connected/index' },
	{ key: 'cast', label: '广播', icon: 'cast', url: '/pages/broadcast/index' },
	{ key: 'info', label: '关于', icon: 'info', url: '/pages/about/index' }
];

const switchTab = (tab) => uni.switchTab({ url: tab.url });
</script>

<style scoped>
.app-tabbar {
	display: flex;
	height: 128rpx;
	padding: 8rpx 16rpx 0;
	padding-bottom: constant(safe-area-inset-bottom);
	padding-bottom: env(safe-area-inset-bottom);
	background: rgba(255, 255, 255, 0.96);
	border-top: 2rpx solid var(--c-line-soft);
	z-index: var(--z-tab);
}
.tb { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; color: var(--c-mut); position: relative; }
.tb-icon { position: relative; display: flex; }
.tb.on .tb-label { color: var(--c-primary); font-weight: var(--fw-bold); }
.tb-label { font-size: var(--fs-micro); font-weight: var(--fw-med); line-height: 1; }
.n {
	position: absolute;
	top: -6rpx;
	right: -26rpx;
	min-width: 32rpx;
	height: 32rpx;
	border-radius: 16rpx;
	background: var(--c-danger);
	color: var(--c-card);
	font-size: 18rpx;
	font-weight: var(--fw-bold);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 8rpx;
}
</style>
