#!/usr/bin/env node
/**
 * UI-MOCK-SWEEP · uniapp H5 九页六态截图通道（2026-09-11 UI 全面轮，Mac 线）。
 *
 * 载体：uni dev -p h5（dev server，按需编译）+ Playwright headless chromium。
 * 数据：apps/uniapp/services/mock/（?mock=1 桥）——正典演示集驱动真实渲染管线。
 * 证据口径：code-level 视觉对照（H5 为 dev 载体，不折算 U-WX/U-AND 真机 VISUAL_PASS）。
 *
 * 用法：
 *   1. 终端 A：cd apps/uniapp && UNI_INPUT_DIR="$PWD" UNI_OUTPUT_DIR="$PWD/unpackage/dist/dev/h5" \
 *      UNI_PLATFORM=h5 node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js -p h5
 *   2. 终端 B：node scripts/ui/uniapp-h5-mock-sweep.mjs [run-id]
 */

import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(resolve(dirname(fileURLToPath(import.meta.url)), '../../tests/e2e/node_modules/playwright'));

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.SWEEP_BASE || 'http://localhost:5173';
const RUN_ID = process.argv[2] || `20260911-h5-mock-sweep`;
const OUT = resolve(ROOT, 'verification/windows-mobile-v1', RUN_ID);

// chromium_headless_shell 版本缺货时回退既有 chromium-1223 全量二进制
const CHROMIUM_CANDIDATES = [
	'/Users/luoyaosheng/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
];

/** 状态清单：PAGE_SPEC §11 六项检查矩阵逐页映射 */
const SWEEP = [
	{
		page: 'P001', dir: 'pages/index/index', nav: 'switchTab', key: 'p001',
		states: [
			{ id: '01-idle-empty', seed: ['p001', 'idle'] },
			{ id: '02-scanning', seed: ['p001', 'scanning'] },
			{ id: '03-complete', seed: ['p001', 'complete'], set: ['p001', { hasScanned: true }] },
			{ id: '04-scan-failed', seed: ['p001', 'failed'], set: ['p001', { hasScanned: true }] },
			{ id: '05-bt-off', seed: ['p001', 'ble-off'] },
			{ id: '06-bt-unsupported', seed: ['p001', 'unsupported'] },
			{ id: '07-filter-empty', seed: ['p001', 'filter-empty'], set: ['p001', { hasScanned: true, filterSettings: { rssi: -100, prefix: 'ZZ', hideNoName: false } }] },
			{ id: '08-filter-open', seed: ['p001', 'complete'], set: ['p001', { hasScanned: true, showFilters: true }] }
		]
	},
	{
		page: 'P002', dir: 'pages/hid/add', nav: 'go', url: '/pages/hid/add?deviceId=SHID-9F3E2A1C', key: 'p002',
		preSeed: ['p002', 'connect-idle'],
		states: [
			{ id: '01-connect-idle' },
			{ id: '02-connect-connecting', seed: ['p002', 'connect-connecting'] },
			{ id: '03-connect-error', seed: ['p002', 'connect-error'] },
			{ id: '04-configure', seed: ['p002', 'configure'] },
			{ id: '05-configure-lost', seed: ['p002', 'configure-lost'] },
			{ id: '06-status-running', seed: ['p002', 'status-running'] },
			{ id: '07-status-running-late', seed: ['p002', 'status-running-late'] },
			{ id: '08-status-done', seed: ['p002', 'status-done'] },
			{ id: '09-status-error', seed: ['p002', 'status-error', { code: 'controlhub_unreachable' }] },
			{ id: '10-status-error-pairing', seed: ['p002', 'status-error', { code: 'pairing_expired' }] }
		]
	},
	{
		page: 'P003', dir: 'pages/hid/detail', nav: 'go', url: '/pages/hid/detail?deviceId=SHID-9F3E2A1C', key: 'p003',
		preSeed: ['p003', 'ready'],
		states: [
			{ id: '01-ready' },
			{ id: '02-missing-fields', seed: ['p003', 'missing'] }
		]
	},
	{
		page: 'P005', dir: 'pages/hid/diagnostics', nav: 'go', url: '/pages/hid/diagnostics?deviceId=SHID-9F3E2A1C', key: 'p005',
		preSeed: ['p005', 'idle'],
		states: [
			{ id: '01-idle-pending', seed: ['p005', 'idle'] },
			{ id: '02-connected', seed: ['p005', 'connected'] },
			{ id: '03-checking', seed: ['p005', 'checking'] },
			{ id: '04-live-mixed', seed: ['p005', 'live'] },
			{ id: '05-offline', seed: ['p005', 'offline'] },
			{ id: '06-error-advanced', seed: ['p005', 'error'] }
		]
	},
	{
		page: 'P006', dir: 'pages/device/detail', nav: 'go', url: '/pages/device/detail?deviceId=D8%3AA6%3A3A%3A41%3AF2%3A09&name=Mi%20Smart%20Band%208&rssi=-66', key: 'p006',
		states: [
			{ id: '01-idle', seed: ['p006', 'idle'] },
			{ id: '02-connecting', seed: ['p006', 'connecting'] },
			{ id: '03-ready-gatt-tree', seed: ['p006', 'ready'], repeatSeed: true },
			{ id: '04-services-empty', seed: ['p006', 'empty'], repeatSeed: true },
			{ id: '05-connect-error', seed: ['p006', 'error'] }
		]
	},
	{
		page: 'P007', dir: 'pages/connected/index', nav: 'switchTab', key: 'p007',
		states: [
			{ id: '01-empty', seed: ['p007', 'empty'] },
			{ id: '02-empty-provision-online', seed: ['p007', 'empty-provision'] },
			{ id: '03-single', seed: ['p007', 'single'] },
			{ id: '04-multi-summary', seed: ['p007', 'multi'] }
		]
	},
	{
		page: 'P008', dir: 'pages/broadcast/index', nav: 'switchTab', key: 'p008',
		states: [
			{ id: '01-idle-weixin', seed: ['p008', 'idle'] },
			{ id: '02-advertising', seed: ['p008', 'advertising'] },
			{ id: '03-advertising-android', seed: ['p008', 'advertising', { platform: 'android' }] },
			{ id: '04-stopped', seed: ['p008', 'stopped'] },
			{ id: '05-failed', seed: ['p008', 'failed'] },
			{ id: '06-web-unsupported', seed: ['p008', 'unsupported'] }
		]
	},
	{
		page: 'P009', dir: 'pages/about/index', nav: 'switchTab', key: 'p009',
		states: [{ id: '01-default' }]
	},
	{
		page: 'P010', dir: 'pages/about/version', nav: 'go', url: '/pages/about/version', key: 'p010',
		states: [{ id: '01-default' }]
	}
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureState(context, spec, state, pageDir) {
	const page = await context.newPage();
	const consoleErrors = [];
	page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300)); });
	page.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 300)));

	try {
		// 1. 落地首页装桥（hash 路由 query 在 # 段）
		await page.goto(`${BASE}/#/pages/index/index?mock=1`, { waitUntil: 'domcontentloaded' });
		await page.waitForFunction(() => Boolean(window.__MOCK__), null, { timeout: 15000 });

		// 2. 导航前种子（上下文守卫页需要：P002/P003/P005）
		if (spec.preSeed) await page.evaluate(([k, p, payload]) => window.__MOCK__.seed(k, p, payload), spec.preSeed);

		// 3. 导航
		if (spec.nav === 'switchTab') {
			await page.evaluate((url) => window.__MOCK__.switchTab(url), `/${spec.dir}`);
		} else {
			await page.evaluate((url) => window.__MOCK__.go(url), spec.url);
		}
		await sleep(700);

		// 4. 导航后种子（页面本地靶标已注册）
		if (state.seed) {
			await page.evaluate(([k, p, payload]) => window.__MOCK__.seed(k, p, payload), state.seed);
			if (state.repeatSeed) { await sleep(400); await page.evaluate(([k, p, payload]) => window.__MOCK__.seed(k, p, payload), state.seed); }
		}
		if (state.set) await page.evaluate(([k, patch]) => window.__MOCK__.set(k, patch), state.set);

		await sleep(450);
		const file = resolve(pageDir, `${state.id}.png`);
		await page.screenshot({ path: file, fullPage: true });
		return { ok: true, file, consoleErrors };
	} catch (error) {
		return { ok: false, error: String(error).slice(0, 300), consoleErrors };
	} finally {
		await page.close().catch(() => {});
	}
}

