<template>
	<view>
		<block v-for="(obj,idx) in list" :key="idx">
			<divider></divider>
			<item :itemObj="obj"></item>
		</block>

		<uni-fab v-if="isMp" :pattern="pattern" :content="content" :horizontal="horizontal" :vertical="vertical"
			:direction="direction" @trigger="trigger">
		</uni-fab>
	</view>
</template>

<script>
	// 引用组件
	import item from '@/components/logItem.vue';

	export default {
		components: {
			item
		},
		data() {
			return {
				isMp: false,
				// #ifdef MP
				pattern: {
					color: '#7A7E83',
					backgroundColor: '#fff',
					selectedColor: '#1677ff',
					buttonColor: '#fff',
					iconColor: '#1677ff'
				},
				directionStr: '垂直',
				horizontal: 'right',
				vertical: 'bottom',
				direction: 'horizontal',
				content: [{
						iconPath: '/static/imgs/upload.png',
						active: false
					},
					{
						iconPath: '/static/imgs/more.png',
						active: false
					}
				],
				// #endif

				list: [],
			}
		},
		methods: {
			exportAction: function() {
				let log = "日志导出\n\n这是一段日志，希望你喜欢。"

				// #ifdef APP
				uni.shareWithSystem({
					summary: log,
					href: this.$Config.Conf.EvaluateUrl
				})
				// #endif
				// #ifndef APP
				uni.setClipboardData({
					data: log
				})
				// #endif
			},
			trigger: function(e) {
				let that = this

				switch (e.index) {
					case 0:
						this.exportAction()
						break
					case 1:
						uni.removeStorage({
							key: this.$Config.Conf.LogFileName,
							success() {
								that.list = []
								uni.showToast({
									icon: "none",
									title: "清空完成"
								})
							}
						})
						break
				}
			},
			getLogs: function() {
				let key = this.$Config.Conf.LogFileName
				let list = []
				try {
					const res = uni.getStorageSync(key)
					if (res != "") list = res
				} catch (e) {
					console.log("try catch: ", e)
				}
				this.list = list
			}
		},
		onNavigationBarButtonTap(e) {
			this.trigger(e)
		},
		onLoad() {
			// #ifdef MP
			this.isMp = true
			// #endif

			// #ifdef H5
			this.list = this.$Mock.logs
			// #endif
		},
		onShow() {
			// #ifndef H5
			this.getLogs()
			// #endif
		}
	}
</script>

<style>

</style>
