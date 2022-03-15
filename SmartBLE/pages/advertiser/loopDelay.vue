<template>
	<view class="flex flex-column">
		<block v-for="(item,idx) in listExt">
			<divider></divider>
			<view class="item flex flex-row align-center" @click="selectAction(idx)">
				<text class="flex-1 color-text-title font-size-list">{{item}}</text>
				<text class="iconfont icon-check color-text-primary font-size-stress" v-if="interval==list[idx]"></text>
			</view>
		</block>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				interval: 500,
				list: [50, 60, 70, 80, 90, 100, 300, 500, 800, 1000, 1500, 2000]
			}
		},
		computed: {
			listExt: function() {
				var list = []
				for (var i = 0; i < this.list.length; i++) {
					var t = this.list[i] + ' ms'
					list.push(t)
				}
				return list
			}
		},
		methods: {
			selectAction: function(idx) {
				this.interval = this.list[idx]
				uni.setStorage({
					key: 'RspStep',
					data: this.interval
				})

				setTimeout(function() {
					uni.navigateBack()
				}, 300)
			},
			load: function() {
				var that = this
				uni.getStorage({
					key: 'RspStep',
					success: function(res) {
						that.interval = res.data
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
	.item {
		height: 96rpx;
		background-color: #FFFFFF;
		padding-left: 24rpx;
		padding-right: 24rpx;

	}
</style>
