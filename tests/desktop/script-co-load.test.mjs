// 桌面脚本链共载门禁（P7 新增）
// 背景：T-WIN app.js 曾顶层重复声明 BleUtils.js 的 MAX_RECONNECT_ATTEMPTS/escapeHtml，
// 浏览器在脚本实例化期直接 SyntaxError → 整个 app.js 不执行 → 应用全瘫。
// 该类缺陷逐文件语法检查（node --check）与单文件静态断言都抓不住；
// 唯一可靠口径 = 把两线 index.html 脚本链按真实顺序装入同一个 vm 上下文
// （vm 的全局词法环境跨 runInContext 持久，重复顶层声明与浏览器同语义抛错）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LANES = {
  'T-WIN': {
    html: resolve(repoRoot, 'apps/desktop/tauri/src/index.html'),
    base: resolve(repoRoot, 'apps/desktop/tauri/src'),
    loadedProbe: 'typeof switchTab',   // T-WIN 函数式：顶层 function 声明应入全局
    loadedExpect: 'function',
  },
  'E-WIN': {
    html: resolve(repoRoot, 'apps/desktop/electron/public/index.html'),
    base: resolve(repoRoot, 'apps/desktop/electron/public'),
    loadedProbe: 'typeof App',         // E-WIN 类式：顶层 class 声明应入全局
    loadedExpect: 'function',
  },
};

function makeStubContext() {
  const noop = () => {};
  const stubEl = () => ({
    style: {}, dataset: {}, innerHTML: '', textContent: '',
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, removeEventListener: noop,
    appendChild: noop, removeChild: noop, setAttribute: noop,
    querySelector: () => null, querySelectorAll: () => [],
  });
  const window = {
    addEventListener: noop,
    location: { search: '', href: 'https://stub.local/', origin: 'https://stub.local' },
    navigator: { userAgent: 'stub' },
    customElements: { define: noop, get: () => undefined },
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    requestAnimationFrame: (f) => { if (typeof f === 'function') f(); return 0; },
  };
  const document = {
    readyState: 'loading',
    addEventListener: noop,
    createElement: stubEl,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    body: stubEl(), head: stubEl(), documentElement: stubEl(),
  };
  window.document = document;
  const sandbox = {
    window, document,
    navigator: window.navigator, location: window.location,
    console,
    customElements: window.customElements,
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
    setInterval: window.setInterval, clearInterval: window.clearInterval,
    requestAnimationFrame: window.requestAnimationFrame,
    HTMLElement: class HTMLElement {},   // 自定义元素类定义需要
    CustomEvent: class CustomEvent { constructor(t) { this.type = t; } },
    Event: class Event { constructor(t) { this.type = t; } },
    performance: { now: () => 0 },
  };
  return vm.createContext(sandbox);
}

function loadLane(lane) {
  const html = readFileSync(lane.html, 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map((m) => resolve(lane.base, m[1]));
  assert.ok(srcs.length >= 10, `脚本链解析异常：${lane.html} 仅 ${srcs.length} 个`);
  const ctx = makeStubContext();
  const loaded = [];
  for (const f of srcs) {
    const code = readFileSync(f, 'utf8');
    try {
      vm.runInContext(code, ctx, { filename: f });
      loaded.push(f.split(/[\\/]/).pop());
    } catch (e) {
      e.laneScript = f;
      e.loadedBefore = loaded;
      throw e;
    }
  }
  return { ctx, loaded };
}

for (const [laneName, lane] of Object.entries(LANES)) {
  test(`${laneName} 脚本链共载：重复顶层声明会实例化失败（浏览器同语义）`, () => {
    const { loaded } = loadLane(lane);
    assert.ok(loaded.length >= 10, '全部脚本应完成装载');
  });

  test(`${laneName} 装载后入口全局可达（app 主脚本确实执行）`, () => {
    const { ctx } = loadLane(lane);
    const probe = vm.runInContext(lane.loadedProbe, ctx);
    assert.equal(probe, lane.loadedExpect, `${lane.loadedProbe} 应为 ${lane.loadedExpect}`);
  });

  test(`${laneName} Smart HID 脚本链挂载（bundle + 桌面服务 attach 目标）`, () => {
    const { ctx } = loadLane(lane);
    const hid = vm.runInContext('typeof window.SmartHid', ctx);
    const desktop = vm.runInContext('typeof window.SmartHidDesktop', ctx);
    assert.equal(hid, 'object', 'window.SmartHid 应为 object');
    assert.equal(desktop, 'object', 'window.SmartHidDesktop 应为 object');
  });
}

test('回归锁：T-WIN app.js 不得重新顶层声明 BleUtils 顶层名（实弹缺陷回归）', () => {
  const { ctx } = loadLane(LANES['T-WIN']);
  // 若重复声明回来，loadLane 第一条测试即以 "has already been declared" 失败；
  // 此处再锁语义：MAX_RECONNECT_ATTEMPTS 解析到 BleUtils 的 3。
  const val = vm.runInContext('MAX_RECONNECT_ATTEMPTS', ctx);
  assert.equal(val, 3, 'MAX_RECONNECT_ATTEMPTS 应解析为 BleUtils.js 的顶层常量 3');
  const esc = vm.runInContext('typeof escapeHtml', ctx);
  assert.equal(esc, 'function', 'escapeHtml 应解析为 BleUtils.js 的顶层函数（DOM 桩下仅验证解析）');
});
