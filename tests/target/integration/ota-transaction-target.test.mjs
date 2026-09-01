// tests/target/integration/ota-transaction-target.test.mjs
// TEST-I-008 / TEST-I-010 OTA 事务时序：完整正典顺序；abort；ready 超时；commit 失败；
// 错误包不进 BLE 事务；V1 失败=整事务重试（DEC-016/12 号）。
// 目标：REQ-043/044/045/066；FEAT-046~050/081；PAGE-006；FLOW-009；STATE-OTA-01..10。
//
// UUID 必须完整精确匹配（禁止 slice/startsWith/共同前缀）。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented, withInjectedGlobals } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-008/010 REQ-043~045/066 FEAT-046~050/081 FLOW-009 DEC-016';
const TARGET_IDS = [
  'TEST-I-008', 'TEST-I-010',
  'REQ-043', 'REQ-044', 'REQ-045', 'REQ-066',
  'FEAT-046', 'FEAT-047', 'FEAT-048', 'FEAT-049', 'FEAT-050', 'FEAT-081',
  'PAGE-006', 'FLOW-009', 'DEC-016',
];

const OTA_SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
const CHR_CTRL = 'beb5483e-36e1-4688-b7f5-ea07361b26c0';
const CHR_DATA = 'beb5483e-36e1-4688-b7f5-ea07361b26c1';
const CHR_STATUS = 'beb5483e-36e1-4688-b7f5-ea07361b26c2';

const GOOD_PKG = {
  manifest: {
    protocol_id: 'smart-ble-ota/1',
    target: 'lightble-fixture',
    hardware: 'esp32-s3',
    firmware_version: '1.2.0',
    size: 6,
    sha256: 'ab'.repeat(32),
    chunk_size: 180,
  },
  firmware: new Uint8Array([1, 2, 3, 4, 5, 6]),
};

function normUuid(u) {
  return String(u || '').replace(/-/g, '').toLowerCase();
}

function sameUuid(a, b) {
  return normUuid(a) === normUuid(b);
}

function decodeWriteValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : ArrayBuffer.isView(value)
      ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
      : new Uint8Array();
  return Buffer.from(bytes).toString('utf8');
}

function writeCalls(platform) {
  return platform.__calls.filter((c) => c.m === 'write');
}

function notifyCalls(platform) {
  return platform.__calls.filter((c) => c.m === 'notify' && c.args.state !== false);
}

function assertExactUuid(actual, expected, label) {
  assert.ok(sameUuid(actual, expected), `${label}: expected exact UUID ${expected}, got ${actual}`);
}

async function loadOtaStack() {
  const m = await importTarget('apps/uniapp/utils/ota_manager.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.OtaManager !== 'function') {
    assert.fail(notImplemented(IDS, '目标类 OtaManager 缺失'));
  }
  const rtMod = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!rtMod.ok) assert.fail(notImplemented(IDS, rtMod.message));
  return { OtaManager: m.module.OtaManager, rt: rtMod.module, exports: m.module };
}

function makePlatform() {
  return createFakePlatform({
    services: [{
      uuid: OTA_SVC,
      characteristics: [
        { uuid: CHR_CTRL, properties: { write: true } },
        { uuid: CHR_DATA, properties: { write: true, writeNoResponse: true } },
        { uuid: CHR_STATUS, properties: { read: true, notify: true } },
      ],
    }],
  });
}

function firstBreakpointCtrlBeforeData(platform) {
  const writes = writeCalls(platform);
  const firstDataIdx = writes.findIndex((w) => sameUuid(w.args.cid, CHR_DATA));
  const firstCtrlIdx = writes.findIndex((w) => sameUuid(w.args.cid, CHR_CTRL));
  if (firstDataIdx >= 0 && (firstCtrlIdx < 0 || firstCtrlIdx > firstDataIdx)) {
    return 'OtaManager 在第一个 DATA 写之前未发送 CTRL start';
  }
  return null;
}

