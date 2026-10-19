<template>
	<view class="app-icon" :style="iconStyle"></view>
</template>

<script setup>
// 正典图标组件（UI-PARITY-G0 · COMPONENT_CONTRACT B0）
// 字形唯一来源：services/design/app-icons.js（prototype/v1-new/index.html sprite 的受锁定镜像，35 枚）。
// 业务代码只允许传 semantic icon id（ICON_CATALOG）；以 data-URI 渲染。
// 色彩入参优先 tone（语义名 → design-tokens.json 正典值），legacy 调用可继续传裸 color hex。
import { computed } from 'vue';
import { APP_ICONS } from '../../services/design/app-icons.js';

// tone → 正典色（core/assets-generator/meta/design-tokens.json · color.brand/neutral/ink）
const TONE_COLORS = {
	text: '#18222E', sub: '#42536A', mut: '#60758D', ph: '#9AA8B6',
	primary: '#1B6DFF', primaryDeep: '#0E4FC4',
	success: '#17C7A8', successDeep: '#0E9A80',
	danger: '#F2555F', warning: '#FF9F43', warningDeep: '#C77E14',
	card: '#FFFFFF', inkText: '#D6E2F5'
};

const props = defineProps({
	name: { type: String, required: true },
	size: { type: Number, default: 40 },
	tone: { type: String, default: 'text' },
	color: { type: String, default: '' },
	knob: { type: String, default: '#FFFFFF' },
	rotate: { type: Number, default: 0 }
});

const iconStyle = computed(() => {
	const color = props.color || TONE_COLORS[props.tone] || TONE_COLORS.text;
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
