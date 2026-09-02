// tests/target/firmware/lib/observer-ad-parser.mjs
// JS mirror of hardware/esp32/LightBLE/src/observer_parser.cpp for Fake AD tests.

const MAIN_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const OTA_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
const PERIPHERAL_NAME = 'BLEToolkit-Server';

export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeUuid(value) {
  return String(value || '').replace(/-/g, '').toLowerCase();
}

function uuid16ToString(lo, hi) {
  return ((hi << 8) | lo).toString(16).padStart(4, '0');
}

function uuid128ToString(bytes) {
  const b = bytes;
  const parts = [
    [b[15], b[14], b[13], b[12]],
    [b[11], b[10]],
    [b[9], b[8]],
    [b[7], b[6]],
    [b[5], b[4], b[3], b[2], b[1], b[0]],
  ].map((group) => group.map((x) => x.toString(16).padStart(2, '0')).join(''));
  return `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`;
}

export function parseAdvertisementPayload(data) {
  const bytes = data instanceof Uint8Array ? data : Uint8Array.from(data);
  const parsed = {
    name: '',
    services: [],
    manufacturerHex: '',
    serviceDataHex: '',
    rawHex: bytesToHex(bytes),
    hasCompleteName: false,
    hasShortName: false,
  };

  let i = 0;
  while (i < bytes.length) {
    const fieldLen = bytes[i];
    if (fieldLen === 0) break;
    if (i + 1 + fieldLen > bytes.length) break;
    const type = bytes[i + 1];
    const payload = bytes.subarray(i + 2, i + 1 + fieldLen);
    const payloadLen = payload.length;

    switch (type) {
      case 0x08:
        parsed.hasShortName = true;
        if (!parsed.name) parsed.name = Buffer.from(payload).toString('utf8');
        break;
      case 0x09:
        parsed.hasCompleteName = true;
        parsed.name = Buffer.from(payload).toString('utf8');
        break;
      case 0x02:
      case 0x03:
        for (let j = 0; j + 1 < payloadLen; j += 2) {
          parsed.services.push(uuid16ToString(payload[j], payload[j + 1]));
        }
        break;
      case 0x06:
      case 0x07:
        for (let j = 0; j + 15 < payloadLen; j += 16) {
          parsed.services.push(uuid128ToString(payload.subarray(j, j + 16)));
        }
        break;
      case 0x16:
        if (payloadLen >= 2) parsed.serviceDataHex = bytesToHex(payload);
        break;
      case 0xff:
        parsed.manufacturerHex = bytesToHex(payload);
        break;
      default:
        break;
    }
    i += 1 + fieldLen;
  }
  return parsed;
}

export function matchesPeripheralName(name) {
  return name === PERIPHERAL_NAME || String(name).includes(PERIPHERAL_NAME);
}

export function matchesOtaService(services) {
  const target = normalizeUuid(OTA_UUID);
  return (services || []).some((svc) => normalizeUuid(svc) === target);
}

export function matchesMainService(services) {
  const target = normalizeUuid(MAIN_UUID);
  return (services || []).some((svc) => normalizeUuid(svc) === target);
}

export function computeFixtureMatch(parsed) {
  return matchesPeripheralName(parsed.name) || matchesMainService(parsed.services);
}

export function buildAdvertisementEvent(address, rssi, parsed) {
  const now = Date.now();
  return {
    type: 'advertisement',
    address,
    name: parsed.name,
    rssi,
    services: [...parsed.services],
    manufacturer: parsed.manufacturerHex,
    timestamp: now,
    t: 'obs',
    ts: now,
    uuids: [...parsed.services],
    mfg: parsed.manufacturerHex,
    svc_data: parsed.serviceDataHex,
    raw: parsed.rawHex,
    last_seen: now,
    fixture_match: computeFixtureMatch(parsed),
    ota_service_match: matchesOtaService(parsed.services),
  };
}

/** Encode little-endian 128-bit UUID bytes for AD type 0x07 */
export function encodeUuid128Le(uuid) {
  const hex = normalizeUuid(uuid);
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    out[15 - i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function buildAdStructure(type, payloadBytes) {
  const payload = payloadBytes instanceof Uint8Array ? payloadBytes : Uint8Array.from(payloadBytes);
  const out = new Uint8Array(2 + payload.length);
  out[0] = 1 + payload.length;
  out[1] = type;
  out.set(payload, 2);
  return out;
}

export function concatAds(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export const FIXTURE_UUIDS = { MAIN_UUID, OTA_UUID, PERIPHERAL_NAME };
