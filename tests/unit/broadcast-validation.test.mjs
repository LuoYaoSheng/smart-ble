import assert from 'node:assert/strict';
import { validateAppBroadcastStart } from '../../apps/uniapp/services/broadcast/validation.js';

const validPayload = { valid: true, errors: [] };

console.log('[broadcast validation]');
assert.match(validateAppBroadcastStart({ pluginReady: false, deviceName: 'SmartBLE', serviceUuid: 'FFE0', payload: validPayload }), /插件/);
assert.match(validateAppBroadcastStart({ pluginReady: true, deviceName: '', serviceUuid: 'FFE0', payload: validPayload }), /设备名称/);
assert.match(validateAppBroadcastStart({ pluginReady: true, deviceName: 'SmartBLE', serviceUuid: '', payload: validPayload }), /UUID/);
assert.equal(validateAppBroadcastStart({ pluginReady: true, deviceName: 'SmartBLE', serviceUuid: 'FFE0', payload: { valid: false, errors: ['超过 31 字节'] } }), '超过 31 字节');
assert.equal(validateAppBroadcastStart({ pluginReady: true, deviceName: 'SmartBLE', serviceUuid: 'FFE0', payload: validPayload }), '');
console.log('  ✓ validates plugin, required fields, and payload before App broadcast');
