/**
 * 通用配网编排（设备无关）。
 *
 * 负责：按 Profile 连接 → 校验 Device Info → 按 framing 写 candidate →
 * （可选）在 write 前挂上 terminal waiter。
 *
 * Smart HID / 未来型号的专属会话、Store、诊断仍由各自 service 持有。
 */

import { encodePayloadFrames } from '../../../../core/ble-core/provisioning/framing-strategies.js';
import {
  connect as gattConnect,
  writeFrames
} from './transport.js';

function requireProfile(profile) {
  if (!profile?.id) throw new Error('profile is required');
  if (!profile.codec?.buildCandidate) throw new Error(`profile ${profile.id}: codec.buildCandidate is required`);
  return profile;
}

function characteristicUuid(profile, alias) {
  const uuid = profile.characteristics?.[alias];
  if (!uuid) throw new Error(`profile ${profile.id}: missing characteristic ${alias}`);
  return uuid;
}

/**
 * 按 Profile 建立配网 GATT 会话（服务确认 + 可选 notify 打开）。
 */
export async function connectProfileSession(deviceId, profile) {
  const selected = requireProfile(profile);
  return gattConnect(deviceId, {
    serviceUuid: selected.serviceUuid,
    characteristicUuids: selected.required.map((alias) => selected.characteristics[alias]),
    mtu: selected.mtu,
    notifyUuids: selected.notify
  });
}

/**
 * 将 candidate 编码为帧并写入 INPUT（或 profile.transport.inputAlias）。
 * V1 简化后不发起 SMP/配对；旧加密固件错误立即上抛并提示重烧。
 */
export async function writeProfileCandidate(session, profile, input, options = {}) {
  const selected = requireProfile(profile);
  if (!session || session.dead) throw new Error('BLE 未连接');

  const inputAlias = selected.transport?.inputAlias || 'INPUT';
  const framing = selected.transport?.framing || 'framed-v1';
  const bytes = selected.codec.buildCandidate(input);
  const frames = encodePayloadFrames(bytes, framing, session.mtu);
  const resultWaiter = options.beforeWrite?.();

  try {
    await writeFrames(session, characteristicUuid(selected, inputAlias), frames);
  } catch (error) {
    resultWaiter?.cancel?.(error?.message || '候选写入失败');
    throw error;
  }

  return { ok: true, frames: frames.length, bytes: bytes.length, framing };
}

/**
 * 先建 waiter，再写 candidate，避免设备快速终态丢失。
 */
export async function runProvisionTransaction({ createWaiter, writeCandidate }) {
  if (typeof createWaiter !== 'function') throw new Error('createWaiter must be a function');
  if (typeof writeCandidate !== 'function') throw new Error('writeCandidate must be a function');
  const waiter = createWaiter();
  try {
    await writeCandidate(waiter);
    return await waiter;
  } catch (error) {
    waiter?.cancel?.(error?.message || '候选写入失败');
    await waiter?.catch?.(() => {});
    throw error;
  }
}
