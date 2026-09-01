// tests/target/lib/fake-runtime.mjs
// Fake BLE Platform：ble-runtime 的平台注入缝（setBlePlatformForTesting）的可脚本化假实现。
// 能力：调用日志（顺序断言）、事件注入（found/conn/value/adapter）、故障脚本、连接表。
// 铁律：Fake Runtime 证据等级 E2，不得冒充 E5（docs/target-tests/05）。

export function createFakePlatform(script = {}) {
  const calls = [];
  const log = (m, args) => calls.push({ m, args, t: calls.length });
  const listeners = { found: [], conn: [], value: [], adapter: [] };
  const connections = new Map(); // deviceId -> { services }
  const notifiable = new Set(); // valueKey
  const S = (o) => ({ success: true, ...o });

  const svc = (id, chars) => ({ uuid: id, characteristics: chars.map((c) => (typeof c === 'string' ? { uuid: c } : c)) });

  // 默认服务/特征表：发现与特征查询共用，保证 runtime 校验可通过
  const DEFAULT_SERVICES = [
    svc('4fafc201-1fb5-459e-8fcc-c5c9c331914b', [
      { uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26a8', properties: { read: true, notify: true } },
      { uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26a9', properties: { read: true } },
    ]),
    svc('4fafc201-1fb5-459e-8fcc-c5c9c331914c', [
      { uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26b0', properties: { read: true, write: true, notify: true } },
      { uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26b1', properties: { write: true } },
    ]),
  ];

  const fake = {
    __calls: calls,
    __listeners: listeners,
    __connections: connections,
    __notifiable: notifiable,
    __failNext: {},
    failNext(method, err) { fake.__failNext[method] = err ?? { errMsg: `${method}:fail fake` }; },

    openBluetoothAdapter(o = {}) { log('openAdapter'); return fake.__failNext.openBluetoothAdapter ? (delete fake.__failNext.openBluetoothAdapter, o.fail?.(fake.__failNext.openBluetoothAdapter)) : o.success?.(S({})); },
    closeBluetoothAdapter(o = {}) { log('closeAdapter'); return o.success?.(S({})); },
    startBluetoothDevicesDiscovery(o = {}) { log('startDiscovery', { allowDuplicates: o.allowDuplicates }); return o.success?.(S({})); },
    stopBluetoothDevicesDiscovery(o = {}) { log('stopDiscovery'); return o.success?.(S({})); },
    onBluetoothDeviceFound(cb) { listeners.found.push(cb); },
    onBluetoothAdapterStateChange(cb) { listeners.adapter.push(cb); },
    onBLEConnectionStateChange(cb) { listeners.conn.push(cb); },
    onBLECharacteristicValueChange(cb) { listeners.value.push(cb); },
    createBLEConnection(o = {}) {
      log('connect', { deviceId: o.deviceId });
      if (fake.__failNext.createBLEConnection) { const e = fake.__failNext.createBLEConnection; delete fake.__failNext.createBLEConnection; return o.fail?.(e); }
      connections.set(o.deviceId, { connected: true, services: script.services ?? null });
      setTimeout(() => listeners.conn.some((cb) => cb({ deviceId: o.deviceId, connected: true })), 0);
      return o.success?.(S({ deviceId: o.deviceId }));
    },
    closeBLEConnection(o = {}) {
      log('disconnect', { deviceId: o.deviceId });
      connections.delete(o.deviceId);
      setTimeout(() => listeners.conn.some((cb) => cb({ deviceId: o.deviceId, connected: false })), 0);
      return o.success?.(S({}));
    },
    getBLEDeviceServices(o = {}) {
      log('getServices', { deviceId: o.deviceId });
      if (fake.__failNext.getBLEDeviceServices) { const e = fake.__failNext.getBLEDeviceServices; delete fake.__failNext.getBLEDeviceServices; return o.fail?.(e); }
      const services = script.emptyServices ? [] : (script.services ?? DEFAULT_SERVICES);
      return o.success?.(S({ services }));
    },
    getBLEDeviceCharacteristics(o = {}) {
      log('getCharacteristics', { deviceId: o.deviceId, serviceId: o.serviceId });
      const table = script.services ?? DEFAULT_SERVICES;
      const target = table.find((s) => s.uuid === o.serviceId);
      return o.success?.(S({ characteristics: target ? target.characteristics : table[0].characteristics }));
    },
    readBLECharacteristicValue(o = {}) {
      log('read', { deviceId: o.deviceId, cid: o.characteristicId });
      if (fake.__failNext.readBLECharacteristicValue) { const e = fake.__failNext.readBLECharacteristicValue; delete fake.__failNext.readBLECharacteristicValue; return o.fail?.(e); }
      const value = script.readValue ?? new Uint8Array([0x01]);
      setTimeout(() => listeners.value.some((cb) => cb({ deviceId: o.deviceId, serviceId: o.serviceId, characteristicId: o.characteristicId, value })), 0);
      return o.success?.(S({ value }));
    },
    writeBLECharacteristicValue(o = {}) {
      log('write', { deviceId: o.deviceId, cid: o.characteristicId });
      if (fake.__failNext.writeBLECharacteristicValue) { const e = fake.__failNext.writeBLECharacteristicValue; delete fake.__failNext.writeBLECharacteristicValue; return o.fail?.(e); }
      script.onWrite?.(o);
      return o.success?.(S({}));
    },
    notifyBLECharacteristicValueChange(o = {}) {
      log('notify', { deviceId: o.deviceId, cid: o.characteristicId, state: o.state });
      const key = [o.deviceId, o.serviceId, o.characteristicId].join('|');
      if (o.state) notifiable.add(key); else notifiable.delete(key);
      if (fake.__failNext.notifyBLECharacteristicValueChange) { const e = fake.__failNext.notifyBLECharacteristicValueChange; delete fake.__failNext.notifyBLECharacteristicValueChange; return o.fail?.(e); }
      return o.success?.(S({}));
    },
    setBLEMTU: undefined, // 平台可选能力
  };

  // ---- 事件注入（测试驱动设备侧行为） ----
  fake.emitFound = (device) => listeners.found.forEach((cb) => cb({ devices: [device] }));
  fake.emitConn = (deviceId, connected) => {
    if (connected) connections.set(deviceId, { connected: true }); else connections.delete(deviceId);
    listeners.conn.forEach((cb) => cb({ deviceId, connected }));
  };
  fake.emitValue = (deviceId, serviceId, characteristicId, value) =>
    listeners.value.forEach((cb) => cb({ deviceId, serviceId, characteristicId, value }));
  fake.emitAdapter = (available) => listeners.adapter.forEach((cb) => cb({ available }));

  return fake;
}

/** 断言调用顺序：['startDiscovery','stopDiscovery'] 等子序列匹配 */
export function callSequence(platform) {
  return platform.__calls.map((c) => c.m);
}
