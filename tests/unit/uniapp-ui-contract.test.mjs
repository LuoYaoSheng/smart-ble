import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uniappRoot = path.join(repoRoot, 'apps/uniapp');

function collectVueFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'unpackage' || entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collectVueFiles(target, files);
    else if (entry.name.endsWith('.vue')) files.push(target);
  }
  return files;
}

console.log('[uniapp UI contract]');

const vueFiles = collectVueFiles(uniappRoot);
const sources = vueFiles.map((file) => ({ file, source: fs.readFileSync(file, 'utf8') }));
const runtimeSources = [
  ...sources,
  { file: path.join(uniappRoot, 'main.js'), source: fs.readFileSync(path.join(uniappRoot, 'main.js'), 'utf8') }
];

for (const { file, source } of sources) {
  const relative = path.relative(repoRoot, file);
  assert.equal(/<BleButton\b|<BleActionCard\b/.test(source), false, `${relative} reintroduced a custom button host`);
  assert.equal(/\sv-bind="[^"]+"/.test(source), false, `${relative} uses unsupported object-form v-bind`);

  for (const match of source.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) {
    const openingTag = match[0].slice(0, match[0].indexOf('>') + 1);
    const hasDesignClass = /class="[^"]*(?:ble-btn|ble-action-card-btn)/.test(openingTag);
    assert.equal(hasDesignClass, true, `${relative} contains a button outside the shared design contract`);
    assert.notEqual(match[1].trim(), '', `${relative} contains a button without a visible label`);
  }
}

for (const { file, source } of runtimeSources) {
  assert.equal(source.includes('getSystemInfoSync'), false, `${path.relative(repoRoot, file)} uses deprecated getSystemInfoSync`);
}

