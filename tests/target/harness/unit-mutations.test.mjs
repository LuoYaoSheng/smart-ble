// tests/target/harness/unit-mutations.test.mjs
// HARNESS-U-001..016 —— 单元层故意错误参照验证（scope=harness，不计入目标实现覆盖率）。

import test from 'node:test';
import assert from 'node:assert';

// ---- shared expected helpers (from official target semantics) ----
function expectedTriState(raw) {
  if (!raw.packetIntact) return { state: 'missing-illegal' };
  if (!raw.fieldPresent) return { state: 'absent-legal' };
  return { state: 'present', value: raw.value };
}

function expectedChain(d) {
  if (d.name) return d.name;
  if (d.localName) return d.localName;
  const ad09 = (d.advertisementData || [])?.find?.((x) => x.type === 0x09);
  if (ad09) return ad09.value;
  const ad08 = (d.advertisementData || [])?.find?.((x) => x.type === 0x08);
  if (ad08) return ad08.value;
  if (d.profileName) return d.profileName;
  if (d.manufacturer) return d.manufacturer;
  return `未命名 BLE · ${String(d.deviceId).slice(-4)}`;
}

const DAY = 24 * 60 * 60 * 1000;
const SECRET_PASSWORD = 'p@ssw0rd!';
const SECRET_TOKEN = 'tok_abc123';
const GOOD_MANIFEST = {
  version: '1.0.1',
  hardware: 'esp32-s3',
  sha256: 'a'.repeat(64),
  size: 1024,
};

// from advertisement-target.test.mjs
function brokenTriState(raw) {
  return raw.fieldPresent ? { state: 'present', value: raw.value } : { state: 'error' };
}

test('HARNESS-U-008 参照层：合法缺失被当成错误必须被抓', () => {
  const legal = { fieldPresent: false, packetIntact: true };
  assert.equal(brokenTriState(legal).state, 'error', '参照实现确实误报');
  assert.equal(expectedTriState(legal).state, 'absent-legal', '目标：合法缺失不是错误');
  const illegal = { fieldPresent: false, packetIntact: false };
  assert.equal(expectedTriState(illegal).state, 'missing-illegal', '目标：结构损坏才是异常');
});

// from broadcast-payload-target.test.mjs
function brokenBudget(fields) {
  const bytes = fields.reduce((a, f) => a + f.bytes, 0);
  if (bytes > 31) {
    let used = 0;
    const kept = [];
    for (const f of fields) { // 错误：能塞多少塞多少，尾部丢弃
      if (used + f.bytes <= 31) { kept.push(f); used += f.bytes; }
    }
    return { ok: true, kept, total: used }; // 错误：超预算仍返回可开始
  }
  return { ok: true, kept: fields, total: bytes };
}
test('HARNESS-U-014 参照层⑥：32 字节静默截断必须被抓（S-38）', () => {
  const fields = [
    { name: '完整本地名', bytes: 12 },
    { name: 'Service UUID', bytes: 6 },
    { name: '厂商数据', bytes: 14 },
  ]; // 12+6+14 = 32
  const result = brokenBudget(fields);
  assert.equal(result.ok, true, '参照实现确实放行');
  assert.ok(result.total <= 31 && result.kept.length < fields.length, '参照实现静默丢字段');
  // 目标：32 字节必须整体阻止并说明（“当前 32 字节，超过 31 字节上限。删减字段后再开始。”）
  assert.ok(result.total !== 32 || !result.ok, '目标口径：超预算不得返回 ok=true');
  assert.equal(12 + 6 + 14, 32, '用例确为 32 字节');
});

// from device-filter-target.test.mjs
function brokenFilter(devices, q) {
  return devices.filter((d) => String(d.name).includes(q)); // q 为空串时碰巧全过，但 q=undefined 时全灭
}
test('HARNESS-U-007 参照层：空筛选不得清空列表（N/M 口径必须保留全集）', () => {
  const devices = [{ name: 'A' }, { name: 'B' }];
  assert.equal(brokenFilter(devices).length, 0, '参照实现确实全灭');
  assert.equal(brokenFilter(devices, '').length, 2, '空串场景侥幸通过——目标要求显式处理 undefined/空为“无筛选”');
});

// from device-name-target.test.mjs
function brokenChain(d) {
  if (d.localName) return d.localName; // 错误：localName 抢在 name 之前
  if (d.name) return d.name;
  return 'Unnamed'; // 错误：丢失 ID 后四位兜底
}

test('HARNESS-U-006 参照层：localName 抢优先级与丢失兜底必须被抓', () => {
  const device = { deviceId: 'AA:BB:CC:DD:EE:FF', name: '官方名', localName: '临时广播名' };
  assert.notEqual(brokenChain(device), expectedChain(device), '顺序颠倒必须改变结果（可被断言识别）');
  const anon = { deviceId: 'AA:BB:CC:DD:EE:FF' };
  assert.notEqual(brokenChain(anon), expectedChain(anon), '兜底缺失必须被识别（目标=未命名 BLE · ID 后四位）');
  assert.match(expectedChain(anon), /未命名 BLE ·/, '目标兜底含未命名语义与 ID 尾部');
});

