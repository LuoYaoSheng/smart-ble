'use strict';
const path = require('path');
const checks = require('./native-package-checks.cjs');
module.exports = async function verifyNativePack(context) {
  if (context.electronPlatformName === 'darwin') {
    const name = context.packager.appInfo.productFilename;
    const app = path.join(context.appOutDir, name + '.app');
    checks.verifyFatPrebuilds(app);
  } else if (context.electronPlatformName === 'win32') {
    const name = context.packager.appInfo.productFilename;
    const executable = path.join(context.appOutDir, name + '.exe');
    checks.verifyWindowsMachine(executable, context.arch === 3 ? 'arm64' : 'x64');
    checks.loadBleBinding(executable, path.join(context.appOutDir, 'resources'), 'win32');
  }
};
