/**
 * BLE Connection Discovery — 纯 JS 服务/特征发现与能力建模。
 */

export const DISCOVERY_ERROR = Object.freeze({
  DISCOVERY_TIMEOUT: 'DISCOVERY_TIMEOUT',
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  CHARACTERISTIC_NOT_FOUND: 'CHARACTERISTIC_NOT_FOUND',
  DISCOVERY_FAILED: 'DISCOVERY_FAILED',
});

export const KNOWN_SERVICE_UUIDS = Object.freeze({
  OTA: '4fafc201-1fb5-459e-8fcc-c5c9c331914d',
  MAIN: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  PERMS: '4fafc201-1fb5-459e-8fcc-c5c9c331914c',
  SMART_HID: '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04',
});

const DEFAULT_TIMEOUT_MS = 10000;
const EXPECTED_SERVICE_RETRIES = 3;
const RETRY_DELAY_MS = 400;

function normalizeUuid(value) {
  return String(value || '').replace(/-/g, '').toLowerCase();
}

function sameUuid(a, b) {
  return normalizeUuid(a) === normalizeUuid(b);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createDiscoveryError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = { code, message, ...details };
  return error;
}

function normalizeProperties(properties) {
  if (!properties) return {};
  if (typeof properties === 'string') {
    const flags = {};
    for (const token of properties.split(/[|,]/).map((part) => part.trim().toLowerCase()).filter(Boolean)) {
      flags[token] = true;
    }
    return flags;
  }
  return { ...properties };
}

function hasProperty(properties, name) {
  const props = normalizeProperties(properties);
  if (props[name]) return true;
  if (name === 'write' && (props.writeNoResponse || props.write_no_response)) return true;
  if (name === 'notify' && (props.indicate || props.indication)) return true;
  return false;
}

function normalizeCharacteristic(serviceUuid, characteristic) {
  const properties = normalizeProperties(characteristic.properties);
  return {
    serviceUuid,
    uuid: characteristic.uuid,
    properties,
  };
}

function normalizeService(service, characteristics = []) {
  return {
    uuid: service.uuid,
    characteristics: characteristics.map((characteristic) => normalizeCharacteristic(service.uuid, characteristic)),
  };
}

function sortDiscovery(services) {
  const sorted = [...services].sort((a, b) => normalizeUuid(a.uuid).localeCompare(normalizeUuid(b.uuid)));
  return sorted.map((service) => ({
    ...service,
    characteristics: [...service.characteristics].sort((a, b) => normalizeUuid(a.uuid).localeCompare(normalizeUuid(b.uuid))),
  }));
}

export function buildCapabilityMap(discovery) {
  const capabilities = {
    read: false,
    write: false,
    notify: false,
    ota: false,
    hid: false,
    broadcast: false,
  };

  for (const service of discovery?.services || []) {
    const serviceUuid = normalizeUuid(service.uuid);
    if (sameUuid(service.uuid, KNOWN_SERVICE_UUIDS.OTA)) {
      capabilities.ota = true;
    }
    if (sameUuid(service.uuid, KNOWN_SERVICE_UUIDS.SMART_HID)) {
      capabilities.hid = true;
    }

    for (const characteristic of service.characteristics || []) {
      const props = characteristic.properties || {};
      if (hasProperty(props, 'read')) capabilities.read = true;
      if (hasProperty(props, 'write')) capabilities.write = true;
      if (hasProperty(props, 'notify')) capabilities.notify = true;
    }
  }

  return capabilities;
}

function withTimeout(promise, timeoutMs, code = DISCOVERY_ERROR.DISCOVERY_TIMEOUT) {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(createDiscoveryError(code, 'discovery timed out', { timeoutMs })), timeoutMs);
    }),
  ]);
}

