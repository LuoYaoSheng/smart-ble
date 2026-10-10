'use strict';
const path = require('path');
const checks = require('./native-package-checks.cjs');
module.exports = async function verifyNativePack(context) {
  if (context.electronPlatformName === 'darwin') {
    const name = context.packager.appInfo.productFilename;
    const app = path.join(context.appOutDir, name + '.app');
    checks.verifyFatPrebuilds(app);
  } else if (context.electronPlatformName === 'linux') {
    if (context.arch !== 1 && context.arch !== 3) throw new Error('Linux candidate requires x64 or arm64');
    const architecture = context.arch === 3 ? 'arm64' : 'x64';
    const executable = path.join(context.appOutDir, context.packager.executableName);
    checks.verifyLinuxElf(context.appOutDir, executable, architecture);
    checks.loadLinuxBleBinding(executable, path.join(context.appOutDir, 'resources'), architecture);
  } else if (context.electronPlatformName === 'win32') {
    const name = context.packager.appInfo.productFilename;
    const executable = path.join(context.appOutDir, name + '.exe');
    checks.verifyWindowsMachine(executable, context.arch === 3 ? 'arm64' : 'x64');
    checks.loadBleBinding(executable, path.join(context.appOutDir, 'resources'), 'win32');
  }
};