test('TEST-I-008 OtaManager：STATUS 订阅后、DATA 前必须精确写 CTRL start', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await withInjectedGlobals({ uni: platform }, async () => {
      await rt.openAdapter();
      await rt.connectDevice('OTA1');
      const ota = new OtaManager('OTA1', () => {}, { confirmTimeoutMs: 50, delay: async () => {} });
      if (typeof ota.startOta !== 'function') {
        assert.fail(notImplemented('TEST-I-008 REQ-044', '目标接口 OtaManager.startOta 缺失'));
      }

      const result = await ota.startOta(GOOD_PKG.firmware, () => {}, () => {}, () => {});
      const writes = writeCalls(platform);
      const notifies = notifyCalls(platform);

      assert.ok(
        notifies.some((n) => sameUuid(n.args.cid, CHR_STATUS)),
        '必须先对 STATUS 完整 UUID 开启 notify/subscribe',
      );

      const bp = firstBreakpointCtrlBeforeData(platform);
      assert.equal(
        bp,
        null,
        bp || 'CTRL start 必须在第一个 DATA 写之前（完整 UUID 精确匹配）',
      );

      const ctrl = writes.find((w) => sameUuid(w.args.cid, CHR_CTRL));
      assert.ok(ctrl, '必须存在 CTRL 写入');
      assertExactUuid(ctrl.args.cid, CHR_CTRL, 'CTRL characteristicId');
      assertExactUuid(ctrl.args.serviceId || ctrl.args.sid, OTA_SVC, 'CTRL serviceId');
      assert.equal(ctrl.args.deviceId, 'OTA1', 'CTRL deviceId');

      const startText = decodeWriteValue(ctrl.args.value);
      let startJson;
      try {
        startJson = JSON.parse(startText);
      } catch {
        assert.fail(`CTRL start 必须是 JSON，实际: ${startText.slice(0, 120)}`);
      }
      const op = startJson.op || startJson.action;
      assert.equal(op, 'start', 'start JSON op/action=start');
      for (const key of ['target', 'size', 'chunk_size', 'target_version', 'sha256']) {
        assert.ok(startJson[key] != null || startJson[key.replace('target_version', 'firmware_version')] != null,
          `start JSON 必须含 ${key}`);
      }

      // 若实现完整，后续 DATA 使用精确 DATA UUID
      const dataWrites = writes.filter((w) => sameUuid(w.args.cid, CHR_DATA));
      for (const w of dataWrites) {
        assertExactUuid(w.args.cid, CHR_DATA, 'DATA characteristicId');
        assert.notEqual(normUuid(w.args.cid), normUuid(CHR_CTRL), 'DATA 不得与 CTRL 混淆');
      }

      // 成功路径需要 commit；当前若未 commit 则失败（产品差距）
      const commit = writes.find((w) => {
        if (!sameUuid(w.args.cid, CHR_CTRL)) return false;
        try {
          const j = JSON.parse(decodeWriteValue(w.args.value));
          return (j.op || j.action) === 'commit';
        } catch {
          return false;
        }
      });
      assert.ok(commit, '全部分包后必须 CTRL commit');
      assert.ok(result?.ok === true, '完整成功路径应 ok');
    });
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('TEST-I-008 OtaManager：Package 校验失败时平台写调用为 0', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await withInjectedGlobals({ uni: platform }, async () => {
      await rt.openAdapter();
      await rt.connectDevice('OTA1');
      const ota = new OtaManager('OTA1', () => {}, { confirmTimeoutMs: 30, delay: async () => {} });
      const before = writeCalls(platform).length;

      if (typeof ota.validatePackage !== 'function' && typeof ota.validateOtaPackage !== 'function') {
        assert.fail(notImplemented('TEST-I-008 FEAT-081 DEC-016', 'validateOtaPackage/validatePackage 缺失；第一断点: 传输前包校验接口不存在'));
      }

      const bad = {
        manifest: { ...GOOD_PKG.manifest, sha256: 'ff'.repeat(32) },
        firmware: GOOD_PKG.firmware,
      };
      const validate = ota.validatePackage || ota.validateOtaPackage;
      const r = validate.call(ota, bad);
      assert.equal(r?.ok, false, '错包必须拒绝');
      assert.equal(writeCalls(platform).length, before, '包校验失败后不得产生平台写');
    });
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('TEST-I-010 OtaManager：cancel 必须写 CTRL abort（完整 UUID）', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await withInjectedGlobals({ uni: platform }, async () => {
      await rt.openAdapter();
      await rt.connectDevice('OTA1');
      const ota = new OtaManager('OTA1', () => {}, {
        confirmTimeoutMs: 200,
        delay: () => new Promise((r) => setTimeout(r, 5)),
      });
      const p = ota.startOta(GOOD_PKG.firmware, () => {}, () => {}, () => {});
      await new Promise((r) => setTimeout(r, 10));
      if (typeof ota.cancel === 'function') ota.cancel();
      await p.catch(() => {});

      const abort = writeCalls(platform).find((w) => {
        if (!sameUuid(w.args.cid, CHR_CTRL)) return false;
        try {
          const j = JSON.parse(decodeWriteValue(w.args.value));
          return (j.op || j.action) === 'abort';
        } catch {
          return false;
        }
      });
      assert.ok(abort, 'cancel 必须向 CTRL 完整 UUID 写入 abort');
    });
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('TEST-I-010 OtaManager：成功后必须 reboot/reconnect 并读 firmware_version', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await withInjectedGlobals({ uni: platform }, async () => {
      await rt.openAdapter();
      await rt.connectDevice('OTA1');
      const ota = new OtaManager('OTA1', () => {}, { confirmTimeoutMs: 40, delay: async () => {} });

      // 若实现会在 subscribe 后等待 ready，注入 ready→在 DATA 后注入 success
      const startPromise = ota.startOta(GOOD_PKG.firmware, () => {}, () => {}, () => {});
      await new Promise((r) => setTimeout(r, 5));
      platform.emitValue('OTA1', OTA_SVC, CHR_STATUS, Buffer.from(JSON.stringify({ status: 'ready' })));
      await new Promise((r) => setTimeout(r, 5));
      platform.emitValue('OTA1', OTA_SVC, CHR_STATUS, Buffer.from(JSON.stringify({ status: 'success' })));
      await startPromise.catch(() => {});

      const reads = platform.__calls.filter((c) => c.m === 'read');
      const versionRead = reads.some((c) => /version|firmware/i.test(JSON.stringify(c.args)));
      const reconnect = platform.__calls.some((c) => c.m === 'connect' || c.m === 'disconnect');
      assert.ok(versionRead, 'success 后必须读取 firmware_version');
      assert.ok(reconnect, 'success 后必须经历 reboot/reconnect 路径（平台 connect/disconnect 证据）');
    });
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

// 元数据供 Runner 回填 Target（不参与断言）
export const CASE_META = {
  suite: 'ota-transaction',
  target_ids: TARGET_IDS,
};
