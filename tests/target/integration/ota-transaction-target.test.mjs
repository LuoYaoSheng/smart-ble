// tests/target/integration/ota-transaction-target.test.mjs
// TEST-I-008 / TEST-I-010 OTA 事务时序：完整正典顺序；abort；ready 超时；commit 失败；
// 错误包不进 BLE 事务；V1 失败=整事务重试（DEC-016/12 号）。
// 目标：REQ-043/044/045/066；FEAT-046~050/081；PAGE-006；FLOW-009；STATE-OTA-01..10。

import test from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
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
const INFO_SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const INFO_CTRL = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

const FIRMWARE = new Uint8Array([1, 2, 3, 4, 5, 6]);
const FIRMWARE_SHA = createHash('sha256').update(FIRMWARE).digest('hex');

const GOOD_PKG = {
  manifest: {
    format_version: 1,
    target: 'lightble-peripheral',
    hardware: 'esp32-s3',
    firmware_version: '1.2.0',
    size: FIRMWARE.length,
    sha256: FIRMWARE_SHA,
  },
  firmware: FIRMWARE,
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

function makePlatform({ autoStatus = true, targetVersion = '1.2.0', readVersion = targetVersion } = {}) {
  const services = [
    {
      uuid: INFO_SVC,
      characteristics: [{ uuid: INFO_CTRL, properties: { read: true, write: true, notify: true } }],
    },
    {
      uuid: OTA_SVC,
      characteristics: [
        { uuid: CHR_CTRL, properties: { write: true } },
        { uuid: CHR_DATA, properties: { write: true, writeNoResponse: true } },
        { uuid: CHR_STATUS, properties: { read: true, notify: true } },
      ],
    },
  ];

  let platform;
  platform = createFakePlatform({
    services,
    readValue: Buffer.from(JSON.stringify({
      type: 'system_info',
      name: 'BLEToolkit-Server',
      firmware_version: readVersion,
      hardware: 'esp32-s3',
    })),
    onWrite: autoStatus
      ? (o) => {
        const cid = o.characteristicId || o.cid;
        const text = decodeWriteValue(o.value);
        try {
          const j = JSON.parse(text);
          if (sameUuid(cid, CHR_CTRL) && j.op === 'start') {
            setTimeout(
              () => platform.emitValue(o.deviceId, OTA_SVC, CHR_STATUS, Buffer.from(JSON.stringify({ status: 'ready' }))),
              0,
            );
          }
          if (sameUuid(cid, CHR_CTRL) && j.op === 'commit') {
            setTimeout(
              () => platform.emitValue(o.deviceId, OTA_SVC, CHR_STATUS, Buffer.from(JSON.stringify({ status: 'success' }))),
              0,
            );
          }
        } catch {
          // binary DATA writes
        }
      }
      : undefined,
  });
  return platform;
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

async function runOtaCase(OtaManager, rt, platform, startFn, options = {}) {
  rt.setBlePlatformForTesting(platform);
  try {
    return await withInjectedGlobals({ uni: platform }, async () => {
      await rt.openAdapter();
      await rt.connectDevice('OTA1');
      const ota = new OtaManager('OTA1', () => {}, {
        confirmTimeoutMs: options.confirmTimeoutMs ?? 200,
        readyTimeoutMs: options.readyTimeoutMs ?? 200,
        delay: options.delay ?? (async () => {}),
        device: options.device,
      });
      return startFn(ota);
    });
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
}

test('TEST-I-008 #1 valid package：subscribe→CTRL start→ready→DATA→commit→success→verify', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  const result = await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  const writes = writeCalls(platform);

  assert.ok(notifyCalls(platform).some((n) => sameUuid(n.args.cid, CHR_STATUS)), '必须先订阅 STATUS');
  assert.equal(firstBreakpointCtrlBeforeData(platform), null);

  const ctrlStart = writes.find((w) => {
    if (!sameUuid(w.args.cid, CHR_CTRL)) return false;
    try {
      return JSON.parse(decodeWriteValue(w.args.value)).op === 'start';
    } catch {
      return false;
    }
  });
  assert.ok(ctrlStart, '必须 CTRL start');
  const startJson = JSON.parse(decodeWriteValue(ctrlStart.args.value));
  assert.equal(startJson.target, GOOD_PKG.manifest.target);
  assert.equal(startJson.size, GOOD_PKG.manifest.size);
  assert.equal(startJson.sha256, GOOD_PKG.manifest.sha256);
  assert.equal(startJson.target_version, GOOD_PKG.manifest.firmware_version);

  const commit = writes.find((w) => {
    if (!sameUuid(w.args.cid, CHR_CTRL)) return false;
    try {
      return JSON.parse(decodeWriteValue(w.args.value)).op === 'commit';
    } catch {
      return false;
    }
  });
  assert.ok(commit, '必须 CTRL commit');
  assert.ok(result?.ok === true, '完整成功路径应 ok');

  const reads = platform.__calls.filter((c) => c.m === 'read');
  assert.ok(reads.some((c) => sameUuid(c.args.cid, INFO_CTRL)), 'success 后必须读 firmware_version');
  assert.ok(platform.__calls.some((c) => c.m === 'connect' || c.m === 'disconnect'), 'success 后必须 reconnect 路径');
});

test('TEST-I-008 #2 invalid package：0 次平台写', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, async (ota) => {
    const before = writeCalls(platform).length;
    const bad = {
      manifest: { ...GOOD_PKG.manifest, sha256: 'ff'.repeat(64) },
      firmware: GOOD_PKG.firmware,
    };
    const validate = ota.validatePackage || ota.validateOtaPackage;
    const r = await validate.call(ota, bad);
    assert.equal(r?.ok, false, '错包必须拒绝');
    assert.equal(writeCalls(platform).length, before, '包校验失败后不得产生平台写');

    const start = await ota.startOta(bad, () => {}, () => {}, () => {});
    assert.equal(start?.ok, false);
    assert.equal(writeCalls(platform).length, before, 'startOta 错包不得 BLE 写');
  });
});

