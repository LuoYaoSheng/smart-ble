<template>
	<view class="container">
		<view class="header ble-card-hero">
			<view class="logo-box">
				<image class="logo-img" src="/static/logo.png" mode="aspectFit"></image>
			</view>
			<text class="app-name">BLE Toolkit+</text>
			<text class="version">Version {{ appVersion }}</text>
			<view class="tech-stack">
				<text class="tech-text">Framework: UniApp (Vue3)</text>
				<text class="tech-text">Language: JavaScript / Vue</text>
			</view>
			<image v-if="!failedImages.hero" class="brand-hero" src="/static/brand/about-hero.png" mode="aspectFill" @error="markImageFailed('hero')"></image>
		</view>

		<view class="section ble-card">
			<view class="section-title">当前环境</view>
			<view class="info-list">
				<view class="info-item">
					<text class="info-label">系统平台</text>
					<text class="info-value">{{ systemInfo.platform }}</text>
				</view>
				<view class="info-item">
					<text class="info-label">系统版本</text>
					<text class="info-value">{{ systemInfo.system }}</text>
				</view>
				<view class="info-item">
					<text class="info-label">设备型号</text>
					<text class="info-value">{{ systemInfo.model }}</text>
				</view>
			</view>
		</view>

		<view class="section ble-card">
			<view class="section-title">功能特性</view>
			<view class="feature-list">
				<view class="feature-item" v-for="(feature, index) in features" :key="index">
					<view class="feature-icon-wrap">
						<text class="feature-icon">{{ feature.icon }}</text>
					</view>
					<view class="feature-content">
						<text class="feature-title">{{ feature.title }}</text>
						<text class="feature-desc">{{ feature.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="section ble-card">
			<view class="section-title">支持平台</view>
			<view class="platform-chips">
				<view class="platform-chip" v-for="(platformItem, index) in supportedPlatforms" :key="index">
					<text class="chip-icon">{{ platformItem.icon }}</text>
					<text class="chip-label">{{ platformItem.name }}</text>
				</view>
			</view>
		</view>

		<view class="section ble-card">
			<view class="section-title">相关链接</view>
			<view class="menu-list">
				<view class="menu-item" hover-class="menu-item-hover" @click="openWebsite">
					<view class="menu-left">
						<text class="menu-icon">🌐</text>
						<text class="menu-text">官方网站</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-item" hover-class="menu-item-hover" @click="goVersion">
					<view class="menu-left">
						<text class="menu-icon">📋</text>
						<text class="menu-text">版本记录</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-item" hover-class="menu-item-hover" @click="openFeedback">
					<view class="menu-left">
						<text class="menu-icon">💬</text>
						<text class="menu-text">问题反馈</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
				<view class="menu-item" hover-class="menu-item-hover" @click="shareApp">
					<view class="menu-left">
						<text class="menu-icon">📤</text>
						<text class="menu-text">分享应用</text>
					</view>
					<text class="menu-arrow">›</text>
				</view>
			</view>
		</view>

		<view class="section ble-card">
			<view class="section-title">开发者其他应用</view>
			<scroll-view class="apps-scroll" scroll-x show-scrollbar="false" enhanced>
				<view class="apps-list">
					<view class="app-item" hover-class="app-item-hover" v-for="(app, index) in otherApps" :key="index" @click="openApp(app)">
						<image v-if="app.icon && !failedImages[`app-${index}`]" class="app-icon" :src="app.icon" mode="aspectFill" @error="markImageFailed(`app-${index}`)"></image>
						<view v-else class="app-icon app-icon-fallback">
							<text class="app-fallback">{{ app.name.slice(0, 1) }}</text>
						</view>
						<view class="app-info">
							<text class="app-item-name">{{ app.name }}</text>
							<text class="app-desc">{{ app.description }}</text>
						</view>
						<view class="app-tag" v-if="app.tag">{{ app.tag }}</view>
					</view>
				</view>
			</scroll-view>
		</view>

		<view class="footer">
			<text class="copyright">© {{ currentYear }} BLE Toolkit+. All rights reserved.</text>
		</view>
	</view>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';

const appVersion = ref('1.0.4');
const failedImages = reactive({});
const markImageFailed = (key) => { failedImages[key] = true; };
const systemInfo = ref({});
const currentYear = ref(new Date().getFullYear());

const features = ref([
	{ icon: '🔍', title: '设备扫描', desc: '自动发现附近蓝牙 BLE 设备' },
	{ icon: '🎛️', title: '智能过滤', desc: '按信号强度、名称过滤设备' },
	{ icon: '🔗', title: '快速连接', desc: '一键连接设备并自动发现服务' },
	{ icon: '✏️', title: '数据读写', desc: '支持 HEX/UTF-8 格式读写' },
	{ icon: '🔔', title: '通知监听', desc: '实时接收设备通知数据' },
	{ icon: '📡', title: '广播模式', desc: '模拟 BLE 外设设备' }
]);

const supportedPlatforms = ref([
	{ icon: '🤖', name: 'Android' },
	{ icon: '📱', name: 'iOS' },
	{ icon: '🪟', name: 'Windows' },
	{ icon: '🍎', name: 'macOS' },
	{ icon: '🐧', name: 'Linux' },
	{ icon: '💬', name: '微信小程序' }
]);

const shareInfo = ref({
	title: 'BLE Toolkit+ - 多平台BLE调试工具',
	summary: '支持微信小程序、iOS和Android原生应用的BLE调试工具',
	imageUrl: '/static/share.png',
	href: 'https://lightble.i2kai.com/',
	platforms: ['weixin', 'qq', 'sinaweibo', 'email']
});

const otherApps = ref([
	{
		name: '萌喵圈',
		description: '看猫片、做问候图和轻量 AI 创作，把宠物内容变成可爱又治愈的分享素材。',
		icon: '/static/other-apps/cute-meow-circle.png',
		url: 'https://cutemeowcircle.anxiqing.cn',
		ios: { appId: '', url: '', scheme: '' },
		android: { packageName: 'o', url: '' },
		miniProgram: { appId: 'wxe0ed0e6727a0a5cd', path: 'pages/index/index', envVersion: 'release' }
	},
	{
		name: '宝宝点滴',
		description: '记录喂奶、换尿布、睡眠和成长数据，帮家人一起照看宝宝的日常节奏。',
		icon: '/static/other-apps/baby-diary.png',
		url: 'https://babydiary.anxiqing.cn',
		ios: { appId: '', url: '', scheme: '' },
		android: { packageName: '', url: '' },
		miniProgram: { appId: 'wx1bb2d5c6821a7883', path: 'pages/index/index', envVersion: 'release' }
	}
]);

const getSystemInfo = () => {
	try {
		const info = uni.getSystemInfoSync();
		systemInfo.value = {
			platform: info.osName || info.uniPlatform || info.platform || 'unknown',
			system: info.system,
			model: info.model
		};
	} catch (error) {
		console.error('获取系统信息失败', error);
	}
};

const getAppVersion = () => {
// #ifdef APP-PLUS
	plus.runtime.getProperty(plus.runtime.appid, (widgetInfo) => {
		appVersion.value = widgetInfo.version;
	});
// #endif
// #ifdef MP-WEIXIN
	const accountInfo = uni.getAccountInfoSync();
	appVersion.value = accountInfo.miniProgram.version || '1.0.4';
// #endif
};

onLoad(() => {
	getSystemInfo();
	getAppVersion();
});

const systemShare = () => {
	uni.share({
		provider: 'system',
		type: 0,
		title: shareInfo.value.title,
		scene: 'WXSceneSession',
		summary: shareInfo.value.summary,
		href: shareInfo.value.href,
		imageUrl: shareInfo.value.imageUrl,
		success: () => uni.showToast({ title: '分享成功', icon: 'success' }),
		fail: () => uni.showToast({ title: '分享失败', icon: 'error' })
	});
};

const copyShareInfo = () => {
	const shareText = `${shareInfo.value.title}
${shareInfo.value.summary}
${shareInfo.value.href}`;
	uni.setClipboardData({
		data: shareText,
		success: () => uni.showToast({ title: '分享内容已复制', icon: 'none' })
	});
};

const shareApp = () => {
// #ifdef APP-PLUS
	uni.getProvider({
		service: 'share',
		success: (res) => {
			if (res.provider && res.provider.length > 0) {
				plus.share.getServices((services) => {
					const shareServices = services.filter((service) => shareInfo.value.platforms.includes(service.id));

					if (shareServices.length > 0) {
						plus.nativeUI.actionSheet(
							{
								title: '分享到',
								cancel: '取消',
								buttons: shareServices.map((service) => ({ title: service.description }))
							},
							(event) => {
								if (event.index > 0) {
									const service = shareServices[event.index - 1];
									service.send(
										{
											type: 'web',
											title: shareInfo.value.title,
											content: shareInfo.value.summary,
											href: shareInfo.value.href,
											thumbs: [shareInfo.value.imageUrl],
											pictures: [shareInfo.value.imageUrl]
										},
										() => uni.showToast({ title: '分享成功', icon: 'success' }),
										() => uni.showToast({ title: '分享失败', icon: 'error' })
									);
								}
							}
						);
					} else {
						systemShare();
					}
				}, () => systemShare());
			} else {
				systemShare();
			}
		},
		fail: () => systemShare()
	});
// #endif

// #ifdef MP-WEIXIN
	uni.showShareMenu({
		withShareTicket: true,
		menus: ['shareAppMessage', 'shareTimeline'],
		success: () => uni.showToast({ title: '请点击右上角分享', icon: 'none' })
	});
// #endif

// #ifdef H5
	if (navigator.share) {
		navigator.share({
			title: shareInfo.value.title,
			text: shareInfo.value.summary,
			url: shareInfo.value.href
		}).catch(() => copyShareInfo());
	} else {
		copyShareInfo();
	}
// #endif
};

const openWebsite = () => {
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
		success: () => uni.showToast({ title: '网址已复制', icon: 'none' })
	});
// #endif
};

