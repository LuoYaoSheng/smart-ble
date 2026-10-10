import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const directory = new URL('../../apps/desktop/electron/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', directory), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('package-lock.json', directory), 'utf8'));

test('Linux keeps its native BLE backend using the pinned N-API HCI implementation', () => {
  assert.equal(manifest.devDependencies.electron, '44.7.0');
  assert.equal(manifest.overrides['@stoprocent/bluetooth-hci-socket'], '2.3.0');
  const sockets = Object.entries(lock.packages).filter(([path]) => path.endsWith('/@stoprocent/bluetooth-hci-socket'));
  assert.equal(sockets.length, 1);
  const socket = sockets[0][1];
  assert.ok(socket.name === undefined || socket.name === '@stoprocent/bluetooth-hci-socket');
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

test('Linux AppImage product filename is safe while preserving the canonical display brand', () => {
  assert.equal(manifest.build.productName, 'BLE Toolkit+');
  assert.equal(manifest.build.linux.executableName, 'smart-ble-open');
  assert.match(manifest.build.linux.executableName, /^[A-Za-z0-9._ -]+$/);
  assert.equal(manifest.build.artifactName, 'Smart-BLE-Open-${version}-${os}-${arch}.${ext}');
});

test('native install and Electron rebuild scripts run serially with rebuilding enabled', () => {
  const npmrc = readFileSync(new URL('.npmrc', directory), 'utf8');
  assert.match(npmrc, /^foreground-scripts=true$/m);
  assert.equal(manifest.build.nativeRebuilder, 'sequential');
  assert.notEqual(manifest.build.npmRebuild, false);
});

test('Windows setup and portable outputs have distinct target-specific names for each CPU', () => {
  const setup = manifest.build.nsis.artifactName;
  const portable = manifest.build.portable.artifactName;
  assert.equal(setup, 'Smart-BLE-Open-${version}-${os}-${arch}-setup.${ext}');
  assert.equal(portable, 'Smart-BLE-Open-${version}-${os}-${arch}-portable.${ext}');
  for (const arch of ['x64', 'arm64']) {
    const values = { version: manifest.version, os: 'win', arch, ext: 'exe' };
    const expand = pattern => pattern.replace(/\$\{(\w+)\}/g, (_, key) => values[key]);
    assert.notEqual(expand(setup), expand(portable));
    assert.ok(expand(setup).endsWith('-setup.exe'));
    assert.ok(expand(portable).endsWith('-portable.exe'));
  }
});

test('WinRT backend is pinned to the maintained standard C++20 implementation', () => {
  assert.equal(manifest.dependencies['@abandonware/noble'], 'npm:@stoprocent/noble@2.8.0');
  const noble = lock.packages['node_modules/@abandonware/noble'];
  assert.equal(noble.name, '@stoprocent/noble');
  assert.equal(noble.version, '2.8.0');
  assert.ok(noble.dependencies['node-addon-api']);
});

test('universal exceptions cover only fat Darwin native prebuilds and require architecture validation', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { assertUniversal } = require('../../apps/desktop/electron/scripts/native-package-checks.cjs');
  assert.doesNotThrow(() => assertUniversal(['x86_64', 'arm64'], 'real-fat.node'));
  assert.throws(() => assertUniversal(['x86_64'], 'thin.node'), /not universal/);
  assert.throws(() => assertUniversal(['arm64'], 'thin.node'), /not universal/);
  assert.match(manifest.build.mac.x64ArchFiles, /prebuilds\/darwin-x64\+arm64\/\*\.node$/);
  assert.equal(manifest.build.afterPack, 'scripts/verify-native-pack.cjs');
  assert.equal(manifest.build.afterAllArtifactBuild, 'scripts/verify-universal-pack.cjs');
});

test('macOS excludes only the mislabeled unused HCI stub and preserves the real BLE binding', () => {
  assert.deepEqual(manifest.build.mac.files, ['!**/node_modules/@stoprocent/bluetooth-hci-socket/prebuilds/darwin-x64+arm64/@stoprocent+bluetooth-hci-socket.node']);
  assert.equal(manifest.build.mac.x64ArchFiles.includes('@stoprocent/bluetooth-hci-socket'), false);
  assert.equal(manifest.build.mac.x64ArchFiles.includes('@abandonware/noble'), true);
});