const designSystem = fs.readFileSync(path.join(uniappRoot, 'styles/design-system.css'), 'utf8');
assert.equal(/button\.ble-(?:btn|action-card-btn)/.test(designSystem), false, 'button selectors must stay class-only for mp-weixin');
assert.match(designSystem, /\.ble-btn--primary\s*\{[\s\S]*?color:\s*#ffffff;[\s\S]*?background:/);
assert.match(designSystem, /\.ble-error-box\s*\{/);
assert.match(designSystem, /\.ble-success-box\s*\{/);
assert.match(designSystem, /\.ble-status-line\s*\{/);
assert.match(designSystem, /--ble-gradient-surface:/);
assert.match(designSystem, /--ble-line-soft:/);
assert.match(designSystem, /--ble-line-faint:/);
assert.match(designSystem, /--ble-shadow-soft:/);
assert.match(designSystem, /--ble-shadow-modal:/);
assert.match(designSystem, /--ble-input-bg:/);
assert.match(designSystem, /\.ble-btn--busy\s*,|\.ble-btn--busy\s*\{/);
assert.match(designSystem, /\.ble-surface-item\s*\{/);
assert.match(designSystem, /\.ble-input\s*\{/);

const connectedPage = fs.readFileSync(path.join(uniappRoot, 'pages/connected/index.vue'), 'utf8');
assert.match(connectedPage, /去扫描/);
assert.match(connectedPage, /summarizeDisconnectAllResults/);
assert.match(connectedPage, /action-label="去扫描"|actionLabel="去扫描"|action-label='去扫描'/);

const broadcastPageSource = fs.readFileSync(path.join(uniappRoot, 'pages/broadcast/index.vue'), 'utf8');
assert.match(broadcastPageSource, /LogPanel|log-panel/);
assert.equal(/log-panel-brd/.test(broadcastPageSource), false, 'broadcast page should reuse shared log-panel');

const operationState = fs.readFileSync(path.join(uniappRoot, 'components/common/operation-state.vue'), 'utf8');
assert.match(operationState, /state === 'loading'/);
assert.match(operationState, /ble-error-box/);

const hidAddSource = fs.readFileSync(path.join(uniappRoot, 'pages/hid/add.vue'), 'utf8');
assert.match(hidAddSource, /OperationState|operation-state/);
assert.equal(/class="error-box"/.test(hidAddSource), false, 'hid add should use shared operation-state/error tokens');

const deviceDetailPage = fs.readFileSync(path.join(uniappRoot, 'pages/device/detail.vue'), 'utf8');
assert.equal(/v-if="services\.length\s*>\s*0"/.test(deviceDetailPage), false, 'device detail must always render service panel states');
assert.match(deviceDetailPage, /servicePanelState/);
assert.match(deviceDetailPage, /manualRetryConnection/);
assert.match(deviceDetailPage, /useDeviceSession/);
assert.equal(/JSON\.stringify\(device\)/.test(deviceDetailPage), false, 'device detail must not embed full device JSON routes');

const smartHidSource = fs.readFileSync(path.join(uniappRoot, 'services/smart-hid/profile.js'), 'utf8');
assert.match(smartHidSource, /model:\s*\{/);
assert.match(smartHidSource, /routes:\s*\{/);

const builtinsSource = fs.readFileSync(path.join(uniappRoot, 'services/provisioning/builtins.js'), 'utf8');
assert.match(builtinsSource, /esp32DemoProfile/);

const indexPage = fs.readFileSync(path.join(uniappRoot, 'pages/index/index.vue'), 'utf8');
const scanComposable = fs.readFileSync(path.join(uniappRoot, 'composables/use-ble-scan.js'), 'utf8');
const scanPermission = fs.readFileSync(path.join(uniappRoot, 'services/scan-permission.js'), 'utf8');
assert.match(indexPage, /bleState\.value === 'unsupported'/);
assert.match(scanComposable, /typeof uni\.getBluetoothAdapterState !== 'function'/);
assert.match(scanPermission, /reason:\s*'ble_not_supported'/);
assert.match(indexPage, /buildGenericDeviceDetailUrl/);
// F023（2026-09-02 用户决策）：首页「已配置 Smart HID」面板与已知设备历史整链移除
assert.doesNotMatch(indexPage, /pruneKnownDevices|knownDevices|openHidHistory|buildHidHistoryUrl/);
assert.match(indexPage, /buildProfileActionUrl/);

const hidAddPage = fs.readFileSync(path.join(uniappRoot, 'pages/hid/add.vue'), 'utf8');
const provisionStepper = fs.readFileSync(path.join(uniappRoot, 'components/hid/provision-stepper.vue'), 'utf8');
assert.match(hidAddPage, /取消等待/);
assert.match(hidAddPage, /onBackPress/);
assert.match(hidAddPage, /confirmLeaveIfNeeded/);
assert.match(provisionStepper, /var\(--ble-gradient-brand,\s*linear-gradient/);

const scanSummary = fs.readFileSync(path.join(uniappRoot, 'components/scan/scan-summary.vue'), 'utf8');
assert.match(scanSummary, /停止扫描/);
assert.match(scanSummary, /开始扫描/);

const broadcastPage = fs.readFileSync(path.join(uniappRoot, 'pages/broadcast/index.vue'), 'utf8');
assert.equal(/status-card|platform-card|broadcast-status-bar/.test(broadcastPage), false, 'broadcast page must keep one compact canonical status');
assert.equal(/substring\(0,\s*(?:4|5|8)\)|retryWithSimpleAdvertising/.test(broadcastPage), false, 'broadcast must not silently replace or truncate the visible payload');
assert.match(broadcastPage, /DEFAULT_ADVERTISING_PAYLOAD/);
assert.match(broadcastPage, /platform\.value === 'web'/);
assert.match(broadcastPage, /当前平台不支持 BLE 广播/);

const hidDetailPage = fs.readFileSync(path.join(uniappRoot, 'pages/hid/detail.vue'), 'utf8');
assert.equal(/hero-card|ble-card-hero/.test(hidDetailPage), false, 'Smart HID detail must start with task information, not a decorative hero');

const mainSource = fs.readFileSync(path.join(uniappRoot, 'main.js'), 'utf8');
assert.equal(mainSource.includes('vue-i18n'), false, 'unused vue-i18n initialization must not return without translated UI');

const productSource = fs.readFileSync(path.join(uniappRoot, 'config/product.js'), 'utf8');
assert.match(productSource, /萌喵圈[\s\S]*?wxe0ed0e6727a0a5cd/);
assert.match(productSource, /宝宝点滴[\s\S]*?wx1bb2d5c6821a7883/);
// 86952f4（PARITY-ILL/P009 正典化）：推广卡片改缩写徽章块，icon PNG 已移除
assert.match(productSource, /abbr:\s*'萌喵'/);
assert.match(productSource, /abbr:\s*'宝宝'/);
assert.doesNotMatch(productSource, /other-apps\/.*\.png/);

const versionSource = fs.readFileSync(path.join(uniappRoot, 'pages/about/version.vue'), 'utf8');
assert.match(versionSource, /getVersionPageModel/, 'Version page must project Release Metadata via getVersionPageModel');
assert.equal(/\bversionHistory\b/.test(versionSource), false, 'Version History must not keep a hardcoded versionHistory array');
assert.equal(/['"`]v?1\.0\.\d+['"`]/.test(versionSource), false, 'Version page must not hardcode product version literals');
assert.match(versionSource, /暂无正式发布版本/);
assert.equal(versionSource.includes('智能蓝牙助手'), false, 'Version History share title must use the current product identity');
assert.match(versionSource, /BLE Toolkit\+/);

const aboutSource = fs.readFileSync(path.join(uniappRoot, 'pages/about/index.vue'), 'utf8');
assert.match(aboutSource, /navigateToMiniProgram/);
assert.match(aboutSource, /暂时无法打开/);

const prototype = fs.readFileSync(path.join(repoRoot, 'docs/prototypes/unified-device-discovery.html'), 'utf8');
assert.equal((prototype.match(/data-tab="(?:device|connected|broadcast|about)"/g) || []).length, 4, 'prototype must keep four top-level tabs');
assert.match(prototype, /id="connectedScreen"/);
assert.match(prototype, /class="broadcast-heading"/);
assert.match(prototype, /class="hid-identity"/);
assert.match(prototype, /id="copyAdv"/);
assert.match(prototype, /label for="wizardSsid"/);
assert.match(prototype, /aria-current="page"/);
assert.match(prototype, /window\.scrollTo\(0,0\)/);
assert.equal(/broadcast-status card|id="scanSegment"|id="connectedSegment"|id="clearBroadcast"/.test(prototype), false, 'prototype reintroduced a stale runtime structure');
assert.match(prototype, /id="broadcastBytes">21 \/ 31 字节/);
assert.equal(prototype.includes('37 / 31'), false, 'prototype must not retain the invalid broadcast default');

console.log(`  ✓ ${vueFiles.length} Vue files keep native, labeled, shared-style buttons`);
