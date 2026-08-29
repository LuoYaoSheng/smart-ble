/**
 * ESP32 演示灯控 Profile（GATT 调试型，无配网 orchestrator）。
 *
 * 用于证明 registry 可接入第二种设备型号：扫描识别 → 通用 GATT 详情。
 * 完整协议见 core/protocols/smart-ble-protocol.ts（TS 正典；此处仅镜像 UUID 常量供 Node/UniApp 共用）。
 */

import { PROFILE_MATCH } from '../../../../core/ble-core/provisioning/profile-contract.js';

export const ESP32_DEMO_PROFILE_ID = 'esp32-demo';

/** 与 smart-ble-protocol.ts PROTOCOL_CONSTANTS 保持一致 */
const ESP32_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const ESP32_CHARACTERISTICS = {
  WRITE: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  NOTIFY: 'beb5483e-36e1-4688-b7f5-ea07361b26a9'
};
const ESP32_DEVICE_NAME = 'BLEToolkit-Server';

export const esp32DemoProfile = {
  id: ESP32_DEMO_PROFILE_ID,
  version: '1',
  displayName: 'ESP32 演示',
  serviceUuid: ESP32_SERVICE_UUID,
  characteristics: {
    WRITE: ESP32_CHARACTERISTICS.WRITE,
    NOTIFY: ESP32_CHARACTERISTICS.NOTIFY
  },
  required: ['WRITE'],
  notify: ['NOTIFY'],
  mtu: 247,
  namePrefix: ESP32_DEVICE_NAME,
  transport: { framing: 'raw' },
  presentation: {
    badge: 'ESP32',
    actionLabel: 'ESP32 调试',
    actionDescription: '连接后使用通用 GATT 读写与通知。'
  },
  model: {
    productLine: 'esp32-demo',
    capabilities: ['gatt-debug'],
    connectedLabel: 'ESP32',
    routes: {
      detail: '/pages/device/detail'
    }
  },
  matchAdvertisement(device) {
    const advertised = (device?.advertisServiceUUIDs || []).map((uuid) => String(uuid).toLowerCase());
    if (advertised.includes(ESP32_SERVICE_UUID)) return PROFILE_MATCH.STRONG;
    const name = String(device?.name || device?.localName || '');
    return name.includes(ESP32_DEVICE_NAME) ? PROFILE_MATCH.WEAK : PROFILE_MATCH.NONE;
  },
  verifyDeviceInfo() {
    return true;
  }
};
