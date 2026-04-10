<template>
	<view class="container">
		<!-- 头部信息 -->
		<view class="header">
			<view class="logo-box">
				<image class="logo-img" src="/static/logo.png" mode="aspectFit"></image>
			</view>
			<text class="app-name">BLE Toolkit+</text>
			<text class="version">Version {{appVersion}}</text>
			<view class="tech-stack">
				<text class="tech-text">Framework: UniApp (Vue3)</text>
				<text class="tech-text">Language: JavaScript / Vue</text>
			</view>
		</view>

		<!-- 应用信息 -->
		<view class="section">
			<view class="info-list">
				<view class="info-item">
					<text class="info-label">系统平台</text>
					<text class="info-value">{{systemInfo.platform}}</text>
				</view>
				<view class="info-item">
					<text class="info-label">系统版本</text>
					<text class="info-value">{{systemInfo.system}}</text>
				</view>
				<view class="info-item">
					<text class="info-label">设备型号</text>
					<text class="info-value">{{systemInfo.model}}</text>
				</view>
			</view>
		</view>

		<!-- 功能特性列表 -->
		<view class="section">
			<view class="section-title">功能特性</view>
			<view class="feature-list">
				<view class="feature-item" v-for="(feature, index) in features" :key="index">
					<view class="feature-icon-wrap">
						<text class="feature-icon">{{feature.icon}}</text>
					</view>
					<view class="feature-content">
						<text class="feature-title">{{feature.title}}</text>
						<text class="feature-desc">{{feature.desc}}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 支持平台 -->
		<view class="section">
			<view class="section-title">支持平台</view>
			<view class="platform-chips">
				<view class="platform-chip" v-for="(pf, index) in supportedPlatforms" :key="index">
					<text class="chip-icon">{{pf.icon}}</text>
					<text class="chip-label">{{pf.name}}</text>
				</view>
			</view>
		</view>

		<!-- 相关链接 -->
		<view class="section">
			<view class="section-title">相关链接</view>
			<view class="menu-list">
				<view class="menu-item" hover-class="menu-item-hover" @click="openWebsite">
					<view class="menu-left">
						<text class="menu-icon">🌐</text>
						<text class="menu-text">官方网站</text>
					</view>
					<text class="menu-arrow">></text>
				</view>
				<view class="menu-item" hover-class="menu-item-hover" @click="goVersion">
					<view class="menu-left">
						<text class="menu-icon">📋</text>
						<text class="menu-text">版本记录</text>
					</view>
					<text class="menu-arrow">></text>
				</view>
				<view class="menu-item" hover-class="menu-item-hover" @click="openFeedback">
					<view class="menu-left">
						<text class="menu-icon">💬</text>
						<text class="menu-text">问题反馈</text>
					</view>
					<text class="menu-arrow">></text>
				</view>
				<view class="menu-item" hover-class="menu-item-hover" @click="shareApp">
					<view class="menu-left">
						<text class="menu-icon">📤</text>
						<text class="menu-text">分享应用</text>
					</view>
					<text class="menu-arrow">></text>
				</view>
			</view>
		</view>

		<!-- 开发者其他应用 -->
		<view class="section">
			<view class="section-title">开发者其他应用</view>
			<scroll-view class="apps-scroll" scroll-x show-scrollbar="false" enhanced>
				<view class="apps-list">
					<view class="app-item" hover-class="app-item-hover" v-for="(app, index) in otherApps" :key="index"
						@click="openApp(app)">
						<image class="app-icon" :src="app.icon" mode="aspectFill"></image>
						<view class="app-info">
							<text class="app-name">{{app.name}}</text>
							<text class="app-desc">{{app.description}}</text>
						</view>
						<view class="app-tag" v-if="app.tag">{{app.tag}}</view>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 底部信息 -->
		<view class="footer">
			<text class="copyright">© {{currentYear}} BLE Toolkit+. All rights reserved.</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				appVersion: '1.0.0',
				systemInfo: {},
				currentYear: new Date().getFullYear(),
			features: [
				{ icon: '🔍', title: '设备扫描', desc: '自动发现附近蓝牙 BLE 设备' },
				{ icon: '🎛️', title: '智能过滤', desc: '按信号强度、名称过滤设备' },
				{ icon: '🔗', title: '快速连接', desc: '一键连接设备并自动发现服务' },
				{ icon: '✏️', title: '数据读写', desc: '支持 HEX/UTF-8 格式读写' },
				{ icon: '🔔', title: '通知监听', desc: '实时接收设备通知数据' },
				{ icon: '📡', title: '广播模式', desc: '模拟 BLE 外设设备' },
			],
			supportedPlatforms: [
				{ icon: '🤖', name: 'Android' },
				{ icon: '📱', name: 'iOS' },
				{ icon: '🪟', name: 'Windows' },
				{ icon: '🍎', name: 'macOS' },
				{ icon: '🐧', name: 'Linux' },
				{ icon: '💬', name: '微信小程序' },
			],
				shareInfo: {
					title: 'BLE Toolkit+ - 多平台BLE调试工具',
					summary: '支持微信小程序、iOS和Android原生应用的BLE调试工具',
					imageUrl: '/static/share.png',
					href: 'https://lightble.i2kai.com/',
					platforms: ['weixin', 'qq', 'sinaweibo', 'email']
				},
				otherApps: [{
					name: '萌喵圈',
					description: '汇集海量精选萌宠图片，随时随地为您提供快乐与治愈',
					icon: 'https://cat.i2kai.com/images/logo.png',
					// tag: '付费',
					url: 'https://cat.i2kai.com/',
					ios: {
						appId: '',
						url: '',
						scheme: ''
					},
					android: {
						packageName: 'o',
						url: ''
					},
					miniProgram: {
						appId: 'wxe0ed0e6727a0a5cd',
						path: 'pages/index/index',
						envVersion: 'release'
					}
				}, {
					name: '宝宝点滴',
					description: '记录宝宝生活的屎尿屁点点滴滴',
					icon: '',
					ios: {
						appId: '',
						url: '',
						scheme: ''
					},
					android: {
						packageName: '',
						url: ''
					},
					miniProgram: {
						appId: 'wx1bb2d5c6821a7883',
						path: 'pages/index/index',
						envVersion: 'release'
					}
				}]
			}
		},
		onLoad() {
			this.getSystemInfo();
			this.getAppVersion();
		},
		methods: {
			getSystemInfo() {
				try {
					const info = uni.getSystemInfoSync();
					this.systemInfo = {
						platform: info.platform === 'android' ? 'Android' : info.platform === 'ios' ? 'iOS' : info
							.platform,
						system: info.system,
						model: info.model
					};
				} catch (e) {
					console.error('获取系统信息失败', e);
				}
			},
			getAppVersion() {
				// #ifdef APP-PLUS
				plus.runtime.getProperty(plus.runtime.appid, (widgetInfo) => {
					this.appVersion = widgetInfo.version;
				});
				// #endif

				// #ifdef MP-WEIXIN
				const accountInfo = uni.getAccountInfoSync();
				this.appVersion = accountInfo.miniProgram.version || '1.0.0';
				// #endif
			},
			shareApp() {
				// #ifdef APP-PLUS
				uni.getProvider({
					service: 'share',
					success: (res) => {
						if (res.provider && res.provider.length > 0) {
							// 优先使用原生分享
							plus.share.getServices((services) => {
								let shareServices = [];
								for (let i = 0; i < services.length; i++) {
									if (this.shareInfo.platforms.includes(services[i].id)) {
										shareServices.push(services[i]);
									}
								}

								if (shareServices.length > 0) {
									plus.nativeUI.actionSheet({
										title: '分享到',
										cancel: '取消',
										buttons: shareServices.map(s => ({
											title: s.description
										})),
									}, (e) => {
										if (e.index > 0) {
											let service = shareServices[e.index - 1];
											service.send({
												type: 'web',
												title: this.shareInfo.title,
												content: this.shareInfo.summary,
												href: this.shareInfo.href,
												thumbs: [this.shareInfo.imageUrl],
												pictures: [this.shareInfo.imageUrl],
											}, (res) => {
												uni.showToast({
													title: '分享成功',
													icon: 'success'
												});
											}, (err) => {
												uni.showToast({
													title: '分享失败',
													icon: 'error'
												});
											});
										}
									});
								} else {
									// 降级使用系统分享
									this.systemShare();
								}
							}, (err) => {
								// 获取分享服务失败，降级使用系统分享
								this.systemShare();
							});
						} else {
							// 不支持分享服务，降级使用系统分享
							this.systemShare();
						}
					},
					fail: () => {
						// 获取服务供应商失败，降级使用系统分享
						this.systemShare();
					}
				});
				// #endif

				// #ifdef MP-WEIXIN
				uni.showShareMenu({
					withShareTicket: true,
					menus: ['shareAppMessage', 'shareTimeline'],
					success: () => {
						uni.showToast({
							title: '请点击右上角分享',
							icon: 'none'
						});
					}
				});
				// #endif

				// #ifdef H5
				if (navigator.share) {
					navigator.share({
						title: this.shareInfo.title,
						text: this.shareInfo.summary,
						url: this.shareInfo.href
					}).catch(() => {
						this.copyShareInfo();
					});
				} else {
					this.copyShareInfo();
				}
				// #endif
			},

			systemShare() {
				uni.share({
					provider: "system",
					type: 0,
					title: this.shareInfo.title,
					scene: "WXSceneSession",
					summary: this.shareInfo.summary,
					href: this.shareInfo.href,
					imageUrl: this.shareInfo.imageUrl,
					success: () => {
						uni.showToast({
							title: '分享成功',
							icon: 'success'
						});
					},
					fail: () => {
						uni.showToast({
							title: '分享失败',
							icon: 'error'
						});
					}
				});
			},

			copyShareInfo() {
				const shareText = `${this.shareInfo.title}\n${this.shareInfo.summary}\n${this.shareInfo.href}`;
				uni.setClipboardData({
					data: shareText,
					success: () => {
						uni.showToast({
							title: '分享内容已复制',
							icon: 'none'
						});
					}
				});
			},

			openWebsite() {
				const url = 'https://lightble.i2kai.com/';

				// #ifdef APP-PLUS
				plus.runtime.openURL(url);
				// #endif

				// #ifdef H5
				window.open(url, '_blank');
				// #endif

				// #ifdef MP-WEIXIN
				uni.setClipboardData({
					data: url,
					success: () => {
						uni.showToast({
							title: '网址已复制',
							icon: 'none'
						});
					}
				});
				// #endif
			},

			goVersion() {
				uni.navigateTo({
					url: '/pages/about/version'
				});
			},

			openFeedback() {
				const url = 'https://gitee.com/luoyaosheng/smart-ble/issues';

				// #ifdef APP-PLUS
				plus.runtime.openURL(url);
				// #endif

				// #ifdef H5
				window.open(url, '_blank');
				// #endif

				// #ifdef MP-WEIXIN
				uni.setClipboardData({
					data: url,
					success: () => {
						uni.showToast({
							title: '问题反馈链接已复制',
							icon: 'none'
						});
					}
				});
				// #endif
			},

			openApp(app) {
				// #ifdef APP-PLUS
				const platform = uni.getSystemInfoSync().platform;
				if (platform === 'ios') {
					// iOS 通过 URL Scheme 检查应用是否安装
					plus.runtime.isApplicationExist({
						pname: app.ios.appId,
						action: (isExist) => {
							if (isExist) {
								// 应用已安装，通过 URL Scheme 打开
								plus.runtime.openURL(`${app.ios.scheme}://`, (err) => {
									if (err) {
										// 打开失败，跳转到 App Store
										plus.runtime.openURL(app.ios.url);
									}
								});
							} else {
								// 应用未安装，跳转到 App Store
								plus.runtime.openURL(app.ios.url);
							}
						}
					});
				} else {
					// Android 通过包名检查应用是否安装
					plus.runtime.isApplicationExist({
						pname: app.android.packageName,
						action: (isExist) => {
							if (isExist) {
								// 应用已安装，通过包名启动
								plus.runtime.launchApplication({
									pname: app.android.packageName,
									fail: (err) => {
										// 启动失败，跳转到应用市场
										plus.runtime.openURL(app.android.url);
									}
								});
							} else {
								// 应用未安装，跳转到应用市场
								plus.runtime.openURL(app.android.url);
							}
						}
					});
				}
				// #endif

				// #ifdef MP-WEIXIN
				if (app.miniProgram && app.miniProgram.appId) {
					uni.navigateToMiniProgram({
						appId: app.miniProgram.appId,
						path: app.miniProgram.path,
						envVersion: app.miniProgram.envVersion,
						success(res) {
							console.log('打开小程序成功');
						},
						fail(err) {
							console.error('打开小程序失败', err);
							// 失败后展示二维码
							uni.previewImage({
								urls: [app.qrcode || app.icon]
							});
						}
					});
				} else {
					uni.previewImage({
						urls: [app.qrcode || app.icon]
					});
				}
				// #endif

				// #ifdef H5
				window.open(app.url, '_blank');
				// #endif
			}
		},
		// #ifdef MP-WEIXIN
		onShareAppMessage(res) {
			console.log('分享来源:', res.from);
			return {
				title: '关于 BLE Toolkit+ 应用', // 分享标题
				path: '/pages/about/index', // 用户点击分享卡片后跳转的页面路径
				// imageUrl: '/static/logo.png' // 可选：自定义分享图片路径
			};
		},
		onShareTimeline() {
			return {
				title: '智能蓝牙助手',
				query: '',
				imageUrl: '/static/logo.png'
			}
		}
		// #endif
	}
