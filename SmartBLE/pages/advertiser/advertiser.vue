<template>
	<view class="flex flex-column" v-if="!isMp">
		<!-- Service -->
		<text class="list-title">Service</text>
		<view class="list-input flex flex-row">
			<text class="list-input-title">服务UUID</text>
			<input class="list-input-value flex-1" type="text" :value="Service.uuid" placeholder="请输入服务UUID" />
		</view>

		<!-- Characteristic -->
		<text class="list-title">Characteristic</text>
		<view class="list-input flex flex-row">
			<text class="list-input-title">服务UUID</text>
			<input class="list-input-value flex-1" type="text" :value="Characteristic.uuid1" placeholder="请输入服务UUID" />
		</view>
		<divider></divider>
		<view class="list-input flex flex-row">
			<text class="list-input-title">特征UUID</text>
			<input class="list-input-value flex-1" type="text" :value="Characteristic.uuid2" placeholder="请输入特征UUID" />
		</view>
		<divider></divider>
		<view class="list-input flex flex-row">
			<text class="list-input-title">特征数据</text>
			<input class="list-input-value flex-1" type="text" :value="Characteristic.data1" placeholder="请输入特征数据" />
		</view>
		<divider></divider>
		<view class="list-input flex flex-row">
			<text class="list-input-title">通知数据</text>
			<input class="list-input-value flex-1" type="text" :value="Characteristic.data2" placeholder="请输入通知数据" />
		</view>

		<!-- 按钮 -->
		<button class="btn v-spacing-large corner-radius-md font-size-title" @click="btnAction()">开始广播</button>
	</view>
	<view class="flex flex-column" v-else>
		<!-- Service -->
		<text class="list-title">Service</text>
		<view class="list-input flex flex-row">
			<text class="list-input-title">服务名称</text>
			<input class="list-input-value flex-1" type="text" :value="Service.name" @input="nameVal"
				placeholder="请输入服务名称" />
		</view>
		<!-- 按钮 -->
		<button :loading=serverState class="btn v-spacing-large corner-radius-md font-size-title"
			@click="btnAction()">{{btnTitle}}</button>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isMp: false,
				Service: {
					name: 'LightBLE',
					uuid: ''
				},
				Characteristic: {
					uuid1: '',
					uuid2: '',
					data1: '0123456789',
					data2: '9876543210'
				},

				serverState: false
			}
		},
		computed: {
			btnTitle: function() {
				return this.serverState ? "停止广播" : "开始广播"
			}
		},
		methods: {

			nameVal: function(e) {
				this.Service.name = e.target.value
			},
			btnAction: function() {
				let that = this
				if (this.serverState) {
					// #ifdef MP-WEIXIN
					wx.closeBluetoothAdapter({
						mode: 'peripheral',
						complete: (result) => {
							console.log("closeBluetoothAdapter:", result);
						}
					})
					// #endif
					this.serverState = false
					return
				}


				// #ifdef MP-WEIXIN
				wx.openBluetoothAdapter({
					mode: 'peripheral',
					success(res) {
						// #ifdef MP-WEIXIN
						that.wxCreateBLEPeripheralServer()
						// #endif
						// #ifdef APP || H5
						uni.navigateTo({
							url: '../advertiser/advertiser'
						})
						// #endif
					},
					fail(res) {
						if (res.errMsg == 'openBluetoothAdapter:fail already opened') {
							// #ifdef MP-WEIXIN
							that.wxCreateBLEPeripheralServer()
							// #endif
							// #ifdef APP || H5
							uni.navigateTo({
								url: '../advertiser/advertiser'
							})
							// #endif
						} else {
							uni.showToast({
								icon: 'none',
								title: res.errMsg
							})
						}
					}
				})
				// #endif
			},

			wxCreateBLEPeripheralServer: function() {
				let that = this
				// #ifdef MP-WEIXIN
				wx.createBLEPeripheralServer({
					success: (result) => {
						console.log('create success')
						let server = result.server
						let name = that.Service.name
						server.startAdvertising({
							advertiseRequest: {
								connected: true,
								deviceName: name,
							}
						}).then(
							(res) => {
								console.log('advertising', res)
								that.serverState = true
							},
							(res) => {
								console.warn('ad fail', res)
							}
						)
					},
					fail: (res) => {
						uni.showToast({
							icon: 'none',
							title: '创建服务失败'
						})
					}
				})
				// #endif
			}

		},
		onLoad() {
			// #ifdef MP
			this.isMp = true
			// #endif

			// 初始化几个UUID
			this.Service.uuid = this.$Tool.udid()
			this.Characteristic.uuid1 = this.$Tool.udid()
			this.Characteristic.uuid2 = this.$Tool.udid()
		}
	}
</script>

<style>
	.btn {
		top: 76rpx;
		height: 98rpx;
		line-height: 98rpx;
		background-color: #1677FF;
		color: #FFFFFF;
	}
</style>

