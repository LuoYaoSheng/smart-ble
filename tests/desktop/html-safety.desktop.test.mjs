import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const lanes = ['electron/public', 'tauri/src', 'wails/frontend/src'];
const payload = `<img src=x onerror="window.stolen=document.querySelector('#hidPwdInput').value">'`;
for (const lane of lanes) {
  test(`${lane} HTML encoder escapes quotes, markup and ampersands without DOM dependence`, () => {
    const context = vm.createContext({ window: {}, TextEncoder, TextDecoder });
    vm.runInContext(readFileSync(new URL(`../../apps/desktop/${lane}/BleUtils.js`, import.meta.url), 'utf8'), context);
    const escaped = context.window.BleUtils.escapeHtml(payload + '&');
    assert.equal(escaped.includes('<img'), false);
    assert.equal(escaped.includes('"'), false);
    assert.equal(escaped.includes("'"), false);
    assert.match(escaped, /&lt;img/);
    assert.match(escaped, /&quot;/);
    assert.match(escaped, /&#39;/);
    assert.ok(escaped.endsWith('&amp;'));
  });
  test(`${lane} GATT characteristic attributes and display values use the same encoder`, () => {
    const context = vm.createContext({ HTMLElement: class {}, customElements: { define() {} } });
    vm.runInContext(readFileSync(new URL(`../../apps/desktop/${lane}/components/ServicePanel.js`, import.meta.url), 'utf8'), context);
    context.payload = payload;
    const output = vm.runInContext("ServicePanel.prototype.renderCharacteristic.call(ServicePanel.prototype, payload, { uuid: payload, name: payload, value: payload, properties: ['read'] })", context);
    assert.equal(output.includes(payload), false);
    assert.equal(output.includes('<img'), false);
    assert.match(output, /data-service-uuid="&lt;img/);
    assert.match(output, /&quot;/);
  });
}

test('desktop renderer CSP blocks inline scripts and external frames; Electron keeps sandbox isolation', () => {
  for (const lane of ['electron/public', 'wails/frontend/src']) {
    const html = readFileSync(new URL(`../../apps/desktop/${lane}/index.html`, import.meta.url), 'utf8');
    assert.match(html, /script-src 'self';/);
    assert.match(html, /object-src 'none'/);
    assert.match(html, /frame-src 'none'/);
    assert.equal(/on(?:click|error|load)\s*=/.test(html), false);
  }
  const config = JSON.parse(readFileSync(new URL('../../apps/desktop/tauri/src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
  assert.match(config.tauri.security.csp, /script-src 'self';/);
  const main = readFileSync(new URL('../../apps/desktop/electron/src/main/index.js', import.meta.url), 'utf8');
  assert.match(main, /sandbox: true/);
  assert.match(main, /contextIsolation: true/);
  assert.match(main, /nodeIntegration: false/);
});
