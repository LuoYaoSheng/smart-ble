<template>
	<view class="flex flex-column">
		<!-- 赛选项 -->
		<view class="list-input flex flex-row">
			<text class="list-input-title">名称</text>
			<input class="list-input-value flex-1" type="text" :value="FilterName" @input="filterNameVal"
				placeholder="请输入名称" />
		</view>
		<divider></divider>
		<view class="list-input flex flex-row">
			<text class="list-input-title">UUID</text>
			<input class="list-input-value flex-1" type="text" :value="FilterUUID" @input="filterUUIDVal"
				placeholder="请输入UUID" />
		</view>
		<divider></divider>
		<view class="list-input flex flex-row align-center">
			<text class="list-input-title">RSSI</text>
			<slider activeColor="#1677ff" class="flex-1" :value="FilterRSSI" @change="sliderChange" :min="sliderMin"
				:max="sliderMax" show-value />
		</view>
		<divider></divider>
		<view class="list-input flex flex-row justify-between flex-row ">
			<text class="list-input-title">空名过滤</text>
			<switch color="#1677ff" :checked="FilterEmpty" @change="switchChange" />
		</view>

		<!-- 按钮 -->
		<button class="btn v-spacing-large corner-radius-md font-size-title" @click="btnAction()">赛选</button>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				FilterName: '', // 过滤器 - 名称
				FilterUUID: '', // 过滤器 - UUID
				FilterRSSI: -50, // 过滤器 - RSSI
				FilterEmpty: false, // 过滤器 - 空名过滤

				sliderMin: -100,
				sliderMax: 0
			}
		},
		methods: {
			btnAction: function() {
				uni.setStorage({
					key: 'FilterName',
					data: this.FilterName
				})
				uni.setStorage({
					key: 'FilterUUID',
					data: this.FilterUUID
				})
				uni.setStorage({
					key: 'FilterRSSI',
					data: this.FilterRSSI
				})
				uni.setStorage({
					key: 'FilterEmpty',
					data: this.FilterEmpty
				})

				setTimeout(function() {
					uni.navigateBack()
				}, 300)
			},
			switchChange: function(e) {
				this.FilterEmpty = e.detail.value
			},
			sliderChange: function(e) {
				this.FilterRSSI = e.detail.value
			},

			filterNameVal: function(e) {
				this.FilterName = e.target.value
			},
			filterUUIDVal: function(e) {
				this.FilterUUID = e.target.value
			},

			load() {
				// 一定存在，所以免去fail
				var that = this
				uni.getStorage({
					key: 'FilterName',
					success: function(res) {
						that.FilterName = res.data
					}
				})
				uni.getStorage({
					key: 'FilterUUID',
					success: function(res) {
						that.FilterUUID = res.data
					}
				})
				uni.getStorage({
					key: 'FilterRSSI',
					success: function(res) {
						that.FilterRSSI = res.data
					}
				})
				uni.getStorage({
					key: 'FilterEmpty',
					success: function(res) {
						that.FilterEmpty = res.data
					}
				})
			}
		},
		onLoad() {
			this.load()
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
