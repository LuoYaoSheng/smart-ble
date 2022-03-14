<template>
	<view>
		<view class="flex align-center justify-center" :style="{height: windowHeight + 'px'}" v-if="!isContented">
			<spread :w="windowWidth" :h="windowHeight"></spread>
		</view>

		<view v-else>
			<block v-for="(obj,idx) in list" :key="idx">
				<divider></divider>
				<item :itemObj="obj"></item>
			</block>
		</view>

		<uni-fab v-if="isMp" :pattern="pattern" :content="content" :horizontal="horizontal" :vertical="vertical"
			:direction="direction" @trigger="trigger">
		</uni-fab>
	</view>
</template>

<script>
	// 引用组件
	import spread from '@/components/spread.vue';
	import item from '@/components/logItem.vue';

	export default {
		components: {
			spread,
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
						iconPath: '/static/imgs/classification.png',
						active: false
					}
				],
				// #endif

				isClear: false,
				isStop: false,

				isContented: true,
				windowWidth: 0,
				windowHeight: 0,
				list: [{
						time: '14:11:05.815',
						uuid: '4D:3E:DF:07:01',
						content: '已连接',
						type: 0
					},
					{
						time: '14:11:05.820',
						uuid: '4D:2E:ED:D2:07',
						content: 'Notification开启',
						type: 1
					},
					{
						time: '14:11:05.900',
						uuid: '4D:3E:DF:07:01',
						content: '读取特征值',
						type: 2
					},
					{
						time: '14:11:05.910',
						uuid: '4D:3E:DF:07:01',
						content: '68 65 6C 6C 6F',
						type: 3
					},
					{
						time: '14:11:05.998',
						uuid: '4D:3E:DF:07:01',
						content: '06 05 04 03 02 01',
						type: 4
					},
				]
			}
		},
		methods: {
			getSystemInfo: function() {

				// #ifdef MP
				this.isMp = true
				// #endif

				var that = this
				uni.getSystemInfo({
					success: function(res) {
						that.windowWidth = res.windowWidth
						that.windowHeight = res.windowHeight
					}
				})
			},
			exportAction: function() {
				uni.showToast({
					title: "导出"
				})
			},
			setttingAction: function() {
				uni.navigateTo({
					url: "./setting?isStop=" + this.isStop
				})
			},
			trigger: function(e) {
				switch (e.index) {
					case 0:
						this.exportAction()
						break
					case 1:
						this.setttingAction()
						break
				}
			},

			// 蓝牙相关
			wxCreateBLEPeripheralServer: function() {
				// #ifdef MP-WEIXIN
				wx.createBLEPeripheralServer({
					success: (result) => {
						console.log('create success')
						let server = result.server
						let name = 'LightBLE'
						server.startAdvertising({
							advertiseRequest: {
								connected: true,
								deviceName: name,
							}
						}).then(
							(res) => {
								console.log('advertising', res)
							},
							(res) => {
								console.warn('ad fail', res)
							}
						)
					},
					fail: (res) => {
						console.log('creat fail')
					}
				})
				// #endif
			}
		},
		onLoad() {
			this.getSystemInfo()

			this.wxCreateBLEPeripheralServer()
		},
		onShow() {
			console.log('------ 广播操作的更新 -----')
			if (this.isClear) {
				console.log('---- 执行清屏操作 ----')
				this.isClear = true
			}
			if (this.isStop) {
				console.log('---- 停止广播 ----')
			} else {
				console.log('---- 开启广播 ----')
			}
		},
		onHide() {
			// #ifdef MP-WEIXIN
			wx.closeBluetoothAdapter({
				success: (result) => {
					console.log("success:", result);
				},
				fail: (result) => {
					console.log("fail:", result);
				}
			})
			// #endif	
		},
		onNavigationBarButtonTap(e) {
			this.trigger(e)
		},
		onPullDownRefresh() {
			console.log('---------- 刷新 ---------')
			this.isStop = false
			uni.stopPullDownRefresh()
		}
	}
</script>

<style>

</style>