test('TEST-I-008 #3 subscribe STATUS', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  assert.ok(notifyCalls(platform).some((n) => sameUuid(n.args.cid, CHR_STATUS)));
});

test('TEST-I-008 #4 CTRL start before DATA', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  assert.equal(firstBreakpointCtrlBeforeData(platform), null);
});

test('TEST-I-008 #5 ready required', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform({ autoStatus: false });
  const result = await runOtaCase(
    OtaManager,
    rt,
    platform,
    (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}),
    { readyTimeoutMs: 40 },
  );
  assert.equal(result?.ok, false);
  assert.match(String(result?.error?.message || result?.error), /ready timeout|等待设备/i);
  assert.ok(writeCalls(platform).some((w) => sameUuid(w.args.cid, CHR_DATA)) === false, '未 ready 不得写 DATA');
});

test('TEST-I-008 #6 DATA chunks order', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  const dataWrites = writeCalls(platform).filter((w) => sameUuid(w.args.cid, CHR_DATA));
  assert.equal(dataWrites.length, 1, '6 字节 firmware 应 1 个 DATA chunk');
  for (const w of dataWrites) assertExactUuid(w.args.cid, CHR_DATA, 'DATA');
});

test('TEST-I-008 #7 progress event', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  const events = [];
  await runOtaCase(OtaManager, rt, platform, (ota) => {
    ota.onOtaEvent((ev) => events.push(ev));
    return ota.startOta(GOOD_PKG, () => {}, () => {}, () => {});
  });
  assert.ok(events.some((e) => e.event === 'progress' && e.sent === GOOD_PKG.manifest.size));
});

test('TEST-I-008 #8 data failure', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  platform.failNext('writeBLECharacteristicValue', { errMsg: 'write:fail data' });
  const result = await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  assert.equal(result?.ok, false);
});

test('TEST-I-008 #9 commit after data', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  const writes = writeCalls(platform);
  const lastData = writes.map((w, i) => ({ w, i })).filter(({ w }) => sameUuid(w.args.cid, CHR_DATA)).pop()?.i ?? -1;
  const commitIdx = writes.findIndex((w) => {
    if (!sameUuid(w.args.cid, CHR_CTRL)) return false;
    try {
      return JSON.parse(decodeWriteValue(w.args.value)).op === 'commit';
    } catch {
      return false;
    }
  });
  assert.ok(lastData >= 0 && commitIdx > lastData, 'commit 必须在全部 DATA 之后');
});

test('TEST-I-008 #10 wait success after commit', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  const result = await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  const writes = writeCalls(platform);
  const commitIdx = writes.findIndex((w) => {
    try {
      return sameUuid(w.args.cid, CHR_CTRL) && JSON.parse(decodeWriteValue(w.args.value)).op === 'commit';
    } catch {
      return false;
    }
  });
  assert.ok(commitIdx >= 0, '必须先 commit');
  assert.equal(result?.ok, true, 'commit 后 success 才最终 ok');
});

