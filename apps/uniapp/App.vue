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
	/* UI-PARITY-G0（2026-09-09）：tokens.css 为正典 token 唯一来源
	   （core/assets-generator/meta/design-tokens.json 生成，--c-* 体系，见 docs/specs/07_design_system/TOKEN_REFERENCE.md）。
	   design-system.css 的 --ble-* 降级为别名层（逐项指向 --c-*，不带自有 hex），仅存量页面兼容；
	   app_theme.css 为跨平台 legacy 生成产物（Electron/Tauri 同源，值已对齐正典），小程序不消费。 */
	@import url('./styles/tokens.css');
	@import url('./styles/design-system.css');
</style>
