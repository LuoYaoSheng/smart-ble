<template>
	<view class="modal" v-if="visible" @click.stop>
		<view class="modal-content">
			<view class="modal-header">
				<text class="modal-title">写入数据</text>
				<view class="modal-close" @click="close"><AppIcon name="x" :size="30" tone="mut" /></view>
			</view>
			<view class="modal-body">
				<view class="input-group">
					<text class="input-label">数据类型：</text>
					<radio-group @change="onSendTypeChange" class="radio-group">
						<label class="radio-label">
							<radio value="text" :checked="sendType === 'text'" />文本
						</label>
						<label class="radio-label">
							<radio value="hex" :checked="sendType === 'hex'" />HEX
						</label>
					</radio-group>
				</view>
				<view class="input-group">
					<text class="input-label">数据内容：</text>
					<input type="text" 
						:value="sendData" 
						@input="onDataInput"
						:placeholder="sendType === 'text' ? '请输入文本数据' : '如：FF 00 01'"
						class="data-input" />
				</view>
			</view>
			<view class="modal-footer">
				<button class="ble-btn ble-btn--ghost ble-btn--lg ble-btn--block modal-btn" @click="close">取消</button>
				<button class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block modal-btn" :class="{ 'ble-btn--busy': isSending }" :disabled="isSending" @click="confirm">{{ isSending ? '发送中...' : '确定' }}</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from 'vue';
import AppIcon from '../ui/AppIcon.vue'; // UI-PARITY-G0 正典图标入口

const props = defineProps({
	visible: { type: Boolean, default: false },
	isSending: { type: Boolean, default: false }
});

const emit = defineEmits(['update:visible', 'confirm']);

const sendType = ref('text');
const sendData = ref('');

watch(() => props.visible, (newVal) => {
	if (!newVal) {
		sendData.value = '';
	}
});

const onSendTypeChange = (e) => {
	sendType.value = e.detail.value;
	sendData.value = '';
};

const onDataInput = (e) => {
	sendData.value = e.detail.value;
};

const close = () => {
	emit('update:visible', false);
};

const confirm = () => {
	if (!sendData.value) {
		uni.showToast({ title: '请输入数据', icon: 'none' });
		return;
	}
	emit('confirm', { type: sendType.value, data: sendData.value });
};
</script>

<style scoped>
.modal { position: fixed; inset: 0; background: rgba(10,20,35,.42); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 32rpx; }
.modal-content { width: 100%; background: var(--ble-gradient-surface); border-radius: var(--ble-radius-lg); overflow: hidden; box-shadow: var(--ble-shadow-modal); }
.modal-header { padding: 28rpx 30rpx; border-bottom: 1rpx solid var(--ble-line-soft); display: flex; justify-content: space-between; align-items: center; }
.modal-title { font-size: 32rpx; font-weight: 700; color: var(--ble-text); }
.modal-close { padding: 0 10rpx; display: flex; align-items: center; }
.modal-body { padding: 30rpx; display: flex; flex-direction: column; gap: 24rpx; }
.input-group:last-child { margin-bottom: 0; }
.input-label { font-size: 26rpx; font-weight: 600; color: var(--ble-text); margin-bottom: 14rpx; display: block; }
.radio-group { display: flex; gap: 30rpx; }
.radio-label { display: flex; align-items: center; font-size: 26rpx; color: var(--ble-text-subtle); }
.data-input { background: rgba(241,246,252,.92); height: 82rpx; border-radius: 22rpx; padding: 0 20rpx; font-size: 26rpx; border: 1rpx solid var(--ble-line-soft); color: var(--ble-text); }
.modal-footer { display: flex; gap: 14rpx; padding: 0 30rpx 30rpx; }
</style>