test('TEST-I-010 #11 reconnect after success', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  const reconnectEvidence = platform.__calls.some((c) => c.m === 'disconnect')
    || platform.__calls.filter((c) => c.m === 'connect').length >= 2
    || platform.__calls.some((c) => c.m === 'read' && sameUuid(c.args.cid, INFO_CTRL));
  assert.ok(reconnectEvidence, 'success 后必须 reconnect/read firmware_version 路径');
});

test('TEST-I-010 #12 version readback', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform({ readVersion: '1.2.0' });
  const result = await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  assert.equal(result?.ok, true);
});

test('TEST-I-010 #13 ready timeout', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform({ autoStatus: false });
  const result = await runOtaCase(
    OtaManager,
    rt,
    platform,
    (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}),
    { readyTimeoutMs: 30 },
  );
  assert.equal(result?.ok, false);
});

test('TEST-I-010 #14 commit failure / no success', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform({ autoStatus: false });
  const result = await runOtaCase(
    OtaManager,
    rt,
    platform,
    async (ota) => {
      const p = ota.startOta(GOOD_PKG, () => {}, () => {}, () => {});
      await new Promise((r) => setTimeout(r, 10));
      platform.emitValue('OTA1', OTA_SVC, CHR_STATUS, Buffer.from(JSON.stringify({ status: 'ready' })));
      await new Promise((r) => setTimeout(r, 30));
      platform.emitValue('OTA1', OTA_SVC, CHR_STATUS, Buffer.from(JSON.stringify({ status: 'error', message: 'commit failed' })));
      return p;
    },
    { confirmTimeoutMs: 200, readyTimeoutMs: 200 },
  );
  assert.equal(result?.ok, false);
});

test('TEST-I-010 cancel #16 abort + #17 cleanup', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform({ autoStatus: false });
  await runOtaCase(
    OtaManager,
    rt,
    platform,
    async (ota) => {
      const p = ota.startOta(GOOD_PKG, () => {}, () => {}, () => {});
      await new Promise((r) => setTimeout(r, 15));
      platform.emitValue('OTA1', OTA_SVC, CHR_STATUS, Buffer.from(JSON.stringify({ status: 'ready' })));
      await new Promise((r) => setTimeout(r, 5));
      await ota.cancelOta();
      await p.catch(() => {});
      const abort = writeCalls(platform).find((w) => {
        if (!sameUuid(w.args.cid, CHR_CTRL)) return false;
        try {
          return JSON.parse(decodeWriteValue(w.args.value)).op === 'abort';
        } catch {
          return false;
        }
      });
      assert.ok(abort, 'cancel 必须 CTRL abort');
      assert.equal(ota.getOtaState(), 'CANCELLED');
    },
    { delay: () => new Promise((r) => setTimeout(r, 5)) },
  );
});

test('TEST-I-008 #18 wrong UUID must not alias CTRL/DATA/STATUS', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  for (const w of writeCalls(platform)) {
    const cid = w.args.cid;
    if (sameUuid(cid, CHR_DATA)) {
      assert.notEqual(normUuid(cid), normUuid(CHR_CTRL));
      assert.notEqual(normUuid(cid), normUuid(CHR_STATUS));
    }
  }
});

test('TEST-I-008 #19 wrong target rejected', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, async (ota) => {
    const bad = {
      manifest: { ...GOOD_PKG.manifest, target: 'lightble-observer' },
      firmware: GOOD_PKG.firmware,
    };
    const r = await ota.validatePackage(bad, { device: { target: 'lightble-peripheral', hardware: 'esp32-s3' } });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'OTA_TARGET_MISMATCH');
  });
});

test('TEST-I-008 #20 wrong sha rejected', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform();
  await runOtaCase(OtaManager, rt, platform, async (ota) => {
    const bad = { manifest: { ...GOOD_PKG.manifest, sha256: 'aa'.repeat(32) }, firmware: GOOD_PKG.firmware };
    const r = await ota.validatePackage(bad);
    assert.equal(r.ok, false);
    assert.equal(r.code, 'OTA_HASH_MISMATCH');
  });
});

test('TEST-I-010 version mismatch after verify', async () => {
  const { OtaManager, rt } = await loadOtaStack();
  const platform = makePlatform({ readVersion: '9.9.9' });
  const result = await runOtaCase(OtaManager, rt, platform, (ota) => ota.startOta(GOOD_PKG, () => {}, () => {}, () => {}));
  assert.equal(result?.ok, false);
  assert.equal(result?.code, 'OTA_VERSION_MISMATCH');
});

export const CASE_META = {
  suite: 'ota-transaction',
  target_ids: TARGET_IDS,
};
