<template>
	<view class="item flex flex-row align-center">
		<text class="left-text font-size-content color-text-subtitle v-spacing-standard-right">{{timeTxt}} ></text>
		<text class="flex-1 font-size-content" :class="txtColor">{{txt}}</text>
	</view>
</template>

<script>
	export default {
		name: "logItem",
		data() {
			return {

			}
		},
		computed: {
			timeTxt: function() {
				let d = new Date(this.itemObj.time)
				return d.toLocaleDateString() + d.toLocaleTimeString()
			},
			txt: function() {
				var uuid = this.itemObj.id
				var content = this.itemObj.msg
				switch (this.itemObj.type) {
					case 1:
						return '[' + uuid + '] 已连接'
					case 2:
						return '[' + uuid + '] Notification开启'
					case 3:
						return '[' + uuid + '] 读取特征值'
					case 4:
						return '接收[' + uuid + '] ' + content
					case 5:
						return '通知[' + uuid + '] ' + content
					case 6:
						return '写入[' + uuid + '] ' + content
					case 10:
						return '错误 ' + content
					default:
						return '[' + uuid + '] ' + content
				}
			},
			txtColor: function() {
				switch (this.itemObj.type) {
					case 1:
						return 'color-text-title'
					case 2:
						return 'color-orange-1'
					case 3:
						return 'color-pomonagreen-1'
					case 4:
						return 'color-darkgreen-1'
					case 5:
						return 'color-royallight-1'
					default:
						return 'color-text-title'
				}
			}
		},
		props: {
			itemObj: {
				type: Object,
				value: {
					time: '14:11:05.815',
					uuid: '4D:3E:DF:07:01',
					content: '已连接',
					type: 0
				},
			}
		}
	}
</script>

<style>
	.item {
		background-color: #FFFFFF;
		padding-left: 24rpx;
		padding-right: 24rpx;
		padding-top: 12rpx;
		padding-bottom: 12rpx;
	}
	
	.left-text {
		width: 160rpx;
	}
</style>
