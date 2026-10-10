'use strict';
const fs = require('fs');
const path = require('path');
const checks = require('./native-package-checks.cjs');
module.exports = async function verifyUniversalPack(context) {
  if (process.platform !== 'darwin' || !context.artifactPaths.some(file => path.basename(file).includes('-universal.'))) return [];
  const directory = path.join(context.outDir, 'mac-universal');
  const apps = fs.readdirSync(directory).filter(name => name.endsWith('.app'));
  if (apps.length !== 1) throw new Error('Expected exactly one universal macOS application');
  const app = path.join(directory, apps[0]);
  const name = path.basename(app, '.app');
  const executable = path.join(app, 'Contents/MacOS', name);
  checks.assertUniversal(checks.slices(executable), executable);
  const nativeFiles = checks.walk(path.join(app, 'Contents/Resources/app.asar.unpacked'))
    .filter(file => file.endsWith('.node') && (!file.includes('/prebuilds/') || file.includes('/prebuilds/darwin')));
  if (!nativeFiles.some(file => file.includes('/@abandonware/noble/'))) throw new Error('Packaged native BLE binding is missing');
  for (const file of nativeFiles) checks.assertUniversal(checks.slices(file), file);
  checks.loadBleBinding(executable, path.join(app, 'Contents/Resources'), 'darwin');
  console.log('Universal application and native modules verified: x86_64 + arm64');
  return [];
};
