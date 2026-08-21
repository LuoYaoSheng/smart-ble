/**
 * 通用 BLE 配网传输层（uni.* GATT 原语封装）
 *
 * 不含任何设备特定逻辑：Smart HID、以及后续接入的任何配网档案（profile）
 * 都复用这一层。设备特定内容（UUID / 特征 / QR scheme / 状态语义）由
 * 各自 profile 提供。
 *
 * 能力：
 *   - connect(deviceId, opts)：连接 → 服务发现 → 特征发现 → 校验 → MTU 协商
 *   - subscribe / unsubscribe：特征值变化订阅（全局单一分发器，按 UUID 路由）
 *   - readChar：读特征（微信的读结果同样走 onBLECharacteristicValueChange，
 *     内部做一次性等待）
 *   - writeValue / writeFrames：写（含分帧序列写）
 *   - 连接状态监听：断链自动标记 session 失效并回调
 *
 * ⚠️ uni.onBLECharacteristicValueChange / onBLEConnectionStateChange 是
 *    全局唯一回调（后注册覆盖先注册）。本模块在首次 import 时注册一次，
 *    此后不再重复注册；pages/device/detail.vue 等旧页面自己注册时会覆盖
 *    本模块的监听——进入配网流程时会重新 ensureListener() 恢复。
 *
 * @module services/provisioning/transport
 */

import { utf8Decode, utf8Encode } from '../../../../core/ble-core/provisioning/framing';

/* ---------------- 全局监听（幂等注册） ---------------- */

const listeners = {
  valueChange: false,
  connState: false
};

/** charUuid(小写) -> Set<callback(ArrayBuffer)> */
const valueListeners = new Map();
/** deviceId -> Set<callback()> */
const disconnectListeners = new Map();

function ensureListener() {
  if (!listeners.valueChange) {
    uni.onBLECharacteristicValueChange((res) => {
      const key = String(res.characteristicId || '').toLowerCase();
      const set = valueListeners.get(key);
      if (set) {
        set.forEach((cb) => {
          try { cb(res.value, res); } catch (e) { console.error('[provisioning] value cb error', e); }
        });
      }
    });
    listeners.valueChange = true;
  }
  if (!listeners.connState) {
    uni.onBLEConnectionStateChange((res) => {
      if (res.connected === false) {
        const set = disconnectListeners.get(res.deviceId);
        if (set) set.forEach((cb) => { try { cb(); } catch (e) { console.error('[provisioning] disc cb error', e); } });
        disconnectListeners.delete(res.deviceId);
        valueListeners.forEach((set2, key) => {
          if (set2._ownerDevice === res.deviceId) valueListeners.delete(key);
        });
      }
    });
    listeners.connState = true;
  }
}

