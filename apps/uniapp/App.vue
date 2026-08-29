<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* design-system.css 的 --ble-* 是小程序侧唯一 token 来源；
	   app_theme.css 为跨平台生成产物（Electron/Tauri 同源），小程序不消费其通用 token */
	@import url('./styles/design-system.css');
</style>
