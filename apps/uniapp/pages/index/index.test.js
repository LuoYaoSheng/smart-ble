const pagesConfig = require('../../pages.json')
const fs = require('node:fs')
const path = require('node:path')

const expectedTabs = [
	['扫描', 'pages/index/index'],
	['已连接', 'pages/connected/index'],
	['广播', 'pages/broadcast/index'],
	['关于', 'pages/about/index']
]

describe('Smart BLE top-level navigation', () => {
	let page

	beforeAll(async () => {
		fs.mkdirSync(path.join(__dirname, '../../unpackage/test-output'), { recursive: true })
		page = await program.reLaunch('/pages/index/index')
		await page.waitFor(1000)
	})

	test('opens Scan with a readable start action', async () => {
		expect(page.path).toBe('pages/index/index')
		const scanSummary = await program.evaluate(function () {
			const pages = getCurrentPages()
			const current = pages[pages.length - 1]
			const component = current && current.selectComponent('#scan-summary')
			return component ? { found: true, data: component.data } : { found: false }
		})
		expect(scanSummary.found).toBe(true)
		expect(scanSummary.data.a).toBe('待开始')
		expect(scanSummary.data.f).toBe('开始扫描')
	})

	test('declares and opens all four TabBar pages', async () => {
		const configuredTabs = pagesConfig.tabBar.list.map(({ text, pagePath }) => [text, pagePath])
		expect(configuredTabs).toEqual(expectedTabs)

		for (const [, pagePath] of expectedTabs) {
			const tabPage = await program.switchTab(`/${pagePath}`)
			await tabPage.waitFor(250)
			expect(tabPage.path).toBe(pagePath)
		}
	})

	test('captures the Scan page in the WeChat simulator', async () => {
		page = await program.switchTab('/pages/index/index')
		await page.waitFor(250)
		await program.screenshot({ path: 'unpackage/test-output/automator-scan.png' })
	})
})