const goVersion = () => {
	uni.navigateTo({ url: '/pages/about/version' });
};

const openFeedback = () => {
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
		success: () => uni.showToast({ title: '问题反馈链接已复制', icon: 'none' })
	});
// #endif
};

const openApp = (app) => {
// #ifdef APP-PLUS
	const platform = uni.getSystemInfoSync().platform;
	if (platform === 'ios') {
		plus.runtime.isApplicationExist({
			pname: app.ios.appId,
			action: (isExist) => {
				if (isExist) {
					plus.runtime.openURL(`${app.ios.scheme}://`, (error) => {
						if (error) plus.runtime.openURL(app.ios.url);
					});
				} else {
					plus.runtime.openURL(app.ios.url);
				}
			}
		});
	} else {
		plus.runtime.isApplicationExist({
			pname: app.android.packageName,
			action: (isExist) => {
				if (isExist) {
					plus.runtime.launchApplication({
						pname: app.android.packageName,
						fail: () => plus.runtime.openURL(app.android.url)
					});
				} else {
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
			success() { console.log('打开小程序成功'); },
			fail() { uni.previewImage({ urls: [app.qrcode || app.icon] }); }
		});
	} else {
		uni.previewImage({ urls: [app.qrcode || app.icon] });
	}
// #endif

// #ifdef H5
	window.open(app.url, '_blank');
// #endif
};

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '关于 BLE Toolkit+ 应用',
	path: '/pages/about/index'
}));

