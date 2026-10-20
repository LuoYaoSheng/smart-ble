import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { sha256SoftwareHex } from '../../apps/uniapp/services/ota/sha256-software.js';
import { sha256Hex } from '../../apps/uniapp/services/ota/package-validator.js';

test('software SHA256 known vectors, padding boundaries and firmware-size input match native crypto', () => {
  const vectors = [Buffer.from(''), Buffer.from('abc'), Buffer.from('a'.repeat(1000000)),
    ...[1, 55, 56, 63, 64, 65, 127, 128, 129, 1024, 1024 * 1024].map(length => randomBytes(length))];
  for (const bytes of vectors) assert.equal(sha256SoftwareHex(bytes), createHash('sha256').update(bytes).digest('hex'));
});
test('manifest hashing works without Web Crypto or Node modules in App runtime', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
  try { assert.equal(await sha256Hex(new TextEncoder().encode('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'); }
  finally { if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor); else delete globalThis.crypto; }
});
