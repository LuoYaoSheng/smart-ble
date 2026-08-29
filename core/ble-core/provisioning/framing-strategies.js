/**
 * 通用分帧策略映射。
 *
 * Profile 通过 transport.framing 声明策略名；orchestrator / Profile 服务
 * 按名称取 encode，避免每个设备服务直接 import framing 细节。
 */

import { buildFrames, chunkSizeForMtu } from './framing.js';

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

export function listFramingStrategies() {
  return Object.keys(strategies);
}

export function getFramingStrategy(name) {
  const key = String(name || '').trim() || 'framed-v1';
  const strategy = strategies[key];
  if (!strategy) {
    throw new Error(`unknown framing strategy: ${key} (known: ${listFramingStrategies().join(', ')})`);
  }
  return strategy;
}

export function encodePayloadFrames(bytes, framingName, mtu) {
  return getFramingStrategy(framingName).encode(bytes, mtu);
}
