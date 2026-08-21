import assert from 'node:assert/strict';
import { getBlePlatform, resetBlePlatformForTesting, setBlePlatformForTesting } from '../../apps/uniapp/services/ble-runtime/platform.js';

console.log('[ble platform]');
const fallback = { name: 'global-fallback' };
globalThis.uni = fallback;
resetBlePlatformForTesting();
assert.equal(getBlePlatform(), fallback);
const injected = { name: 'test-injected' };
setBlePlatformForTesting(injected);
assert.equal(getBlePlatform(), injected);
resetBlePlatformForTesting();
delete globalThis.uni;
assert.throws(() => getBlePlatform(), /unavailable/);
console.log('  ✓ injected platform wins and missing runtime fails explicitly');
