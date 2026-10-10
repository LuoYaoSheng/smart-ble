import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const { readElfHeader, verifyLinuxElf, linuxBleLoadScript } = require('../../apps/desktop/electron/scripts/native-package-checks.cjs');
function elf(machine) { const bytes = Buffer.alloc(64); bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1]); bytes.writeUInt16LE(machine, 18); return bytes; }
function tree() {
  const root = mkdtempSync(path.join(tmpdir(), 'smartble-elf-test-'));
  const module = path.join(root, 'resources/app.asar.unpacked/node_modules/@stoprocent/bluetooth-hci-socket/build/Release/bluetooth_hci_socket.node');
  mkdirSync(path.dirname(module), { recursive: true });
  return { root, module, executable: path.join(root, 'smart-ble-open') };
}

test('ELF headers distinguish x64/ARM64 and reject malformed/class/endian headers', () => {
  assert.equal(readElfHeader(elf(62), 'x64').machine, 62);
  assert.equal(readElfHeader(elf(183), 'arm64').machine, 183);
  assert.equal(readElfHeader(Buffer.from('not ELF'), 'text'), null);
  assert.throws(() => readElfHeader(elf(62).subarray(0, 20), 'truncated'), /Truncated/);
  const wrong = elf(183); wrong[4] = 1;
  assert.throws(() => readElfHeader(wrong, 'ELF32'), /requires ELF64/);
  wrong[4] = 2; wrong[5] = 2;
  assert.throws(() => readElfHeader(wrong, 'big-endian'), /little-endian/);
});
for (const [architecture, machine] of [['x64', 62], ['arm64', 183]]) {
  test(`${architecture} checks main and every ELF node/shared library including versioned .so`, () => {
    const files = tree();
    try {
      writeFileSync(files.executable, elf(machine)); writeFileSync(files.module, elf(machine));
      const shared = path.join(files.root, 'libvulkan.so.1'); writeFileSync(shared, elf(machine));
      assert.equal(verifyLinuxElf(files.root, files.executable, architecture).length, 2);
      writeFileSync(shared, elf(machine === 62 ? 183 : 62));
      assert.throws(() => verifyLinuxElf(files.root, files.executable, architecture), /Wrong Linux native ELF/);
      writeFileSync(files.executable, elf(machine === 62 ? 183 : 62));
      assert.throws(() => verifyLinuxElf(files.root, files.executable, architecture), /Wrong Linux executable/);
    } finally { rmSync(files.root, { recursive: true, force: true }); }
  });
}

test('Linux loading checks actual native exports without constructing or initializing HCI', () => {
  let constructed = 0, loaded = null;
  function Socket() { constructed++; throw new Error('Adapter must not be initialized'); }
  const context = vm.createContext({ process: { arch: 'arm64', versions: { electron: '44.7.0' } }, console: { log() {} }, require(name) {
    assert.equal(name, 'node:module');
    return { createRequire() { return name => {
      if (name === 'node-gyp-build') return { path: () => '/actual/hci.node' };
      loaded = name; return { BluetoothHciSocket: Socket };
    }; } };
  } });
  vm.runInContext(linuxBleLoadScript('/pkg/resources', 'arm64'), context);
  assert.equal(loaded, '/actual/hci.node'); assert.equal(constructed, 0);
  assert.throws(() => vm.runInContext(linuxBleLoadScript('/pkg/resources', 'x64'), context), /architecture mismatch/);
});

test('missing HCI module cannot satisfy the package gate', () => {
  const files = tree();
  try {
    writeFileSync(files.executable, elf(62));
    assert.throws(() => verifyLinuxElf(files.root, files.executable, 'x64'), /HCI ELF binding is missing/);
  } finally { rmSync(files.root, { recursive: true, force: true }); }
});

