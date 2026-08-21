export function createFakeBlePlatform() {
  const callbacks = {
    value: null,
    connection: null,
    discovery: null
  };
  const calls = [];
  const servicesByDevice = new Map();
  const charsByDeviceService = new Map();

  const key = (deviceId, serviceId) => `${deviceId}|${String(serviceId).toLowerCase()}`;
  const succeed = (opts, value = {}) => queueMicrotask(() => opts.success?.(value));

  const platform = {
    calls,
    setServices(deviceId, services) {
      servicesByDevice.set(deviceId, services);
    },
    setCharacteristics(deviceId, serviceId, characteristics) {
      charsByDeviceService.set(key(deviceId, serviceId), characteristics);
    },
    emitValue(res) {
      callbacks.value?.(res);
    },
    emitConnection(res) {
      callbacks.connection?.(res);
    },
    emitDiscovery(devices) {
      callbacks.discovery?.({ devices });
    },
    onBLECharacteristicValueChange(cb) {
      callbacks.value = cb;
    },
    onBLEConnectionStateChange(cb) {
      callbacks.connection = cb;
    },
    onBluetoothDeviceFound(cb) {
      callbacks.discovery = cb;
    },
    openBluetoothAdapter(opts) {
      calls.push({ type: 'open-adapter', ...opts });
      succeed(opts);
    },
    startBluetoothDevicesDiscovery(opts) {
      calls.push({ type: 'start-discovery', ...opts });
      succeed(opts);
    },
    stopBluetoothDevicesDiscovery(opts) {
      calls.push({ type: 'stop-discovery', ...opts });
      succeed(opts);
    },
    createBLEConnection(opts) {
      calls.push({ type: 'connect', ...opts });
      succeed(opts);
    },
    closeBLEConnection(opts) {
      calls.push({ type: 'close', ...opts });
      succeed(opts);
    },
    getBLEDeviceServices(opts) {
      calls.push({ type: 'services', ...opts });
      succeed(opts, { services: servicesByDevice.get(opts.deviceId) || [] });
    },
    getBLEDeviceCharacteristics(opts) {
      calls.push({ type: 'characteristics', ...opts });
      succeed(opts, { characteristics: charsByDeviceService.get(key(opts.deviceId, opts.serviceId)) || [] });
    },
    setBLEMTU(opts) {
      calls.push({ type: 'mtu', ...opts });
      succeed(opts, { mtu: opts.mtu });
    },
    notifyBLECharacteristicValueChange(opts) {
      calls.push({ type: 'notify', ...opts });
      succeed(opts);
    },
    readBLECharacteristicValue(opts) {
      calls.push({ type: 'read', ...opts });
      succeed(opts);
    },
    writeBLECharacteristicValue(opts) {
      calls.push({ type: 'write', ...opts });
      succeed(opts);
    }
  };

  return platform;
}
