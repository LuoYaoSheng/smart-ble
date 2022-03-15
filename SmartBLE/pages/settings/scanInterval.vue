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
				interval: 30,
				list: [5, 30, 60, 120, 300, 1800, 0]
			}
		},
		computed: {
			listExt: function() {
				var list = []
				for (var i = 0; i < this.list.length; i++) {
					var t = this.$Tool.secText(this.list[i])
					list.push(t)
				}
				return list
			}
		},
		methods: {
			selectAction: function(idx) {
				this.interval = this.list[idx]
				this.setStorageScanStep(this.interval)
				setTimeout(function() {
					uni.navigateBack()
				}, 300)
			},
			load: function() {
				var that = this
				uni.getStorage({
					key: 'ScanStep',
					success: function(res) {
						that.interval = res.data
					},
					fail(res) {
						that.interval = that.$Config.Conf.ScanStep
						that.setStorageScanStep(that.interval)
					}
				})
			},
			setStorageScanStep: function(step) {
				uni.setStorage({
					key: 'ScanStep',
					data: step
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
