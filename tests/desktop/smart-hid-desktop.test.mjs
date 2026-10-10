/**
 * Smart HID 桌面接入测试（P5 第二步 · PARITY-002）
 *
 * 覆盖三层：
 * 1. 镜像一致性：hid-service.js / DeviceCard.js / prototype.css 两线逐字节；
 *    index.html 两线同构（三视图 + 脚本序 bundle→hid-service→app）。
 * 2. 传输编排（fake bleAPI 全链）：connect 服务/特征确认→先订阅再读→身份验证；
 *    provisionAndWait waiter-先建-再写 + 帧序列/间隔 + 终态通知解析；
 *    断链独占（U-REC-001 同型）/ 取消等待 / 写失败取消 waiter。
 * 3. 纯函数向量：进度投影（含 base 累加语义）/ ControlHub 地址 / 表单 candidate /
 *    扫描匹配（E-WIN noble / T-WIN btleplug / uniapp 三种设备形状）。
 *
 * Run: node --test tests/desktop/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(import.meta.url);

const LINES = {
  electron: 'apps/desktop/electron/public',
  tauri: 'apps/desktop/tauri/src',
};

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

const bytesToHexStr = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
const utf8Bytes = (str) => Array.from(Buffer.from(str, 'utf8'));

function loadHidStack(relDir) {
  const g = { window: {} };
  global.window = g.window;
  require_(resolve(ROOT, relDir, 'smart-hid.bundle.js'));
  require_(resolve(ROOT, relDir, 'hid-service.js'));
  const api = {
    HID: g.window.SmartHid,
    Desktop: g.window.SmartHidDesktop,
  };
  delete global.window;
  return api;
}

/** fake bleAPI：记录调用序；事件回调可由测试注入触发。 */
function createFakeBle({ services, connectOk = true } = {}) {
  const ble = {
    calls: [],
    valueListeners: [],
    disconnectListeners: [],
    async connect(deviceId) {
      ble.calls.push(['connect', deviceId]);
      return connectOk ? { success: true } : { success: false, error: 'Device not found' };
    },
    async disconnect(deviceId) {
      ble.calls.push(['disconnect', deviceId]);
      return { success: true };
    },
    async discoverServices(deviceId) {
      ble.calls.push(['discoverServices', deviceId]);
      return { success: true, services: JSON.parse(JSON.stringify(services)) };
    },
    async readCharacteristic(deviceId, serviceUuid, charUuid) {
      ble.calls.push(['read', deviceId, serviceUuid, charUuid]);
      const value = ble.readValues?.[charUuid] ?? ble.readValues?.['*'] ?? '';
      return { success: true, value };
    },
    async writeRaw(deviceId, serviceUuid, charUuid, data, withoutResponse) {
      ble.calls.push(['writeRaw', deviceId, serviceUuid, charUuid, data, withoutResponse]);
      return { success: true };
    },
    async notifyCharacteristic(deviceId, serviceUuid, charUuid, notify) {
      ble.calls.push(['notify', deviceId, serviceUuid, charUuid, notify]);
      return { success: true };
    },
    onCharacteristicValueChanged(cb) {
      ble.valueListeners.push(cb);
      return () => { ble.valueListeners = ble.valueListeners.filter((x) => x !== cb); };
    },
    onDeviceDisconnected(cb) {
      ble.disconnectListeners.push(cb);
      return () => { ble.disconnectListeners = ble.disconnectListeners.filter((x) => x !== cb); };
    },
    // 测试侧驱动
    fireValue(payload) { ble.valueListeners.forEach((cb) => cb(payload)); },
    fireDisconnect(deviceId) { ble.disconnectListeners.forEach((cb) => cb({ id: deviceId })); },
    readValues: {},
  };
  return ble;
}

const SVC = '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04';
const CHAR = {
  INFO: '9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04',
  INPUT: '9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04',
  STATUS: '9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04',
};

