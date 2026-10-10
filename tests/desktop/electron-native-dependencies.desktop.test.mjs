import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const directory = new URL('../../apps/desktop/electron/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', directory), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('package-lock.json', directory), 'utf8'));

test('Linux keeps its native BLE backend using the pinned N-API HCI implementation', () => {
  assert.equal(manifest.devDependencies.electron, '44.7.0');
  assert.equal(manifest.overrides['@abandonware/bluetooth-hci-socket'], 'npm:@stoprocent/bluetooth-hci-socket@2.3.0');
  const sockets = Object.entries(lock.packages).filter(([path]) => path.endsWith('/@abandonware/bluetooth-hci-socket'));
  assert.equal(sockets.length, 1);
  const socket = sockets[0][1];
  assert.equal(socket.name, '@stoprocent/bluetooth-hci-socket');
  assert.equal(socket.version, '2.3.0');
  assert.ok(socket.dependencies['node-addon-api']);
  assert.equal(socket.dependencies.nan, undefined);
  assert.equal(manifest.build.npmRebuild, undefined); // Do not hide compile failures by omitting BLE.
});

test('Windows install scripts resolve the node-gyp version supporting Visual Studio 2026', () => {
  assert.equal(manifest.devDependencies['node-gyp'], '12.4.0');
  assert.equal(manifest.overrides['node-gyp'], '12.4.0');
  const versions = Object.entries(lock.packages).filter(([path]) => path.endsWith('/node-gyp')).map(([, pkg]) => pkg.version);
  assert.ok(versions.length > 0);
  assert.ok(versions.every(version => version === '12.4.0'));
});
