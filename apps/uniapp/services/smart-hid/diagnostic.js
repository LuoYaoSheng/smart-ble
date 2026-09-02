/**
 * Smart HID diagnostic runner — connection / discovery / services / characteristics / session.
 */

import { createHidError, HID_ERROR_CODE } from './errors.js';

/**
 * @param {object} [input]
 * @param {object} [input.session] registry or runtime session snapshot
 * @param {object} [input.discovery]
 * @param {Array} [input.services]
 * @param {Array} [input.characteristics]
 * @param {{ connected?: boolean, owner?: object, deviceId?: string }} [input.connection]
 * @returns {{ passed: boolean, items: Array<{ key: string, passed: boolean, detail: string }> }}
 */
export function runDiagnostic(input = {}) {
  const connection = input.connection || {};
  const session = input.session || null;
  const discovery = input.discovery || session?.discovery || null;
  const services = input.services || session?.services || [];
  const characteristics = input.characteristics
    || session?.characteristics
    || flattenChars(services);

  const items = [
    {
      key: 'connection',
      passed: Boolean(connection.connected || session?.connectionState === 'READY' || session?.connectionState === 'CONNECTED'),
      detail: connection.connected || session?.connectionState
        ? `connected (${session?.connectionState || 'ok'})`
        : 'not connected',
    },
    {
      key: 'discovery',
      passed: Boolean(discovery || (Array.isArray(services) && services.length > 0)),
      detail: discovery
        ? 'discovery present'
        : (services.length ? `services=${services.length}` : 'discovery missing'),
    },
    {
      key: 'services',
      passed: Array.isArray(services) && services.length > 0,
      detail: Array.isArray(services) ? `${services.length} service(s)` : 'no services',
    },
    {
      key: 'characteristics',
      passed: Array.isArray(characteristics) && characteristics.length > 0,
      detail: Array.isArray(characteristics)
        ? `${characteristics.length} characteristic(s)`
        : 'no characteristics',
    },
    {
      key: 'session',
      passed: Boolean(session && (session.deviceId || connection.deviceId)),
      detail: session?.deviceId || connection.deviceId
        ? `session ${session?.deviceId || connection.deviceId}`
        : 'no session',
    },
  ];

  return {
    passed: items.every((item) => item.passed),
    items,
  };
}

function flattenChars(services = []) {
  const out = [];
  for (const service of services) {
    for (const characteristic of service.characteristics || []) {
      out.push(characteristic);
    }
  }
  return out;
}

/**
 * Async wrapper for workflow injection (may call BLE reads later).
 */
export async function runDiagnosticAsync(input = {}) {
  if (typeof input.load === 'function') {
    try {
      const loaded = await input.load();
      return runDiagnostic({ ...input, ...loaded });
    } catch (error) {
      throw createHidError(
        HID_ERROR_CODE.HID_TIMEOUT,
        error?.message || 'diagnostic load failed',
        { cause: error?.code || error?.message },
      );
    }
  }
  return runDiagnostic(input);
}