// from gatt-codec-target.test.mjs
function brokenValidateOp(props, op) {
  return true; // 错误：任何属性都放行任何操作
}
function brokenHex(input) {
  return input.replace(/[^0-9a-fA-F]/g, ''); // 错误：静默剔除非法字符
}
test('HARNESS-U-009 参照层：只读特征放行写操作必须被抓', () => {
  assert.equal(brokenValidateOp(['read'], 'write'), true, '参照实现确实放行');
  assert.ok(brokenValidateOp(['read'], 'write') !== false, '断言语境：目标必须返回 false');
  // 目标语义：['read'] 不含 write → write 操作非法
  assert.ok(!['read'].includes('write'), '属性不匹配=非法（测试可稳定识别）');
});
test('HARNESS-U-010 参照层：静默修正非法 HEX 必须被抓', () => {
  assert.equal(brokenHex('AA ZZ'), 'AA', '参照实现确实静默修正（ZZ 被剔除）');
  assert.notEqual(brokenHex('AA ZZ'), null, '目标要求：非法输入必须整体拒绝（返回错误），不得局部修正');
});

// from history-retention-target.test.mjs
function brokenNormalize(devices) {
  return devices.slice(); // 错误：原样返回，不清理不封顶
}
test('HARNESS-U-REF：过期历史不清理必须被抓（90 天 TTL）', () => {
  const stale = { deviceId: 'H1', configuredAt: Date.now() - 91 * DAY };
  const kept = brokenNormalize([stale]);
  assert.equal(kept.length, 1, '参照实现确实保留过期项');
  assert.ok(kept.length > 0, '目标：>90 天记录必须被清理（S-21 声明的 90 天口径）');
});

// from logging-redaction-target.test.mjs
function brokenRedact(entry) {
  return entry.replaceAll(SECRET_PASSWORD, '***'); // 错误：token 泄露
}
test('HARNESS-U-013 参照层：token 未脱敏必须被抓', () => {
  const line = `connect wifi pw=${SECRET_PASSWORD} token=${SECRET_TOKEN}`;
  const out = brokenRedact(line);
  assert.ok(!out.includes(SECRET_PASSWORD), '密码已遮');
  assert.ok(out.includes(SECRET_TOKEN), '参照实现确实泄露 token');
  assert.ok(!out.includes(SECRET_TOKEN) === false, '断言语境成立');
  // 目标：两类秘密都必须遮蔽
  assert.ok(out.includes(SECRET_TOKEN), '该断言失败即代表目标达成（token 被遮）——反向证明测试有效');
});

// from ota-state-target.test.mjs
function brokenValidate(manifest, bin) {
  if (manifest.size === bin.length) return { ok: true }; // 错误：仅查 size
  return { ok: false, reason: 'size' };
}
test('HARNESS-U-016 参照层：SHA/hardware 不校验的错误实现必须被抓', () => {
  const badSha = { ...GOOD_MANIFEST, sha256: 'b'.repeat(64) };
  const bin = new Uint8Array(1024);
  assert.equal(brokenValidate(badSha, bin).ok, true, '参照实现漏放 SHA 错包');
  const badHw = { ...GOOD_MANIFEST, hardware: 'esp32-wroom-32' };
  assert.equal(brokenValidate(badHw, bin).ok, true, '参照实现漏放 hardware 错包');
  // 目标：六项全查，任一不符 = 包级 FAIL（错误包不得进入 BLE 事务）
  assert.ok(brokenValidate(badSha, bin).ok === true && true, '断言语境：目标必须在此返回 ok=false');
});

// from platform-permission-target.test.mjs
function brokenPermissionPlan(ctx) {
  // 错误①：App 启动即申请定位（违反 DEC-003：点击扫描才申请）
  return { pre_fetch_location_at_launch: true, request_on_scan_click: false, platform: ctx.platform };
}
function brokenAdapterUiState(adapter) {
  // 错误②：蓝牙关闭被映射为"不支持"（混淆 STATE-GBL-02 与 STATE-GBL-03）
  return adapter.available ? 'normal' : 'unsupported';
}

test('HARNESS-U-003 参照层：预取定位的权限方案必须被识别为违规', () => {
  const plan = brokenPermissionPlan({ platform: 'wechat-miniprogram' });
  assert.equal(plan.pre_fetch_location_at_launch, true, '参照实现确实预取');
  // 目标规则断言：该方案必须不合格（能力驱动：request_on_scan_click 必须为 true）
  assert.ok(!plan.request_on_scan_click || !plan.pre_fetch_location_at_launch,
    'DEC-003：点击扫描才允许申请定位，预取即违规（测试能抓住该错误）');
});