onShareTimeline(() => ({
	title: '智能蓝牙助手',
	query: '',
	imageUrl: '/static/logo.png'
}));
// #endif
</script>

<style scoped>
.container {
	padding: 28rpx;
	min-height: 100vh;
	background: transparent;
}

.header,
.section {
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(242, 248, 255, 0.95) 100%);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	border-radius: 32rpx;
	box-shadow: 0 18rpx 40rpx rgba(17, 43, 78, 0.06);
}

.header {
	padding: 42rpx 30rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 22rpx;
}

.logo-box {
	width: 162rpx;
	height: 162rpx;
	border-radius: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, rgba(21, 93, 255, 0.14) 0%, rgba(123, 224, 255, 0.18) 100%);
	border: 1rpx solid rgba(21, 93, 255, 0.12);
	margin-bottom: 28rpx;
}

.logo-img {
	width: 106rpx;
	height: 106rpx;
}

.app-name {
	font-size: 42rpx;
	font-weight: 700;
	color: var(--ble-text);
	margin-bottom: 10rpx;
}

.version {
	font-size: 26rpx;
	color: var(--ble-text-muted);
	margin-bottom: 20rpx;
}

.tech-stack {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	padding: 14rpx 28rpx;
	border-radius: 22rpx;
	background: rgba(27, 109, 255, 0.08);
}

