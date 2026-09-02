/**
 * OTA Manager — UniApp 入口：注入 ble-runtime defaultRuntime。
 */

import {
  getSession,
  setMtu,
  setNotifyEnabled,
  subscribe,
  writeValue,
  readValue,
  closeDevice,
  connectDevice,
  setSessionOwner,
  cancelReconnect,
  chunkForMtu,
  OWNER_TYPE,
} from '../services/ble-runtime/index.js';

import {
  OtaManager as OtaManagerCore,
  OTA_UUIDS,
  DEVICE_INFO_UUIDS,
  OTA_STATE,
  parseOtaStatusPayload,
  validateOtaPackage,
  createOtaRuntime,
} from '../services/ota/ota-manager.js';

export {
  OTA_UUIDS,
  DEVICE_INFO_UUIDS,
  OTA_STATE,
  parseOtaStatusPayload,
  validateOtaPackage,
};

export { validateFirmwarePackage } from '../services/ota/package-validator.js';

const defaultRuntime = createOtaRuntime({
  getSession,
  setMtu,
  setNotifyEnabled,
  subscribe,
  writeValue,
  readValue,
  closeDevice,
  connectDevice,
  setSessionOwner,
  cancelReconnect,
  chunkForMtu,
});

export class OtaManager extends OtaManagerCore {
  constructor(deviceId, logCallback, options = {}) {
    super(deviceId, logCallback, {
      ...options,
      runtime: options.runtime || defaultRuntime,
    });
  }
}

export { OWNER_TYPE };
