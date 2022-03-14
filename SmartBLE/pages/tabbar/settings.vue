<template>
	<view class="flex flex-column">
		<!-- Scanner -->
		<text class="list-title">Scanner</text>
		<view class="list-input flex flex-row" @click="goPage()">
			<text class="list-input-title flex-1">扫描间隔</text>
			<text class="color-text-weak font-size-subtitle">{{intervalExt}}</text>
			<text class="iconfont icon-next color-text-weak font-size-stress"></text>
		</view>
		<divider></divider>
		<view class="list-input flex flex-row">
			<text class="list-input-title flex-1">连接后是否停止扫描</text>
			<switch color="#1677ff" :checked="checked" @change="switchChange" />
		</view>

		<!-- Application -->
		<text class="list-title">Application</text>
		<view class="list-input flex flex-row">
			<text class="list-input-title flex-1">版本号</text>
			<text class="color-text-weak font-size-subtitle">V {{version}}</text>
		</view>
		<divider></divider>
		<view class="list-input flex flex-row" @click="goUrl( GitHubUrl )">
			<text class="list-input-title flex-1">GitHub</text>
			<text class="iconfont icon-next color-text-weak font-size-stress"></text>
		</view>

		<!-- About -->
		<text class="list-title">About</text>
		<view class="list-input flex flex-row" @click="goUrl( FeedbackUrl )">
			<text class="list-input-title flex-1">提交反馈</text>
			<text class="iconfont icon-next color-text-weak font-size-stress"></text>
		</view>
		<divider></divider>
		<view class="list-input flex flex-row" @click="goAbout()">
			<text class="list-input-title flex-1">关于我们</text>
			<text class="iconfont icon-next color-text-weak font-size-stress"></text>
		</view>
		<divider></divider>
		<view class="list-input flex flex-row" @click="goUrl( PrivacyPolicyUrl )">
			<text class="list-input-title flex-1">隐私政策</text>
			<text class="iconfont icon-next color-text-weak font-size-stress"></text>
		</view>

	</view>
</template>

<script>
	export default {
		data() {
			return {
				checked: true,
				interval: '30',
				version: '1.0.0',

				GitHubUrl: 'https://github.com/LuoYaoSheng/SimpleBLE',
				FeedbackUrl: 'https://github.com/LuoYaoSheng/SimpleBLE/issues',
				PrivacyPolicyUrl: 'https://github.com/LuoYaoSheng/SimpleBLE/wiki/privacy',
				EvaluateUrl: 'https://i2kai.com',
			}
		},
		computed: {
			intervalExt: function() {
				return this.$Tool.secText(this.interval)
			}
		},
		methods: {
			switchChange: function(e) {
				this.checked = e.target.value
			},
			goPage: function() {
				uni.navigateTo({
					url: '../settings/scanInterval'
				})
			},
			goAbout: function() {
				uni.navigateTo({
					url: '../settings/about'
				})
			},
			goUrl: function(url) {
				// #ifdef APP-PLUS
				plus.runtime.openURL(url)
				// #endif

				// #ifdef MP || H5
				uni.navigateTo({
					url: '../settings/web?url=' + url
				})
				// #endif
			},
			getVersion: function() {
				// #ifdef APP-PLUS
				plus.runtime.getProperty(plus.runtime.appid, (wgtinfo) => {
					this.version = wgtinfo.version
				})
				// #endif
			},
			load: function() {
				// 从配置文件读取，减少代码操作
				this.GitHubUrl = this.$Config.Conf.GitHubUrl
				this.FeedbackUrl = this.$Config.Conf.FeedbackUrl
				this.PrivacyPolicyUrl = this.$Config.Conf.PrivacyPolicyUrl
				this.EvaluateUrl = this.$Config.Conf.EvaluateUrl

				// 需存储内容
				var that = this
				uni.getStorage({
					key: 'ConnectAutoStop',
					success: function(res) {
						that.checked = res.data
					},
					fail(res) {
						that.checked = that.$Config.Conf.ConnectAutoStop
						that.setStorageConnectAutoStop(that.checked)
					}
				})
			},
			show: function() {
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
			setStorageConnectAutoStop: function(checked) {
				uni.setStorage({
					key: 'ConnectAutoStop',
					data: checked
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
			this.getVersion()
			this.load()
		},
		onShow() {
			this.show()
		},
		onHide() {
			this.setStorageConnectAutoStop(this.checked)
		}
	}
</script>

<style>

</style>
