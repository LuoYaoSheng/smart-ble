<template>
	<view>
		<web-view :webview-styles="webviewStyles" :src="url"></web-view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				url: 'https://www.baidu.com',
				webviewStyles: {
					progress: {
						color: '#e7f1ff'
					}
				}
			}
		},
		methods: {

		},
		onLoad(option) {
			this.url = option.url
			uni.setClipboardData({
				data: this.url
			})
		}
	}
</script>

<style>

</style>
