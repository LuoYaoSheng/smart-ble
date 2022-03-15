<template>
	<view>
		<view class="flex align-center justify-center" :style="{height: windowHeight + 'px'}" v-if="isEmpty">
			<spread :w="windowWidth" :h="windowHeight"></spread>
		</view>

		<view v-else>
			<block v-for="(obj,idx) in showList" :key="idx">
				<divider></divider>
				<item :itemObj="obj" @click.native="itemAction(idx)"></item>
			</block>
		</view>

		<uni-fab v-if="isMp" :pattern="pattern" :content="content" :horizontal="horizontal" :vertical="vertical"
			:direction="direction" @trigger="trigger">
		</uni-fab>
	</view>
</template>

<script>
	// 引用组件
	import item from '@/components/scannerItem.vue';
	import spread from '@/components/spread.vue';

	export default {
		components: {
			item,
			spread
		},
		computed: {
			isEmpty() {
				return this.showList.length > 0 ? false : true
			}
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
						iconPath: '/static/imgs/more.png',
						active: false
					},
					{
						iconPath: '/static/imgs/search.png',
						active: false
					},
					{
						iconPath: '/static/imgs/scan.png',
						active: false
					}
				],
				// #endif

				windowWidth: 0,
				windowHeight: 0,
				list: [],
				showList: [],

				FilterName: '', // 过滤器 - 名称
				FilterUUID: '', // 过滤器 - UUID
				FilterRSSI: -100, // 过滤器 - RSSI
				FilterEmpty: false, // 过滤器 - 空名过滤
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
			scanCode: function() {
				// #ifdef H5
				uni.showToast({
					icon: "none",
					title: "暂不支持扫码功能"
				})
				// #endif
				// #ifdef APP-PLUS || MP-WEIXIN
				uni.scanCode({
					success: function(res) {
						// 获得 uuid 快速连接
						let msg = '类型:' + res.scanType + ' 内容:' + res.result
						uni.showToast({
							title: msg
						})
					}
				})
				// #endif
			},
			refresh: function() {
				var that = this
				uni.stopBluetoothDevicesDiscovery({
					complete(res) {
						that.list = []
						that.showList = []
						that.bleOpenBluetoothAdapter()
					}
				})
			},
			filter: function() {
				uni.navigateTo({
					url: "../scanner/filter"
				})
			},
			itemAction: function(idx) {
				let url = "../scanner/equipment?item=" + JSON.stringify(this.list[idx])
				uni.navigateTo({
					url: url
				})
			},
			refreshStatus: function(state) {
				// #ifdef APP-PLUS
				var currentWebview = this.$mp.page.$getAppWebview()
				var tn = currentWebview.getStyle().titleNView
				tn.buttons[1].text = state ? "\ue62b" : "\ue6a0"
				currentWebview.setStyle({
					titleNView: tn
				})
				// #endif
			},
			trigger: function(e) {
				switch (e.index) {
					case 0:
						this.filter()
						break
					case 1:
						uni.startPullDownRefresh()
						break
					case 2:
						this.scanCode()
						break
				}
			},
			show: function() {
				var that = this
				const FilterName = uni.getStorageSync('FilterName')
				if (FilterName) {
					that.FilterName = FilterName
				} else {
					that.FilterName = that.$Config.Conf.FilterName
					uni.setStorage({
						key: 'FilterName',
						data: that.FilterName
					})
				}

				const FilterUUID = uni.getStorageSync('FilterUUID')
				if (FilterUUID) {
					that.FilterUUID = FilterUUID
				} else {
					that.FilterUUID = that.$Config.Conf.FilterUUID
					uni.setStorage({
						key: 'FilterUUID',
						data: that.FilterUUID
					})
				}

				const FilterRSSI = uni.getStorageSync('FilterRSSI')
				if (FilterRSSI) {
					that.FilterRSSI = FilterRSSI
				} else {
					that.FilterRSSI = that.$Config.Conf.FilterRSSI
					uni.setStorage({
						key: 'FilterRSSI',
						data: that.FilterRSSI
					})
				}

				const FilterEmpty = uni.getStorageSync('FilterEmpty')
				if (FilterEmpty) {
					that.FilterEmpty = FilterEmpty
				} else {
					that.FilterEmpty = that.$Config.Conf.FilterEmpty
					uni.setStorage({
						key: 'FilterEmpty',
						data: that.FilterEmpty
					})
				}

				that.dataRegularization()

				// #ifdef MP || APP 
				that.bleOpenBluetoothAdapter()
				// uni.getBluetoothAdapterState({
				// 	fail(res) {
				// 		uni.showToast({
				// 			icon: 'none',
				// 			title: '请查看蓝牙是否开启'
				// 		})
				// 	},
				// 	success(res) {
				// 		that.bleOpenBluetoothAdapter()
				// 	}
				// })

				// setInterval(function() {
				// 	console.log('------ 蓝牙状态 ----')
				// }, 300)
				// #endif
			},

			dataRegularization: function() {
				var list = []
				var count = this.list.length
				for (let i = 0; i < this.list.length; i++) {
					let itemObj = this.list[i]
					let name = itemObj.name ? itemObj.name : itemObj.localName
					let add = true
					// 空名过滤
					if (this.FilterEmpty) {
						if (!name) add = false
					}
					// 过滤器 - RSSI
					if (!(itemObj.RSSI > this.FilterRSSI)) add = false
					// 过滤器 - 名称
					if (this.FilterName.length > 0 && (!name || name.indexOf(this.FilterName)) < 0) add = false
					// 过滤器 - UUID	
					if (itemObj.deviceId.indexOf(this.FilterUUID) < 0) add = false

					if (add) list.push(itemObj)
				}

				this.showList = list
			},
			// 蓝牙相关
			// 初始化蓝牙模块
			bleOpenBluetoothAdapter: function() {
				var that = this
				uni.openBluetoothAdapter({
					mode: 'cnetral',
					success(res) {
						that.bleStartBluetoothDevicesDiscovery()
					},
					fail(res) {
						if (res.errMsg == 'openBluetoothAdapter:fail already opened') {
							that.bleStartBluetoothDevicesDiscovery()
						} else {
							uni.showToast({
								icon: 'none',
								title: res.errMsg
							})
						}
					},
					complete(res) {
						uni.stopPullDownRefresh()
					}
				})
			},
			// 开始搜寻附近的蓝牙外围设备
			bleStartBluetoothDevicesDiscovery: function() {
				var that = this
				uni.startBluetoothDevicesDiscovery({
					// services: ['FEE7'],  增加条件
					// interval: 0,
					allowDuplicatesKey: false,
					success(res) {
						that.bleOnBluetoothDeviceFound()
					},
					fail(res) {
						if (res.errMsg == 'startBluetoothDevicesDiscovery:fail already discovering devices') {
							that.bleOnBluetoothDeviceFound()
						} else {
							uni.showToast({
								icon: 'none',
								title: res.errMsg
							})
						}
					}
				})
			},
			// 监听寻找到新设备的事件
			bleOnBluetoothDeviceFound: function() {
				let that = this
				uni.onBluetoothDeviceFound(function(obj) {
					let list = obj.devices
					for (let i = 0; i < list.length; i++) {
						that.belDeviceAdd(list[i])
					}
					that.dataRegularization()
				})
			},
			// 设备加入
			belDeviceAdd: function(dev) {
				let selectIdx = -1
				for (let i = 0; i < this.list.length; i++) {
					let item = this.list[i]
					if (item.deviceId == dev.deviceId) {
						selectIdx = i
						break
					}
				}
				if (selectIdx == -1) {
					this.list.push(dev)
				} else {
					this.list[selectIdx] = dev
				}
			},
		},
		onLoad() {
			// 演示数据，仅模板使用
			// #ifdef H5
			this.list = this.$Mock.devices
			this.showList = this.list
			// #endif
			// #ifdef MP || APP
			this.getSystemInfo()
			this.bleOpenBluetoothAdapter()
			// #endif
		},
		onShow() {
			this.show()
		},
		onNavigationBarButtonTap(e) {
			this.trigger(e)
		},
		onPullDownRefresh() {
			this.refresh()
		}
	}
</script>

<style>
</style>
