<template>
	<view class="services-panel">
		<view class="panel-header">
			<text class="panel-title">服务列表</text>
			<text class="toggle-btn" @click="toggleAllServices">{{showAllServices ? '收起列表' : '展开列表'}}</text>
		</view>
		<view class="services-list">
			<view v-for="(service, sIndex) in localServices" :key="sIndex" class="service-item">
				<view class="service-header" @click="toggleService(sIndex)">
					<view class="service-info">
						<text class="service-name">服务 {{sIndex + 1}}</text>
						<text class="service-uuid">{{service.uuid}}</text>
					</view>
					<text class="arrow">{{service.isOpen ? '▼' : '▶'}}</text>
				</view>
				<view v-if="service.isOpen" class="characteristics-list">
					<view v-for="(characteristic, cIndex) in service.characteristics" 
						:key="cIndex" 
						class="characteristic-item">
						<view class="characteristic-info">
							<text class="characteristic-name">{{characteristic.name || '特征值 ' + (cIndex + 1)}}</text>
							<text class="characteristic-uuid">{{characteristic.uuid}}</text>
						</view>
						<view class="characteristic-props">
							<button class="prop-btn read" 
								v-if="characteristic.properties.read"
								@click="() => readCharacteristic(service.uuid, characteristic.uuid)">
								<text class="btn-icon">📖</text>
								<text>读取</text>
							</button>
							<button class="prop-btn write" 
								v-if="characteristic.properties.write"
								@click="() => writeCharacteristic(service.uuid, characteristic.uuid)">
								<text class="btn-icon">✏️</text>
								<text>写入</text>
							</button>
							<button class="prop-btn notify" 
								v-if="characteristic.properties.notify"
								@click="() => toggleNotify(service.uuid, characteristic.uuid)">
								<text class="btn-icon">{{characteristic.notifying ? '🔔' : '🔕'}}</text>
								<text>{{characteristic.notifying ? '停止监听' : '监听'}}</text>
							</button>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watchEffect } from 'vue';

const props = defineProps({
	services: {
		type: Array,
		required: true
	}
});

const emit = defineEmits(['read', 'write', 'notifyToggle']);

const localServices = ref([]);
const showAllServices = ref(false);

watchEffect(() => {
	// 保持 isOpen 状态，但更新其他数据
	if (localServices.value.length === 0 && props.services.length > 0) {
		localServices.value = props.services.map(s => ({...s, isOpen: false}));
	} else if (props.services.length > 0) {
		localServices.value = props.services.map(s => {
			const existing = localServices.value.find(ls => ls.uuid === s.uuid);
			return {...s, isOpen: existing ? existing.isOpen : false};
		});
	} else {
	    localServices.value = [];
	}
});

const toggleAllServices = () => {
	showAllServices.value = !showAllServices.value;
	localServices.value.forEach(s => s.isOpen = showAllServices.value);
};

const toggleService = (index) => {
	localServices.value[index].isOpen = !localServices.value[index].isOpen;
};

const readCharacteristic = (serviceId, charId) => {
	emit('read', { serviceId, charId });
};

const writeCharacteristic = (serviceId, charId) => {
	emit('write', { serviceId, charId });
};

const toggleNotify = (serviceId, charId) => {
	emit('notifyToggle', { serviceId, charId });
};
</script>

<style scoped>
.services-panel { margin-bottom: 30rpx; background-color: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 30rpx; background-color: #f8f8f8; border-bottom: 2rpx solid #eee; }
.panel-title { font-size: 30rpx; font-weight: bold; color: #333; }
.toggle-btn { font-size: 26rpx; color: #007AFF; }
.services-list { display: flex; flex-direction: column; }
.service-item { border-bottom: 2rpx solid #eee; }
.service-item:last-child { border-bottom: none; }
.service-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 30rpx; background-color: #fff; }
.service-header:active { background-color: #fafafa; }
.service-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.service-name { font-size: 28rpx; font-weight: 500; color: #333; }
.service-uuid { font-size: 24rpx; color: #999; font-family: monospace; }
.arrow { color: #ccc; font-size: 24rpx; padding-left: 20rpx; }
.characteristics-list { background-color: #f9f9f9; padding: 0 30rpx; }
.characteristic-item { padding: 24rpx 0; border-bottom: 2rpx dashed #eee; display: flex; flex-direction: column; gap: 16rpx; }
.characteristic-item:last-child { border-bottom: none; }
.characteristic-info { display: flex; flex-direction: column; gap: 8rpx; }
.characteristic-name { font-size: 26rpx; color: #333; font-weight: 500; }
.characteristic-uuid { font-size: 24rpx; color: #999; font-family: monospace; }
.characteristic-props { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 8rpx; }
.prop-btn { display: flex; align-items: center; gap: 8rpx; margin: 0; padding: 0 24rpx; height: 52rpx; line-height: 52rpx; font-size: 24rpx; border-radius: 26rpx; border: none; }
.prop-btn::after { border: none; }
.btn-icon { font-size: 28rpx; line-height: 1; margin-top: -2rpx; }
.prop-btn.read { background-color: rgba(52, 199, 89, 0.1); color: #34C759; }
.prop-btn.write { background-color: rgba(255, 149, 0, 0.1); color: #FF9500; }
.prop-btn.notify { background-color: rgba(0, 122, 255, 0.1); color: #007AFF; }
.prop-btn:active { filter: brightness(0.9); }
</style>
