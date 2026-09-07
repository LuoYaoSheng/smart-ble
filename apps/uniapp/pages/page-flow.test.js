const fs = require('node:fs')
const path = require('node:path')
const pagesConfig = require('../pages.json')

// 2026-09-02 决策口径：PAGE004（pages/hid/history）已移除，正典页面集为 9 页。
// 下方 inventory 测试同时承担「P004 不存在」断言（toEqual 精确匹配，多注册即失败）。
const EXPECTED_PAGES = [
	'pages/index/index',
	'pages/hid/add',
	'pages/hid/detail',
	'pages/hid/diagnostics',
	'pages/device/detail',
	'pages/connected/index',
	'pages/broadcast/index',
	'pages/about/index',
	'pages/about/version'
]

const HID_DEVICE = {
	deviceId: 'HID-ABCD1234',
	name: 'Smart HID 测试设备',
	profileId: 'smart-hid',
	hardware: 'ESP32-S3',
	firmware: '1.0.5',
	protocol: 'V1',
	lastWifi: 'Test Wi-Fi',
	lastHub: '192.168.1.8:17892',
	configuredAt: 1788134400000
}

const GENERIC_DEVICE = {
	deviceId: 'GENERIC-DEVICE-01',
	name: 'Generic BLE Test',
	profileId: '',
	isConnected: true,
	connected: true,
	RSSI: -56,
	services: []
}

jest.setTimeout(30000)

async function replaceRuntimeState({ knownDevices = [], currentDevice = null, connectedDevices = [] } = {}) {
	return program.evaluate(function (payload) {
		const app = getApp()
		const globals = app.$vm.$.appContext.config.globalProperties
		const state = globals.$pinia.state.value
		state.hid.knownDevices = payload.knownDevices
		state.hid.currentDevice = payload.currentDevice
		const connected = state.ble.connectedDevicesMap
		Object.keys(connected).forEach((deviceId) => delete connected[deviceId])
		payload.connectedDevices.forEach((device) => { connected[device.deviceId] = device })
		return {
			knownCount: state.hid.knownDevices.length,
			connectedCount: Object.keys(connected).length
		}
	}, { knownDevices, currentDevice, connectedDevices })
}

