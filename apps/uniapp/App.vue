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
	/* 引入自动生成的主题色彩体系 (Design Tokens) */
	@import url('./app_theme.css');

	/*每个页面公共css */
	page {
		background-color: var(--background);
		color: var(--text-primary);
	}
</style>
