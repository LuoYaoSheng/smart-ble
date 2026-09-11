#!/usr/bin/env node
/**
 * UI-MOCK-COPYCHECK · 九页六态正典文案断言（H5 mock 通道，2026-09-11）。
 *
 * 与 uniapp-h5-mock-sweep.mjs 同载体：按页导航一次 → 逐态种子 → 断言 body 文本
 * 包含/不包含正典关键串（PAGE_SPEC §11 + 逐页文案 + 原型条件渲染口径）。
 * expect 项：[文案, 1=必须出现 / 0=必须不出现]
 */

import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(resolve(dirname(fileURLToPath(import.meta.url)), '../../tests/e2e/node_modules/playwright'));

const BASE = process.env.SWEEP_BASE || 'http://localhost:5173';
const CHROMIUM = '/Users/luoyaosheng/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
	{
		page: 'P001', dir: 'pages/index/index', nav: 'switchTab', key: 'p001',
		states: [
			{ id: 'idle', seed: ['p001', 'idle'], expect: [['待开始扫描', 1], ['还没有扫描结果', 1], ['点上方按钮开始扫描附近 BLE 设备', 1]] },
			{ id: 'scanning', seed: ['p001', 'scanning'], expect: [['扫描中 · 5s 会话', 1], ['停止扫描', 1]] },
			{ id: 'complete', seed: ['p001', 'complete'], set: { hasScanned: true }, expect: [['扫描完成 · 发现 6 台', 1], ['Smart HID · 强匹配', 1], ['疑似 Smart HID · 弱匹配', 1], ['未命名 BLE · AA77', 1], ['配置 Smart HID', 1], ['ESP32 · 强匹配', 1]] },
			{ id: 'failed', seed: ['p001', 'failed'], set: { hasScanned: true }, expect: [['扫描失败', 1], ['重试', 1], ['10006', 1]] },
			{ id: 'ble-off', seed: ['p001', 'ble-off'], expect: [['蓝牙未开启', 1]] },
			{ id: 'unsupported', seed: ['p001', 'unsupported'], expect: [['平台不支持', 1]] },
			{ id: 'filter-empty', seed: ['p001', 'filter-empty'], set: { hasScanned: true, filterSettings: { rssi: -100, prefix: 'ZZ', hideNoName: false } }, expect: [['当前没有匹配设备', 1], ['调整筛选条件试试', 1]] },
			{ id: 'filter-open', seed: ['p001', 'complete'], set: { hasScanned: true, showFilters: true }, expect: [['隐藏无名', 1], ['重置过滤', 1]] }
		]
	},
	{
		page: 'P002', dir: 'pages/hid/add', nav: 'go', url: '/pages/hid/add?deviceId=SHID-9F3E2A1C', key: 'p002',
		preSeed: ['p002', 'connect-idle'],
		states: [
			{ id: 'connect-idle', seed: ['p002', 'connect-idle'], expect: [['配置 Smart HID', 1], ['连接', 1]] },
			{ id: 'configure', seed: ['p002', 'configure'], expect: [['填写配置', 1], ['Wi-Fi 名称', 1], ['无密码可留空', 1], ['ControlHub 地址', 1], ['重新扫描', 1], ['已获取', 1], ['下发配置', 1], ['Wi-Fi 密码和配对凭据只用于本次下发，不写入日志或本地存储', 1]] },
			{ id: 'configure-lost', seed: ['p002', 'configure-lost'], expect: [['已断开', 1], ['已填写的配网信息不会丢失', 1]] },
			{ id: 'status-running', seed: ['p002', 'status-running'], expect: [['Wi-Fi 连接', 1], ['ControlHub 配对', 1], ['MQTT 连接', 1], ['设备控制链路就绪', 1], ['取消等待', 1]] },
			{ id: 'status-done', seed: ['p002', 'status-done'], expect: [['查看设备', 1], ['HID 控制请通过 ControlHub 下发', 1]] },
			{ id: 'status-error-pairing', seed: ['p002', 'status-error', { code: 'pairing_expired' }], expect: [['配对码已过期', 1], ['重新扫描', 1]] }
		]
	},
	{
		page: 'P003', dir: 'pages/hid/detail', nav: 'go', url: '/pages/hid/detail?deviceId=SHID-9F3E2A1C', key: 'p003',
		preSeed: ['p003', 'ready'],
		states: [
			{ id: 'ready', seed: ['p003', 'ready'], expect: [['Smart HID 设备详情', 1], ['重新配置', 1], ['运行诊断', 1], ['高级 BLE 调试', 1], ['Office-5G', 1], ['192.168.1.8:17892', 1]] },
			{ id: 'missing', seed: ['p003', 'missing'], expect: [['—', 1]] }
		]
	},
	{
		page: 'P005', dir: 'pages/hid/diagnostics', nav: 'go', url: '/pages/hid/diagnostics?deviceId=SHID-9F3E2A1C', key: 'p005',
		preSeed: ['p005', 'idle'],
		states: [
			{ id: 'idle', seed: ['p005', 'idle'], expect: [['尚未检测', 1], ['BLE 链路', 1], ['待检测', 1], ['重新检测', 1], ['返回设备详情', 1], ['重新配网', 1], ['显示错误码', 0]] },
			{ id: 'connected', seed: ['p005', 'connected'], expect: [['设备已连接可开始检测', 1]] },
			{ id: 'checking', seed: ['p005', 'checking'], expect: [['正在读取实时状态', 1]] },
			{ id: 'live', seed: ['p005', 'live'], expect: [['实时检测完成', 1], ['正常', 1], ['异常', 1], ['失败', 1]] },
			{ id: 'offline', seed: ['p005', 'offline'], expect: [['设备未连接', 1]] },
			{ id: 'error', seed: ['p005', 'error'], expect: [['检测失败', 1], ['diagnostic_read_failed', 1], ['隐藏错误码', 1]] }
		]
	},
	{
		page: 'P006', dir: 'pages/device/detail', nav: 'go', url: '/pages/device/detail?deviceId=D8%3AA6%3A3A%3A41%3AF2%3A09&name=Mi%20Smart%20Band%208&rssi=-66', key: 'p006',
		states: [
			{ id: 'connecting', seed: ['p006', 'connecting'], expect: [['连接中…', 1]] },
			{ id: 'ready', seed: ['p006', 'ready'], repeatSeed: true, expect: [['服务与特征', 1], ['4 服务 / 7 特征', 1], ['通用访问', 1], ['电池服务', 1], ['OTA 服务', 1], ['串口透传', 1], ['固件更新', 1], ['通信日志', 1], ['连接成功', 1]] },
			{ id: 'empty', seed: ['p006', 'empty'], repeatSeed: true, expect: [['未发现可用服务', 0]] },
			{ id: 'error', seed: ['p006', 'error'], expect: [['重试', 1], ['连接超时', 1]] }
		]
	},
	{
		page: 'P007', dir: 'pages/connected/index', nav: 'switchTab', key: 'p007',
		states: [
			{ id: 'empty', seed: ['p007', 'empty'], expect: [['先在', 1], ['找到设备并连接', 1], ['去扫描', 1]] },
			{ id: 'empty-provision', seed: ['p007', 'empty-provision'], expect: [['Smart HID 配网连接进行中', 1]] },
			{ id: 'single', seed: ['p007', 'single'], expect: [['已连接 · 可进行 GATT 调试', 1], ['断开', 1]] },
			{ id: 'multi', seed: ['p007', 'multi'], expect: [['全部断开', 1], ['3', 1]] }
		]
	},
	{
		page: 'P008', dir: 'pages/broadcast/index', nav: 'switchTab', key: 'p008',
		states: [
			{ id: 'idle', seed: ['p008', 'idle'], expect: [['已就绪', 1], ['开始广播', 1], ['检查支持', 1]] },
			{ id: 'advertising', seed: ['p008', 'advertising'], expect: [['广播中', 1], ['停止广播', 1], ['/ 31 字节', 1], ['通信日志', 1]] },
			{ id: 'failed', seed: ['p008', 'failed'], expect: [['失败', 1], ['errCode 10001', 1]] },
			{ id: 'unsupported', seed: ['p008', 'unsupported'], expect: [['不支持', 1]] }
		]
	},
	{
		page: 'P009', dir: 'pages/about/index', nav: 'switchTab',
		states: [{ id: 'default', expect: [['关于', 1], ['版本记录', 1], ['官方网站', 1], ['问题反馈', 1], ['分享应用', 1]] }]
	},
	{
		page: 'P010', dir: 'pages/about/version', nav: 'go', url: '/pages/about/version',
		states: [{ id: 'default', expect: [['版本记录', 1], ['本页数据来自 Release Metadata 投影', 1]] }]
	}
];

