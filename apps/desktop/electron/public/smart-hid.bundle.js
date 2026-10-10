//
// SmartBLE Desktop - Smart HID V1 纯逻辑 bundle（PARITY-002 桌面接入 · P5）
//
// uniapp Smart HID 服务层纯逻辑的锁定镜像（E-WIN/T-WIN 共用同一字节），
// 按依赖序单文件合并（模块语法剥离，统一挂 window.SmartHid）：
//   errors → framing → profile-contract → framing-strategies → session-registry
//   → smart-hid/provisioning → diagnostic → workflow-engine → profile
// 源文件逐个对应 apps/uniapp/services/smart-hid/*、core/ble-core/provisioning/*、
// apps/uniapp/services/ble-runtime/session-registry.js；传输/页面编排在桌面层实现。
// 协议正典：Smart-HID-Workspace protocols/ble/PROVISIONING_V1.md；向量：core/protocols/smart-hid-v1-vectors.json。
//
'use strict';
(function (root) {

// ============================================================================
// == 源：apps/uniapp/services/smart-hid/errors.js
// ============================================================================
/**
 * Smart HID error model — unified { code, message, details }.
 */

const HID_ERROR_CODE = Object.freeze({
  HID_DEVICE_NOT_FOUND: 'HID_DEVICE_NOT_FOUND',
  HID_PAIR_FAILED: 'HID_PAIR_FAILED',
  HID_TOKEN_EXPIRED: 'HID_TOKEN_EXPIRED',
  /** QR token lifecycle alias (memory-only 5-minute token). */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  HID_PROFILE_INVALID: 'HID_PROFILE_INVALID',
  HID_SESSION_CONFLICT: 'HID_SESSION_CONFLICT',
  HID_TIMEOUT: 'HID_TIMEOUT',
});

const DEFAULT_MESSAGES = Object.freeze({
  [HID_ERROR_CODE.HID_DEVICE_NOT_FOUND]: 'Smart HID device not found',
  [HID_ERROR_CODE.HID_PAIR_FAILED]: 'Smart HID pairing failed',
  [HID_ERROR_CODE.HID_TOKEN_EXPIRED]: 'Smart HID pairing token expired',
  [HID_ERROR_CODE.TOKEN_EXPIRED]: 'Pairing token expired',
  [HID_ERROR_CODE.HID_PROFILE_INVALID]: 'Smart HID profile invalid',
  [HID_ERROR_CODE.HID_SESSION_CONFLICT]: 'Smart HID session ownership conflict',
  [HID_ERROR_CODE.HID_TIMEOUT]: 'Smart HID operation timed out',
});

/**
 * @param {string} code
 * @param {string} [message]
 * @param {object} [details]
 */
function createHidError(code, message, details = {}) {
  const msg = message || DEFAULT_MESSAGES[code] || code;
  const error = new Error(msg);
  error.code = code;
  error.details = { code, message: msg, ...details };
  return error;
}

function isHidError(error, code) {
  if (!error) return false;
  if (!code) return Boolean(error.code);
  return error.code === code || error.details?.code === code;
}

// ============================================================================
// == 源：core/ble-core/provisioning/framing.js
// ============================================================================
/**
 * 通用 BLE 配网分帧传输（纯逻辑，无 uni.* / 平台依赖）
 *
 * 帧格式（与 Smart-HID-Workspace protocols/ble/PROVISIONING_V1.md §3 一致，
 * 但本模块本身不绑定 Smart HID——任何「大 payload 分多次写特征」的配网
 * 档案都可复用）：
 *
 *   帧 = [seq:u8][total:u8][len:u8][payload:len 字节]
 *
 * 约定：
 *   - seq 从 0 起，顺序递增；total = 总块数（1–MAX_FRAMES）
 *   - 每块 payload ≤ MAX_CHUNK_BYTES；按协商 MTU 切小块同样合法
 *     （设备端不假设单包成功；MTU 23 时每块 17B 也是合法实现）
 *   - 接收方收到 seq=0 视为新传输开始（出错可整体从 0 重发）
 *   - 乱序/跳号由接收方丢弃报错；组装上限 MAX_ASSEMBLED_BYTES
 *
 * @module core/ble-core/provisioning/framing
 */

/** 帧头字节数：seq + total + len */
const FRAME_HEADER_SIZE = 3;

/** 每帧 payload 上限（字节） */
const MAX_CHUNK_BYTES = 128;

/** 组装后的总 payload 上限（字节） */
const MAX_ASSEMBLED_BYTES = 1024;

/** 最大帧数（= ceil(MAX_ASSEMBLED_BYTES / 1B 最小块) 的保护上限） */
const MAX_FRAMES = 64;

/** 默认 ATT MTU（未协商成功时的保守值） */
const DEFAULT_ATT_MTU = 23;

/**
 * 依据协商 MTU 计算安全的每帧 payload 尺寸。
 *
 * ATT write 每次可发 (MTU - 3) 字节，其中 3 字节是帧头，故 payload 上限
 * 为 MTU - 3 - 3；同时不超过协议规定的 MAX_CHUNK_BYTES。
 *
 * @param {number} mtu 协商到的 ATT MTU（未知传 23）
 * @returns {number} 每帧 payload 字节数（≥1）
 */
function chunkSizeForMtu(mtu) {
	const m = Number(mtu);
	if (!Number.isFinite(m) || m < DEFAULT_ATT_MTU) return DEFAULT_ATT_MTU - FRAME_HEADER_SIZE - 3;
	return Math.max(1, Math.min(MAX_CHUNK_BYTES, m - FRAME_HEADER_SIZE - 3));
}

/**
 * 将完整 payload（字节序列）切成帧数组。
 *
 * @param {Uint8Array|number[]} bytes 完整 payload
 * @param {number} chunkSize 每帧 payload 尺寸（建议来自 chunkSizeForMtu）
 * @returns {Uint8Array[]} 帧数组，已带 [seq][total][len] 头
 * @throws {Error} payload 为空 / 超过 MAX_ASSEMBLED_BYTES / 帧数超过 MAX_FRAMES
 */
function buildFrames(bytes, chunkSize) {
	const src = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
	if (src.length === 0) throw new Error('framing: empty payload');
	if (src.length > MAX_ASSEMBLED_BYTES) {
		throw new Error(`framing: payload ${src.length}B exceeds ${MAX_ASSEMBLED_BYTES}B`);
	}
	const chunk = Math.max(1, Math.min(MAX_CHUNK_BYTES, Number(chunkSize) || MAX_CHUNK_BYTES));
	const total = Math.ceil(src.length / chunk);
	if (total > MAX_FRAMES) throw new Error(`framing: needs ${total} frames > ${MAX_FRAMES}`);

	const frames = [];
	for (let seq = 0; seq < total; seq++) {
		const off = seq * chunk;
		const len = Math.min(chunk, src.length - off);
		const frame = new Uint8Array(FRAME_HEADER_SIZE + len);
		frame[0] = seq;
		frame[1] = total;
		frame[2] = len;
		frame.set(src.subarray(off, off + len), FRAME_HEADER_SIZE);
		frames.push(frame);
	}
	return frames;
}

/**
 * 接收侧组装器（测试与桌面端调试用；小程序侧组装发生在设备端）。
 * 语义与固件一致：seq=0 重启；乱序/跳号报错；超上限报错。
 */
class FrameAssembler {
	constructor(maxBytes = MAX_ASSEMBLED_BYTES) {
		this.maxBytes = maxBytes;
		this._buf = null;
		this._expect = 0;
		this._total = 0;
		this._written = 0;
	}

	/** 喂入一帧；完整时返回 Uint8Array，未完整返回 null，非法抛错 */
	feed(frame) {
		const f = frame instanceof Uint8Array ? frame : Uint8Array.from(frame);
		if (f.length < FRAME_HEADER_SIZE) throw new Error('framing: short frame');
		const seq = f[0];
		const total = f[1];
		const len = f[2];
		if (total < 1 || total > MAX_FRAMES) throw new Error(`framing: bad total ${total}`);
		if (f.length !== FRAME_HEADER_SIZE + len) throw new Error('framing: len mismatch');
		if (seq === 0) {
			// 新传输开始（也允许出错后整体从 0 重发）
			this._buf = new Uint8Array(this.maxBytes);
			this._expect = 0;
			this._total = total;
			this._written = 0;
		}
		if (this._buf === null) throw new Error('framing: frame before start (seq!=0)');
		if (seq !== this._expect) throw new Error(`framing: out of order (expect ${this._expect}, got ${seq})`);
		if (this._total !== total) throw new Error('framing: total changed mid-transfer');
		if (this._written + len > this.maxBytes) throw new Error('framing: exceed max bytes');
		this._buf.set(f.subarray(FRAME_HEADER_SIZE), this._written);
		this._written += len;
		this._expect++;
		if (this._expect === this._total) {
			const out = this._buf.subarray(0, this._written);
			this._buf = null;
			return out;
		}
		return null;
	}
}

/**
 * UTF-8 编解码（微信小程序环境无 TextEncoder 保证，手写可移植实现）
 */
function utf8Encode(str) {
	const out = [];
	for (let i = 0; i < str.length; i++) {
		let code = str.codePointAt(i);
		if (code > 0xffff) i++; // 代理对占 2 个 char
		if (code < 0x80) {
			out.push(code);
		} else if (code < 0x800) {
			out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0x10000) {
			out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			out.push(
				0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)
			);
		}
	}
	return Uint8Array.from(out);
}

function utf8Decode(bytes) {
	const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
	let out = '';
	let i = 0;
	while (i < arr.length) {
		const b = arr[i];
		let code = 0;
		if (b < 0x80) {
			code = b; i += 1;
		} else if (b < 0xe0) {
			code = ((b & 0x1f) << 6) | (arr[i + 1] & 0x3f); i += 2;
		} else if (b < 0xf0) {
			code = ((b & 0x0f) << 12) | ((arr[i + 1] & 0x3f) << 6) | (arr[i + 2] & 0x3f); i += 3;
		} else {
			code = ((b & 0x07) << 18) | ((arr[i + 1] & 0x3f) << 12) | ((arr[i + 2] & 0x3f) << 6) | (arr[i + 3] & 0x3f); i += 4;
		}
		out += String.fromCodePoint(code);
	}
	return out;
}

// ============================================================================
// == 源：core/ble-core/provisioning/profile-contract.js
// ============================================================================
/**
 * 通用 Provisioning Profile 契约。
 *
 * 这里不包含 uni-app、Vue 或任何设备家族的业务语义；它只负责校验并登记
 * “一个设备家族如何被发现、如何连接”的最小描述。
 */

const PROFILE_MATCH = Object.freeze({
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

function normalizeModel(input, profileId) {
  const raw = input?.model || {};
  const routes = raw.routes || {};
  return Object.freeze({
    productLine: String(raw.productLine || profileId),
    capabilities: Object.freeze(
      Array.isArray(raw.capabilities) ? raw.capabilities.map(String) : []
    ),
    routes: Object.freeze({
      detail: routes.detail ? String(routes.detail) : '',
      provision: routes.provision ? String(routes.provision) : '',
      diagnostics: routes.diagnostics ? String(routes.diagnostics) : '',
      history: routes.history ? String(routes.history) : ''
    }),
    connectedLabel: String(raw.connectedLabel || '')
  });
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
function defineProvisioningProfile(input) {
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
    model: normalizeModel(input, id),
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

function getProvisioningProfile(id) {
  return registry.get(id) || null;
}

function listProvisioningProfiles() {
  return Array.from(registry.values());
}

function resetProfilesForTesting() {
  registry.clear();
}

// ============================================================================
// == 源：core/ble-core/provisioning/framing-strategies.js
// ============================================================================
/**
 * 通用分帧策略映射。
 *
 * Profile 通过 transport.framing 声明策略名；orchestrator / Profile 服务
 * 按名称取 encode，避免每个设备服务直接 import framing 细节。
 */
const strategies = Object.freeze({
  'framed-v1': {
    name: 'framed-v1',
    encode(bytes, mtu) {
      return buildFrames(bytes, chunkSizeForMtu(mtu));
    }
  },
  raw: {
    name: 'raw',
    encode(bytes) {
      const payload = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
      if (!payload.length) throw new Error('raw framing: empty payload');
      return [payload];
    }
  }
});

function listFramingStrategies() {
  return Object.keys(strategies);
}

function getFramingStrategy(name) {
  const key = String(name || '').trim() || 'framed-v1';
  const strategy = strategies[key];
  if (!strategy) {
    throw new Error(`unknown framing strategy: ${key} (known: ${listFramingStrategies().join(', ')})`);
  }
  return strategy;
}

function encodePayloadFrames(bytes, framingName, mtu) {
  return getFramingStrategy(framingName).encode(bytes, mtu);
}

// ============================================================================
// == 源：apps/uniapp/services/ble-runtime/session-registry.js
// ============================================================================
/**
 * BLE Session Registry — 纯 JS，无 Vue/uni/wx/plus 依赖。
 * 统一管理连接状态、所有权、订阅生命周期与多设备隔离。
 */

const CONNECTION_STATE = Object.freeze({
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCOVERING: 'DISCOVERING',
  READY: 'READY',
  DISCONNECTING: 'DISCONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  FAILED: 'FAILED',
});

const RECONNECT_STATE = Object.freeze({
  NONE: 'NONE',
  SCHEDULED: 'SCHEDULED',
  RECONNECTING: 'RECONNECTING',
  SUCCESS: 'SUCCESS',
  EXHAUSTED: 'EXHAUSTED',
});

const OWNER_TYPE = Object.freeze({
  PAGE: 'PAGE',
  WORKFLOW: 'WORKFLOW',
  BACKGROUND: 'BACKGROUND',
  SYSTEM: 'SYSTEM',
});

const now = () => Date.now();

function subscriptionKey(serviceId, characteristicId) {
  return `${String(serviceId).toLowerCase()}|${String(characteristicId).toLowerCase()}`;
}

function syncSubscriptionCount(session) {
  session.subscription_count = session.subscriptions.filter((entry) => entry.enabled).length;
}

function ownerKey(owner) {
  if (!owner) return '';
  if (typeof owner === 'string') return owner;
  return `${owner.type || ''}:${owner.id || ''}`;
}

function flattenCharacteristics(services = []) {
  const characteristics = [];
  for (const service of services) {
    for (const characteristic of service.characteristics || []) {
      characteristics.push({
        serviceId: service.uuid,
        characteristicId: characteristic.uuid,
        ...characteristic,
      });
    }
  }
  return characteristics;
}

function createEmptySession(deviceId, partial = {}) {
  const ts = now();
  return {
    deviceId,
    deviceInfo: partial.deviceInfo ?? null,
    connectionState: partial.connectionState ?? CONNECTION_STATE.IDLE,
    services: partial.services ?? [],
    characteristics: partial.characteristics ?? flattenCharacteristics(partial.services ?? []),
    discovery: partial.discovery ?? null,
    capabilities: partial.capabilities ?? null,
    subscriptions: [],
    owner: partial.owner ?? null,
    createdAt: partial.createdAt ?? ts,
    updatedAt: partial.updatedAt ?? ts,
    reconnectState: partial.reconnectState ?? RECONNECT_STATE.NONE,
    disconnectReason: partial.disconnectReason ?? null,
    metadata: partial.metadata ? { ...partial.metadata } : {},
    runtime: partial.runtime ?? null,
    borrowRefs: new Set(),
    provisioning: Boolean(partial.provisioning),
    subscription_count: 0,
  };
}

function snapshotSession(session) {
  syncSubscriptionCount(session);
  return {
    deviceId: session.deviceId,
    deviceInfo: session.deviceInfo,
    connectionState: session.connectionState,
    services: session.services,
    characteristics: session.characteristics,
    discovery: session.discovery,
    capabilities: session.capabilities,
    subscriptions: session.subscriptions.map((entry) => ({ ...entry })),
    owner: session.owner,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    reconnectState: session.reconnectState,
    disconnectReason: session.disconnectReason,
    metadata: { ...session.metadata },
    subscription_count: session.subscription_count,
    provisioning: session.provisioning,
  };
}

function createSessionRegistry() {
  const sessions = new Map();
  let nextCallbackId = 1;

  function createSession(deviceOrPartial) {
    const partial = typeof deviceOrPartial === 'string' ? { deviceId: deviceOrPartial } : { ...deviceOrPartial };
    const { deviceId } = partial;
    if (!deviceId) throw new Error('deviceId is required');

    const existing = sessions.get(deviceId);
    if (
      existing
      && existing.connectionState !== CONNECTION_STATE.DISCONNECTED
      && existing.connectionState !== CONNECTION_STATE.FAILED
    ) {
      return existing;
    }

    const session = createEmptySession(deviceId, partial);
    if (partial.services?.length) {
      session.characteristics = flattenCharacteristics(partial.services);
    }
    syncSubscriptionCount(session);
    sessions.set(deviceId, session);
    return session;
  }

  function getSession(deviceId) {
    if (!deviceId) return null;
    return sessions.get(deviceId) ?? null;
  }

  function updateSession(deviceId, patch = {}) {
    const session = sessions.get(deviceId);
    if (!session) return null;

    if (patch.deviceInfo !== undefined) session.deviceInfo = patch.deviceInfo;
    if (patch.connectionState !== undefined) session.connectionState = patch.connectionState;
    if (patch.services !== undefined) {
      session.services = patch.services;
      session.characteristics = flattenCharacteristics(patch.services);
    }
    if (patch.discovery !== undefined) session.discovery = patch.discovery;
    if (patch.capabilities !== undefined) session.capabilities = patch.capabilities;
    if (patch.characteristics !== undefined) session.characteristics = patch.characteristics;
    if (patch.reconnectState !== undefined) session.reconnectState = patch.reconnectState;
    if (patch.disconnectReason !== undefined) session.disconnectReason = patch.disconnectReason;
    if (patch.owner !== undefined) session.owner = patch.owner;
    if (patch.runtime !== undefined) session.runtime = patch.runtime;
    if (patch.provisioning !== undefined) session.provisioning = Boolean(patch.provisioning);
    if (patch.metadata) session.metadata = { ...session.metadata, ...patch.metadata };

    session.updatedAt = now();
    syncSubscriptionCount(session);
    return session;
  }

  function removeSession(deviceId) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.connectionState = CONNECTION_STATE.DISCONNECTED;
    session.subscriptions = [];
    session.borrowRefs.clear();
    session.runtime = null;
    syncSubscriptionCount(session);
    sessions.delete(deviceId);
    return true;
  }

  function listSessions(options = {}) {
    const { excludeProvisioning = false } = options;
    const rows = [];
    for (const session of sessions.values()) {
      if (excludeProvisioning && session.provisioning) continue;
      if (session.connectionState === CONNECTION_STATE.DISCONNECTED) continue;
      rows.push(snapshotSession(session));
    }
    return rows;
  }

  function setOwner(deviceId, owner) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.owner = owner;
    session.updatedAt = now();
    return true;
  }

  function getOwner(deviceId) {
    return sessions.get(deviceId)?.owner ?? null;
  }

  function borrowReference(deviceId, borrower) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.borrowRefs.add(ownerKey(borrower));
    session.updatedAt = now();
    return true;
  }

  function releaseReference(deviceId, borrower) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.borrowRefs.delete(ownerKey(borrower));
    session.updatedAt = now();
    return true;
  }

  function canDisconnect(deviceId, callerOwner) {
    const session = sessions.get(deviceId);
    if (!session) return { allowed: false, reason: 'no_session' };
    if (!callerOwner) return { allowed: false, reason: 'no_owner' };
    if (
      session.owner
      && session.owner.type === callerOwner.type
      && session.owner.id === callerOwner.id
    ) {
      return { allowed: true, mode: 'owner' };
    }
    if (session.borrowRefs.has(ownerKey(callerOwner))) {
      return { allowed: false, action: 'release_only', mode: 'borrow' };
    }
    return { allowed: false, reason: 'not_owner' };
  }

  function addSubscription(deviceId, subscription = {}) {
    const session = sessions.get(deviceId);
    if (!session) return null;

    const entry = {
      serviceId: subscription.serviceId,
      characteristicId: subscription.characteristicId,
      enabled: subscription.enabled !== false,
      callbackId: subscription.callbackId ?? `cb-${nextCallbackId++}`,
      createdAt: subscription.createdAt ?? now(),
    };
    const key = subscriptionKey(entry.serviceId, entry.characteristicId);
    const index = session.subscriptions.findIndex(
      (item) => subscriptionKey(item.serviceId, item.characteristicId) === key,
    );
    if (index >= 0) session.subscriptions[index] = entry;
    else session.subscriptions.push(entry);

    session.updatedAt = now();
    syncSubscriptionCount(session);
    return entry;
  }

  function removeSubscription(deviceId, subscription) {
    const session = sessions.get(deviceId);
    if (!session) return false;

    const before = session.subscriptions.length;
    if (typeof subscription === 'string') {
      session.subscriptions = session.subscriptions.filter((item) => item.callbackId !== subscription);
    } else {
      const key = subscriptionKey(subscription.serviceId, subscription.characteristicId);
      session.subscriptions = session.subscriptions.filter(
        (item) => subscriptionKey(item.serviceId, item.characteristicId) !== key,
      );
    }

    session.updatedAt = now();
    syncSubscriptionCount(session);
    return session.subscriptions.length < before;
  }

  function clearSubscriptions(deviceId) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.subscriptions = [];
    session.updatedAt = now();
    syncSubscriptionCount(session);
    return true;
  }

  function markProvisioning(deviceId, value = true) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.provisioning = Boolean(value);
    session.updatedAt = now();
    return true;
  }

  function isProvisioning(deviceId) {
    return Boolean(sessions.get(deviceId)?.provisioning);
  }

  function exclude(deviceId) {
    return markProvisioning(deviceId, true);
  }

  function registerProvisioning(deviceId, partial = {}) {
    return createSession({ deviceId, ...partial, provisioning: true });
  }

  function reset() {
    sessions.clear();
    nextCallbackId = 1;
  }

  return {
    createSession,
    getSession,
    updateSession,
    removeSession,
    listSessions,
    setOwner,
    getOwner,
    addSubscription,
    removeSubscription,
    clearSubscriptions,
    reset,
    borrowReference,
    releaseReference,
    canDisconnect,
    markProvisioning,
    isProvisioning,
    exclude,
    registerProvisioning,
    snapshot: () => listSessions(),
    CONNECTION_STATE,
    RECONNECT_STATE,
    OWNER_TYPE,
  };
}