export function createConnectionDiscovery(deps = {}) {
  const callPlatform = deps.callPlatform;
  if (typeof callPlatform !== 'function') {
    throw new Error('callPlatform is required');
  }

  const store = new Map();

  async function discoverCharacteristics(deviceId, service) {
    if (!service?.uuid) {
      throw createDiscoveryError(
        DISCOVERY_ERROR.DISCOVERY_FAILED,
        'service uuid is required for characteristic discovery',
        { deviceId },
      );
    }

    let response;
    try {
      response = await callPlatform('getBLEDeviceCharacteristics', {
        deviceId,
        serviceId: service.uuid,
      });
    } catch (error) {
      throw createDiscoveryError(
        DISCOVERY_ERROR.DISCOVERY_FAILED,
        error?.message || 'characteristic discovery failed',
        { deviceId, serviceUuid: service.uuid, cause: error },
      );
    }

    const characteristics = response?.characteristics || [];
    if (!characteristics.length) {
      throw createDiscoveryError(
        DISCOVERY_ERROR.CHARACTERISTIC_NOT_FOUND,
        `no characteristics found for service ${service.uuid}`,
        { deviceId, serviceUuid: service.uuid },
      );
    }

    return normalizeService(service, characteristics);
  }

  async function discoverServices(deviceId, options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let response;
    try {
      response = await withTimeout(
        callPlatform('getBLEDeviceServices', { deviceId }),
        timeoutMs,
      );
    } catch (error) {
      if (error?.code === DISCOVERY_ERROR.DISCOVERY_TIMEOUT) throw error;
      throw createDiscoveryError(
        DISCOVERY_ERROR.DISCOVERY_FAILED,
        error?.message || 'service discovery failed',
        { deviceId, cause: error },
      );
    }

    const rawServices = response?.services || [];
    if (!rawServices.length) {
      throw createDiscoveryError(
        DISCOVERY_ERROR.SERVICE_NOT_FOUND,
        'no services discovered',
        { deviceId },
      );
    }

    const services = [];
    for (const service of rawServices) {
      services.push(await discoverCharacteristics(deviceId, service));
    }

    return sortDiscovery(services);
  }

  function buildDiscoveryResult(deviceId, services) {
    const sortedServices = sortDiscovery(services);
    const discovery = {
      deviceId,
      services: sortedServices,
      characteristics: sortedServices.flatMap((service) => service.characteristics || []),
      capabilities: buildCapabilityMap({ services: sortedServices }),
      discoveredAt: Date.now(),
    };
    store.set(deviceId, discovery);
    return discovery;
  }

  function finalizeDiscoveryFailure(deviceId, expectedServiceUuid, lastError) {
    if (expectedServiceUuid) {
      throw createDiscoveryError(
        DISCOVERY_ERROR.SERVICE_NOT_FOUND,
        `expected service not found: ${expectedServiceUuid}`,
        { deviceId, expectedServiceUuid, cause: lastError },
      );
    }
    throw lastError || createDiscoveryError(
      DISCOVERY_ERROR.DISCOVERY_FAILED,
      'discovery failed',
      { deviceId },
    );
  }

  async function runDiscovery(deviceId, options = {}) {
    const expectedServiceUuid = options.expectedServiceUuid;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = expectedServiceUuid ? EXPECTED_SERVICE_RETRIES : 1;
    let lastError = null;

    for (let attempt = 0; attempt < retries; attempt += 1) {
      if (attempt > 0) await sleep(RETRY_DELAY_MS);
      try {
        const services = await discoverServices(deviceId, { timeoutMs });
        if (expectedServiceUuid && !services.some((service) => sameUuid(service.uuid, expectedServiceUuid))) {
          throw createDiscoveryError(
            DISCOVERY_ERROR.SERVICE_NOT_FOUND,
            `expected service not found: ${expectedServiceUuid}`,
            { deviceId, expectedServiceUuid },
          );
        }
        return buildDiscoveryResult(deviceId, services);
      } catch (error) {
        lastError = error;
      }
    }

    finalizeDiscoveryFailure(deviceId, expectedServiceUuid, lastError);
  }

  function getCapabilityMap(deviceId) {
    return store.get(deviceId)?.capabilities ?? null;
  }

  function getDiscoveryResult(deviceId) {
    return store.get(deviceId) ?? null;
  }

  function clearDiscovery(deviceId) {
    if (deviceId) {
      store.delete(deviceId);
      return;
    }
    store.clear();
  }

  return {
    discoverServices,
    discoverCharacteristics,
    buildCapabilityMap,
    getCapabilityMap,
    getDiscoveryResult,
    clearDiscovery,
    runDiscovery,
  };
}

export function resetConnectionDiscoveryForTesting(instance) {
  instance?.clearDiscovery?.();
}
