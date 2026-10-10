<template>
	<view class="app-ill" :style="illStyle"></view>
</template>

<script setup>
// 正典空态插图（COMPONENT_CONTRACT B0 · ICON_CATALOG §7）
// 4 幅：radar/link/doc/box，viewBox 118×86，自配色，透明底。字形来源 services/design/app-illustrations.js（受锁定镜像）。
import { computed } from 'vue';
import { APP_ILLS, APP_ILL_VIEWBOX } from '../../services/design/app-illustrations.js';

const props = defineProps({
	name: { type: String, default: 'box' },
	width: { type: Number, default: 236 }
});

const illStyle = computed(() => {
	const body = APP_ILLS[props.name] || APP_ILLS.box;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${APP_ILL_VIEWBOX}" fill="none">${body}</svg>`;
	return {
		width: props.width + 'rpx',
		height: Math.round(props.width * (86 / 118)) + 'rpx',
		backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
		backgroundSize: '100% 100%',
		backgroundRepeat: 'no-repeat'
	};
});
</script>

<style scoped>
.app-ill { display: block; }
</style>
