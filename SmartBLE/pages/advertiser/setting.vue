<template>
	<view class="flex flex-column">
		<!-- Log Printing-->
		<text class="list-title">Log Printing</text>
		<view class="list-input flex flex-row align-center">
			<text class="list-input-title flex-1">打印格式</text>
			<skSwitch leftText="HEX" rightText="ASCII" :value="LogFormat" @change="formatChange"></skSwitch>
		</view>
		<divider></divider>
		<view class="list-input flex flex-row align-center">
			<text class="list-input-title flex-1">简化展示</text>
			<switch color="#1677ff" :checked="LogSimplify" @change="switchChange" />
		</view>
		<divider></divider>
		<view class="list-input flex flex-row align-center">
			<text class="list-input-title flex-1">自动滚动</text>
			<switch color="#1677ff" :checked="LogAutoRoll" @change="switchChange" />
		</view>

		<!-- Response Mode -->
		<text class="list-title">Response Mode</text>
		<view class="list-input flex flex-row align-center">
			<text class="list-input-title flex-1">响应</text>
			<skSwitch leftText="被写入" rightText="循环" :value="RspModel" @change="modelChange"></skSwitch>
		</view>
		<divider></divider>
		<view class="list-input flex flex-row align-center" @click="goPage()" v-if="RspModel">
			<text class="list-input-title flex-1">循环延迟</text>
			<text class="color-text-weak font-size-subtitle">{{RspStepExt}}</text>
			<text class="iconfont icon-next color-text-weak font-size-stress"></text>
		</view>

		<!-- 按钮 -->
		<view class="btn-content flex flex-row justify-between">
			<view class="btn text-center color-text-title font-size-title" @click="clsAction()">清屏</view>
			<view class="btn text-center color-fill-primary color-text-base font-size-title" @click="ssAction()">
				{{btnTitle}}
			</view>
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

				LogFormat: 0, // 0：HEX , 1：ASCII
				LogSimplify: false, // 是否简化
				LogAutoRoll: true, // 是否自动滚动
				LogFileName: 'log_ble_file', // Log存储文件名

				RspModel: 0, // 响应模式：0：被写入，1：循环
				RspStep: 50, // 响应间隔，毫秒


				btnTitle: '暂停'
			}
		},
		computed: {
			RspStepExt: function() {
				return this.RspStep + ' ms'
			}
		},
		methods: {
			formatChange: function(e) {
				this.LogFormat = e
			},
			modelChange: function(e) {
				this.RspModel = e
			},
			switchChange: function(e) {
				console.log('switchChange 发生 change 事件，携带值为', e)
			},
			goPage: function() {
				uni.navigateTo({
					url: './loopDelay'
				})
			},

			clsAction: function() {
				let pages = getCurrentPages()
				let prevPage = pages[pages.length - 2]
				prevPage.$vm.isClear = true

				setTimeout(function() {
					uni.navigateBack()
				}, 300)
			},
			ssAction: function() {
				let pages = getCurrentPages()
				let prevPage = pages[pages.length - 2]
				prevPage.$vm.isStop = !prevPage.$vm.isStop

				setTimeout(function() {
					uni.navigateBack()
				}, 300)
			},
			load: function() {
				var that = this

				// 打印日志
				uni.getStorage({
					key: 'LogFormat',
					success: function(res) {
						that.LogFormat = res.data
					},
					fail(res) {
						that.LogFormat = that.$Config.Conf.LogFormat
						uni.setStorage({
							key: 'LogFormat',
							data: that.LogFormat
						})
					}
				})
				// 简化展示
				uni.getStorage({
					key: 'LogSimplify',
					success: function(res) {
						that.LogSimplify = res.data
					},
					fail(res) {
						that.LogSimplify = that.$Config.Conf.LogSimplify
						uni.setStorage({
							key: 'LogSimplify',
							data: that.LogSimplify
						})
					}
				})
				// 自动滚动
				uni.getStorage({
					key: 'LogAutoRoll',
					success: function(res) {
						that.LogAutoRoll = res.data
					},
					fail(res) {
						that.LogAutoRoll = that.$Config.Conf.LogAutoRoll
						uni.setStorage({
							key: 'LogAutoRoll',
							data: that.LogAutoRoll
						})
					}
				})
				// 相应模式
				uni.getStorage({
					key: 'RspModel',
					success: function(res) {
						that.RspModel = res.data
					},
					fail(res) {
						that.RspModel = that.$Config.Conf.RspModel
						uni.setStorage({
							key: 'RspModel',
							data: that.RspModel
						})
					}
				})

				// 相应间隔 放到 show
			},
			show: function() {
				var that = this
				uni.getStorage({
					key: 'RspStep',
					success: function(res) {
						that.RspStep = res.data
					},
					fail(res) {
						that.RspStep = that.$Config.Conf.RspStep
						uni.setStorage({
							key: 'RspStep',
							data: that.RspStep
						})
					}
				})
			},
		},
		onShow() {
			this.show()
		},
		onLoad(option) {
			this.btnTitle = option.isStop == 'false' ? '暂停' : '开启'
			this.load()
		},
		onHide() {
			// 打印日志
			uni.setStorage({
				key: 'LogFormat',
				data: this.LogFormat
			})
			// 简化展示
			uni.setStorage({
				key: 'LogSimplify',
				data: this.LogSimplify
			})
			// 自动滚动
			uni.setStorage({
				key: 'LogAutoRoll',
				data: this.LogAutoRoll
			})
			// 相应模式
			uni.setStorage({
				key: 'RspModel',
				data: this.RspModel
			})
		}
	}
</script>

<style>
	.btn-content {
		margin-top: 168rpx;
		padding-left: 24rpx;
		padding-right: 24rpx;
	}

	.btn {
		width: 339rpx;
		height: 98rpx;
		border-radius: 8rpx;
		border: 2rpx solid #E5E5E5;
		line-height: 98rpx;
	}
</style>
