import assert from 'node:assert/strict';
import { logger } from '../../core/ble-core/utils/logger.ts';

console.log('[logger]');

logger.clear();
logger.info('A-1', 'device-a');
logger.warn('A-2', 'device-a');
logger.error('B-1', 'device-b');

assert.deepEqual(logger.getHistory('device-a').map(({ message }) => message), ['A-2', 'A-1']);
assert.deepEqual(logger.getHistory('device-b').map(({ message }) => message), ['B-1']);
assert.equal(logger.getHistory().length, 3);
console.log('  ✓ keeps global and per-device history separate');

let delivered = 0;
const unsubscribe = logger.subscribe(() => { delivered += 1; }, 'device-a');
logger.success('A-3', 'device-a');
unsubscribe();
logger.success('A-4', 'device-a');
assert.equal(delivered, 1);
assert.deepEqual(logger.getHistory('device-a').map(({ message }) => message), ['A-4', 'A-3', 'A-2', 'A-1']);
console.log('  ✓ supports listener cleanup while preserving reopen history');

logger.clear('device-a');
assert.deepEqual(logger.getHistory('device-a'), []);
assert.equal(logger.getHistory('device-b').length, 1);
logger.clear();
assert.deepEqual(logger.getHistory(), []);
assert.deepEqual(logger.getHistory('device-b'), []);
console.log('  ✓ clears one device without clearing another, then clears all');

logger.clear();
for (let i = 0; i < 250; i += 1) logger.info(`row-${i}`, 'cap-device');
assert.equal(logger.getHistory('cap-device').length, 200);
console.log('  ✓ caps per-device history at 200 entries');
