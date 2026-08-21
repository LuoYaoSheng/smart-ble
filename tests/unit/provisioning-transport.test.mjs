import assert from 'node:assert/strict';

import { createFakeBlePlatform } from './ble-fixture.mjs';
import { setBlePlatformForTesting, resetBleRuntimeForTesting } from '../../apps/uniapp/services/ble-runtime/index.js';
import { connect, subscribe } from '../../apps/uniapp/services/provisioning/transport.js';

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
await subscribe(session, INFO, () => { notifications += 1; });
platform.emitValue({ deviceId: 'device-a', serviceId: SERVICE, characteristicId: INFO, value: new ArrayBuffer(0) });
assert.equal(notifications, 1);
console.log('  ✓ notify enable and callback registration are separate');