describe('Smart BLE complete page and navigation flow', () => {
	beforeAll(() => {
		fs.mkdirSync(path.join(__dirname, '../unpackage/test-output/page-flow'), { recursive: true })
	})

	test('all registered pages have source files and match the canonical inventory', () => {
		const registered = pagesConfig.pages.map((page) => page.path)
		expect(registered).toEqual(EXPECTED_PAGES)
		expect(registered).not.toContain('pages/hid/history')
		expect(fs.existsSync(path.join(__dirname, '../pages/hid/history.vue'))).toBe(false)
		for (const pagePath of registered) {
			expect(fs.existsSync(path.join(__dirname, '..', `${pagePath}.vue`))).toBe(true)
		}
	})

	test('PARITY-ICON: tabBar uses canonical glyph assets (scan/link/cast/info)', () => {
		const tabs = pagesConfig.tabBar.list.map((tab) => ({
			text: tab.text,
			icon: path.basename(tab.iconPath, '.png')
		}))
		expect(tabs).toEqual([
			{ text: '扫描', icon: 'scan' },
			{ text: '已连接', icon: 'link' },
			{ text: '广播', icon: 'cast' },
			{ text: '关于', icon: 'info' }
		])
		for (const tab of pagesConfig.tabBar.list) {
			expect(fs.existsSync(path.join(__dirname, '..', tab.iconPath))).toBe(true)
			expect(fs.existsSync(path.join(__dirname, '..', tab.selectedIconPath))).toBe(true)
		}
		// 旧字形资产（智能手表/键盘等 P004 时代遗留）必须清理干净
		const legacy = ['device', 'device_active', 'hid', 'hid_active', 'broadcast', 'broadcast_active', 'about', 'about_active']
		for (const name of legacy) {
			expect(fs.existsSync(path.join(__dirname, `../static/tabs/${name}.png`))).toBe(false)
		}
	})

	test('PARITY-ICON: icon canon mirror is locked to the prototype sprite', () => {
		const sprite = fs.readFileSync(
			path.join(__dirname, '../../docs/specs/prototype/v1-new/index.html'),
			'utf8'
		)
		const canonNames = [...sprite.matchAll(/<g id="(i-[a-z0-9-]+)"/g)].map((m) => m[1].slice(2))
		expect(canonNames.length).toBeGreaterThanOrEqual(30)

		const mirrorSrc = fs.readFileSync(
			path.join(__dirname, '../services/design/app-icons.js'),
			'utf8'
		)
		const namesMatch = mirrorSrc.match(/APP_ICON_NAMES = \[([^\]]+)\]/)
		expect(namesMatch).not.toBeNull()
		const mirrored = namesMatch[1].split(',').map((s) => s.trim().replace(/["']/g, ''))
		expect(mirrored).toEqual(canonNames)
		for (const name of canonNames) {
			expect(mirrorSrc).toContain(`  ${name}: `)
			expect(mirrorSrc).toContain('{C}')
		}
	})

	test('PARITY-ILL: empty-state illustration mirror is locked to prototype C.ILL (transparent, 4 glyphs)', () => {
		const comp = fs.readFileSync(
			path.join(__dirname, '../../docs/specs/prototype/v1-new/components/components.js'),
			'utf8'
		)
		const illBlock = comp.slice(comp.indexOf('ILL:{'), comp.indexOf('},', comp.indexOf('ILL:{')))
		const canonNames = [...illBlock.matchAll(/(\w+):`<svg/g)].map((m) => m[1])
		expect(canonNames).toEqual(['radar', 'link', 'doc', 'box'])

		const mirrorSrc = fs.readFileSync(
			path.join(__dirname, '../services/design/app-illustrations.js'),
			'utf8'
		)
		const namesMatch = mirrorSrc.match(/APP_ILL_NAMES = \[([^\]]+)\]/)
		expect(namesMatch).not.toBeNull()
		const mirrored = namesMatch[1].split(',').map((s) => s.trim().replace(/["']/g, ''))
		expect(mirrored).toEqual(canonNames)
		// 逐字锁定：正典每个 ILL 主体片段必须在镜像中出现，且不得引入背景矩形
		for (const name of canonNames) {
			const body = illBlock.match(new RegExp(`${name}:\\\`<svg[^>]*>([\\s\\S]*?)<\\/svg>`))
			expect(body).not.toBeNull()
			const normalized = body[1].replace(/\s+/g, ' ').trim()
			expect(normalized.length).toBeGreaterThan(40)
			expect(mirrorSrc).toContain(normalized)
		}
		expect(mirrorSrc).not.toContain('<rect')
	})

	test('PARITY-ILL: no opaque placeholder bitmap assets remain; empty states use canonical illustrations', () => {
		// 占位图目录整体退役：正典 B6 ILL 为透明底内联 SVG 镜像
		expect(fs.existsSync(path.join(__dirname, '../static/placeholders'))).toBe(false)
		expect(fs.existsSync(path.join(__dirname, '../static/other-apps'))).toBe(false)
		expect(fs.existsSync(path.join(__dirname, '../static/brand'))).toBe(false)

		const scanPages = ['pages/index/index.vue', 'pages/connected/index.vue', 'components/common/empty-state.vue']
		for (const rel of scanPages) {
			const src = fs.readFileSync(path.join(__dirname, '../', rel), 'utf8')
			expect(src).not.toContain('/static/placeholders/')
		}
		const indexSrc = fs.readFileSync(path.join(__dirname, '../pages/index/index.vue'), 'utf8')
		expect(indexSrc).toContain(`:ill="devices.length > 0 ? 'link' : 'radar'"`)
		const connectedSrc = fs.readFileSync(path.join(__dirname, '../pages/connected/index.vue'), 'utf8')
		expect(connectedSrc).toContain('ill="link"')
		const emptyStateSrc = fs.readFileSync(path.join(__dirname, '../components/common/empty-state.vue'), 'utf8')
		expect(emptyStateSrc).toContain("import AppIll from './app-ill.vue'")
	})

	test('PARITY-P001: scan page navbar / scantool copy locked to prototype p001 canon', () => {
		const indexSrc = fs.readFileSync(path.join(__dirname, '../pages/index/index.vue'), 'utf8')
		// 导航栏：kicker=BLE TOOLKIT+、标题=扫描、蓝牙状态三态词（正典 btWord）
		expect(indexSrc).toContain('kicker="BLE TOOLKIT+"')
		expect(indexSrc).toContain('title="扫描"')
		expect(indexSrc).toContain("'蓝牙就绪'")
		expect(indexSrc).toContain("'蓝牙未开启'")
		expect(indexSrc).toContain("'平台不支持'")
		// sec-t：附近设备 + 筛选/收起筛选 txtlink
		expect(indexSrc).toContain('附近设备')
		expect(indexSrc).toContain("showFilters ? '收起筛选' : '筛选'")

		const summarySrc = fs.readFileSync(path.join(__dirname, '../components/scan/scan-summary.vue'), 'utf8')
		// scantool 状态行三态（正典 scanLb）+ 按钮文案与图标位
		expect(summarySrc).toContain('扫描中 · 5s 会话')
		expect(summarySrc).toContain('扫描完成 · 发现')
		expect(summarySrc).toContain('待开始扫描')
		expect(summarySrc).toContain("scanning ? '停止扫描' : '开始扫描'")
		// 图标位：开始=scan / 停止=stop（正典 C.btn icon 参数）
		expect(summarySrc).toContain(":name=\"scanning ? 'stop' : 'scan'\"")
		// 正典无「N 台设备 · N 台已连接」工具条行，也无「待开始/需重试」状态 chip
		expect(summarySrc).not.toContain('台已连接')
		expect(summarySrc).not.toContain('需重试')
	})

	test('PARITY-P001: filter rows locked to prototype .filter canon', () => {
		const filterSrc = fs.readFileSync(path.join(__dirname, '../components/filter-panel/filter-panel.vue'), 'utf8')
		expect(filterSrc).toContain('最弱信号')
		expect(filterSrc).toContain('强 [-40]')
		expect(filterSrc).toContain('较好 [-60]')
		expect(filterSrc).toContain('一般 [-70]')
		expect(filterSrc).toContain('弱 [-85]')
		expect(filterSrc).toContain('阈值')
		expect(filterSrc).toContain(':min="-100"')
		expect(filterSrc).toContain(':max="-40"')
		expect(filterSrc).toContain(':step="5"')
		expect(filterSrc).toContain('placeholder="如 SHID / LightBLE"')
		expect(filterSrc).toContain('隐藏无名')
		expect(filterSrc).toContain('重置过滤')
		expect(filterSrc).toContain('#17C7A8')
		// 旧漂移值必须清除：预设档 / 滑杆范围 / 占位文案
		expect(filterSrc).not.toContain('-55')
		expect(filterSrc).not.toContain('例如 SHID')
	})

	test('PARITY-P001: device card scan variant locked to C1 devCard canon', () => {
		const cardSrc = fs.readFileSync(path.join(__dirname, '../components/device-card/device-card.vue'), 'utf8')
		expect(cardSrc).toContain('未命名 BLE 设备')
		expect(cardSrc).toContain('（未命名）')
		expect(cardSrc).toContain('配置 Smart HID')
		// 匹配 chip 文案来自 profile 注册表注入（chipStrong/chipWeak）
		expect(cardSrc).toContain('profileChipStrong')
		// 动作按钮图标位：hid / link
		expect(cardSrc).toContain('name="hid"')
		expect(cardSrc).toContain('name="link"')
		// 信号条正典配色：q4/q3 绿 / q2 黄 / q1 红 / 底灰
		expect(cardSrc).toContain('#17C7A8')
		expect(cardSrc).toContain('#FF9F43')
		expect(cardSrc).toContain('#F2555F')
		expect(cardSrc).toContain('#E3EAF3')
		// 生态猜测 chip / JS 截断 /「未知设备」必须清除（正典 meta 仅 sig+dBm，id 走 CSS 省略）
		expect(cardSrc).not.toContain('小米生态')
		expect(cardSrc).not.toContain('substring')
		expect(cardSrc).not.toContain('未知设备')

		const profileSrc = fs.readFileSync(path.join(__dirname, '../services/smart-hid/profile.js'), 'utf8')
		expect(profileSrc).toContain("actionLabel: '配置 Smart HID'")
		expect(profileSrc).toContain("chipStrong: 'Smart HID · 强匹配'")
		expect(profileSrc).toContain("chipWeak: '疑似 Smart HID · 弱匹配'")
	})

	test('PARITY-P001: error banner and advertisement sheet locked to B8/advdlg canon', () => {
		const bannerSrc = fs.readFileSync(path.join(__dirname, '../components/common/error-banner.vue'), 'utf8')
		expect(bannerSrc).toContain('扫描失败')
		expect(bannerSrc).toContain('重试')
		expect(bannerSrc).toContain('name="warn"')
		expect(bannerSrc).toContain('name="refresh"')
		expect(bannerSrc).toContain('#FDEBEC')

		const advSrc = fs.readFileSync(path.join(__dirname, '../components/scan/advertisement-dialog.vue'), 'utf8')
		expect(advSrc).toContain('广播数据 · ')
		expect(advSrc).toContain('设备 ID')
		expect(advSrc).toContain('profileMatch')
		expect(advSrc).toContain('本轮平台 API 未提供此字段')
		expect(advSrc).toContain('复制数据')
		expect(advSrc).toContain('#101521')
		// textarea 全量 dump 形态必须退役
		expect(advSrc).not.toContain('textarea')
	})

	test('P004 removed: index shows no configured-devices panel even with session snapshots', async () => {
		await replaceRuntimeState({ knownDevices: [HID_DEVICE], currentDevice: HID_DEVICE })
		const page = await program.reLaunch('/pages/index/index')
		await page.waitFor(300)
		expect(page.path).toBe('pages/index/index')
		expect(await page.$('.known-devices-panel')).toBeNull()
		expect(await page.$('.known-header-actions')).toBeNull()
	})

	test('connected empty state returns to Scan', async () => {
		await replaceRuntimeState()
		await program.reLaunch('/pages/index/index')
		let page = await program.switchTab('/pages/connected/index')
		await page.waitFor(300)
		expect(page.path).toBe('pages/connected/index')
		const emptyState = await page.$('#connected-empty')
		expect(emptyState).not.toBeNull()
		await (await emptyState.$('.ble-btn')).trigger('tap')
		await page.waitFor(250)
		page = await program.currentPage()
		expect(page.path).toBe('pages/index/index')
	})

	test('configured Smart HID routes preserve device context and back-stack flow', async () => {
		const state = await replaceRuntimeState({ knownDevices: [HID_DEVICE], currentDevice: HID_DEVICE })
		expect(state.knownCount).toBe(1)

		let page = await program.reLaunch('/pages/index/index')
		await page.waitFor(300)
		expect(page.path).toBe('pages/index/index')

		page = await program.navigateTo(`/pages/hid/detail?deviceId=${encodeURIComponent(HID_DEVICE.deviceId)}`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/hid/detail')
		expect(await (await page.$('.device-title')).text()).toBe(HID_DEVICE.name)
		await program.screenshot({ path: 'unpackage/test-output/page-flow/01-hid-detail.png' })

		page = await program.navigateTo(`/pages/hid/add?deviceId=${encodeURIComponent(HID_DEVICE.deviceId)}`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/hid/add')
		await program.screenshot({ path: 'unpackage/test-output/page-flow/02-hid-provision.png' })
		await program.navigateBack()

		page = await program.currentPage()
		expect(page.path).toBe('pages/hid/detail')
		page = await program.navigateTo(`/pages/hid/diagnostics?deviceId=${encodeURIComponent(HID_DEVICE.deviceId)}`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/hid/diagnostics')
		await program.screenshot({ path: 'unpackage/test-output/page-flow/03-hid-diagnostics.png' })
		await program.navigateBack()
		page = await program.currentPage()
		expect(page.path).toBe('pages/hid/detail')

		page = await program.navigateTo(`/pages/device/detail?deviceId=${encodeURIComponent(HID_DEVICE.deviceId)}&name=${encodeURIComponent(HID_DEVICE.name)}&profileId=smart-hid`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/device/detail')
		expect(await (await page.$('.device-id')).text()).toBe(HID_DEVICE.deviceId)
		await program.screenshot({ path: 'unpackage/test-output/page-flow/04-generic-detail.png' })
	})

	test('connected device context opens the generic GATT detail and returns', async () => {
		const state = await replaceRuntimeState({ connectedDevices: [GENERIC_DEVICE] })
		expect(state.connectedCount).toBe(1)
		await program.reLaunch('/pages/index/index')
		let page = await program.switchTab('/pages/connected/index')
		await page.waitFor(300)
		expect((await program.evaluate(function () {
			const state = getApp().$vm.$.appContext.config.globalProperties.$pinia.state.value
			return state.ble.connectedDevicesMap['GENERIC-DEVICE-01']?.name
		}))).toBe(GENERIC_DEVICE.name)
		page = await program.navigateTo(`/pages/device/detail?deviceId=${encodeURIComponent(GENERIC_DEVICE.deviceId)}&name=${encodeURIComponent(GENERIC_DEVICE.name)}`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/device/detail')
		expect(await (await page.$('.device-id')).text()).toBe(GENERIC_DEVICE.deviceId)
		await program.navigateBack()
		page = await program.currentPage()
		expect(page.path).toBe('pages/connected/index')
	})

	test('About and current Version History route both directions', async () => {
		await program.reLaunch('/pages/index/index')
		let page = await program.switchTab('/pages/about/index')
		await page.waitFor(300)
		const menuItems = await page.$$('.menu-item')
		expect(menuItems.length).toBe(4)
		page = await program.navigateTo('/pages/about/version')
		await page.waitFor(300)
		expect(page.path).toBe('pages/about/version')
		expect(await (await page.$('.version-name')).text()).toBe('v1.0.5')
		await program.screenshot({ path: 'unpackage/test-output/page-flow/05-version-history.png' })
		await program.navigateBack()
		page = await program.currentPage()
		expect(page.path).toBe('pages/about/index')
	})

	test('Broadcast renders support feedback in WeChat DevTools', async () => {
		await program.reLaunch('/pages/index/index')
		const page = await program.switchTab('/pages/broadcast/index')
		await page.waitFor(800)
		expect(page.path).toBe('pages/broadcast/index')
		expect(await page.$('.settings-section')).not.toBeNull()
		expect(await page.$('.action-section')).not.toBeNull()
		await program.screenshot({ path: 'unpackage/test-output/page-flow/06-broadcast.png' })
	})
})
