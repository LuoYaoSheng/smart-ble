<template>
	<view class="item flex flex-column p-1">
		<view class="top flex-1 flex flex-row ">
			<view class="flex-1 flex flex-column justify-center">
				<view class="item-1 flex flex-row text-area align-center">
					<view class="left-item flex align-center justify-center">
						<image class="signal" :src="require('../static/imgs/'+signalUrl)" mode="aspectFit"></image>
					</view>
					<text class="color-text-title font-size-list">{{bleName}}</text>
				</view>
				<view class="item-1 flex flex-row">
					<text class="font-size-content color-text-title left-item text-center">{{itemObj.RSSI}}</text>
					<text class="font-size-content color-text-subtitle">{{serverNum}}</text>
				</view>
			</view>
			<view class="ml-1 flex justify-center align-center">
				<text class="ml-1 iconfont icon-next color-text-weak font-size-stress" v-show="isServer"></text>
			</view>
		</view>
		<view class="bottom font-size-content color-text-subtitle">UUID: {{itemObj.deviceId}}</view>
	</view>
</template>

<script>
	export default {
		name: "scannerItem",
		data() {
			return {

			}
		},
		computed: {
			bleName: function() {
				var name = this.itemObj.localName ? this.itemObj.localName : this.itemObj.name
				name = name ? name : 'N/A'
				return name
			},
			signalUrl: function() {
				let quality = Math.min(Math.max(2 * (this.itemObj.RSSI + 100), 0), 100)
				return 'signal' + Math.round(quality / 25) + '.png'
			},
			serverNum: function() {
				if (this.itemObj.advertisServiceUUIDs) {
					let length = this.itemObj.advertisServiceUUIDs.length
					return length > 0 ? length + ' server' : '0 servers'
				} else {
					return '0 servers'
				}
			},
			isServer:function(){
				if (this.itemObj.advertisServiceUUIDs) {
					let length = this.itemObj.advertisServiceUUIDs.length
					return length > 0 ? true : false
				} else {
					return false
				}
			}
		},
		props: {
			itemObj: {
				type: Object,
				value: {
					name: '设备名',
					deviceId: 1234567890,
					RSSI: -1,
					advertisData: [],
					advertisServiceUUIDs: [],
					localName: '',
					serviceData: {}
				}
			}
		},
		methods: {
			rssi2quality: function(rssi) {
				let quality = Math.min(Math.max(2 * (rssi + 100), 0), 100)
				return '../static/imgs/signal' + Math.round(quality / 20) + '.png'
			},
		}
	}
</script>

<style>
	.item {
		height: 204rpx;
		background-color: #FFFFFF;
		padding-left: 24rpx;
		padding-right: 24rpx;
	}

	.top {
		/* background-color: #0056B3; */
	}

	.top .item-1 {
		height: 54rpx;
		line-height: 54rpx;
	}

	.left-item {
		width: 80rpx;
	}

	.signal {
		width: 46rpx;
		height: 42rpx;
	}

	.bottom {
		height: 48rpx;
		line-height: 48rpx;
	}
</style>
