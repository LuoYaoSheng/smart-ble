import { utf8Encode } from '../../../core/ble-core/provisioning/framing.js';

function exactArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export function encodeWritePayload(type, data) {
  const source = String(data ?? '');
  if (!source) throw new Error('write payload is empty');

  if (type !== 'hex') return exactArrayBuffer(utf8Encode(source));

  const hex = source.replace(/\s+/g, '');
  if (!hex) throw new Error('HEX payload is empty');
  if (hex.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(hex)) {
    throw new Error('HEX format is invalid');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return exactArrayBuffer(bytes);
}

export function formatDeviceLogExport(logs = []) {
  return logs.map((log) => `[${log.timestamp}] [${log.type}] ${log.message}`).join('\n');
}

export function createNotifyToggleController({ subscribe, disable }) {
  if (typeof subscribe !== 'function' || typeof disable !== 'function') {
    throw new Error('Notify controller requires subscribe and disable functions');
  }

  const entries = new Map();
  const sessionIds = new WeakMap();
  let nextSessionId = 1;

  const keyFor = ({ session, serviceId, characteristicId }) => {
    if (!session || session.dead) throw new Error('Notify requires an active session');
    if (!sessionIds.has(session)) sessionIds.set(session, nextSessionId++);
    return `${sessionIds.get(session)}|${String(serviceId).toLowerCase()}|${String(characteristicId).toLowerCase()}`;
  };

  const disableEntry = async (key, entry) => {
    try {
      await disable(entry.target);
    } finally {
      entry.unsubscribe?.();
      entry.unsubscribe = null;
      entry.enabled = false;
      if (entries.get(key) === entry) entries.delete(key);
    }
    return false;
  };

  const toggle = (target) => {
    const key = keyFor(target);
    let entry = entries.get(key);
    if (!entry) {
      entry = { target, enabled: false, pending: null, unsubscribe: null };
      entries.set(key, entry);
    } else {
      entry.target = target;
    }
    if (entry.pending) return entry.pending;

    const operation = entry.enabled
      ? disableEntry(key, entry)
      : subscribe(target).then((unsubscribe) => {
        entry.unsubscribe = typeof unsubscribe === 'function' ? unsubscribe : () => {};
        entry.enabled = true;
        return true;
      });
    const wrapped = operation.finally(() => {
      if (entry.pending === wrapped) entry.pending = null;
    });
    entry.pending = wrapped;
    return wrapped;
  };

  const dispose = async () => {
    const pending = [...entries.values()].map((entry) => entry.pending).filter(Boolean);
    await Promise.allSettled(pending);
    await Promise.allSettled(
      [...entries.entries()].map(([key, entry]) => entry.enabled
        ? disableEntry(key, entry)
        : Promise.resolve(entries.delete(key)))
    );
  };

  return {
    toggle,
    dispose,
    isPending(target) {
      try {
        return Boolean(entries.get(keyFor(target))?.pending);
      } catch {
        return false;
      }
    },
    get size() {
      return entries.size;
    }
  };
}