async function main() {
	const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM });
	const results = [];
	for (const spec of PAGES) {
		const context = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: 'zh-CN' });
		const page = await context.newPage();
		try {
			await page.goto(`${BASE}/#/pages/index/index?mock=1`, { waitUntil: 'domcontentloaded' });
			await page.waitForFunction(() => Boolean(window.__MOCK__), null, { timeout: 15000 });
			if (spec.preSeed) await page.evaluate(([k, p, payload]) => window.__MOCK__.seed(k, p, payload), spec.preSeed);
			if (spec.nav === 'switchTab') await page.evaluate((u) => window.__MOCK__.switchTab(u), `/${spec.dir}`);
			else await page.evaluate((u) => window.__MOCK__.go(u), spec.url);
			await sleep(700);
			for (const state of spec.states) {
				if (state.seed) {
					await page.evaluate(([k, p, payload]) => window.__MOCK__.seed(k, p, payload), state.seed);
					if (state.repeatSeed) { await sleep(350); await page.evaluate(([k, p, payload]) => window.__MOCK__.seed(k, p, payload), state.seed); }
				}
				if (state.set) await page.evaluate(([k, patch]) => window.__MOCK__.set(k, patch), [spec.key, state.set]);
				await sleep(400);
				const text = await page.evaluate(() => document.body.innerText);
				const missing = state.expect.filter(([str, req]) => req && !text.includes(str)).map(([str]) => str);
				const unexpected = state.expect.filter(([str, req]) => !req && text.includes(str)).map(([str]) => str);
				const ok = missing.length === 0 && unexpected.length === 0;
				results.push({ ok, page: spec.page, state: state.id });
				console.log(`${ok ? '✓' : '✗'} ${spec.page}/${state.id}${ok ? '' : ` missing=${JSON.stringify(missing)} unexpected=${JSON.stringify(unexpected)}`}`);
			}
		} catch (error) {
			results.push({ ok: false, page: spec.page, state: 'NAV', error: String(error).slice(0, 200) });
			console.log(`✗ ${spec.page}/NAV — ${String(error).slice(0, 150)}`);
		} finally {
			await context.close();
		}
	}
	await browser.close();
	const failed = results.filter((r) => !r.ok).length;
	console.log(`\n${results.length - failed}/${results.length} 文案断言通过`);
	process.exit(failed ? 1 : 0);
}

main();
