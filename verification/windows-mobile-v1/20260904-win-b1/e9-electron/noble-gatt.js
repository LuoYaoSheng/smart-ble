// Full GATT round via @abandonware/noble (our Electron app's BLE backend), headless
const noble = require('@abandonware/noble');
const TARGET = '10:b4:1d:cd:23:8d';
const WRITE_UUID = 'beb5483e36e14688b7f5ea07361b26b1';
const log = (...a) => console.log(new Date().toISOString().slice(11,23), ...a);
const t0 = Date.now();

noble.on('stateChange', (s) => { if (s === 'poweredOn') noble.startScanning([], false); });
noble.on('discover', (p) => {
  if (p.address !== TARGET) return;
  log('TARGET discovered, name=', p.advertisement.localName, 'rssi=', p.rssi);
  noble.stopScanning();
  p.connect((err) => {
    if (err) { log('CONNECT-FAIL', err.message); process.exit(1); }
    log('CONNECTED after', Date.now()-t0, 'ms');
    p.discoverAllServicesAndCharacteristics((err, services, chars) => {
      if (err) { log('DISCOVER-FAIL', err.message); process.exit(1); }
      log('SERVICES', services.length, 'CHARS', chars.length);
      services.forEach(s => log('  svc', s.uuid));
      const byUuid = {}; chars.forEach(c => byUuid[c.uuid] = c);

      const read2a00 = chars.find(c => c.uuid === '2a00');
      if (read2a00) {
        read2a00.read((err, data) => {
          log('READ 2a00 ->', err ? ('FAIL ' + err.message) : (data ? data.toString('utf8') + ' hex=' + data.toString('hex') : 'null'));
        });
      } else log('READ 2a00: char not found');

      const w = byUuid[WRITE_UUID];
      if (w) {
        w.on('data', (data) => log('NOTIFY-DATA on write char:', data && data.toString('hex')));
        setTimeout(() => {
          w.write(Buffer.from('noble-gatt-write', 'utf8'), false, (err) => {
            log('WRITE 26b1 (noble-gatt-write) ->', err ? ('FAIL ' + err.message) : 'OK');
            const n = chars.find(c => c.properties.includes('notify') && c.uuid !== WRITE_UUID);
            if (n) {
              n.on('data', (data) => log('NOTIFY-DATA', n.uuid, data && data.toString('hex')));
              n.subscribe((err) => log('SUBSCRIBE', n.uuid, '->', err ? ('FAIL ' + err.message) : 'OK'));
              setTimeout(() => {
                p.disconnect(() => { log('DISCONNECTED'); process.exit(0); });
              }, 9000);
            } else {
              log('no separate notify char found');
              setTimeout(() => { p.disconnect(() => { log('DISCONNECTED'); process.exit(0); }); }, 1500);
            }
          });
        }, 1200);
      } else { log('write char not found'); setTimeout(()=>{p.disconnect(()=>process.exit(0));}, 1500); }
    });
  });
});
setTimeout(() => { log('GLOBAL-TIMEOUT-40s'); process.exit(1); }, 40000);
