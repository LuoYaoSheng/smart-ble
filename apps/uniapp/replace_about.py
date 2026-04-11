import re
import sys

filepath = r'e:\project\xf\smart-ble\apps\uniapp\pages\about\index.vue'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_script = """<script setup>
import { ref, onMounted } from 'vue';
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';

const appVersion = ref('1.0.0');
const systemInfo = ref({});
const currentYear = ref(new Date().getFullYear());

const features = ref([
	{ icon: '🔍', title: '设备扫描', desc: '自动发现附近蓝牙 BLE 设备' },
	{ icon: '🎛️', title: '智能过滤', desc: '按信号强度、名称过滤设备' },
	{ icon: '🔗', title: '快速连接', desc: '一键连接设备并自动发现服务' },
	{ icon: '✏️', title: '数据读写', desc: '支持 HEX/UTF-8 格式读写' },
	{ icon: '🔔', title: '通知监听', desc: '实时接收设备通知数据' },
	{ icon: '📡', title: '广播模式', desc: '模拟 BLE 外设设备' },
]);

const supportedPlatforms = ref([
	{ icon: '🤖', name: 'Android' },
	{ icon: '📱', name: 'iOS' },
	{ icon: '🪟', name: 'Windows' },
	{ icon: '🍎', name: 'macOS' },
	{ icon: '🐧', name: 'Linux' },
	{ icon: '💬', name: '微信小程序' },
]);

const shareInfo = ref({
	title: 'BLE Toolkit+ - 多平台BLE调试工具',
	summary: '支持微信小程序、iOS和Android原生应用的BLE调试工具',
	imageUrl: '/static/share.png',
	href: 'https://lightble.i2kai.com/',
	platforms: ['weixin', 'qq', 'sinaweibo', 'email']
});

const otherApps = ref([{
	name: '萌喵圈',
	description: '汇集海量精选萌宠图片，随时随地为您提供快乐与治愈',
	icon: 'https://cat.i2kai.com/images/logo.png',
	url: 'https://cat.i2kai.com/',
	ios: { appId: '', url: '', scheme: '' },
	android: { packageName: 'o', url: '' },
	miniProgram: { appId: 'wxe0ed0e6727a0a5cd', path: 'pages/index/index', envVersion: 'release' }
}, {
	name: '宝宝点滴',
	description: '记录宝宝生活的屎尿屁点点滴滴',
	icon: '',
	ios: { appId: '', url: '', scheme: '' },
	android: { packageName: '', url: '' },
	miniProgram: { appId: 'wx1bb2d5c6821a7883', path: 'pages/index/index', envVersion: 'release' }
}]);

const getSystemInfo = () => {
	try {
		const info = uni.getSystemInfoSync();
		systemInfo.value = {
			platform: info.platform === 'android' ? 'Android' : info.platform === 'ios' ? 'iOS' : info.platform,
			system: info.system,
			model: info.model
		};
	} catch (e) {
		console.error('获取系统信息失败', e);
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
	appVersion.value = accountInfo.miniProgram.version || '1.0.0';
// #endif
};

onLoad(() => {
	getSystemInfo();
	getAppVersion();
});

const systemShare = () => {
	uni.share({
		provider: "system",
		type: 0,
		title: shareInfo.value.title,
		scene: "WXSceneSession",
		summary: shareInfo.value.summary,
		href: shareInfo.value.href,
		imageUrl: shareInfo.value.imageUrl,
		success: () => uni.showToast({ title: '分享成功', icon: 'success' }),
		fail: () => uni.showToast({ title: '分享失败', icon: 'error' })
	});
};

const copyShareInfo = () => {
	const shareText = `${shareInfo.value.title}\\n${shareInfo.value.summary}\\n${shareInfo.value.href}`;
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
					let shareServices = services.filter(s => shareInfo.value.platforms.includes(s.id));

					if (shareServices.length > 0) {
						plus.nativeUI.actionSheet({
							title: '分享到',
							cancel: '取消',
							buttons: shareServices.map(s => ({ title: s.description })),
						}, (e) => {
							if (e.index > 0) {
								let service = shareServices[e.index - 1];
								service.send({
									type: 'web',
									title: shareInfo.value.title,
									content: shareInfo.value.summary,
									href: shareInfo.value.href,
									thumbs: [shareInfo.value.imageUrl],
									pictures: [shareInfo.value.imageUrl],
								}, () => uni.showToast({ title: '分享成功', icon: 'success' }), 
								   () => uni.showToast({ title: '分享失败', icon: 'error' }));
							}
						});
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
					plus.runtime.openURL(`${app.ios.scheme}://`, (err) => {
						if (err) plus.runtime.openURL(app.ios.url);
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
</script>"""

new_content = re.sub(r'<script.*?</script>', new_script, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Replaced successfully')
