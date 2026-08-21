<template>
	<view class="app-card" hover-class="app-card-hover" @click="$emit('select')">
		<image v-if="app.icon && !imageFailed" class="app-icon" :src="app.icon" mode="aspectFill" @error="imageFailed = true" />
		<view v-else class="app-icon app-icon-fallback"><text>{{ app.name.slice(0, 1) }}</text></view>
		<view class="app-copy">
			<view class="app-heading"><text class="app-name">{{ app.name }}</text><text class="app-tag">小程序</text></view>
			<text class="app-desc">{{ app.description }}</text>
		</view>
		<text class="app-arrow">›</text>
	</view>
</template>

<script setup>
import { ref } from 'vue';

defineProps({ app: { type: Object, required: true } });
defineEmits(['select']);
const imageFailed = ref(false);
</script>

<style scoped>
.app-card { display: grid; grid-template-columns: 92rpx 1fr auto; align-items: center; gap: 18rpx; padding: 22rpx; border: 1rpx solid rgba(27, 109, 255, 0.12); border-radius: 26rpx; background: rgba(255, 255, 255, 0.9); box-shadow: 0 12rpx 30rpx rgba(17, 43, 78, 0.06); }
.app-card-hover { transform: translateY(2rpx); opacity: 0.92; }
.app-icon { width: 92rpx; height: 92rpx; border-radius: 22rpx; background: #fff; box-shadow: 0 10rpx 24rpx rgba(17, 43, 78, 0.08); }
.app-icon-fallback { display: flex; align-items: center; justify-content: center; color: var(--ble-brand); background: rgba(27, 109, 255, 0.1); font-size: 34rpx; font-weight: 800; }
.app-copy { min-width: 0; }
.app-heading { display: flex; align-items: center; gap: 10rpx; }
.app-name { color: var(--ble-text); font-size: 28rpx; font-weight: 800; }
.app-tag { padding: 4rpx 10rpx; border-radius: 999rpx; color: var(--ble-brand); background: rgba(27, 109, 255, 0.09); font-size: 19rpx; font-weight: 700; }
.app-desc { display: -webkit-box; margin-top: 8rpx; overflow: hidden; color: var(--ble-text-subtle); font-size: 22rpx; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.app-arrow { color: var(--ble-brand); font-size: 38rpx; }
</style>
