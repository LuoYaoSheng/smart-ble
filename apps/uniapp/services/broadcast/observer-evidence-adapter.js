/**
 * Observer evidence adapter — maps Observer JSON → Broadcast Evidence.
 * Does not modify Observer firmware parser.
 */

function normalizeHex(value) {
  return String(value || '').replace(/[^0-9a-f]/gi, '').toLowerCase();
}

function normalizeUuid(value) {
  return String(value || '').replace(/-/g, '').toLowerCase();
}

function sameUuid(a, b) {
  if (!a || !b) return false;
  return normalizeUuid(a) === normalizeUuid(b);
}

function utf8ToHex(value) {
  const text = String(value || '');
  let hex = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      hex += code.toString(16).padStart(2, '0');
    } else {
      // Fallback: encode via encodeURIComponent for non-ASCII
      const encoded = encodeURIComponent(text[i]);
      hex += encoded.replace(/%/g, '').toLowerCase();
    }
  }
  return hex;
}

/**
 * @param {object} observerEvent - { type, name, services, manufacturer, rssi, ... }
 * @param {object} broadcastPayload - built payload from payload-builder
 */
export function matchObserverEvidence(observerEvent, broadcastPayload) {
  const event = observerEvent || {};
  const payload = broadcastPayload || {};
  const services = event.services || event.uuids || [];
  const manufacturer = event.manufacturer || event.mfg || '';
  const name = event.name || '';

  const nameMatched = !payload.deviceName
    || name === payload.deviceName
    || String(name).includes(String(payload.deviceName));

  const serviceMatched = !payload.serviceUuid
    || services.some((svc) => sameUuid(svc, payload.serviceUuid));

  let manufacturerMatched = true;
  if (payload.manufacturer?.id != null) {
    const expectedId = Number(payload.manufacturer.id);
    const mfgHex = normalizeHex(manufacturer);
    const idLe = ((expectedId & 0xff).toString(16).padStart(2, '0'))
      + (((expectedId >> 8) & 0xff).toString(16).padStart(2, '0'));
    const idBe = (((expectedId >> 8) & 0xff).toString(16).padStart(2, '0'))
      + ((expectedId & 0xff).toString(16).padStart(2, '0'));
    manufacturerMatched = mfgHex.includes(idLe) || mfgHex.includes(idBe);
    if (payload.manufacturer.data) {
      const dataHex = utf8ToHex(payload.manufacturer.data);
      manufacturerMatched = manufacturerMatched && mfgHex.includes(dataHex);
    }
  }

  const matched = Boolean(
    (event.type === 'advertisement' || event.t === 'obs')
    && nameMatched
    && serviceMatched
    && manufacturerMatched,
  );

  return {
    matched,
    payload: {
      name: payload.deviceName || null,
      serviceUuid: payload.serviceUuid || null,
      manufacturer: payload.manufacturer || null,
    },
    observed: {
      name,
      services,
      manufacturer,
      rssi: event.rssi ?? null,
    },
    rssi: event.rssi ?? null,
    timestamp: event.timestamp ?? event.ts ?? Date.now(),
    checks: {
      nameMatched,
      serviceMatched,
      manufacturerMatched,
    },
  };
}

export function createObserverEvidenceAdapter() {
  return {
    match: matchObserverEvidence,
  };
}