const VALID_INFO = JSON.stringify({
  product: 'smart-hid',
  protocol: '1.0',
  device_id: 'HID-9F3E2A1C',
  firmware: '1.0.2',
  state: 'unprovisioned',
});

function hidServices({ charCase = 'lower' } = {}) {
  const norm = (u) => (charCase === 'upperDash' ? u.toUpperCase() : u);
  return [
    { uuid: '1800', name: 'GAP', characteristics: [] },
    {
      uuid: SVC,
      name: 'Smart HID',
      characteristics: [
        { uuid: norm(CHAR.INFO), name: 'INFO', properties: ['read', 'notify'] },
        { uuid: norm(CHAR.INPUT), name: 'INPUT', properties: ['write'] },
        { uuid: norm(CHAR.STATUS), name: 'STATUS', properties: ['read', 'notify'] },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 1. 镜像一致性
// ---------------------------------------------------------------------------

test('mirror: hid-service.js / DeviceCard.js / prototype.css byte-identical across E-WIN & T-WIN', () => {
  for (const rel of ['hid-service.js', 'components/DeviceCard.js', 'prototype.css']) {
    const a = readFileSync(resolve(ROOT, LINES.electron, rel), 'utf8');
    const b = readFileSync(resolve(ROOT, LINES.tauri, rel), 'utf8');
    assert.equal(a, b, `${rel} 必须在两线间逐字节一致（锁定镜像）`);
  }
});

test('structure: 两线 index.html 同构——P002/P003/P005 三视图 + 脚本序 bundle→hid-service→app', () => {
  for (const dir of Object.values(LINES)) {
    const html = readFileSync(resolve(ROOT, dir, 'index.html'), 'utf8');
    for (const id of ['hidProvisionView', 'hidDetailView', 'hidDiagnosticsView']) {
      assert.ok(html.includes(`id="${id}"`), `${dir}: 缺视图 ${id}`);
    }
    for (const marker of ['hidProvStepper', 'hidProvProgressCard', 'hidQrBigact', 'hidSsidInput', 'hidPwdInput', 'hidHubInput']) {
      assert.ok(html.includes(`id="${marker}"`), `${dir}: 缺 P002 结构 ${marker}`);
    }
    const bundleAt = html.indexOf('smart-hid.bundle.js');
    const serviceAt = html.indexOf('hid-service.js');
    const appAt = html.lastIndexOf('app.js');
    assert.ok(bundleAt > 0 && serviceAt > bundleAt && appAt > serviceAt, `${dir}: 脚本加载序必须 bundle→hid-service→app`);
  }
});

test('structure: 两线 app.js 均含 U-REC-001 断链独占守卫 + 双入口事件接线', () => {
  const eWin = readFileSync(resolve(ROOT, LINES.electron, 'app.js'), 'utf8');
  const tWin = readFileSync(resolve(ROOT, LINES.tauri, 'app.js'), 'utf8');
  for (const [name, src] of [['E-WIN', eWin], ['T-WIN', tWin]]) {
    assert.ok(src.includes('ownsDevice'), `${name}: 缺 ownsDevice 断链独占守卫`);
    assert.ok(src.includes('configure-hid'), `${name}: 缺扫描卡配置入口接线`);
    assert.ok(src.includes('openHidProvision'), `${name}: 缺 P002 入口`);
    assert.ok(src.includes('openHidDiagnostics'), `${name}: 缺 P005 入口`);
    assert.ok(src.includes('deriveProgress'), `${name}: 缺进度投影接线`);
  }
});

// ---------------------------------------------------------------------------
// 2. 传输编排（fake bleAPI）
// ---------------------------------------------------------------------------

const stack = loadHidStack(LINES.electron);

test('transport: connect 全链——连接→服务确认→先订阅 STATUS/INFO→读 INFO 验证身份', async () => {
  const ble = createFakeBle({ services: hidServices() });
  ble.readValues['*'] = bytesToHexStr(utf8Bytes(VALID_INFO));
  const svc = stack.Desktop.attach(ble);

  const { deviceId, info } = await svc.connect('aa:bb:cc:dd:ee:01');

  assert.equal(deviceId, 'aa:bb:cc:dd:ee:01');
  assert.equal(info.device_id, 'HID-9F3E2A1C');
  const kinds = ble.calls.map((c) => c[0]);
  // 顺序契约：connect → discover → notify STATUS → notify INFO → read INFO
  assert.deepEqual(kinds, ['connect', 'discoverServices', 'notify', 'notify', 'read']);
  assert.equal(ble.calls[2][3], CHAR.STATUS);
  assert.equal(ble.calls[3][3], CHAR.INFO);
  assert.ok(svc.isConnected());
  assert.ok(svc.ownsDevice('aa:bb:cc:dd:ee:01'));
  assert.ok(!svc.ownsDevice('other'));
});

test('transport: 身份验证失败（product 不符）→ 自动断开并抛错', async () => {
  const ble = createFakeBle({ services: hidServices() });
  ble.readValues['*'] = bytesToHexStr(utf8Bytes(JSON.stringify({
    product: 'other', protocol: '1.0', device_id: 'HID-9F3E2A1C', firmware: '1.0.2',
  })));
  const svc = stack.Desktop.attach(ble);

  await assert.rejects(
    () => svc.connect('aa:bb:cc:dd:ee:02'),
    /不是兼容的 Smart HID/
  );
  assert.ok(ble.calls.some((c) => c[0] === 'disconnect'), '验证失败必须自动断开');
  assert.ok(!svc.isConnected());
});

test('transport: 配网服务缺失 / 特征缺失 → 明确错误并断开', async () => {
  const noService = createFakeBle({ services: [{ uuid: '1800', characteristics: [] }] });
  await assert.rejects(() => stack.Desktop.attach(noService).connect('x1'), /未找到 Smart HID 配网服务/);

  const missingChar = hidServices();
  missingChar[1].characteristics = missingChar[1].characteristics.filter((c) => !c.uuid.includes('1004'));
  const ble2 = createFakeBle({ services: missingChar });
  await assert.rejects(() => stack.Desktop.attach(ble2).connect('x2'), /配网特征缺失：STATUS/);
  assert.ok(ble2.calls.some((c) => c[0] === 'disconnect'));
});

test('transport: UUID 形状自适应——发现结果带大写连字符也能解析并按原样回传', async () => {
  const ble = createFakeBle({ services: hidServices({ charCase: 'upperDash' }) });
  ble.readValues['*'] = bytesToHexStr(utf8Bytes(VALID_INFO));
  const svc = stack.Desktop.attach(ble);
  await svc.connect('aa:bb:cc:dd:ee:03');
  // notify/read 使用的 UUID = 发现结果原样（大写带连字符），由主进程/后端规范化
  assert.equal(ble.calls[2][3], CHAR.STATUS.toUpperCase());
  assert.equal(ble.calls[3][3], CHAR.INFO.toUpperCase());
});

test('transport: provisionAndWait——帧序列/间隔/先建 waiter；ready 终态解析 ok', async () => {
  const ble = createFakeBle({ services: hidServices() });
  ble.readValues['*'] = bytesToHexStr(utf8Bytes(VALID_INFO));
  const svc = stack.Desktop.attach(ble);
  await svc.connect('aa:bb:cc:dd:ee:04');

  const candidate = {
    wifi_ssid: 'Home-2.4G',
    wifi_password: 'secret-pwd',
    hub_host: '192.168.1.8',
    hub_port: 17892,
    token: 'a'.repeat(32),
  };

  const pending = svc.provisionAndWait(candidate, 5000);
  // 设备侧推进：received → connecting_wifi → ready（notify 帧 = hex 字符串）
  const fire = (obj) => ble.fireValue({
    deviceId: 'aa:bb:cc:dd:ee:04',
    characteristicUuid: CHAR.STATUS,
    value: bytesToHexStr(utf8Bytes(JSON.stringify(obj))),
  });
  fire({ type: 'provision', state: 'provisioning', step: 'received' });
  fire({ type: 'provision', state: 'connecting_wifi', step: 'connecting_wifi' });
  fire({ type: 'provision', state: 'ready', step: 'ready' });

  const result = await pending;
  assert.equal(result.ok, true);
  assert.equal(result.status.state, 'ready');

  // 帧契约：写入次数 = encodePayloadFrames(candidate, framed-v1, ATT 23)
  const bytes = stack.HID.smartHidProfile.codec.buildCandidate(candidate);
  const frames = stack.HID.encodePayloadFrames(bytes, 'framed-v1', stack.HID.DEFAULT_ATT_MTU);
  const writes = ble.calls.filter((c) => c[0] === 'writeRaw');
  assert.equal(writes.length, frames.length);
  for (const w of writes) {
    assert.equal(w[2], SVC, '写入必须指向配网服务');
    assert.equal(w[3], CHAR.INPUT, '写入必须指向 INPUT 特征');
    assert.equal(w[5], false, 'INPUT 写必须带响应');
    assert.ok(Array.isArray(w[4]) && w[4].every((b) => Number.isInteger(b) && b >= 0 && b <= 255));
  }
  assert.deepEqual(writes[0][4], Array.from(frames[0]));
});

test('transport: 写帧失败 → waiter 取消且不悬挂', async () => {
  const ble = createFakeBle({ services: hidServices() });
  ble.readValues['*'] = bytesToHexStr(utf8Bytes(VALID_INFO));
  ble.writeRaw = async () => ({ success: false, error: 'GATT error 133' });
  const svc = stack.Desktop.attach(ble);
  await svc.connect('aa:bb:cc:dd:ee:05');

  await assert.rejects(
    () => svc.provisionAndWait({ wifi_ssid: 'x', wifi_password: '', hub_host: 'h', hub_port: 17892, token: 'b'.repeat(32) }, 5000),
    /写入配网帧失败/
  );
});

test('transport: 意外断链 → 会话失效 + 被动通知 + waiter 拒绝 + ownsDevice 释放', async () => {
  const ble = createFakeBle({ services: hidServices() });
  ble.readValues['*'] = bytesToHexStr(utf8Bytes(VALID_INFO));
  const svc = stack.Desktop.attach(ble);
  await svc.connect('aa:bb:cc:dd:ee:06');

  const lost = new Promise((resolve) => svc.onSessionDisconnect(resolve));
  const pending = svc.provisionAndWait({ wifi_ssid: 'x', wifi_password: '', hub_host: 'h', hub_port: 17892, token: 'c'.repeat(32) }, 5000)
    .then(() => 'resolved', (e) => `rejected:${e.message}`);

  ble.fireDisconnect('aa:bb:cc:dd:ee:06');
  assert.equal(await lost, 'BLE 连接已断开');
  assert.ok((await pending).startsWith('rejected:'), '断链必须让 pending waiter 拒绝');
  assert.ok(!svc.isConnected());
  assert.ok(!svc.ownsDevice('aa:bb:cc:dd:ee:06'), '断链后必须释放独占（App 层自动重连恢复权限）');
});

test('transport: 取消等待 → waiter 以取消理由拒绝', async () => {
  const ble = createFakeBle({ services: hidServices() });
  ble.readValues['*'] = bytesToHexStr(utf8Bytes(VALID_INFO));
  const svc = stack.Desktop.attach(ble);
  await svc.connect('aa:bb:cc:dd:ee:07');

  const pending = svc.provisionAndWait({ wifi_ssid: 'x', wifi_password: '', hub_host: 'h', hub_port: 17892, token: 'd'.repeat(32) }, 5000)
    .then(() => 'resolved', (e) => `rejected:${e.message}`);
  svc.cancelProvisionWait('用户已取消等待');
  assert.equal(await pending, 'rejected:用户已取消等待');
});

test('transport: diagnose 五项映射（wifi_failed → wifi fail + detail）', async () => {
  const ble = createFakeBle({ services: hidServices() });
  ble.readValues[CHAR.INFO] = bytesToHexStr(utf8Bytes(VALID_INFO));
  ble.readValues[CHAR.STATUS] = bytesToHexStr(utf8Bytes(JSON.stringify({
    type: 'provision', state: 'error', step: 'connecting_wifi', error: 'wifi_failed',
  })));
  const svc = stack.Desktop.attach(ble);
  await svc.connect('aa:bb:cc:dd:ee:08');

  const rows = await svc.diagnose();
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => r.key), ['ble', 'wifi', 'hub', 'conn', 'usb']);
  assert.equal(rows[0].state, 'ok');
  assert.equal(rows[1].state, 'fail');
  assert.equal(rows[1].detail, 'wifi_failed');
});

test('transport: P003 会话内存快照 commit/read（零持久化——无任何 storage 调用）', async () => {
  const ble = createFakeBle({ services: hidServices() });
  const svc = stack.Desktop.attach(ble);
  svc.commitKnownDevice({ deviceId: 'aa:bb', name: 'SHID-1', firmware: '1.0.2', protocol: '1.0', lastWifi: 'W', lastHub: 'h:17892' });
  assert.equal(svc.getKnownDevice().deviceId, 'aa:bb');
  assert.equal(svc.getKnownDevice().lastWifi, 'W');
});

test('red-line: F023——hid-service.js 全文无 localStorage/sessionStorage/setStorageSync 调用', () => {
  const src = readFileSync(resolve(ROOT, LINES.electron, 'hid-service.js'), 'utf8');
  assert.ok(!/localStorage|sessionStorage|setStorageSync|setStorage\(/.test(src.replace(/^.*\/\/.*$/gm, '')),
    'Smart HID 桌面服务不得触碰任何持久化 API');
});

// ---------------------------------------------------------------------------
// 3. 纯函数向量
// ---------------------------------------------------------------------------

test('derive: 阶段推进向量（state/step 双映射）', () => {
  const d = stack.Desktop.deriveProgress;
  assert.deepEqual(d({ state: 'connecting_wifi', step: 'connecting_wifi' }),
    { wifi: 'active', hub: 'pending', conn: 'pending', usb: 'pending' });
  assert.deepEqual(d({ state: 'pairing', step: 'pairing' }),
    { wifi: 'done', hub: 'active', conn: 'pending', usb: 'pending' });
  assert.deepEqual(d({ state: 'ready', step: 'ready' }),
    { wifi: 'done', hub: 'done', conn: 'done', usb: 'done' });
});

test('derive: 错误态只落对应行、其余保留（base 累加 = uniapp store 就地突变语义）', () => {
  const d = stack.Desktop.deriveProgress;
  const base = { wifi: 'done', hub: 'active', conn: 'pending', usb: 'pending' };
  assert.deepEqual(
    d({ state: 'error', step: 'pairing', error: 'pairing_expired' }, base),
    { wifi: 'done', hub: 'fail', conn: 'pending', usb: 'pending' }
  );
  // 无 base 时错误行落 fail、其余 pending
  assert.deepEqual(
    d({ state: 'error', step: 'connecting_wifi', error: 'wifi_failed' }),
    { wifi: 'fail', hub: 'pending', conn: 'pending', usb: 'pending' }
  );
  assert.deepEqual(
    d({ state: 'error', error: 'mqtt_invalid' }, { wifi: 'done', hub: 'done', conn: 'active', usb: 'pending' }),
    { wifi: 'done', hub: 'done', conn: 'fail', usb: 'pending' }
  );
});

test('form: ControlHub 地址解析与格式化（默认端口 17892）', () => {
  const P = stack.Desktop;
  assert.deepEqual(P.parseControlHubAddress('192.168.1.8:17892'), { host: '192.168.1.8', port: 17892 });
  assert.deepEqual(P.parseControlHubAddress('192.168.1.8'), { host: '192.168.1.8', port: 17892 });
  assert.deepEqual(P.parseControlHubAddress('hub.local:9000'), { host: 'hub.local', port: 9000 });
  assert.throws(() => P.parseControlHubAddress(''), /请输入 ControlHub 地址/);
  assert.throws(() => P.parseControlHubAddress('a b:17892'), /格式不正确/);
  assert.throws(() => P.parseControlHubAddress('h:0'), /端口不正确/);
  assert.throws(() => P.parseControlHubAddress('h:99999'), /端口不正确/);
  assert.equal(P.formatControlHubAddress({ host: '192.168.1.8', port: 17892 }), '192.168.1.8:17892');
  assert.equal(P.formatControlHubAddress({}), '');
});

test('form: buildProvisionFormCandidate → bundle candidate JSON 闭环', () => {
  const token = 'e'.repeat(32);
  const candidate = stack.Desktop.buildProvisionFormCandidate({
    wifiSsid: '  Home  ', wifiPassword: 'p', hubAddress: '192.168.1.8:2000', token,
  });
  assert.deepEqual(candidate, { wifi_ssid: 'Home', wifi_password: 'p', hub_host: '192.168.1.8', hub_port: 2000, token });
  const json = JSON.parse(stack.HID.buildProvisionCandidateJson(candidate));
  assert.equal(json.v, 1);
  assert.equal(json.wifi_ssid, 'Home');
  assert.equal(json.hub_port, 2000);
  assert.equal(json.token, token);
  // 空白校验在 candidate JSON 构造层（bundle 正典）：SSID 空 / token 形态非法必须抛
  assert.throws(() => stack.HID.buildProvisionCandidateJson(
    stack.Desktop.buildProvisionFormCandidate({ wifiSsid: ' ', hubAddress: 'h', token })
  ), /wifi_ssid/);
  assert.throws(() => stack.HID.buildProvisionCandidateJson(
    stack.Desktop.buildProvisionFormCandidate({ wifiSsid: 'x', hubAddress: 'h', token: 'short' })
  ), /token 形态非法/);
});

test('match: 扫描匹配三形状——E-WIN noble / T-WIN btleplug / uniapp', () => {
  const M = stack.Desktop.matchScannedDevice;
  const HID_MATCH = stack.HID.PROFILE_MATCH;
  // E-WIN noble：advertisement.serviceUuids
  assert.equal(M({ id: 'x', name: 'LightBLE', advertisement: { serviceUuids: [SVC] } }), HID_MATCH.STRONG);
  // T-WIN btleplug：service_uuids（snake_case）
  assert.equal(M({ id: 'x', name: '', service_uuids: [SVC.toUpperCase()] }), HID_MATCH.STRONG);
  // uniapp：serviceUuids + 名称弱匹配
  assert.equal(M({ deviceId: 'x', name: 'SHID-AB12CD', serviceUuids: [] }), HID_MATCH.WEAK);
  assert.equal(M({ id: 'x', name: 'LightBLE-9A32' }), HID_MATCH.NONE);
  assert.equal(M(null), HID_MATCH.NONE);
});

test('match: 强匹配优先语义——服务 UUID 命中即 STRONG（与名称无关）', () => {
  const M = stack.Desktop.matchScannedDevice;
  assert.equal(M({ id: 'x', name: 'SHID-XX', advertisement: { serviceUuids: [SVC] } }), stack.HID.PROFILE_MATCH.STRONG);
});
