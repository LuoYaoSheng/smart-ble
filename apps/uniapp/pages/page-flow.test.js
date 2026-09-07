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