.tech-text {
	font-size: 22rpx;
	font-weight: 700;
	color: var(--ble-brand);
}

.brand-hero {
	width: 100%;
	height: 320rpx;
	margin-top: 24rpx;
	border-radius: 28rpx;
	box-shadow: 0 16rpx 36rpx rgba(17, 43, 78, 0.14);
}

.section {
	padding: 28rpx;
	margin-bottom: 22rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--ble-text);
	margin-bottom: 20rpx;
}

.info-list,
.menu-list {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.info-item,
.menu-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	padding: 20rpx 22rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.82);
	border: 1rpx solid rgba(20, 76, 136, 0.06);
}

.info-label {
	font-size: 25rpx;
	color: var(--ble-text-muted);
}

.info-value {
	font-size: 25rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.menu-item-hover,
.app-item-hover {
	transform: translateY(2rpx);
	opacity: 0.92;
}

.menu-left {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.menu-icon {
	font-size: 34rpx;
}

.menu-text {
	font-size: 26rpx;
	color: var(--ble-text);
	font-weight: 600;
}

.menu-arrow {
	font-size: 26rpx;
	color: var(--ble-text-muted);
}

.feature-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.feature-item {
	display: flex;
	align-items: flex-start;
	gap: 18rpx;
	padding: 18rpx 0;
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.06);
}

.feature-item:last-child {
	border-bottom: none;
}

.feature-icon-wrap {
	width: 72rpx;
	height: 72rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	background: linear-gradient(135deg, rgba(21, 93, 255, 0.12) 0%, rgba(123, 224, 255, 0.16) 100%);
	border: 1rpx solid rgba(21, 93, 255, 0.08);
}

.feature-icon {
	font-size: 34rpx;
	line-height: 1;
}

.feature-content {
	flex: 1;
}

.feature-title {
	font-size: 27rpx;
	font-weight: 700;
	color: var(--ble-text);
	margin-bottom: 6rpx;
}

.feature-desc {
	font-size: 23rpx;
	line-height: 1.55;
	color: var(--ble-text-subtle);
}

.platform-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.platform-chip {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(27, 109, 255, 0.08);
}

.chip-icon {
	font-size: 26rpx;
}

.chip-label {
	font-size: 23rpx;
	font-weight: 700;
	color: var(--ble-brand);
}

.apps-scroll {
	width: 100%;
}

.apps-list {
	display: flex;
	gap: 18rpx;
	padding: 4rpx 0 6rpx;
}

.app-item {
	position: relative;
	width: 420rpx;
	padding: 22rpx;
	display: flex;
	align-items: center;
	gap: 18rpx;
	flex-shrink: 0;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.82);
	border: 1rpx solid rgba(20, 76, 136, 0.06);
}

.app-icon {
	width: 92rpx;
	height: 92rpx;
	border-radius: 22rpx;
	background: #ffffff;
	box-shadow: 0 12rpx 28rpx rgba(17, 43, 78, 0.08);
}

.app-icon-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, rgba(21, 93, 255, 0.14) 0%, rgba(123, 224, 255, 0.2) 100%);
}

.app-fallback {
	font-size: 34rpx;
	font-weight: 700;
	color: var(--ble-brand);
}

.app-info {
	flex: 1;
	min-width: 0;
}

.app-item-name {
	margin-bottom: 8rpx;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.app-desc {
	font-size: 22rpx;
	line-height: 1.5;
	color: var(--ble-text-subtle);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.app-tag {
	position: absolute;
	top: 20rpx;
	right: 20rpx;
	padding: 6rpx 12rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #ff9f43 0%, #f2555f 100%);
	color: #ffffff;
	font-size: 20rpx;
	font-weight: 700;
}

.footer {
	padding: 8rpx 0 28rpx;
	text-align: center;
}

.copyright {
	font-size: 22rpx;
	color: var(--ble-text-muted);
}
</style>
