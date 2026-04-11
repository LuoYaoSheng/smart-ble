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
	/*每个页面公共css */
	@media (prefers-color-scheme: dark) {
		page, :root {
			--uni-color-primary: #0a84ff;
			--uni-text-color: #ffffff;
			--uni-text-color-inverse: #000000;
			--uni-text-color-grey: #ebebf5;
			--uni-text-color-placeholder: #8e8e93;
			--uni-text-color-disable: #48484a;
			
			--uni-bg-color: #000000;
			--uni-bg-color-grey: #1c1c1e;
			--uni-bg-color-hover: #2c2c2e;
			--uni-bg-color-mask: rgba(255, 255, 255, 0.1);
			
			--uni-border-color: #38383a;
		}
	}
</style>