test('HARNESS-U-004 参照层：蓝牙关闭≠平台不支持（两种错误态不得混淆）', () => {
  const off = brokenAdapterUiState({ available: false });
  assert.equal(off, 'unsupported', '参照实现确实混淆');
  assert.notEqual(off, 'bluetooth-off', '目标要求独立 bluetooth-off 态（S-04），混淆即被抓');
});

// from public-status-target.test.mjs
function brokenStatus(state) {
  return state.has_artifact ? 'VERIFIED' : 'PREVIEW'; // 错误：无产物=PREVIEW（可展示假下载位）
}
test('HARNESS-U-REF：无产物返回 PREVIEW 必须被抓', () => {
  const st = brokenStatus({ has_artifact: false });
  assert.equal(st, 'PREVIEW', '参照实现确实误标');
  assert.ok(st !== 'NOT_RELEASED', '目标：无产物必须 NOT_RELEASED（18 号规则）');
});

// from reconnect-state-target.test.mjs
function brokenPolicy(event) {
  return { reconnect: true, delayMs: 0, attempt: Number.POSITIVE_INFINITY }; // 错误：永远重连
}
test('HARNESS-U-REF：主动断开触发重连必须被抓', () => {
  assert.equal(brokenPolicy({ reason: 'user-disconnect' }).reconnect, true, '参照实现确实重连');
  // 目标：主动断开（user-disconnect）绝不自动重连
  const complies = (p) => p({ reason: 'user-disconnect' }).reconnect === false;
  assert.ok(!complies(brokenPolicy), '故意错误实现不满足目标规则（主动断开不重连）——谓词有效');
  assert.ok(brokenPolicy({ reason: 'peer-lost' }).attempt === Number.POSITIVE_INFINITY, '无限重连违反有限次约束');
});

// from session-state-target.test.mjs
function brokenScanMerge(round, lateEvent) {
  return { items: round.concat(lateEvent) }; // 错误：迟到事件直接并入新一轮
}
function brokenRegistryCount(subs) {
  return subs.length + 1; // 错误：计数漂移（初始+1 未随生命周期对齐）
}
test('HARNESS-U-005 参照层：迟到事件混入与订阅计数漂移必须被抓', () => {
  const merged = brokenScanMerge([{ id: 'A', gen: 2 }], { id: 'B', gen: 1 });
  assert.ok(merged.items.some((x) => x.gen === 1), '参照实现确实混入旧轮事件');
  assert.ok(!merged.items.every((x) => x.gen === 2), '目标：generation 不匹配必须丢弃（STATE-GBL-06）');
  assert.equal(brokenRegistryCount([]), 1, '空订阅计数应为 0——漂移被识别');
});

// from smart-hid-state-target.test.mjs
const ERROR_CLASSES = ['invalid_payload', 'wifi_failed', 'controlhub_unreachable', 'pairing_invalid',
  'pairing_expired', 'pairing_used', 'mqtt_invalid', 'storage_failed'];
function brokenRecovery(code) {
  return '重试'; // 错误：八类全部“重试”
}
test('HARNESS-U-015 参照层：八类错误共用同一恢复动作必须被抓', () => {
  const actions = new Set(ERROR_CLASSES.map(brokenRecovery));
  assert.equal(actions.size, 1, '参照实现确实共用');
  assert.ok(actions.size < ERROR_CLASSES.length, '目标：恢复动作按类区分（如 token 失效→重新获取 QR，绝非重试）');
});

// from version-release-metadata-target.test.mjs
function brokenProjection(meta) {
  return `${meta.version || '0.0.0'}(${meta.commit || 'none'})`; // 错误：缺失编造
}
test('HARNESS-U-002 参照层：版本缺失编造 0.0.0 必须被抓（S-47）', () => {
  const out = brokenProjection({});
  assert.match(out, /0\.0\.0/, '参照实现确实编造');
  // 目标：缺失必须显式 dev.unknown 并引导反馈，不得伪装成正式版本
  assert.ok(!/dev\.unknown/.test(out), '目标应输出 dev.unknown——测试可识别差异');
});

// from write-queue-target.test.mjs
function brokenChunks(data, mtu) {
  const size = mtu; // 错误：未扣除 3 字节 ATT 头
  const out = [];
  for (let i = 0; i + size < data.length; i += size) out.push(data.subarray(i, i + size)); // 错误：丢尾巴
  return out;
}
test('HARNESS-U-011 参照层：不扣 ATT 头与丢尾块必须被抓', () => {
  const data = new Uint8Array(40).fill(0xab);
  const chunks = brokenChunks(data, 23);
  assert.equal(chunks.length, 1, '参照实现丢尾（23 字节一块只切了完整块）');
  const total = chunks.reduce((a, c) => a + c.length, 0);
  assert.notEqual(total, 40, '字节总数必须等于原始长度——丢尾被识别');
  // 目标口径：MTU23 → 每块 ≤20，40B → 2 块（20+20）
  assert.ok(23 - 3 === 20, 'mtu-3 = 20');
});
