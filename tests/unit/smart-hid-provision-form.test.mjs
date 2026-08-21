import assert from 'node:assert/strict';

import {
  buildProvisionFormCandidate,
  formatControlHubAddress,
  parseControlHubAddress
} from '../../apps/uniapp/services/smart-hid/provision-form.js';

const run = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[smart hid provision form]');

run('server address defaults to the V1 pairing port', () => {
  assert.deepEqual(parseControlHubAddress('192.168.1.8'), { host: '192.168.1.8', port: 17892 });
  assert.deepEqual(parseControlHubAddress('hub.lan:18888'), { host: 'hub.lan', port: 18888 });
});

run('server address rejects URLs, paths and invalid ports', () => {
  assert.throws(() => parseControlHubAddress(''), /地址/);
  assert.throws(() => parseControlHubAddress('http://hub.lan:17892'), /主机名/);
  assert.throws(() => parseControlHubAddress('hub.lan/path'), /主机名/);
  assert.throws(() => parseControlHubAddress('hub.lan:'), /端口/);
  assert.throws(() => parseControlHubAddress('hub.lan:70000'), /端口/);
});

run('QR address formatting stays editable without exposing token', () => {
  assert.equal(formatControlHubAddress({ host: 'hub.lan', port: 17892 }), 'hub.lan:17892');
  assert.equal(formatControlHubAddress({ host: 'hub.lan', port: 18888, token: 'secret' }), 'hub.lan:18888');
});

run('form candidate keeps the canonical V1 fields', () => {
  assert.deepEqual(buildProvisionFormCandidate({
    wifiSsid: 'Home WiFi',
    wifiPassword: 'do-not-log',
    hubAddress: '192.168.1.8:17892',
    token: '0123456789abcdef0123456789abcdef'
  }), {
    wifi_ssid: 'Home WiFi',
    wifi_password: 'do-not-log',
    hub_host: '192.168.1.8',
    hub_port: 17892,
    token: '0123456789abcdef0123456789abcdef'
  });
});
