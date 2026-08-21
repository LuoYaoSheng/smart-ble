/**
 * 通用 Provisioning Profile 契约。
 *
 * 这里不包含 uni-app、Vue 或任何设备家族的业务语义；它只负责校验并登记
 * “一个设备家族如何被发现、如何连接”的最小描述。
 */

export const PROFILE_MATCH = Object.freeze({
  NONE: 0,
  WEAK: 1,
  STRONG: 2
});

const registry = new Map();

const normalizeUuid = (value) => String(value || '').trim().toLowerCase();

function assertFunction(value, field, profileId) {
  if (typeof value !== 'function') {
    throw new Error(`profile ${profileId}: ${field} must be a function`);
  }
}

function normalizeAliases(values, field, profileId) {
  if (!Array.isArray(values)) {
    throw new Error(`profile ${profileId}: ${field} must be an array`);
  }
  return values.map((value) => String(value));
}

/**
 * 校验并登记一个 Provisioning Profile。
 *
 * codec/workflow 在 5A 作为向后兼容的可选能力：已有 Profile 不会因 Runtime
 * 基础设施落地而中断；5B 将把 Smart HID 显式补齐这两组能力。
 */
export function defineProvisioningProfile(input) {
  const id = String(input?.id || '').trim();
  if (!id) throw new Error('profile id is required');
  if (registry.has(id)) throw new Error(`profile ${id} already registered`);

  const serviceUuid = normalizeUuid(input?.serviceUuid || input?.gatt?.serviceUuid);
  if (!serviceUuid) throw new Error(`profile ${id}: serviceUuid is required`);

  const rawCharacteristics = input?.characteristics || input?.gatt?.characteristics || {};
  const characteristics = Object.fromEntries(
    Object.entries(rawCharacteristics).map(([alias, uuid]) => [alias, normalizeUuid(uuid)])
  );
  if (!Object.keys(characteristics).length || Object.values(characteristics).some((uuid) => !uuid)) {
    throw new Error(`profile ${id}: characteristics must contain UUIDs`);
  }

  const required = normalizeAliases(input?.required || input?.gatt?.required || Object.keys(characteristics), 'required', id);
  const notify = normalizeAliases(input?.notify || input?.notifyUuids || input?.gatt?.notify || [], 'notify', id);
  for (const alias of [...required, ...notify]) {
    const isAlias = Object.prototype.hasOwnProperty.call(characteristics, alias);
    const isUuid = Object.values(characteristics).includes(normalizeUuid(alias));
    if (!isAlias && !isUuid) {
      throw new Error(`profile ${id}: required characteristic ${alias} is not declared`);
    }
  }

  const rawMatcher = input?.matchAdvertisement;
  const verifyDeviceInfo = input?.verifyDeviceInfo || (() => true);
  assertFunction(verifyDeviceInfo, 'verifyDeviceInfo', id);
  const matchAdvertisement = rawMatcher
    ? (device) => {
      const result = rawMatcher(device);
      if (!Object.values(PROFILE_MATCH).includes(result)) {
        throw new Error(`profile ${id}: invalid match result ${result}`);
      }
      return result;
    }
    : (device) => {
      const advertised = (device?.advertisServiceUUIDs || []).map(normalizeUuid);
      if (advertised.includes(serviceUuid)) return PROFILE_MATCH.STRONG;
      const name = String(device?.name || device?.localName || '');
      return input?.namePrefix && name.toUpperCase().startsWith(String(input.namePrefix).toUpperCase())
        ? PROFILE_MATCH.WEAK
        : PROFILE_MATCH.NONE;
    };

  const descriptor = {
    id,
    version: String(input?.version || '1'),
    displayName: String(input?.displayName || id),
    serviceUuid,
    characteristics: Object.freeze(characteristics),
    required: Object.freeze(required),
    notify: Object.freeze(notify.map((item) => characteristics[item] || normalizeUuid(item))),
    gatt: Object.freeze({
      serviceUuid,
      characteristics: Object.freeze({ ...characteristics }),
      required: Object.freeze([...required]),
      notify: Object.freeze(notify.map((item) => characteristics[item] || normalizeUuid(item))),
      preferredMtu: Number(input?.mtu || input?.gatt?.preferredMtu || 247)
    }),
    namePrefix: String(input?.namePrefix || ''),
    mtu: Number(input?.mtu || input?.gatt?.preferredMtu || 247),
    transport: Object.freeze({ ...(input?.transport || {}) }),
    codec: input?.codec || null,
    workflow: input?.workflow || null,
    presentation: Object.freeze({
      badge: String(input?.presentation?.badge || input?.displayName || id),
      actionLabel: String(input?.presentation?.actionLabel || input?.displayName || id),
      actionDescription: String(input?.presentation?.actionDescription || '')
    }),
    parseQr: input?.parseQr || null,
    verifyDeviceInfo,
    matchAdvertisement
  };

  if (descriptor.codec) {
    assertFunction(descriptor.codec.parseDeviceInfo, 'codec.parseDeviceInfo', id);
    assertFunction(descriptor.codec.parseStatus, 'codec.parseStatus', id);
    assertFunction(descriptor.codec.buildCandidate, 'codec.buildCandidate', id);
  }
  if (descriptor.workflow) {
    assertFunction(descriptor.workflow.classifyStatus, 'workflow.classifyStatus', id);
    assertFunction(descriptor.workflow.recoveryAction, 'workflow.recoveryAction', id);
  }

  Object.freeze(descriptor.transport);
  Object.freeze(descriptor);
  registry.set(id, descriptor);
  return descriptor;
}

export function getProvisioningProfile(id) {
  return registry.get(id) || null;
}

export function listProvisioningProfiles() {
  return Array.from(registry.values());
}

export function resetProfilesForTesting() {
  registry.clear();
}
