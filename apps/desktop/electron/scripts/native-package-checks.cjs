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
module.exports = { walk, slices, assertUniversal, verifyFatPrebuilds, verifyWindowsMachine, loadBleBinding };