let defaultRegistry = null;

function getSessionRegistry() {
  if (!defaultRegistry) defaultRegistry = createSessionRegistry();
  return defaultRegistry;
}

function resetSessionRegistryForTesting() {
  defaultRegistry?.reset();
  defaultRegistry = null;
}

// ============================================================================
// == 源：apps/uniapp/services/smart-hid/provisioning.js
// ============================================================================
/**
 * Smart HID provisioning helpers — state constants + memory-only QR token.
 */
const PROVISION_STATE = Object.freeze({
  IDLE: 'IDLE',
  DISCOVERING: 'DISCOVERING',
  PAIRING: 'PAIRING',
  VERIFYING: 'VERIFYING',
  PROVISIONED: 'PROVISIONED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

const PROVISION_EVENT = Object.freeze({
  discovering: 'discovering',
  pairing: 'pairing',
  verifying: 'verifying',
  success: 'success',
  failed: 'failed',
  cancelled: 'cancelled',
});

/** Pairing QR token lifetime: 5 minutes, memory only. */
const TOKEN_TTL_MS = 5 * 60 * 1000;

const FORBIDDEN_TOKEN_SINKS = Object.freeze([
  'localStorage',
  'sessionStorage',
  'storage',
  'database',
  'uni.setStorageSync',
  'uni.setStorage',
]);

/**
 * In-memory pairing token store. Never persists to disk/storage.
 * @param {{ now?: () => number, ttlMs?: number }} [options]
 */
function createMemoryTokenStore(options = {}) {
  const now = options.now || (() => Date.now());
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : TOKEN_TTL_MS;
  let slot = null;

  function clear() {
    slot = null;
  }

  function create(tokenInput) {
    const token = String(tokenInput || '').trim();
    if (!token) {
      throw createHidError(HID_ERROR_CODE.HID_PROFILE_INVALID, 'pairing token required');
    }
    const createdAt = now();
    slot = {
      token,
      createdAt,
      expiresAt: createdAt + ttlMs,
    };
    return get();
  }

  function get() {
    if (!slot) return null;
    return {
      token: slot.token,
      createdAt: slot.createdAt,
      expiresAt: slot.expiresAt,
    };
  }

  function assertValid() {
    if (!slot) {
      throw createHidError(HID_ERROR_CODE.TOKEN_EXPIRED, 'pairing token missing', {
        reason: 'missing',
      });
    }
    if (now() >= slot.expiresAt) {
      const expired = get();
      clear();
      throw createHidError(HID_ERROR_CODE.TOKEN_EXPIRED, 'pairing token expired', {
        reason: 'expired',
        createdAt: expired.createdAt,
        expiresAt: expired.expiresAt,
        hidCode: HID_ERROR_CODE.HID_TOKEN_EXPIRED,
      });
    }
    return get();
  }

  /** Explicit probe used by tests — confirms no storage API usage. */
  function storagePolicy() {
    return {
      memoryOnly: true,
      forbidden: [...FORBIDDEN_TOKEN_SINKS],
    };
  }

  return {
    create,
    get,
    clear,
    assertValid,
    storagePolicy,
    get ttlMs() {
      return ttlMs;
    },
  };
}

// ============================================================================
// == 源：apps/uniapp/services/smart-hid/diagnostic.js
// ============================================================================
/**
 * Smart HID diagnostic runner — connection / discovery / services / characteristics / session.
 */
/**
 * @param {object} [input]
 * @param {object} [input.session] registry or runtime session snapshot
 * @param {object} [input.discovery]
 * @param {Array} [input.services]
 * @param {Array} [input.characteristics]
 * @param {{ connected?: boolean, owner?: object, deviceId?: string }} [input.connection]
 * @returns {{ passed: boolean, items: Array<{ key: string, passed: boolean, detail: string }> }}
 */
function runDiagnostic(input = {}) {
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
async function runDiagnosticAsync(input = {}) {
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

// ============================================================================
// == 源：apps/uniapp/services/smart-hid/workflow-engine.js
// ============================================================================
/**
 * Smart HID provisioning workflow engine (pure JS — Node-testable).
 * App code may import via workflow.js; tests import this module directly.
 */
const SENSITIVE_PROFILE_KEYS = Object.freeze([
  'token',
  'wifi_password',
  'wifiPassword',
  'password',
  'mqtt',
  'mqttPassword',
  'mqtt_password',
]);

/**
 * Device Profile store (non-sensitive metadata only).
 * Exported via profile.js as well.
 */
function createDeviceProfileStore(options = {}) {
  const clock = options.now || (() => Date.now());
  const profiles = new Map();

  function sanitize(input = {}) {
    const id = String(input.deviceId || '').trim();
    if (!id) {
      throw createHidError(HID_ERROR_CODE.HID_PROFILE_INVALID, 'deviceId required');
    }
    for (const key of SENSITIVE_PROFILE_KEYS) {
      if (input[key] != null && String(input[key]).length > 0) {
        throw createHidError(
          HID_ERROR_CODE.HID_PROFILE_INVALID,
          `refusing to store sensitive field: ${key}`,
          { field: key },
        );
      }
    }
    const existing = profiles.get(id);
    const createdAt = existing?.createdAt || Number(input.createdAt) || clock();
    return {
      deviceId: id,
      name: String(input.name || 'Smart HID'),
      capabilities: Array.isArray(input.capabilities)
        ? [...input.capabilities]
        : (input.capabilities ? [String(input.capabilities)] : []),
      createdAt,
      updatedAt: clock(),
    };
  }

  function saveProfile(input) {
    const profile = sanitize(input);
    profiles.set(profile.deviceId, profile);
    return { ...profile, capabilities: [...profile.capabilities] };
  }

  function getProfile(id) {
    const profile = profiles.get(String(id || '').trim());
    return profile
      ? { ...profile, capabilities: [...profile.capabilities] }
      : null;
  }

  function removeProfile(id) {
    return profiles.delete(String(id || '').trim());
  }

  function listProfiles() {
    return [...profiles.values()].map((p) => ({
      ...p,
      capabilities: [...p.capabilities],
    }));
  }

  function clear() {
    profiles.clear();
  }

  return { saveProfile, getProfile, removeProfile, listProfiles, clear };
}

function classifySmartHidStatus(status) {
  if (!status?.state) return { phase: 'unknown', terminal: false };
  if (status.error) return { phase: 'error', terminal: true, error: status.error };
  if (status.state === 'ready') return { phase: 'ready', terminal: true };
  if (status.state === 'recovery' || status.state === 'error') {
    return { phase: status.state, terminal: true };
  }
  return { phase: status.step || status.state, terminal: false };
}

function smartHidRecoveryAction(status) {
  const code = typeof status === 'string' ? status : status?.error;
  switch (code) {
    case 'wifi_failed':
    case 'invalid_payload':
      return 'form';
    case 'pairing_invalid':
    case 'pairing_expired':
    case 'pairing_used':
    case 'controlhub_unreachable':
      return 'pairing';
    case 'mqtt_invalid':
      return 'diagnostics';
    default:
      return 'retry';
  }
}

function describeSmartHidStatus(status) {
  if (!status) return '配网失败';
  if (status.error) return PROVISIONING_ERROR_HINTS[status.error] || `配网失败：${status.error}`;
  if (status.state === 'recovery') return '设备进入恢复模式，请检查配置后重试';
  return `配网未完成（${status.state || 'unknown'}）`;
}

function createSmartHidStatusWaiters(options = {}) {
  const setTimer = options.setTimer || setTimeout;
  const clearTimer = options.clearTimer || clearTimeout;
  const waiters = new Set();

  const remove = (waiter) => {
    if (!waiters.delete(waiter)) return false;
    clearTimer(waiter.timer);
    return true;
  };

  const waitFor = (predicate, timeoutMs = 60000) => {
    if (typeof predicate !== 'function') throw new Error('status predicate must be a function');
    let waiter;
    const promise = new Promise((resolve, reject) => {
      waiter = { predicate, resolve, reject, timer: null };
      waiter.timer = setTimer(() => {
        if (!remove(waiter)) return;
        reject(new Error(`等待设备状态超时（${timeoutMs}ms）`));
      }, timeoutMs);
      waiters.add(waiter);
    });
    promise.cancel = (reason = '等待已取消') => {
      if (!remove(waiter)) return;
      waiter.reject(new Error(reason));
    };
    promise.catch(() => {});
    return promise;
  };

  const emit = (status) => {
    for (const waiter of [...waiters]) {
      let matched = false;
      try {
        matched = waiter.predicate(status);
      } catch {
        matched = false;
      }
      if (!matched || !remove(waiter)) continue;
      waiter.resolve(status);
    }
  };

  const failAll = (reason) => {
    for (const waiter of [...waiters]) {
      if (!remove(waiter)) continue;
      waiter.reject(new Error(reason));
    }
  };

  return {
    waitFor,
    emit,
    failAll,
    get size() {
      return waiters.size;
    }
  };
}

const WORKFLOW_OWNER = Object.freeze({
  type: OWNER_TYPE.WORKFLOW,
  id: 'smart-hid-provision',
});

function normalizeOwner(owner) {
  if (!owner) return { ...WORKFLOW_OWNER };
  if (typeof owner === 'string') return { type: owner, id: owner };
  return {
    type: owner.type || OWNER_TYPE.WORKFLOW,
    id: owner.id || 'smart-hid-provision',
  };
}

/**
 * Smart HID first-party provisioning workflow.
 *
 * API: startProvision / cancelProvision / getProvisionState / onProvisionEvent
 */
function createSmartHidWorkflow(deps = {}) {
  const now = deps.now || (() => Date.now());
  const sessionRegistry = deps.sessionRegistry || createSessionRegistry();
  const tokenStore = deps.tokenStore || createMemoryTokenStore({ now, ttlMs: deps.tokenTtlMs });
  const profileStore = deps.profileStore || createDeviceProfileStore({ now });
  const workflowOwner = normalizeOwner(deps.owner || WORKFLOW_OWNER);

  const discover = deps.discover || (async (input) => {
    if (!input?.deviceId) {
      throw createHidError(HID_ERROR_CODE.HID_DEVICE_NOT_FOUND, 'deviceId required for discover');
    }
    return { deviceId: input.deviceId, name: input.name || 'Smart HID' };
  });

  const pair = deps.pair || (async (ctx) => ({
    deviceId: ctx.deviceId,
    paired: true,
  }));

  const verify = deps.verify || (async (ctx) => ({
    deviceId: ctx.deviceId,
    verified: true,
    product: 'smart-hid',
  }));

  let state = PROVISION_STATE.IDLE;
  let deviceId = null;
  let lastError = null;
  let lastResult = null;
  let cancelRequested = false;
  let generation = 0;
  const listeners = new Set();

  function snapshot() {
    return {
      state,
      deviceId,
      owner: deviceId ? sessionRegistry.getOwner(deviceId) : null,
      token: tokenStore.get(),
      lastError,
      lastResult,
    };
  }

  function emitEvent(type, payload = {}) {
    const event = { type, state, ...payload, at: now() };
    for (const listener of listeners) {
      try { listener(event); } catch { /* ignore */ }
    }
  }

  function setState(next) {
    state = next;
  }

  function onProvisionEvent(listener) {
    if (typeof listener !== 'function') throw new Error('listener must be a function');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getProvisionState() {
    return state;
  }

  function getToken() {
    return tokenStore.get();
  }

  function getTokenStoragePolicy() {
    return tokenStore.storagePolicy();
  }

  function acquireSession(id, partial = {}) {
    const existing = sessionRegistry.getSession(id);
    if (
      existing?.owner
      && existing.owner.type
      && (existing.owner.type !== workflowOwner.type || existing.owner.id !== workflowOwner.id)
      && existing.connectionState !== CONNECTION_STATE.DISCONNECTED
      && existing.connectionState !== CONNECTION_STATE.FAILED
    ) {
      throw createHidError(
        HID_ERROR_CODE.HID_SESSION_CONFLICT,
        'session owned by another owner',
        { owner: existing.owner, requested: workflowOwner },
      );
    }
    const session = sessionRegistry.registerProvisioning(id, {
      ...partial,
      connectionState: CONNECTION_STATE.CONNECTING,
      owner: workflowOwner,
      provisioning: true,
    });
    sessionRegistry.setOwner(id, workflowOwner);
    sessionRegistry.markProvisioning(id, true);
    return session;
  }

  function releaseOwner(id = deviceId) {
    if (!id) return false;
    const owner = sessionRegistry.getOwner(id);
    if (owner && owner.type === workflowOwner.type && owner.id === workflowOwner.id) {
      sessionRegistry.setOwner(id, null);
    }
    sessionRegistry.markProvisioning(id, false);
    return true;
  }

  function borrowSession(id, borrower) {
    if (!id) return false;
    const pageOwner = typeof borrower === 'string'
      ? { type: OWNER_TYPE.PAGE, id: borrower }
      : (borrower || { type: OWNER_TYPE.PAGE, id: 'page' });
    return sessionRegistry.borrowReference(id, pageOwner);
  }

  function releaseBorrow(id, borrower) {
    if (!id) return false;
    const pageOwner = typeof borrower === 'string'
      ? { type: OWNER_TYPE.PAGE, id: borrower }
      : (borrower || { type: OWNER_TYPE.PAGE, id: 'page' });
    return sessionRegistry.releaseReference(id, pageOwner);
  }

  async function startProvision(input = {}) {
    if (
      state === PROVISION_STATE.DISCOVERING
      || state === PROVISION_STATE.PAIRING
      || state === PROVISION_STATE.VERIFYING
    ) {
      throw createHidError(
        HID_ERROR_CODE.HID_SESSION_CONFLICT,
        'provisioning already in progress',
        { state },
      );
    }

    cancelRequested = false;
    lastError = null;
    lastResult = null;
    const runId = ++generation;

    const tokenValue = input.token || input.pairingToken;
    if (tokenValue) {
      tokenStore.create(tokenValue);
    } else if (!tokenStore.get()) {
      // allow discover-only starts without token when tests inject later
      tokenStore.create(`auto-${now().toString(16).padStart(32, '0').slice(-32)}`);
    }

    try {
      tokenStore.assertValid();

      setState(PROVISION_STATE.DISCOVERING);
      emitEvent(PROVISION_EVENT.discovering, { input });
      if (cancelRequested || runId !== generation) {
        return finalizeCancel();
      }

      const discovered = await discover(input);
      if (!discovered?.deviceId) {
        throw createHidError(HID_ERROR_CODE.HID_DEVICE_NOT_FOUND, 'discover returned no device');
      }
      deviceId = discovered.deviceId;
      acquireSession(deviceId, {
        deviceInfo: discovered,
        connectionState: CONNECTION_STATE.CONNECTING,
      });

      if (cancelRequested || runId !== generation) {
        releaseOwner(deviceId);
        return finalizeCancel();
      }

      setState(PROVISION_STATE.PAIRING);
      emitEvent(PROVISION_EVENT.pairing, { deviceId });
      tokenStore.assertValid();
      sessionRegistry.updateSession(deviceId, { connectionState: CONNECTION_STATE.CONNECTED });
      const paired = await pair({ ...input, ...discovered, deviceId, token: tokenStore.get() });
      if (paired?.paired === false) {
        throw createHidError(HID_ERROR_CODE.HID_PAIR_FAILED, 'pair step returned paired=false');
      }

      if (cancelRequested || runId !== generation) {
        releaseOwner(deviceId);
        return finalizeCancel();
      }

      setState(PROVISION_STATE.VERIFYING);
      emitEvent(PROVISION_EVENT.verifying, { deviceId });
      tokenStore.assertValid();
      sessionRegistry.updateSession(deviceId, { connectionState: CONNECTION_STATE.DISCOVERING });
      const verified = await verify({ ...input, ...discovered, ...paired, deviceId });
      if (verified?.verified === false) {
        throw createHidError(HID_ERROR_CODE.HID_PAIR_FAILED, 'verify step failed');
      }

      if (cancelRequested || runId !== generation) {
        releaseOwner(deviceId);
        return finalizeCancel();
      }

      sessionRegistry.updateSession(deviceId, {
        connectionState: CONNECTION_STATE.READY,
        deviceInfo: { ...(discovered || {}), ...(verified || {}) },
      });

      if (input.saveProfile !== false) {
        profileStore.saveProfile({
          deviceId,
          name: discovered.name || verified?.name || 'Smart HID',
          capabilities: verified?.capabilities || ['provisioning'],
        });
      }

      releaseOwner(deviceId);
      tokenStore.clear();
      setState(PROVISION_STATE.PROVISIONED);
      lastResult = { deviceId, discovered, paired, verified };
      emitEvent(PROVISION_EVENT.success, { deviceId, result: lastResult });
      return snapshot();
    } catch (error) {
      if (cancelRequested || runId !== generation) {
        releaseOwner(deviceId);
        return finalizeCancel();
      }
      const hidError = error?.code
        ? error
        : createHidError(HID_ERROR_CODE.HID_PAIR_FAILED, error?.message || 'provision failed');
      lastError = {
        code: hidError.code,
        message: hidError.message,
        details: hidError.details || { code: hidError.code, message: hidError.message },
      };
      releaseOwner(deviceId);
      tokenStore.clear();
      setState(PROVISION_STATE.FAILED);
      emitEvent(PROVISION_EVENT.failed, { error: lastError, deviceId });
      throw hidError;
    }
  }

  function finalizeCancel() {
    releaseOwner(deviceId);
    tokenStore.clear();
    setState(PROVISION_STATE.CANCELLED);
    emitEvent(PROVISION_EVENT.cancelled, { deviceId });
    return snapshot();
  }

  async function cancelProvision() {
    if (
      state === PROVISION_STATE.IDLE
      || state === PROVISION_STATE.PROVISIONED
      || state === PROVISION_STATE.FAILED
      || state === PROVISION_STATE.CANCELLED
    ) {
      if (state !== PROVISION_STATE.CANCELLED) {
        setState(PROVISION_STATE.CANCELLED);
        emitEvent(PROVISION_EVENT.cancelled, { deviceId });
      }
      tokenStore.clear();
      releaseOwner(deviceId);
      return snapshot();
    }
    cancelRequested = true;
    generation += 1;
    return finalizeCancel();
  }

  function saveProfile(input) {
    return profileStore.saveProfile(input);
  }

  function getProfile(id) {
    return profileStore.getProfile(id);
  }

  function removeProfile(id) {
    return profileStore.removeProfile(id);
  }

  function diagnostic(input = {}) {
    const session = sessionRegistry.getSession(input.deviceId || deviceId);
    return runDiagnostic({
      session: session ? {
        deviceId: session.deviceId,
        connectionState: session.connectionState,
        services: session.services,
        characteristics: session.characteristics,
        discovery: session.discovery,
      } : null,
      connection: {
        connected: Boolean(session && session.connectionState !== CONNECTION_STATE.DISCONNECTED),
        deviceId: session?.deviceId || deviceId,
        owner: session?.owner,
      },
      ...input,
    });
  }

  return {
    startProvision,
    cancelProvision,
    getProvisionState,
    onProvisionEvent,
    getToken,
    getTokenStoragePolicy,
    acquireSession,
    releaseOwner,
    borrowSession,
    releaseBorrow,
    saveProfile,
    getProfile,
    removeProfile,
    runDiagnostic: diagnostic,
    getSessionRegistry: () => sessionRegistry,
    getSnapshot: snapshot,
    WORKFLOW_OWNER: workflowOwner,
  };
}

// ============================================================================
// == 源：_core/protocols/hid-provisioning-protocol.ts（stripTypeScriptTypes 类型剥离）
// ============================================================================
/**
 * Smart HID BLE Provisioning Protocol 公开定义
 *
 * 事实源：Smart-HID-Workspace `protocols/ble/PROVISIONING_V1.md`（canonical）。
 * 本文件是其在 BLE Toolkit+ 侧的镜像定义，两侧同步修改。
 * 历史版本（v1.1，Protocomm endpoint + fe5a UUID + 数字错误码）已废弃，
 * 溯源见 Smart-HID-Workspace docs/archive/03。
 *
 * BLE 只负责：设备发现 / 配网 / 状态查询。
 * HID 实时控制不走 BLE（走 ControlHub HTTP → MQTT → ESP32）。
 *
 * @module Protocols/SmartHID/Provisioning
 */

/* ------------------------------------------------------------------ */
/* GATT 结构（PROVISIONING_V1 §2）                                     */
/* ------------------------------------------------------------------ */

/**
 * Smart HID Provisioning Service UUID（128-bit，广播中携带，可据此过滤扫描）
 */
const SMART_HID_PROVISIONING_SERVICE_UUID = '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'

/**
 * 三个 GATT 特征（UUID 仅末尾一段不同：1002 info / 1003 input / 1004 status）
 */
const SMART_HID_CHARACTERISTIC_UUIDS = {
  /** Device Info：read + notify */
  INFO: '9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04',
  /** Provision Input：write（明文，2026-09-05 V1 简化：无 SMP 配对） */
  INPUT: '9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04',
  /** Provision Status：read + notify */
  STATUS: '9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04'
}         

/**
 * 设备名前缀（Scan Response 广播名形如 SHID-ABCD1234，= device_id 8 位尾码）
 */
const SMART_HID_NAME_PREFIX = 'SHID-'

/* ------------------------------------------------------------------ */
/* 常量                                                                 */
/* ------------------------------------------------------------------ */

const PROVISIONING_CONSTANTS = {
  /** Provision Input JSON 的 v 字段（协议版本，当前仅 1） */
  CANDIDATE_VERSION: 1,
  /** Device Info 中的 protocol 字段 */
  PROTOCOL_VERSION: '1.0',
  /** Device ID 正则（HID- + 8 位大写字母数字） */
  DEVICE_ID_PATTERN: /^HID-[A-Z0-9]{8}$/,
  /** 广播设备名正则（SHID- + 6~8 位） */
  DEVICE_NAME_PATTERN: /^SHID-[A-Z0-9]{6,8}$/,
  /** ControlHub Pairing 默认端口 */
  DEFAULT_PAIRING_PORT: 17892,
  /** Pairing token 形态（32 位小写十六进制） */
  TOKEN_PATTERN: /^[0-9a-f]{32}$/,
  /** 配网 QR URI scheme */
  QR_SCHEME: 'shid://pair'
}         

/* ------------------------------------------------------------------ */
/* Provision Input（一次分帧写入的完整 candidate，PROVISIONING_V1 §4）   */
/* ------------------------------------------------------------------ */

/**
 * 配网候选配置。V1 为**单次写入**（Wi-Fi + hub + token 一个 JSON），
 * 设备侧 stage 到 NVS pending、全链路成功才 promote 为 active——
 * 因此不存在「先写 Wi-Fi 再写 hub」的两段式（那是 v1.1 旧设计）。
 */
                                          
                   
                       
                                   
                  
                     
                   
                                                   
               
 

/** 组装后的 Provision Input JSON 形态 */
                                                                     
      
 

/**
 * 构造并发送用的 candidate JSON 字符串。
 * 校验失败抛 Error（UI 层捕获后提示用户检查输入）。
 */
function buildProvisionCandidateJson(input                         )         {
  const ssid = String(input?.wifi_ssid || '').trim()
  const password = String(input?.wifi_password ?? '')
  const host = String(input?.hub_host || '').trim()
  const token = String(input?.token || '').trim()
  const port = Number(input?.hub_port ?? PROVISIONING_CONSTANTS.DEFAULT_PAIRING_PORT)

  if (!ssid) throw new Error('wifi_ssid 不能为空')
  if (ssid.length > 32) throw new Error('wifi_ssid 超长（≤32 字符）')
  if (password.length > 64) throw new Error('wifi_password 超长（≤64 字符）')
  if (!host) throw new Error('hub_host 不能为空（请检查配对二维码）')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('hub_port 非法')
  if (!PROVISIONING_CONSTANTS.TOKEN_PATTERN.test(token)) throw new Error('token 形态非法（需 32 位十六进制）')

  return JSON.stringify({ v: 1, wifi_ssid: ssid, wifi_password: password, hub_host: host, hub_port: port, token })
}

/* ------------------------------------------------------------------ */
/* 配对 QR（PROVISIONING_V1 §1）                                        */
/* ------------------------------------------------------------------ */

/** QR 解析结果（敏感：token 仅内存持有，不持久化） */
                                   
               
              
              
 

/**
 * 解析 ControlHub 动态配对二维码载荷：
 *   shid://pair?token=<32hex>&host=<hub-lan-ip>&port=<17892>
 *
 * 解析失败返回 null（不抛错，扫码流程按「非 Smart HID 码」处理）。
 */
function parsePairingQrPayload(text        )                          {
  const s = String(text || '').trim()
  const scheme = PROVISIONING_CONSTANTS.QR_SCHEME
  if (s.toLowerCase().indexOf(scheme) !== 0) return null
  const query = s.slice(scheme.length)
  if (query && query[0] !== '?' && query[0] !== '&') return null

  const params                         = {}
  try {
    query.replace(/^[?&]/, '').split('&').forEach((kv) => {
      if (!kv) return
      const eq = kv.indexOf('=')
      if (eq <= 0) return
      const key = decodeURIComponent(kv.slice(0, eq)).toLowerCase()
      if (Object.prototype.hasOwnProperty.call(params, key)) throw new Error('duplicate query parameter')
      params[key] = decodeURIComponent(kv.slice(eq + 1))
    })
  } catch {
    return null
  }

  const token = (params.token || '').toLowerCase()
  const host = (params.host || '').trim()
  if (!PROVISIONING_CONSTANTS.TOKEN_PATTERN.test(token)) return null
  if (!host || /[\s/]/.test(host)) return null
  let port = PROVISIONING_CONSTANTS.DEFAULT_PAIRING_PORT
  if (params.port != null && params.port !== '') {
    const p = Number(params.port)
    if (!Number.isInteger(p) || p < 1 || p > 65535) return null
    port = p
  }
  return { token, host, port }
}

/* ------------------------------------------------------------------ */
/* Device Info / Provision Status（PROVISIONING_V1 §5 §6）              */
/* ------------------------------------------------------------------ */

/** Device Info 特征返回（读 / notify） */
                                     
                 
                  
                   
                  
               
                      
 

/** 设备侧状态机取值（provisioning 组件状态） */
const PROVISIONING_STATES = [
  'boot', 'load_config', 'unprovisioned', 'provisioning', 'connecting_wifi',
  'pairing', 'mqtt_connecting', 'ready', 'recovery', 'error'
]         
                                                                    

/** 配网过渡步骤取值 */
const PROVISIONING_STEPS = [
  'received', 'connecting_wifi', 'wifi_connected', 'pairing',
  'pairing_success', 'mqtt_connecting', 'ready'
]         
                                                                  

/** Provision Status 特征返回（读 / notify） */
                                          
               
              
                      
 

/** 解析 Device Info JSON（防御式；非法返回 null） */
function parseDeviceInfo(text        )                            {
  try {
    const o = JSON.parse(String(text || ''))
    if (!o || typeof o !== 'object') return null
    if (typeof o.device_id !== 'string' || !o.device_id) return null
    return {
      product: String(o.product || ''),
      protocol: String(o.protocol || ''),
      device_id: o.device_id,
      firmware: String(o.firmware || ''),
      state: String(o.state || ''),
      provisioned: Boolean(o.provisioned)
    }
  } catch {
    return null
  }
}

/** 解析 Provision Status JSON（防御式；非法返回 null） */
function parseProvisionStatus(text        )                                 {
  try {
    const o = JSON.parse(String(text || ''))
    if (!o || typeof o !== 'object') return null
    return {
      state: String(o.state || ''),
      step: String(o.step || ''),
      error: o.error == null ? null : String(o.error)
    }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* 错误码（PROVISIONING_V1 §6，字符串，稳定勿改；可扩展新码）            */
/* ------------------------------------------------------------------ */

const PROVISIONING_ERROR_CODES = {
  INVALID_PAYLOAD: 'invalid_payload',
  WIFI_FAILED: 'wifi_failed',
  CONTROLHUB_UNREACHABLE: 'controlhub_unreachable',
  PAIRING_INVALID: 'pairing_invalid',
  PAIRING_EXPIRED: 'pairing_expired',
  PAIRING_USED: 'pairing_used',
  MQTT_INVALID: 'mqtt_invalid',
  STORAGE_FAILED: 'storage_failed'
}         
                                                                                                            

/** 错误码 → 客户端提示（PROVISIONING_V1 §6 表；新增档案可扩展自己的码表） */
const PROVISIONING_ERROR_HINTS                         = {
  [PROVISIONING_ERROR_CODES.INVALID_PAYLOAD]: '配置内容非法，请检查输入',
  [PROVISIONING_ERROR_CODES.WIFI_FAILED]: 'Wi-Fi 连接失败，请检查 SSID / 密码',
  [PROVISIONING_ERROR_CODES.CONTROLHUB_UNREACHABLE]: '连不上 ControlHub，请确认它在运行、地址可达',
  [PROVISIONING_ERROR_CODES.PAIRING_INVALID]: '配对码无效，请重新扫码',
  [PROVISIONING_ERROR_CODES.PAIRING_EXPIRED]: '配对码已过期，请重新扫码',
  [PROVISIONING_ERROR_CODES.PAIRING_USED]: '配对码已被使用，请重新扫码',
  [PROVISIONING_ERROR_CODES.MQTT_INVALID]: 'MQTT 连接失败，请进入诊断',
  [PROVISIONING_ERROR_CODES.STORAGE_FAILED]: '设备存储失败，请重试或联系支持'
}

/* ------------------------------------------------------------------ */
/* 与 ControlHub 的契约（非 BLE 载荷，供文档/联调对照）                  */
/* ------------------------------------------------------------------ */

/**
 * ControlHub 配对成功后下发给 ESP32 的 MQTT 凭据。
 * ESP32 POST /api/v1/pairing/device 成功后获得；**不经过小程序**。
 */
                                 
                   
                   
                       
                         
 

/*
 * 恢复原则（PROVISIONING_V1 §6，实现侧参考）：
 *   - Wi-Fi 失败：只退回 Wi-Fi 步骤，不重做 ControlHub
 *   - token 失效 / 已用：只重新扫码，不重做 Wi-Fi
 *   - MQTT 失败：进入诊断，不重做 Wi-Fi
 *   - 小程序切后台：恢复后重新连接并读 Status
 */

// ============================================================================
// == 源：apps/uniapp/services/smart-hid/profile.js
// ============================================================================
const SMART_HID_PROFILE_ID = 'smart-hid';

/** Device Profile store — pure engine (avoids TS import cycle). */
const asText = (value) => typeof value === 'string' ? value : utf8Decode(value);

const smartHidProfile = {
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
    actionLabel: '配置 Smart HID',
    actionDescription: '配置 Wi-Fi 与 ControlHub 地址',
    chipStrong: 'Smart HID · 强匹配',
    chipWeak: '疑似 Smart HID · 弱匹配'
  },
  model: {
    productLine: 'smart-hid',
    capabilities: ['provisioning', 'diagnostics', 'gatt-debug'],
    connectedLabel: 'Smart HID',
    routes: {
      detail: '/pages/hid/detail',
      provision: '/pages/hid/add',
      diagnostics: '/pages/hid/diagnostics'
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

// ============================================================================
// == 全局挂载
// ============================================================================
  root.SmartHid = {
    CONNECTION_STATE,
    DEFAULT_ATT_MTU,
    FRAME_HEADER_SIZE,
    FrameAssembler,
    HID_ERROR_CODE,
    MAX_ASSEMBLED_BYTES,
    MAX_CHUNK_BYTES,
    MAX_FRAMES,
    OWNER_TYPE,
    PROFILE_MATCH,
    PROVISIONING_CONSTANTS,
    PROVISIONING_ERROR_CODES,
    PROVISIONING_ERROR_HINTS,
    PROVISIONING_STATES,
    PROVISIONING_STEPS,
    PROVISION_EVENT,
    PROVISION_STATE,
    RECONNECT_STATE,
    SMART_HID_CHARACTERISTIC_UUIDS,
    SMART_HID_NAME_PREFIX,
    SMART_HID_PROFILE_ID,
    SMART_HID_PROVISIONING_SERVICE_UUID,
    TOKEN_TTL_MS,
    buildFrames,
    buildProvisionCandidateJson,
    chunkSizeForMtu,
    classifySmartHidStatus,
    createDeviceProfileStore,
    createHidError,
    createMemoryTokenStore,
    createSessionRegistry,
    createSmartHidStatusWaiters,
    createSmartHidWorkflow,
    defineProvisioningProfile,
    describeSmartHidStatus,
    encodePayloadFrames,
    getFramingStrategy,
    getProvisioningProfile,
    getSessionRegistry,
    isHidError,
    listFramingStrategies,
    listProvisioningProfiles,
    parseDeviceInfo,
    parsePairingQrPayload,
    parseProvisionStatus,
    resetProfilesForTesting,
    resetSessionRegistryForTesting,
    runDiagnostic,
    smartHidProfile,
    smartHidRecoveryAction,
    utf8Decode,
    utf8Encode,
  };
})(typeof window !== 'undefined' ? window : globalThis);
