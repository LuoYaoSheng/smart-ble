// tests/target/unit/smart-hid-state-target.test.mjs
// TEST-U-015 Smart HID 校验/解析/恢复映射：matcher 强/弱、八类错误→恢复动作、候选字段校验。
// 目标：REQ-047~050/052/065；FEAT-053/055/056/058；PAGE-001/002；FLOW-010；13 号契约。
//
// 匹配语义与 PROVISIONING_V1 正典一致：ADV 携带 Service UUID 是家族确定性标识 → STRONG；
// 仅 Scan Response 名称前缀（SHID-）→ WEAK（需 INFO 1002 二次身份确认）；都不是 → NONE。
// 接口名对齐 profile-contract 注册表契约：matchAdvertisement（profile.match/matches 为旧稿）。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-015 REQ-047~050 FEAT-053/055/056/058 FLOW-010';

const SERVICE = '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04';
const NAME_PREFIX = 'SHID-';

// PROVISIONING_V1 §6 八类错误码（与 core/protocols/hid-provisioning-protocol.ts 镜像一致）
const ERROR_CLASSES = ['invalid_payload', 'wifi_failed', 'controlhub_unreachable', 'pairing_invalid',
  'pairing_expired', 'pairing_used', 'mqtt_invalid', 'storage_failed'];

// ---------- 目标层 ----------
test('TEST-U-015 目标层：smart-hid/profile.js + workflow.js', async (t) => {
  const p = await importTarget('apps/uniapp/services/smart-hid/profile.js');
  if (!p.ok) return assert.fail(notImplemented(IDS, p.message));
  const profile = p.module.smartHidProfile;
  if (!profile) return assert.fail(notImplemented(IDS, 'smartHidProfile 缺失'));
  const matchFn = profile.matchAdvertisement;
  if (typeof matchFn !== 'function') return assert.fail(notImplemented('REQ-047 FEAT-053', '目标接口 profile.matchAdvertisement 缺失'));
  const c = await importTarget('core/ble-core/provisioning/profile-contract.js');
  const PM = c.ok ? c.module.PROFILE_MATCH : null;
  const levelOf = (r) => {
    if (PM) {
      if (r === PM.STRONG) return 'strong';
      if (r === PM.WEAK) return 'weak';
      if (r === PM.NONE) return 'none';
    }
    if (r && (r.strong === true || r.level === 'strong')) return 'strong';
    if (r && (r.strong === false || r.level === 'weak')) return 'weak';
    return String(r);
  };
  // 广播携带 Service UUID（正典：可据此过滤扫描）→ 强匹配
  assert.equal(levelOf(matchFn({ advertisServiceUUIDs: [SERVICE], name: NAME_PREFIX + 'AB12CD34' })), 'strong',
    'UUID+名称前缀 → 强匹配');
  assert.equal(levelOf(matchFn({ advertisServiceUUIDs: [SERVICE.toUpperCase()], name: '随便的名字' })), 'strong',
    '仅 Service UUID（大小写不敏感）→ 强匹配');
  // 仅 Scan Response 名称前缀 → 弱匹配（需 INFO 1002 二次身份确认）
  assert.equal(levelOf(matchFn({ name: NAME_PREFIX + 'AB12CD' })), 'weak', '仅名称前缀 → 弱匹配');
  assert.equal(levelOf(matchFn({ name: 'random device', localName: 'random device' })), 'none', '无关设备 → 不匹配');

  const w = await importTarget('apps/uniapp/services/smart-hid/workflow.js');
  if (!w.ok) return assert.fail(notImplemented(IDS, w.message));
  // 八类错误分类与恢复动作
  const classify = w.module.classifySmartHidStatus;
  const recovery = w.module.smartHidRecoveryAction;
  if (typeof classify !== 'function' || typeof recovery !== 'function') {
    return assert.fail(notImplemented('REQ-049 FEAT-058', '目标接口 classifySmartHidStatus/smartHidRecoveryAction 缺失'));
  }
  const actions = new Set();
  for (const code of ERROR_CLASSES) {
    // parseProvisionStatus 的真实产物形态：error 与 state:'error' 成对出现
    const status = { state: 'error', error: code };
    const cls = classify(status);
    assert.ok(cls, `错误 ${code} 可分类`);
    assert.equal(cls.phase, 'error', `错误 ${code} 归入 error 相位`);
    actions.add(String(recovery(status) ?? recovery(cls) ?? recovery(code)));
  }
  assert.ok(actions.size >= 4, `八类错误恢复动作区分度 ≥4（实际 ${actions.size}；全员同一动作=未实现按类恢复）`);
  // token 类错误不得建议“重试”
  const tokenAction = String(recovery({ error: 'pairing_expired' }) ?? '');
  assert.ok(!/重试/.test(tokenAction) || /重新/.test(tokenAction), 'pairing_expired 恢复动作≠单纯重试');
});
