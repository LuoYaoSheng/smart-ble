<template>
	<view class="ble-modal-mask" v-if="visible" @click.stop>
		<view class="ble-modal-sheet">
			<view class="ble-modal-header">
				<text class="ble-modal-title">写入数据</text>
				<text class="ble-modal-close" @click="close">×</text>
			</view>
			<view class="ble-modal-body modal-body">
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
			<view class="ble-modal-footer">
				<button class="ble-modal-btn cancel" @click="close">取消</button>
				<button class="ble-modal-btn confirm" :disabled="isSending" @click="confirm">
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
/* 模态壳（遮罩/面板/头部/底部按钮）统一走 design-system.css 的 ble-modal-* */
.modal-body { display: flex; flex-direction: column; gap: 24rpx; }
.input-group:last-child { margin-bottom: 0; }
.input-label { font-size: 26rpx; font-weight: 600; color: var(--ble-text); margin-bottom: 14rpx; display: block; }
.radio-group { display: flex; gap: 30rpx; }
.radio-label { display: flex; align-items: center; font-size: 26rpx; color: var(--ble-text-subtle); }
.data-input { background: rgba(241,246,252,.92); height: 82rpx; border-radius: 22rpx; padding: 0 20rpx; font-size: 26rpx; border: 1rpx solid rgba(20,76,136,.08); color: var(--ble-text); }
</style>