function oncePromise(cond, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 超时（${timeoutMs}ms）`)), timeoutMs);
    const stop = (fn) => { clearTimeout(timer); fn(); };
    cond(
      (v) => stop(() => resolve(v)),
      (e) => stop(() => reject(e))
    );
  });
}

const promisify = (api, opts = {}) => new Promise((resolve, reject) => {
  api({ ...opts, success: resolve, fail: reject });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- 连接与会话 ---------------- */

/**
 * 建立 GATT 会话。
 *
 * @param {string} deviceId BLE 设备 ID（平台句柄）
 * @param {object} opts
 * @param {string} opts.serviceUuid 目标 Provisioning Service UUID
 * @param {string[]} opts.characteristicUuids 需要确认存在的特征 UUID 列表
 * @param {number} [opts.mtu=247] 期望 MTU（仅 Android 生效；失败不致命）
 * @param {string[]} [opts.notifyUuids=[]] 连接后立即订阅 notify 的特征
 * @returns {Promise<object>} session：{ deviceId, serviceId, chars:{uuid->char}, mtu, onDisconnect(fn), close() }
 */
export async function connect(deviceId, opts) {
  const { serviceUuid, characteristicUuids = [], mtu = 247, notifyUuids = [] } = opts || {};
  ensureListener();

  await promisify(uni.createBLEConnection, { deviceId, timeout: 10000 });

  // 服务发现（Android 上偶发刚连上时拿不到，做短重试）
  let services = null;
  for (let i = 0; i < 3 && !services; i++) {
    if (i > 0) await sleep(400);
    const res = await promisify(uni.getBLEDeviceServices, { deviceId });
    const hit = (res.services || []).find((s) => String(s.uuid).toLowerCase() === String(serviceUuid).toLowerCase());
    if (hit) services = hit;
  }
  if (!services) {
    await promisify(uni.closeBLEConnection, { deviceId }).catch(() => {});
    throw new Error('目标设备上未找到配网服务（UUID 不匹配或设备固件过旧）');
  }

  const charRes = await promisify(uni.getBLEDeviceCharacteristics, { deviceId, serviceId: services.uuid });
  const chars = {};
  (charRes.characteristics || []).forEach((c) => { chars[String(c.uuid).toLowerCase()] = c; });

  const missing = characteristicUuids
    .map((u) => String(u).toLowerCase())
    .filter((u) => !chars[u]);
  if (missing.length) {
    await promisify(uni.closeBLEConnection, { deviceId }).catch(() => {});
    throw new Error(`配网特征缺失：${missing.join(', ')}`);
  }

  // MTU 协商：仅 Android；iOS 自动协商且接口不可用，失败静默
  let negotiated = 23;
  try {
    const r = await promisify(uni.setBLEMTU, { deviceId, mtu });
    negotiated = r && r.mtu ? r.mtu : mtu;
  } catch (e) {
    negotiated = 23; // 保守值：每帧 payload 17B，一定合法
  }

  const session = {
    deviceId,
    serviceId: services.uuid,
    chars,
    mtu: negotiated,
    dead: false,
    onDisconnect(fn) {
      let set = disconnectListeners.get(deviceId);
      if (!set) { set = new Set(); disconnectListeners.set(deviceId, set); }
      set.add(fn);
    },
    async close() {
      this.dead = true;
      disconnectListeners.delete(deviceId);
      try { await promisify(uni.closeBLEConnection, { deviceId }); } catch (e) { /* 已断开 */ }
    }
  };
  session.onDisconnect(() => { session.dead = true; });

  for (const u of notifyUuids) await subscribe(session, u);
  return session;
}

/** 订阅特征值变化（notify）。cb(value:ArrayBuffer, res) */
export async function subscribe(session, charUuid, cb) {
  ensureListener();
  const key = String(charUuid).toLowerCase();
  await promisify(uni.notifyBLECharacteristicValueChange, {
    deviceId: session.deviceId,
    serviceId: session.serviceId,
    characteristicId: session.chars[key].uuid,
    state: true
  });
  let set = valueListeners.get(key);
  if (!set) { set = new Set(); set._ownerDevice = session.deviceId; valueListeners.set(key, set); }
  set.add(cb);
}

/** 取消订阅 */
export function unsubscribe(charUuid, cb) {
  const key = String(charUuid).toLowerCase();
  const set = valueListeners.get(key);
  if (set) { set.delete(cb); if (!set.size) valueListeners.delete(key); }
}

/** 读特征（UTF-8 文本）。结果经 value-change 回调到达，内部一次性等待。 */
export function readChar(session, charUuid, timeoutMs = 3000) {
  const key = String(charUuid).toLowerCase();
  let cb = null;
  return oncePromise((ok, fail) => {
    cb = (value) => { const fn = cb; cb = null; unsubscribe(key, fn); ok(utf8Decode(value)); };
    // 直接挂一次性监听（不复用 subscribe：不需要 notify 开关）
    let set = valueListeners.get(key);
    if (!set) { set = new Set(); set._ownerDevice = session.deviceId; valueListeners.set(key, set); }
    set.add(cb);
    uni.readBLECharacteristicValue({
      deviceId: session.deviceId,
      serviceId: session.serviceId,
      characteristicId: session.chars[key].uuid,
      fail: (e) => {
        if (cb) { set.delete(cb); cb = null; }
        fail(new Error(`读特征失败: ${e && e.errMsg}`));
      }
    });
    // 超时清理：oncePromise 的 timer 只 reject，不清理监听，这里补上
    setTimeout(() => {
      if (cb) {
        const s = valueListeners.get(key);
        if (s) s.delete(cb);
        cb = null;
      }
    }, timeoutMs + 50);
  }, timeoutMs, 'readChar');
}

/** 写单个值（默认带响应写） */
export async function writeValue(session, charUuid, bytes) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const key = String(charUuid).toLowerCase();
  const value = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  try {
    await promisify(uni.writeBLECharacteristicValue, {
      deviceId: session.deviceId,
      serviceId: session.serviceId,
      characteristicId: session.chars[key].uuid,
      value
    });
  } catch (e) {
    throw normalizeWriteError(e);
  }
}

/**
 * 顺序写入帧序列（帧间小间隔，避免连续写压垮部分Android栈）
 * @param {Uint8Array[]} frames
 * @param {object} [opts] { intervalMs = 30 }
 */
export async function writeFrames(session, charUuid, frames, opts) {
  const { intervalMs = 30 } = opts || {};
  for (let i = 0; i < frames.length; i++) {
    if (i > 0 && intervalMs > 0) await sleep(intervalMs);
    await writeValue(session, charUuid, frames[i]);
  }
}

/** 写失败归类（加密未配对 / 断链 / 其他），供上层给出针对性提示 */
export function normalizeWriteError(e) {
  const msg = String((e && (e.errMsg || e.message)) || '');
  const err = new Error(`写特征失败: ${msg}`);
  if (/encrypt|auth|pair|bond|139|10006|10007/i.test(msg)) {
    err.kind = 'encrypt';
    err.tip = '写入特征需要加密链路：请在系统弹窗中确认配对（Just Works），然后重试';
  } else if (/disconnect|10008|not connect/i.test(msg)) {
    err.kind = 'disconnect';
    err.tip = 'BLE 连接已断开，请重新连接设备';
  } else {
    err.kind = 'write';
    err.tip = `写入失败：${msg}`;
  }
  return err;
}

export { utf8Decode, utf8Encode };