</script>

<style>
	.container {
		padding: 30rpx;
		min-height: 100vh;
		background-color: #f7f8fa;
	}

	.header {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 48rpx 0 20rpx 0;
	}

	.logo-box {
		width: 180rpx;
		height: 180rpx;
		border-radius: 40rpx;
		background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
		box-shadow: 0 16rpx 32rpx rgba(0, 122, 255, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 32rpx;
	}

	.logo-img {
		width: 100rpx;
		height: 100rpx;
	}

	.app-name {
		font-size: 44rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 12rpx;
	}

	.version {
		font-size: 28rpx;
		color: #999;
		margin-bottom: 24rpx;
	}

	.tech-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(0, 122, 255, 0.08);
		padding: 12rpx 32rpx;
		border-radius: 20rpx;
		gap: 8rpx;
	}

	.tech-text {
		font-size: 24rpx;
		color: #007AFF;
		font-weight: 600;
	}

	.section {
		background-color: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	}

	.info-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16rpx 0;
		border-bottom: 2rpx solid #f5f5f5;
	}

	.info-item:last-child {
		border-bottom: none;
	}

	.info-label {
		font-size: 28rpx;
		color: #666;
	}

	.info-value {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
	}

	.section-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 24rpx;
	}

	.menu-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.menu-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24rpx;
		background-color: #f9f9f9;
		border-radius: 16rpx;
		transition: all 0.3s;
	}

	.menu-item-hover {
		transform: translateY(2rpx);
		opacity: 0.9;
		background-color: #f5f5f5;
	}

	.menu-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.menu-icon {
		font-size: 36rpx;
	}

	.menu-text {
		font-size: 28rpx;
		color: #333;
	}

	.menu-arrow {
		font-size: 24rpx;
		color: #999;
	}

	.apps-scroll {
		width: 100%;
	}

	.apps-list {
		display: flex;
		padding: 20rpx 0;
		gap: 24rpx;
	}

	.app-item {
		position: relative;
		width: 400rpx;
		background-color: #f9f9f9;
		border-radius: 16rpx;
		padding: 24rpx;
		display: flex;
		align-items: center;
		gap: 20rpx;
		flex-shrink: 0;
		transition: all 0.3s;
	}

	.app-item-hover {
		transform: translateY(2rpx);
		opacity: 0.9;
		background-color: #f5f5f5;
	}

	.app-icon {
		width: 96rpx;
		height: 96rpx;
		border-radius: 20rpx;
		background-color: #fff;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	}

	.app-info {
		flex: 1;
		min-width: 0;
	}

	.app-info .app-name {
		font-size: 28rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 8rpx;
	}

	.app-desc {
		font-size: 24rpx;
		color: #666;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.app-tag {
		position: absolute;
		top: 24rpx;
		right: 24rpx;
		padding: 4rpx 12rpx;
		background: linear-gradient(135deg, #FF9500 0%, #FF9F0A 100%);
		color: #fff;
		font-size: 20rpx;
		border-radius: 100rpx;
		font-weight: 500;
	}

	.footer {
		text-align: center;
		padding: 30rpx 0;
	}

	.copyright {
		font-size: 24rpx;
		color: #999;
	}

/* 功能特性列表 */
.feature-list {
	padding: 0 24rpx;
}
.feature-item {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	padding: 20rpx 0;
	border-bottom: 1rpx solid rgba(0,0,0,0.06);
}
.feature-item:last-child {
	border-bottom: none;
}
.feature-icon-wrap {
	width: 72rpx;
	height: 72rpx;
	background: linear-gradient(135deg, #007AFF22, #5AC8FA22);
	border-radius: 18rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 24rpx;
}
.feature-icon {
	font-size: 34rpx;
	line-height: 1;
}
.feature-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
}
.feature-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1a1a1a;
	margin-bottom: 6rpx;
}
.feature-desc {
	font-size: 24rpx;
	color: #888;
	line-height: 1.4;
}

/* 支持平台 Chips */
.platform-chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 16rpx;
	padding: 0 24rpx;
}
.platform-chip {
	display: flex;
	flex-direction: row;
	align-items: center;
	background: #f0f6ff;
	border: 1rpx solid #d0e4ff;
	border-radius: 50rpx;
	padding: 10rpx 24rpx;
	gap: 8rpx;
}
.chip-icon {
	font-size: 28rpx;
	line-height: 1;
}
.chip-label {
	font-size: 24rpx;
	font-weight: 500;
	color: #007AFF;
}
</style>