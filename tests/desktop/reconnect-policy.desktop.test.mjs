import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

for (const path of ['electron/public', 'tauri/src', 'wails/frontend/src']) {
  test(`${path} reconnect uses the 1/3/5 second contract`, () => {
    const context = vm.createContext({ window: {}, TextEncoder, TextDecoder });
    vm.runInContext(readFileSync(new URL(`../../apps/desktop/${path}/BleUtils.js`, import.meta.url), 'utf8'), context);
    assert.deepEqual([1, 2, 3].map(context.window.BleUtils.reconnectDelay), [1000, 3000, 5000]);
    assert.throws(() => context.window.BleUtils.reconnectDelay(4));
  });
}
