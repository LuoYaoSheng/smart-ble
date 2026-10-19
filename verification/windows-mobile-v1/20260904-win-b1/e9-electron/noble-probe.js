// Headless probe of @abandonware/noble (same dep+version as our Electron app)
const noble = require('@abandonware/noble');
const log = (...a) => console.log(new Date().toISOString().slice(11,23), ...a);
log('noble loaded, initial state:', noble.state);
noble.on('stateChange', (s) => {
  log('stateChange ->', s);
  if (s === 'poweredOn') { noble.startScanning(); log('startScanning() called'); }
});
noble.on('scanStart', () => log('scanStart event'));
noble.on('scanStop', () => log('scanStop event'));
noble.on('discover', (p) => {
  const name = p.advertisement && p.advertisement.localName || '';
  log('DISCOVER', p.address, name, 'rssi=' + p.rssi);
  if (name.includes('BLEToolkit')) {
    log('TARGET-FOUND', p.address, name);
    noble.stopScanning();
    setTimeout(() => process.exit(0), 500);
  }
});
noble.on('warning', (w) => log('warning:', w.message || w));
setTimeout(() => { log('TIMEOUT-25s, no target found'); process.exit(1); }, 25000);
