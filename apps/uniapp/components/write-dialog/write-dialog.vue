<template>
	<view class="modal" v-if="visible" @click.stop>
		<view class="modal-content">
			<view class="modal-header">
				<text class="modal-title">写入数据</text>
				<text class="modal-close" @click="close">×</text>
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
				<button class="modal-btn cancel" @click="close">取消</button>
				<button class="modal-btn confirm" :disabled="isSending" @click="confirm">
					{{ isSending ? '发送中...' : '确定' }}
				</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from 'vue';

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
.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { width: 80%; background-color: #fff; border-radius: 20rpx; overflow: hidden; }
.modal-header { padding: 30rpx; border-bottom: 2rpx solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 40rpx; color: #999; line-height: 1; padding: 0 10rpx; }
.modal-body { padding: 30rpx; }
.input-group { margin-bottom: 30rpx; }
.input-group:last-child { margin-bottom: 0; }
.input-label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; display: block; }
.radio-group { display: flex; gap: 40rpx; }
.radio-label { display: flex; align-items: center; font-size: 28rpx; color: #666; }
.data-input { background-color: #f5f5f5; height: 80rpx; border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; }
.modal-footer { display: flex; border-top: 2rpx solid #eee; }
.modal-btn { flex: 1; height: 90rpx; line-height: 90rpx; font-size: 32rpx; text-align: center; border-radius: 0; background-color: transparent; }
.modal-btn::after { border: none; }
.modal-btn.cancel { color: #666; border-right: 2rpx solid #eee; }
.modal-btn.confirm { color: #007AFF; font-weight: bold; }
.modal-btn.confirm[disabled] { color: #999; }
</style>
