<template>
	<view class="flex flex-column align-center">
		<view class="flex flex-column align-center">
			<image class="logo corner-radius-md" src="../../static/imgs/about.png" mode="aspectFit"></image>
			<text class="title1 font-size-title color-text-title">{{name}}</text>
			<text class="title2 font-size-content color-text-subtitle">v {{version}}</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				name: 'SimpleBLE',
				version: '1.0.0',
			}
		},
		methods: {
			getVersion: function() {
				// #ifdef APP-PLUS
				plus.runtime.getProperty(plus.runtime.appid, (wgtinfo) => {
					this.version = wgtinfo.version
				})
				// #endif
			},
		},
		onLoad() {
			this.getVersion()
		}
	}
</script>

<style>
	.logo {
		width: 336rpx;
		height: 336rpx;
		margin-top: 182rpx;
	}

	.title1 {
		margin-top: 42rpx;
		height: 50rpx;
		line-height: 50rpx;
	}

	.title2 {
		margin-top: 24rpx;
		height: 36rpx;
		line-height: 36rpx;
	}
</style>
