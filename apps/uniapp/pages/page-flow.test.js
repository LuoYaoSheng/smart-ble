const fs = require('node:fs')
const path = require('node:path')
const pagesConfig = require('../pages.json')

const EXPECTED_PAGES = [
	'pages/index/index',
	'pages/hid/add',
	'pages/hid/detail',
	'pages/hid/history',
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
		for (const pagePath of registered) {
			expect(fs.existsSync(path.join(__dirname, '..', `${pagePath}.vue`))).toBe(true)
		}
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

		let page = await program.reLaunch('/pages/hid/history')
		await page.waitFor(300)
		expect(page.path).toBe('pages/hid/history')
		expect(await (await page.$('.device-name')).text()).toBe(HID_DEVICE.name)
		await program.screenshot({ path: 'unpackage/test-output/page-flow/01-hid-history.png' })

		page = await program.navigateTo(`/pages/hid/detail?deviceId=${encodeURIComponent(HID_DEVICE.deviceId)}`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/hid/detail')
		expect(await (await page.$('.device-title')).text()).toBe(HID_DEVICE.name)
		await program.screenshot({ path: 'unpackage/test-output/page-flow/02-hid-detail.png' })

		page = await program.navigateTo(`/pages/hid/add?deviceId=${encodeURIComponent(HID_DEVICE.deviceId)}`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/hid/add')
		await program.screenshot({ path: 'unpackage/test-output/page-flow/03-hid-provision.png' })
		await program.navigateBack()

		page = await program.currentPage()
		expect(page.path).toBe('pages/hid/detail')
		page = await program.navigateTo(`/pages/hid/diagnostics?deviceId=${encodeURIComponent(HID_DEVICE.deviceId)}`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/hid/diagnostics')
		await program.screenshot({ path: 'unpackage/test-output/page-flow/04-hid-diagnostics.png' })
		await program.navigateBack()
		page = await program.currentPage()
		expect(page.path).toBe('pages/hid/detail')

		page = await program.navigateTo(`/pages/device/detail?deviceId=${encodeURIComponent(HID_DEVICE.deviceId)}&name=${encodeURIComponent(HID_DEVICE.name)}&profileId=smart-hid`)
		await page.waitFor(300)
		expect(page.path).toBe('pages/device/detail')
		expect(await (await page.$('.device-id')).text()).toBe(HID_DEVICE.deviceId)
		await program.screenshot({ path: 'unpackage/test-output/page-flow/05-generic-detail.png' })
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
		await program.screenshot({ path: 'unpackage/test-output/page-flow/06-version-history.png' })
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
		await program.screenshot({ path: 'unpackage/test-output/page-flow/07-broadcast.png' })
	})
})
