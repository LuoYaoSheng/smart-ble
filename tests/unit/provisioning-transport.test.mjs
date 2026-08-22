import assert from 'node:assert/strict';

import { createFakeBlePlatform } from './ble-fixture.mjs';
import { setBlePlatformForTesting, resetBleRuntimeForTesting } from '../../apps/uniapp/services/ble-runtime/index.js';
import { connect, subscribe, unsubscribe } from '../../apps/uniapp/services/provisioning/transport.js';

const SERVICE = '11111111-0000-0000-0000-000000000001';
const INFO = '11111111-0000-0000-0000-000000000002';

const platform = createFakeBlePlatform();
platform.setServices('device-a', [{ uuid: SERVICE }]);
platform.setCharacteristics('device-a', SERVICE, [{ uuid: INFO }]);
setBlePlatformForTesting(platform);
resetBleRuntimeForTesting();

console.log('[provisioning transport]');

const session = await connect('device-a', {
  serviceUuid: SERVICE,
  characteristicUuids: [INFO],
  notifyUuids: [INFO]
});

assert.equal(session.deviceId, 'device-a');
assert.equal(platform.calls.filter((call) => call.type === 'notify').length, 1);

let notifications = 0;
const onInfo = () => { notifications += 1; };
await subscribe(session, INFO, onInfo);
assert.equal(platform.calls.filter((call) => call.type === 'notify').length, 1);
platform.emitValue({ deviceId: 'device-a', serviceId: SERVICE, characteristicId: INFO, value: new ArrayBuffer(0) });
assert.equal(notifications, 1);
unsubscribe(onInfo);
platform.emitValue({ deviceId: 'device-a', serviceId: SERVICE, characteristicId: INFO, value: new ArrayBuffer(0) });
assert.equal(notifications, 1);
console.log('  ✓ notify enable and callback registration are separate without enabling twice');

platform.setServices('device-notify-fail', [{ uuid: SERVICE }]);
platform.setCharacteristics('device-notify-fail', SERVICE, [{ uuid: INFO }]);
const originalNotify = platform.notifyBLECharacteristicValueChange;
platform.notifyBLECharacteristicValueChange = (options) => queueMicrotask(() => options.fail?.({ errCode: 10008, errMsg: 'notify failed' }));
await assert.rejects(connect('device-notify-fail', {
  serviceUuid: SERVICE,
  characteristicUuids: [INFO],
  notifyUuids: [INFO]
}), (error) => error.errCode === 10008);
platform.notifyBLECharacteristicValueChange = originalNotify;
assert.ok(platform.calls.some((call) => call.type === 'close' && call.deviceId === 'device-notify-fail'));
console.log('  ✓ notify setup failure closes the half-initialized session');
