<template>
	<view class="app-ill" :style="illStyle"></view>
</template>

<script setup>
import { computed } from 'vue';
import { APP_ILLS, APP_ILL_VIEWBOX } from '../../services/design/app-illustrations.js';

// 正典空态插图（B6 C.ILL）：透明底、118×86 等比缩放。
const props = defineProps({
	name: {
		type: String,
		required: true,
		validator: (v) => ['radar', 'link', 'doc', 'box'].includes(v)
	},
	width: {
		type: Number,
		default: 236
	}
});

const illStyle = computed(() => {
	const body = APP_ILLS[props.name] || APP_ILLS.box;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${APP_ILL_VIEWBOX}">${body}</svg>`;
	const height = Math.round((props.width * 86) / 118);
	return {
		width: `${props.width}rpx`,
		height: `${height}rpx`,
		backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
		backgroundSize: '100% 100%',
		backgroundRepeat: 'no-repeat'
	};
});
</script>
