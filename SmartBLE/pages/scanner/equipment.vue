<template>
	<view class="flex flex-column">

		<view v-for="(obj,idx) in list" :key="idx">
			<view class="item flex flex-column justify-center">
				<text class="title font-size-list color-text-title">service</text>
				<text class="subtitle font-size-subtitle color-text-subtitle" selectable=true>UUID: {{obj.UUID}}</text>
			</view>

			<block v-for="(obj2,idx2) in obj.characteristics" :key="idx2">
				<divider></divider>
				<view class="item color-fill-grey-inverse flex flex-row align-center"
					@click="itemAction(obj.UUID,obj2)">
					<view class="flex-1 flex flex-column justify-center">
						<text class="title font-size-list color-text-title">{{obj2.uuid}}</text>
						<text class="subtitle font-size-subtitle color-text-subtitle">支持类型：{{obj2.supportType}}</text>
					</view>
					<text class="iconfont icon-next color-text-weak font-size-stress"></text>
				</view>
			</block>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				itemObj: {},
				list: [],
				ConnectAutoStop: true, // 连接后是否停止扫描
			}
		},
		methods: {
			itemAction: function(uuid, obj) {
				let item = obj
				item.deviceId = this.itemObj.deviceId
				item.serviceId = uuid
				uni.navigateTo({
					url: "./characteristic?item=" + JSON.stringify(item)
				})
			},
			linkStatus: function(state) {
				// #ifdef APP-PLUS
				var currentWebview = this.$mp.page.$getAppWebview()
				var tn = currentWebview.getStyle().titleNView
				tn.buttons[0].text = state ? "\ue6e7" : "\ue6ea"
				tn.buttons[0].color = state ? "#1677FF" : "#ccc"
				currentWebview.setStyle({
					titleNView: tn
				})
				// #endif
			},
			// 蓝牙部分
			createBLEConnection: function() {
				let devId = this.itemObj.deviceId
				var that = this
				uni.createBLEConnection({
					deviceId: devId,
					success(res) {

						let log = {
							time: (new Date()).getTime(),
							type: that.$Config.LogType.Connent,
							id: devId,
							msg: ''
						}
						that.saveLog(log)

						if (that.ConnectAutoStop) {
							uni.stopBluetoothDevicesDiscovery()
						}
						uni.getBLEDeviceServices({
							deviceId: devId,
							success(res) {
								let services = []
								for (let i = 0; i < res.services.length; i++) {
									services.push(res.services[i].uuid)
								}
								services = [...new Set(services)]

								for (let i = 0; i < services.length; i++) {
									setTimeout(function() {
										uni.getBLEDeviceCharacteristics({
											deviceId: devId,
											serviceId: services[i],
											complete(res) {
												that.addService(services[i], res)
											}
										})
									}, (i + 1) * 300)
								}
							}
						})

						uni.onBLEConnectionStateChange(function(res) {
							// 该方法回调中可以用于处理连接意外断开等异常情况
							console.log(
								`device ${res.deviceId} state has changed, connected: ${res.connected}`
							)
							that.linkStatus(res.connected)
							if (!res.connected) {
								uni.showToast({
									icon: 'none',
									title: '连接已断开'
								})
							}
						})
					},
					fail(res) {
						uni.showToast({
							icon: 'none',
							title: '连接失败，请重试'
						})
					}
				})
			},

			addService: function(serviceId, res) {
				for (let i = 0; i < res.characteristics.length; i++) {
					let item = res.characteristics[i]
					item.supportType = ''
					if (item.properties.indicate) item.supportType += 'Indicate、'
					if (item.properties.notify) item.supportType += 'Notify、'
					if (item.properties.read) item.supportType += 'Read、'
					if (item.properties.write) item.supportType += 'Write、'

					item.supportType = item.supportType.substring(0, item.supportType.lastIndexOf('、'))
				}
				let item = {
					UUID: serviceId,
					characteristics: res.characteristics
				}
				this.list.push(item)
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
			// 演示数据
			// #ifdef H5
			let list = this.$Mock.services
			for (let i = 0; i < list.length; i++) {
				this.addService(list[i].UUID, list[i])
			}
			// #endif

			// #ifdef MP || APP
			this.itemObj = JSON.parse(option.item)
			this.createBLEConnection()
			// #endif
		},
		onBackPress(res) {
			uni.closeBLEConnection({
				deviceId: this.itemObj.deviceId
			})
		},
		onShow() {
			const ConnectAutoStop = uni.getStorageSync('ConnectAutoStop')
			if (ConnectAutoStop) {
				this.ConnectAutoStop = ConnectAutoStop
			} else {
				this.ConnectAutoStop = this.$Config.Conf.ConnectAutoStop
				uni.setStorage({
					key: 'ConnectAutoStop',
					data: this.ConnectAutoStop
				})
			}
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
		overflow: hidden;
		word-break: break-all;
		/* break-all(允许在单词内换行。) */
		text-overflow: ellipsis;
		/* 超出部分省略号 */
		display: -webkit-box;
		/** 对象作为伸缩盒子模型显示 **/
		-webkit-box-orient: vertical;
		/** 设置或检索伸缩盒对象的子元素的排列方式 **/
		-webkit-line-clamp: 1;
		/** 显示的行数 **/
	}

	.subtitle {
		height: 42rpx;
		overflow: hidden;
		word-break: break-all;
		/* break-all(允许在单词内换行。) */
		text-overflow: ellipsis;
		/* 超出部分省略号 */
		display: -webkit-box;
		/** 对象作为伸缩盒子模型显示 **/
		-webkit-box-orient: vertical;
		/** 设置或检索伸缩盒对象的子元素的排列方式 **/
		-webkit-line-clamp: 1;
		/** 显示的行数 **/
	}
</style>
