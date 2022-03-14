<template>
	<view class="flex flex-column">
		<!-- 设备信息 -->
		<view class="item flex flex-column justify-center">
			<text class="title font-size-list color-text-title">service</text>
			<text class="subtitle font-size-subtitle color-text-subtitle">UUID:{{characteristic.serviceId}}</text>
		</view>
		<view class="item flex flex-column justify-center">
			<text class="title font-size-list color-text-title">characteristic</text>
			<text class="subtitle font-size-subtitle color-text-subtitle">UUID:{{characteristic.uuid}}</text>
		</view>

		<!-- 通知 -->
		<view class="flex flex-column" v-if="characteristic.properties.notify || characteristic.properties.indicate">
			<view class="item-bar flex flex-row justify-between align-center">
				<text class="font-size-list color-text-title">通知</text>
				<view class="item-btn" v-if="notifyState" @click="notifyAction()">监听中</view>
				<view class="item-btn" v-else="notifyState" @click="notifyAction()">监听</view>
			</view>
			<divider></divider>
			<textarea disabled=true class="item-content font-size-subtitle" :value="notifyText" placeholder="通知内容" />
		</view>

		<!-- 读取 -->
		<view class="flex flex-column h-spacing-large-top" v-if="characteristic.properties.read">
			<view class="item-bar flex flex-row justify-between align-center">
				<text class="font-size-list color-text-title">读取</text>
				<view class="item-btn" @click="readAction()">读取</view>
			</view>
			<divider></divider>
			<textarea disabled=true class="item-content font-size-subtitle" :value="readText" placeholder="读取内容" />
		</view>

		<!-- 写入 -->
		<view class="flex flex-column h-spacing-large-top" v-if="characteristic.properties.write">
			<view class="item-bar flex flex-row justify-between align-center">
				<text class="font-size-list color-text-title">写入</text>
				<view class="flex flex-row align-center">
					<skSwitch leftText="HEX" rightText="ASCII" :value="formatValue" @change="formatChange"></skSwitch>
					<view class="item-btn v-spacing-large-left" @click="writeAction()">写入</view>
				</view>
			</view>
			<divider></divider>
			<textarea class="item-content font-size-subtitle" :value="writeText" placeholder="写入数据"
				@input="writeTextVal" />
		</view>
	</view>
</template>

<script>
	// 引入组件
	import skSwitch from '@/components/sk-switch.vue';

	export default {
		components: {
			skSwitch
		},
		data() {
			return {
				formatValue: 1,
				characteristic: {
					properties: {
						indicate: true,
						notify: true,
						read: true,
						write: true
					},
					serviceId: "D0611E78-BBB4-4591-A5F8-487910AE4366",
					supportType: "",
					uuid: "00002A38-0000-1000-8000-00805F9B34FB",
					deviceId: ""
				},

				notifyState: false,
				notifyText: "", //"0078\n",

				readText: "",
				writeText: "",
			}
		},
		methods: {
			writeTextVal: function(e) {
				this.writeText = e.target.value
			},

			formatChange: function(e) {
				this.formatValue = e
			},
			notifyAction: function() {
				let state = !this.notifyState
				this.notifyState = state
				// #ifdef APP || MP
				this.notifyBLECharacteristicValueChange(state)
				// #endif
			},
			readAction: function() {
				// #ifdef APP || MP
				let that = this
				uni.readBLECharacteristicValue({
					deviceId: that.characteristic.deviceId,
					serviceId: that.characteristic.serviceId,
					characteristicId: that.characteristic.uuid,
					success(res) {
						let log = {
							time: (new Date()).getTime(),
							type: that.$Config.LogType.CharacteristicRead,
							id: that.characteristic.deviceId,
							msg: ''
						}
						that.saveLog(log)

						uni.onBLECharacteristicValueChange(function(res1) {
							let readText = that.$Tool.ab2hex(res1.value)
							that.readText = that.readText + "\n" + readText

							let log = {
								time: (new Date()).getTime(),
								type: that.$Config.LogType.MsgRead,
								id: that.characteristic.deviceId,
								msg: readText
							}
							that.saveLog(log)
						})
					}
				})
				// #endif
			},
			writeAction: function() {
				// #ifdef APP || MP
				let that = this
				let text = this.formatValue == 0 ? this.$Tool.hex_to_ascii(this.writeText) : this.writeText
				let buffer = that.$Tool.str2ab(text)

				uni.writeBLECharacteristicValue({
					deviceId: that.characteristic.deviceId,
					serviceId: that.characteristic.serviceId,
					characteristicId: that.characteristic.uuid,
					value: buffer,
					success(res) {
						uni.showToast({
							icon: 'none',
							title: '写入成功'
						})

						let log = {
							time: (new Date()).getTime(),
							type: that.$Config.LogType.MsgWrite,
							id: that.characteristic.deviceId,
							msg: text
						}
						that.saveLog(log)
					},
					fail() {
						uni.showToast({
							icon: 'none',
							title: '写入失败'
						})
					}
				})
				// #endif
			},

			// 监听
			notifyBLECharacteristicValueChange: function(state) {
				let that = this
				uni.notifyBLECharacteristicValueChange({
					deviceId: that.characteristic.deviceId,
					serviceId: that.characteristic.serviceId,
					characteristicId: that.characteristic.uuid,
					state: state,
					success(res) {
						if (state) {

							let log = {
								time: (new Date()).getTime(),
								type: that.$Config.LogType.NoticeOpen,
								id: that.characteristic.deviceId,
								msg: ''
							}
							that.saveLog(log)

							uni.onBLECharacteristicValueChange(function(res1) {
								let notifyText = that.$Tool.ab2hex(res1.value)
								that.notifyText = that.notifyText + "\n" + notifyText

								let log = {
									time: (new Date()).getTime(),
									type: that.$Config.LogType.NoticeRead,
									id: that.characteristic.deviceId,
									msg: notifyText
								}
								that.saveLog(log)
							})
						}
					}
				})
			},
			saveLog: function(log) {
				let key = this.$Config.Conf.LogFileName
				uni.getStorage({
					key: key,
					complete(res) {
						let list = []
						if (res.data != "") list = res.data
						list.push(log)
						uni.setStorage({
							key: key,
							data: list
						})
					}
				})
			}
		},
		onLoad(option) {
			if (JSON.stringify(option) != '{}') {
				this.characteristic = JSON.parse(option.item)
			}
		},
		onHide() {
			this.notifyBLECharacteristicValueChange(false)
		}
	}
</script>

<style>
	.item {
		height: 138rpx;
		padding-left: 24rpx;
		padding-right: 24rpx;
	}

	.title {
		height: 48rpx;
	}

	.subtitle {
		/* height: 42rpx; */
	}

	.item-bar {
		padding-left: 24rpx;
		padding-right: 24rpx;
		height: 96rpx;
		background-color: #FFFFFF;
	}

	.item-content {
		width: auto;
		padding: 24rpx;
		height: 240rpx;
		background-color: #FFFFFF;
	}

	.item-btn {
		padding-left: 16rpx;
		padding-right: 16rpx;
		/* width: 144rpx; */
		height: 48rpx;
		border-radius: 100px;
		border: 1rpx solid #1677FF;
		color: #1677FF;
		font: 24rpx;
		line-height: 48rpx;
		text-align: center;
	}
</style>
