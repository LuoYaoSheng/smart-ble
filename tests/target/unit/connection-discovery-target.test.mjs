// tests/target/unit/connection-discovery-target.test.mjs
// RUNTIME-CONNECTION-DISCOVERY-001：服务/特征发现、能力建模、失败模型。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConnectionDiscovery,
  createDiscoveryError,
  DISCOVERY_ERROR,
  buildCapabilityMap,
  KNOWN_SERVICE_UUIDS,
} from '../../../apps/uniapp/services/ble-runtime/connection-discovery.js';

const MAIN = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const PERMS = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
const OTA = KNOWN_SERVICE_UUIDS.OTA;
const HID = KNOWN_SERVICE_UUIDS.SMART_HID;

const DEFAULT_TABLE = [
  {
    uuid: MAIN,
    characteristics: [
      { uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26a8', properties: { read: true, notify: true } },
    ],
  },
  {
    uuid: PERMS,
    characteristics: [
      { uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26b0', properties: { read: true, write: true, notify: true } },
    ],
  },
];

function createMockPlatform(script = {}) {
  const table = script.services ?? DEFAULT_TABLE;
  const calls = [];
  return {
    calls,
    async callPlatform(method, args) {
      calls.push({ method, args });
      if (script.fail?.[method]) throw script.fail[method];
      if (script.delayMs) await new Promise((r) => setTimeout(r, script.delayMs));
      if (method === 'getBLEDeviceServices') {
        if (script.emptyServices) return { services: [] };
        return { services: table.map((service) => ({ uuid: service.uuid })) };
      }
      if (method === 'getBLEDeviceCharacteristics') {
        const service = table.find((row) => row.uuid === args.serviceId);
        if (script.emptyCharacteristics?.includes(args.serviceId)) return { characteristics: [] };
        return { characteristics: service?.characteristics ?? [] };
      }
      throw new Error(`unexpected platform call: ${method}`);
    },
  };
}

test('1. service discovery success', async () => {
  const platform = createMockPlatform();
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  const services = await discovery.discoverServices('D1');
  assert.equal(services.length, 2);
  assert.ok(platform.calls.some((call) => call.method === 'getBLEDeviceServices'));
});

test('2. characteristic discovery', async () => {
  const platform = createMockPlatform();
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  const service = await discovery.discoverCharacteristics('D1', { uuid: MAIN });
  assert.equal(service.uuid, MAIN);
  assert.equal(service.characteristics.length, 1);
  assert.equal(service.characteristics[0].serviceUuid, MAIN);
});

test('3. empty service', async () => {
  const platform = createMockPlatform({ emptyServices: true });
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  await assert.rejects(
    () => discovery.discoverServices('D1'),
    (error) => error.code === DISCOVERY_ERROR.SERVICE_NOT_FOUND,
  );
});

test('4. missing characteristic', async () => {
  const platform = createMockPlatform({ emptyCharacteristics: [MAIN] });
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  await assert.rejects(
    () => discovery.discoverServices('D1'),
    (error) => error.code === DISCOVERY_ERROR.CHARACTERISTIC_NOT_FOUND,
  );
});

test('5. timeout', async () => {
  const platform = createMockPlatform({ delayMs: 50 });
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  await assert.rejects(
    () => discovery.discoverServices('D1', { timeoutMs: 5 }),
    (error) => error.code === DISCOVERY_ERROR.DISCOVERY_TIMEOUT,
  );
});

test('6. failed adapter', async () => {
  const platform = createMockPlatform({
    fail: { getBLEDeviceServices: new Error('adapter unavailable') },
  });
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  await assert.rejects(
    () => discovery.discoverServices('D1'),
    (error) => error.code === DISCOVERY_ERROR.DISCOVERY_FAILED,
  );
});

test('7. capability build', async () => {
  const platform = createMockPlatform();
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  const result = await discovery.runDiscovery('D1');
  const caps = discovery.buildCapabilityMap(result);
  assert.equal(typeof caps.read, 'boolean');
  assert.equal(typeof caps.write, 'boolean');
  assert.equal(typeof caps.notify, 'boolean');
  assert.equal(typeof caps.ota, 'boolean');
  assert.equal(typeof caps.hid, 'boolean');
  assert.equal(caps.broadcast, false);
});

test('8. read capability', async () => {
  const caps = buildCapabilityMap({
    services: [{ uuid: MAIN, characteristics: [{ uuid: 'c1', properties: { read: true } }] }],
  });
  assert.equal(caps.read, true);
});

test('9. write capability', async () => {
  const caps = buildCapabilityMap({
    services: [{ uuid: PERMS, characteristics: [{ uuid: 'c2', properties: { write: true } }] }],
  });
  assert.equal(caps.write, true);
});

test('10. notify capability', async () => {
  const caps = buildCapabilityMap({
    services: [{ uuid: MAIN, characteristics: [{ uuid: 'c3', properties: { notify: true } }] }],
  });
  assert.equal(caps.notify, true);
});

test('11. OTA capability', async () => {
  const platform = createMockPlatform({
    services: [
      {
        uuid: OTA,
        characteristics: [{ uuid: 'ota-ctrl', properties: { write: true, notify: true } }],
      },
    ],
  });
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  const result = await discovery.runDiscovery('OTA1');
  assert.equal(result.capabilities.ota, true);
});

test('12. HID capability', async () => {
  const platform = createMockPlatform({
    services: [
      {
        uuid: HID,
        characteristics: [{ uuid: 'hid-1', properties: { write: true } }],
      },
    ],
  });
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  const result = await discovery.runDiscovery('HID1');
  assert.equal(result.capabilities.hid, true);
});

test('13. multi-device isolation', async () => {
  const platform = createMockPlatform();
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  await discovery.runDiscovery('A');
  await discovery.runDiscovery('B');
  assert.equal(discovery.getDiscoveryResult('A').deviceId, 'A');
  assert.equal(discovery.getDiscoveryResult('B').deviceId, 'B');
  discovery.clearDiscovery('A');
  assert.equal(discovery.getDiscoveryResult('A'), null);
  assert.ok(discovery.getDiscoveryResult('B'));
});

test('14. clear discovery', async () => {
  const platform = createMockPlatform();
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  await discovery.runDiscovery('C1');
  discovery.clearDiscovery('C1');
  assert.equal(discovery.getDiscoveryResult('C1'), null);
  assert.equal(discovery.getCapabilityMap('C1'), null);
});

test('15. deterministic result', async () => {
  const platform = createMockPlatform({
    services: [
      { uuid: PERMS, characteristics: [{ uuid: 'z-char', properties: { write: true } }] },
      { uuid: MAIN, characteristics: [{ uuid: 'a-char', properties: { read: true } }] },
    ],
  });
  const discovery = createConnectionDiscovery({ callPlatform: platform.callPlatform });
  const first = await discovery.runDiscovery('DET');
  discovery.clearDiscovery('DET');
  const second = await discovery.runDiscovery('DET');
  assert.deepEqual(
    {
      services: first.services.map((service) => ({
        uuid: service.uuid,
        characteristics: service.characteristics.map((characteristic) => characteristic.uuid),
      })),
      capabilities: first.capabilities,
    },
    {
      services: second.services.map((service) => ({
        uuid: service.uuid,
        characteristics: service.characteristics.map((characteristic) => characteristic.uuid),
      })),
      capabilities: second.capabilities,
    },
  );
});

test('discovery error structure', () => {
  const error = createDiscoveryError(DISCOVERY_ERROR.DISCOVERY_FAILED, 'boom', { deviceId: 'X' });
  assert.equal(error.code, DISCOVERY_ERROR.DISCOVERY_FAILED);
  assert.equal(error.details.code, DISCOVERY_ERROR.DISCOVERY_FAILED);
  assert.equal(error.details.deviceId, 'X');
});
