'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function assertUniversal(slices, file) {
  if (!slices.includes('x86_64') || !slices.includes('arm64')) throw new Error(`Native file is not universal (x86_64 + arm64): ${file}`);
}
function slices(file) { return execFileSync('lipo', ['-archs', file], { encoding: 'utf8' }).trim().split(/\s+/); }
function verifyFatPrebuilds(app) {
  const files = walk(path.join(app, 'Contents/Resources/app.asar.unpacked'))
    .filter(file => /\/prebuilds\/darwin-x64\+arm64\/[^/]+\.node$/.test(file));
  // These are the only identical Mach-O files allowed by x64ArchFiles. A thin
  // binary accidentally shipped under this directory must fail the build.
  for (const file of files) assertUniversal(slices(file), file);
  return files;
}
function verifyWindowsMachine(file, architecture) {
  const bytes = fs.readFileSync(file);
  if (bytes.toString('ascii', 0, 2) !== 'MZ') throw new Error(`Missing Windows PE: ${file}`);
  const offset = bytes.readUInt32LE(0x3c);
  if (bytes.toString('ascii', offset, offset + 4) !== 'PE\0\0') throw new Error(`Invalid Windows PE: ${file}`);
  const expected = architecture === 'arm64' ? 0xaa64 : 0x8664;
  if (bytes.readUInt16LE(offset + 4) !== expected) throw new Error(`Wrong Windows executable architecture: ${file}`);
}
function loadBleBinding(executable, resources, platform) {
  const binding = path.join(resources, 'app.asar', 'node_modules', '@abandonware', 'noble', 'lib', platform === 'win32' ? 'win' : 'mac', 'bindings.js');
  const script = `const binding = require(${JSON.stringify(binding)}); if (typeof binding !== 'function') throw new Error('Native BLE binding export is missing'); console.log('Native BLE binding loaded under Electron');`;
  execFileSync(executable, ['-e', script], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', timeout: 30000,
  });
}
function readElfHeader(bytes, file) {
  if (bytes.length < 4 || !bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) return null;
  if (bytes.length < 64) throw new Error(`Truncated ELF header: ${file}`);
  if (bytes[4] !== 2 || bytes[5] !== 1 || bytes[6] !== 1) throw new Error(`Unsupported ELF encoding (requires ELF64 little-endian): ${file}`);
  return { machine: bytes.readUInt16LE(18) };
}
function readFileElf(file) {
  const handle = fs.openSync(file, 'r');
  try {
    const bytes = Buffer.alloc(64);
    const length = fs.readSync(handle, bytes, 0, 64, 0);
    return readElfHeader(bytes.subarray(0, length), file);
  } finally { fs.closeSync(handle); }
}
function verifyLinuxElf(appOutDir, executable, architecture) {
  const machine = { x64: 62, arm64: 183 }[architecture];
  if (!machine) throw new Error(`Unsupported Linux candidate architecture: ${architecture}`);
  const main = readFileElf(executable);
  if (!main || main.machine !== machine) throw new Error(`Wrong Linux executable ELF architecture: ${executable}`);
  const checked = [];
  for (const file of walk(appOutDir).filter(file => /(?:\.node|\.so(?:\.\d+)*)$/.test(file))) {
    const elf = readFileElf(file);
    if (!elf) continue; // PE/Mach-O files are not Linux ELF modules.
    if (elf.machine !== machine) throw new Error(`Wrong Linux native ELF architecture (${elf.machine}, expected ${machine}): ${file}`);
    checked.push(file);
  }
  if (!checked.some(file => file.includes('/@stoprocent/bluetooth-hci-socket/') && file.endsWith('.node'))) throw new Error('Packaged Linux HCI ELF binding is missing');
  console.log(`Linux ELF architecture verified: ${architecture}, main executable + ${checked.length} native modules`);
  return checked;
}
function linuxBleLoadScript(resources, architecture) {
  const root = path.join(resources, 'app.asar', 'node_modules', '@stoprocent', 'bluetooth-hci-socket');
  return `(function () {
    if (process.arch !== ${JSON.stringify(architecture)}) throw new Error('Packaged Electron process architecture mismatch');
    if (!process.versions.electron) throw new Error('Native check must run under Electron');
    const { createRequire } = require('node:module');
    const requireBinding = createRequire(${JSON.stringify(path.join(root, 'package.json'))});
    const nativePath = requireBinding('node-gyp-build').path(${JSON.stringify(root)});
    const binding = requireBinding(nativePath);
    if (typeof binding.BluetoothHciSocket !== 'function') throw new Error('HCI N-API constructor export is missing');
    console.log('Linux HCI N-API binding loaded under Electron; adapter was not initialized');
  })();`;
}
function loadLinuxBleBinding(executable, resources, architecture) {
  execFileSync(executable, ['-e', linuxBleLoadScript(resources, architecture)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', timeout: 30000,
  });
}
module.exports = { walk, slices, assertUniversal, verifyFatPrebuilds, verifyWindowsMachine, loadBleBinding, readElfHeader, verifyLinuxElf, linuxBleLoadScript, loadLinuxBleBinding };
