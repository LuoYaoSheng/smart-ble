import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const root = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const requireElectron = createRequire(root + '/apps/desktop/electron/package.json');
const errors = [];
const app = await electron.launch({ executablePath: requireElectron('electron'), args: [root + '/apps/desktop/electron'], timeout: 30000 });
try {
  const page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await page.evaluate(() => Boolean(window.appInstance && window.bleAPI))) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(await page.evaluate(() => Boolean(window.appInstance && window.bleAPI)), true);
  const isolation = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  assert.equal(isolation.sandbox, true);
  assert.equal(isolation.contextIsolation, true);
  assert.equal(isolation.nodeIntegration, false);
  const payload = '<img src=x onerror="window.__injected=1">';
  const rendered = await page.evaluate((payload) => {
    const app = window.appInstance;
    app.currentDevice = { id: 'security-test-device', name: payload };
    app.isConnecting = true;
    app.showDeviceDetail();
    app.renderServices();
    const gatt = document.getElementById('gattPanel');
    app.hidDiag = { deviceId: payload, state: 'error', rows: [{ label: payload, state: 'warn', detail: payload }], error: { code: payload, message: payload }, showErr: true };
    app.hidRenderDiag();
    const diag = document.getElementById('hidDiagBody');
    const card = document.createElement('device-card'); card.device = { id: 'test', name: payload };
    document.body.appendChild(card);
    const svc = document.createElement('service-panel');
    svc.services = [{ uuid: '180a', name: payload, characteristics: [{ uuid: '" onmouseover="window.__injected=1', name: payload, properties: ['read'], value: payload }] }];
    document.body.appendChild(svc);
    return { gattText: gatt?.textContent, diagText: diag.textContent, images: diag.querySelectorAll('img').length + card.querySelectorAll('img').length + svc.querySelectorAll('img').length + (gatt?.querySelectorAll('img').length || 0), badAttributes: svc.querySelectorAll('[onmouseover]').length, injected: window.__injected || false };
  }, payload);
  assert.equal(rendered.images, 0); assert.equal(rendered.badAttributes, 0); assert.equal(rendered.injected, false);
  assert.ok(rendered.gattText?.includes(payload)); assert.ok(rendered.diagText.includes(payload));
  const jsQR = await page.evaluate(async () => typeof await window.appInstance.hidEnsureJsQr());
  assert.equal(jsQR, 'function');
  await page.evaluate(() => { window.appInstance.switchTab('scan'); });
  await page.locator('#filterToggle').click();
  assert.equal(await page.locator('#mainFilterPanel').getAttribute('hidden'), null);
  // Test denial handling without opening or recording the physical camera.
  const cameraDenial = await page.evaluate(async () => {
    let requests = 0;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async () => { requests++; throw new DOMException('Test denied', 'NotAllowedError'); };
    window.appInstance.hidProv = { ssid: '', hub: '', pairing: null };
    window.appInstance.hidOpenQrSheet();
    await new Promise(resolve => setTimeout(resolve, 80));
    const status = document.getElementById('hidQrVfStatus')?.textContent;
    navigator.mediaDevices.getUserMedia = original;
    return { requests, status };
  });
  assert.equal(cameraDenial.requests, 1); assert.match(cameraDenial.status, /摄像头权限被拒绝/);
  await page.locator('#hidQrFallbackBtn').click();
  assert.ok(await page.locator('#hidModalMask').isVisible());
  const sandboxView = await page.evaluate(() => ({ require: typeof window.require, csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]').content }));
  assert.equal(sandboxView.require, 'undefined');
  await fs.mkdir(root + '/output/playwright', { recursive: true });
  await page.screenshot({ path: root + '/output/playwright/electron-security-qr.png' });
  assert.equal(errors.filter(error => /Content Security Policy|Refused to|is not defined|SyntaxError/.test(error)).length, 0, errors.join('\n'));
  console.log(JSON.stringify({ pass: true, isolation: { sandbox: isolation.sandbox, contextIsolation: isolation.contextIsolation }, rendered, qrLibrary: jsQR, cameraDenial, errors }, null, 2));
} finally {
  app.process().kill('SIGKILL');
  await Promise.race([app.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 2000))]);
}
