<template>
	<view class="app-icon" :style="iconStyle"></view>
</template>

<script setup>
// 正典图标组件（PARITY-ICON）：字形唯一来源 services/design/app-icons.js
// （docs/specs/prototype/v1-new/index.html sprite 的受锁定镜像）。
// mp-weixin 不支持内联 <svg>，故以 data-URI background-image 渲染。
import { computed } from 'vue';
import { APP_ICONS } from '../../services/design/app-icons.js';

const props = defineProps({
	name: { type: String, required: true },
	size: { type: Number, default: 40 },
	color: { type: String, default: '' },
	knob: { type: String, default: '#FFFFFF' },
	rotate: { type: Number, default: 0 }
});

const iconStyle = computed(() => {
	const color = props.color || '#12263F';
	let body = (APP_ICONS[props.name] || APP_ICONS.info)
		.split('{C}')
		.join(color)
		.split('{KNOB}')
		.join(props.knob);
	if (props.rotate) body = `<g transform="rotate(${props.rotate} 12 12)">${body}</g>`;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;
	return {
		width: props.size + 'rpx',
		height: props.size + 'rpx',
		backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
		backgroundSize: '100% 100%',
		backgroundRepeat: 'no-repeat'
	};
});
</script>

<style scoped>
.app-icon {
	display: inline-block;
	flex-shrink: 0;
	vertical-align: middle;
}
</style>