async function main() {
	// dev server 探活
	try {
		const res = await fetch(BASE);
		if (!res.ok) throw new Error(`status ${res.status}`);
	} catch {
		console.error(`dev server 未就绪：${BASE}（先起 uni -p h5，见脚本头注释）`);
		process.exit(1);
	}

	await mkdir(OUT, { recursive: true });
	const browser = await chromium.launch({
		headless: true,
		...(await (async () => {
			try { await chromium.launch({ headless: true }); return {}; } catch { return { executablePath: CHROMIUM_CANDIDATES[0] }; }
		})())
	});

	const manifest = [];
	for (const spec of SWEEP) {
		const pageDir = resolve(OUT, spec.page);
		await mkdir(pageDir, { recursive: true });
		for (const state of spec.states) {
			// 每状态独立 context：状态互不渗透（375×780 设计基准 → 393×852 矩阵基准视口）
			const context = await browser.newContext({
				viewport: { width: 393, height: 852 },
				deviceScaleFactor: 2,
				locale: 'zh-CN'
			});
			const result = await captureState(context, spec, state, pageDir);
			manifest.push({ page: spec.page, state: state.id, ...result, consoleErrors: result.consoleErrors?.slice(0, 5) });
			console.log(`${result.ok ? '✓' : '✗'} ${spec.page}/${state.id}${result.ok ? '' : ' — ' + result.error}`);
			await context.close();
		}
	}
	await browser.close();

	const summary = {
		runId: RUN_ID, base: BASE, generatedAt: new Date().toISOString(),
		vehicle: 'uniapp H5 dev server + playwright headless (mock bridge ?mock=1)',
		total: manifest.length,
		passed: manifest.filter((m) => m.ok).length,
		failed: manifest.filter((m) => !m.ok).length,
		items: manifest.map(({ file, ...rest }) => ({ ...rest, file: file ? file.replace(ROOT + '/', '') : null }))
	};
	const { writeFile } = await import('node:fs/promises');
	await writeFile(resolve(OUT, 'MANIFEST.json'), JSON.stringify(summary, null, 2));
	console.log(`\n${summary.passed}/${summary.total} 截图落袋 → ${OUT.replace(ROOT + '/', '')}`);
	process.exit(summary.failed ? 1 : 0);
}

main();
