<template>
	<view class="services-panel">
		<view class="panel-header">
			<view class="title-group">
				<text class="panel-title">服务与特征值</text>
				<text class="panel-caption">{{ localServices.length }} 个服务，按需展开查看特征值能力。</text>
			</view>
			<text class="toggle-btn" @click="toggleAllServices">{{ showAllServices ? '全部收起' : '全部展开' }}</text>
		</view>

		<view v-if="localServices.length === 0" class="ble-empty-card service-empty">
			<image src="/static/placeholders/empty_services.png" class="ble-empty-image" mode="aspectFit"></image>
			<text class="ble-empty-title">服务还没加载完成</text>
			<text class="ble-empty-copy">建立连接并完成服务发现后，这里会展示 GATT 结构树。</text>
		</view>

		<view v-else class="services-list">
			<view v-for="(service, sIndex) in localServices" :key="service.uuid || sIndex" class="service-item">
				<view class="service-header" @click="toggleService(sIndex)">
					<view class="service-info">
						<text class="service-name">服务 {{ sIndex + 1 }}</text>
						<text class="service-uuid ble-mono">{{ service.uuid }}</text>
					</view>
					<view class="service-toggle">
						<text class="service-count">{{ service.characteristics.length }} 项</text>
						<text class="arrow">{{ service.isOpen ? '−' : '+' }}</text>
					</view>
				</view>

				<view v-if="service.isOpen" class="characteristics-list">
					<view
						v-for="(characteristic, cIndex) in service.characteristics"
						:key="characteristic.uuid || cIndex"
						class="characteristic-item"
					>
						<view class="characteristic-info">
							<text class="characteristic-name">{{ characteristic.name || `特征值 ${cIndex + 1}` }}</text>
							<text class="characteristic-uuid ble-mono">{{ characteristic.uuid }}</text>
						</view>
						<view class="characteristic-props">
							<button
								v-if="characteristic.properties.read"
								class="ble-btn ble-btn--secondary ble-btn--sm prop-btn"
								@click="() => readCharacteristic(service.uuid, characteristic.uuid)"
							>
								读取
							</button>
							<button
								v-if="characteristic.properties.write"
								class="ble-btn ble-btn--primary ble-btn--sm prop-btn"
								@click="() => writeCharacteristic(service.uuid, characteristic.uuid)"
							>
								写入
							</button>
							<button
								v-if="characteristic.properties.notify"
								class="ble-btn ble-btn--sm prop-btn"
								:class="characteristic.notifying ? 'ble-btn--danger' : 'ble-btn--ghost'"
								@click="() => toggleNotify(service.uuid, characteristic.uuid)"
							>
								{{ characteristic.notifying ? '停止监听' : '开始监听' }}
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
	if (localServices.value.length === 0 && props.services.length > 0) {
		localServices.value = props.services.map((service) => ({ ...service, isOpen: false }));
	} else if (props.services.length > 0) {
		localServices.value = props.services.map((service) => {
			const existing = localServices.value.find((item) => item.uuid === service.uuid);
			return { ...service, isOpen: existing ? existing.isOpen : false };
		});
	} else {
		localServices.value = [];
	}
});

const toggleAllServices = () => {
	showAllServices.value = !showAllServices.value;
	localServices.value.forEach((service) => {
		service.isOpen = showAllServices.value;
	});
};

const toggleService = (index) => {
	localServices.value[index].isOpen = !localServices.value[index].isOpen;
};

const readCharacteristic = (serviceId, charId) => emit('read', { serviceId, charId });
const writeCharacteristic = (serviceId, charId) => emit('write', { serviceId, charId });
const toggleNotify = (serviceId, charId) => emit('notifyToggle', { serviceId, charId });
</script>

<style scoped>
.services-panel {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.panel-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
}

.title-group {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.panel-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.panel-caption {
	font-size: 22rpx;
	line-height: 1.5;
	color: var(--ble-text-muted);
}

.toggle-btn {
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(27, 109, 255, 0.08);
	color: var(--ble-brand);
	font-size: 22rpx;
	font-weight: 700;
}

.service-empty {
	min-height: 360rpx;
}

.services-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.service-item {
	border-radius: 28rpx;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(242, 248, 255, 0.95) 100%);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	box-shadow: 0 14rpx 30rpx rgba(17, 43, 78, 0.05);
	overflow: hidden;
}

.service-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
}

.service-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.service-name {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.service-uuid {
	font-size: 22rpx;
	color: var(--ble-text-muted);
}

.service-toggle {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.service-count {
	font-size: 22rpx;
	color: var(--ble-text-subtle);
}

.arrow {
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(27, 109, 255, 0.08);
	color: var(--ble-brand);
	font-size: 28rpx;
	font-weight: 700;
}

.characteristics-list {
	padding: 0 24rpx 24rpx;
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.characteristic-item {
	padding: 20rpx;
	border-radius: 22rpx;
	background: rgba(255, 255, 255, 0.8);
	border: 1rpx solid rgba(20, 76, 136, 0.06);
}

.characteristic-info {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.characteristic-name {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.characteristic-uuid {
	font-size: 22rpx;
	color: var(--ble-text-muted);
}

.characteristic-props {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 18rpx;
}

.prop-btn {
	height: 56rpx;
	line-height: 56rpx;
	padding: 0 22rpx;
	border: none;
	border-radius: 999rpx;
	font-size: 22rpx;
	font-weight: 700;
}

.prop-btn::after {
	border: none;
}

.prop-btn.read {
	background: rgba(23, 199, 168, 0.12);
	color: #0e9c82;
}

.prop-btn.write {
	background: rgba(255, 159, 67, 0.14);
	color: #d37a12;
}

.prop-btn.notify {
	background: rgba(27, 109, 255, 0.1);
	color: var(--ble-brand);
}
</style>
