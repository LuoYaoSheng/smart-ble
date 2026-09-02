import {
  PROVISIONING_CONSTANTS,
  SMART_HID_CHARACTERISTIC_UUIDS,
  SMART_HID_NAME_PREFIX,
  SMART_HID_PROVISIONING_SERVICE_UUID,
  buildProvisionCandidateJson,
  parseDeviceInfo,
  parseProvisionStatus,
  parsePairingQrPayload
} from '../../../../core/protocols/hid-provisioning-protocol.ts';
import { PROFILE_MATCH } from '../../../../core/ble-core/provisioning/profile-contract.js';
import { utf8Decode, utf8Encode } from '../../../../core/ble-core/provisioning/framing.js';
import { classifySmartHidStatus, smartHidRecoveryAction } from './workflow.js';

export const SMART_HID_PROFILE_ID = 'smart-hid';

/** Device Profile store — pure engine (avoids TS import cycle). */
export { createDeviceProfileStore } from './workflow-engine.js';

const asText = (value) => typeof value === 'string' ? value : utf8Decode(value);

export const smartHidProfile = {
  id: SMART_HID_PROFILE_ID,
  version: '1',
  displayName: 'Smart HID',
  serviceUuid: SMART_HID_PROVISIONING_SERVICE_UUID,
  characteristics: SMART_HID_CHARACTERISTIC_UUIDS,
  required: ['INFO', 'INPUT', 'STATUS'],
  notify: ['INFO', 'STATUS'],
  mtu: 247,
  namePrefix: SMART_HID_NAME_PREFIX,
  transport: { framing: 'framed-v1' },
  presentation: {
    badge: 'Smart HID',
    actionLabel: 'Smart HID 配网',
    actionDescription: '配置 Wi-Fi 与 ControlHub 地址'
  },
  model: {
    productLine: 'smart-hid',
    capabilities: ['provisioning', 'diagnostics', 'gatt-debug'],
    connectedLabel: 'Smart HID',
    routes: {
      detail: '/pages/hid/detail',
      provision: '/pages/hid/add',
      diagnostics: '/pages/hid/diagnostics',
      history: '/pages/hid/history'
    }
  },
  parseQr: parsePairingQrPayload,
  matchAdvertisement(device) {
    const advertised = (device?.advertisServiceUUIDs || []).map((uuid) => String(uuid).toLowerCase());
    if (advertised.includes(SMART_HID_PROVISIONING_SERVICE_UUID)) return PROFILE_MATCH.STRONG;
    const name = String(device?.name || device?.localName || '');
    return name.toUpperCase().startsWith(SMART_HID_NAME_PREFIX) ? PROFILE_MATCH.WEAK : PROFILE_MATCH.NONE;
  },
  verifyDeviceInfo(info) {
    return Boolean(
      info &&
      info.product === 'smart-hid' &&
      info.protocol === PROVISIONING_CONSTANTS.PROTOCOL_VERSION &&
      PROVISIONING_CONSTANTS.DEVICE_ID_PATTERN.test(info.device_id)
    );
  },
  codec: {
    parseDeviceInfo: (value) => parseDeviceInfo(asText(value)),
    parseStatus: (value) => parseProvisionStatus(asText(value)),
    buildCandidate: (input) => utf8Encode(buildProvisionCandidateJson(input))
  },
  workflow: {
    classifyStatus: classifySmartHidStatus,
    recoveryAction: smartHidRecoveryAction
  }
};
