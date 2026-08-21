/**
 * 配网框架 + Smart HID 协议单元测试（纯 Node，无 uni.* 依赖）
 *
 * 运行：node tests/unit/provisioning.test.mjs
 * 依赖 Node ≥ 23（对 .ts 做类型剥离）；仅测试纯逻辑层。
 */
import assert from 'node:assert/strict';

import {
	FRAME_HEADER_SIZE, MAX_CHUNK_BYTES, MAX_ASSEMBLED_BYTES,
	chunkSizeForMtu, buildFrames, FrameAssembler,
	utf8Encode, utf8Decode
} from '../../core/ble-core/provisioning/framing.js';

import {
	SMART_HID_PROVISIONING_SERVICE_UUID,
	SMART_HID_CHARACTERISTIC_UUIDS,
	buildProvisionCandidateJson,
	parsePairingQrPayload,
	parseDeviceInfo,
	parseProvisionStatus,
	PROVISIONING_ERROR_CODES,
	PROVISIONING_ERROR_HINTS
} from '../../core/protocols/hid-provisioning-protocol.ts';

let passed = 0;
const run = (name, fn) => {
	try { fn(); passed++; console.log(`  ✓ ${name}`); }
	catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
};

console.log('[framing]');

run('chunkSizeForMtu: MTU 23 → 17B（协议 §3 合法下限）', () => {
	assert.equal(chunkSizeForMtu(23), 17);
});

run('chunkSizeForMtu: MTU 185/247 → 128B（封顶）', () => {
	assert.equal(chunkSizeForMtu(185), 128);
	assert.equal(chunkSizeForMtu(247), 128);
});

run('chunkSizeForMtu: 非法/未知 MTU → 保守 17B', () => {
	assert.equal(chunkSizeForMtu(undefined), 17);
	assert.equal(chunkSizeForMtu(10), 17);
	assert.equal(chunkSizeForMtu(NaN), 17);
});

run('buildFrames: 单帧（payload ≤ chunk）帧头正确', () => {
	const frames = buildFrames(utf8Encode('hello'), 128);
	assert.equal(frames.length, 1);
	assert.equal(frames[0][0], 0); // seq
	assert.equal(frames[0][1], 1); // total
	assert.equal(frames[0][2], 5); // len
	assert.equal(frames[0].length, FRAME_HEADER_SIZE + 5);
});

run('buildFrames: 多帧切块与 [seq][total][len] 递增', () => {
	const payload = utf8Encode('x'.repeat(300));
	const frames = buildFrames(payload, 128);
	assert.equal(frames.length, 3); // 128+128+44
	frames.forEach((f, i) => {
		assert.equal(f[0], i);
		assert.equal(f[1], 3);
	});
	assert.equal(frames[2][2], 44);
});

run('buildFrames ↔ FrameAssembler 往返（含中文/代理对）', () => {
	const text = '密码密码密码🔑 wifi_ssid 家用网络';
	const bytes = utf8Encode(text);
	const frames = buildFrames(bytes, 20); // 小块强制多帧
	const asm = new FrameAssembler();
	let out = null;
	for (const f of frames) {
		const r = asm.feed(f);
		if (r) out = r;
	}
	assert.ok(out);
	assert.equal(utf8Decode(out), text);
});

run('FrameAssembler: 乱序拒绝', () => {
	const frames = buildFrames(utf8Encode('a'.repeat(50)), 20);
	const asm = new FrameAssembler();
	asm.feed(frames[0]);
	assert.throws(() => asm.feed(frames[2]), /out of order/);
});

run('FrameAssembler: seq=0 重启（客户端出错从 0 重发）', () => {
	const frames = buildFrames(utf8Encode('b'.repeat(50)), 20);
	const asm = new FrameAssembler();
	asm.feed(frames[0]);
	asm.feed(frames[1]); // 旧传输未完成，直接开新的
	let out = null;
	for (const f of frames) { const r = asm.feed(f); if (r) out = r; }
	assert.ok(out && out.length === 50);
});

run('buildFrames: 空 payload / 超限 抛错', () => {
	assert.throws(() => buildFrames([], 128), /empty/);
	assert.throws(() => buildFrames(new Uint8Array(MAX_ASSEMBLED_BYTES + 1), MAX_CHUNK_BYTES), /exceeds/);
});

run('utf8 往返（ASCII / 中文 / 表情）', () => {
	const s = 'abc密码🔑ÿ';
	assert.equal(utf8Decode(utf8Encode(s)), s);
});

console.log('[protocol V1]');

run('UUID 与固件正典一致（9f1d1001-1002-1003-1004）', () => {
	assert.equal(SMART_HID_PROVISIONING_SERVICE_UUID, '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04');
	assert.equal(SMART_HID_CHARACTERISTIC_UUIDS.INFO.endsWith('1002-e73b-4c8f-9d2a-6f0b5e8a1c04'), true);
	assert.equal(SMART_HID_CHARACTERISTIC_UUIDS.INPUT.endsWith('1003-e73b-4c8f-9d2a-6f0b5e8a1c04'), true);
	assert.equal(SMART_HID_CHARACTERISTIC_UUIDS.STATUS.endsWith('1004-e73b-4c8f-9d2a-6f0b5e8a1c04'), true);
});

run('parsePairingQrPayload: 正典载荷', () => {
	const p = parsePairingQrPayload('shid://pair?token=0123456789abcdef0123456789abcdef&host=192.168.1.8&port=17892');
	assert.deepEqual(p, { token: '0123456789abcdef0123456789abcdef', host: '192.168.1.8', port: 17892 });
});

run('parsePairingQrPayload: port 缺省 17892 / 大写 scheme / 大写 token', () => {
	const p = parsePairingQrPayload('SHID://PAIR?TOKEN=0123456789ABCDEF0123456789ABCDEF&HOST=hub.lan');
	assert.equal(p.port, 17892);
	assert.equal(p.token, '0123456789abcdef0123456789abcdef');
	assert.equal(p.host, 'hub.lan');
});

run('parsePairingQrPayload: 拒绝非 shid:// 码 / 坏 token / 坏 port', () => {
	assert.equal(parsePairingQrPayload('https://example.com/pair?token=x'), null);
	assert.equal(parsePairingQrPayload('shid://pair?token=abc&host=1.2.3.4'), null);
	assert.equal(parsePairingQrPayload('shid://pair?token=0123456789abcdef0123456789abcdef&host=1.2.3.4&port=99999'), null);
	assert.equal(parsePairingQrPayload('shid://pair?host=1.2.3.4'), null);
	assert.equal(parsePairingQrPayload('shid://pair?token=%E0%A4%A&host=1.2.3.4'), null);
	assert.equal(parsePairingQrPayload('shid://pair?token=0123456789abcdef0123456789abcdef&token=0123456789abcdef0123456789abcdef&host=1.2.3.4'), null);
});

run('buildProvisionCandidateJson: 字段与默认端口', () => {
	const json = buildProvisionCandidateJson({
		wifi_ssid: 'home-net', wifi_password: 'pass1234',
		hub_host: '192.168.1.8', token: '0123456789abcdef0123456789abcdef'
	});
	const o = JSON.parse(json);
	assert.deepEqual(Object.keys(o).sort(), ['hub_host', 'hub_port', 'token', 'v', 'wifi_password', 'wifi_ssid']);
	assert.equal(o.v, 1);
	assert.equal(o.hub_port, 17892);
});

run('buildProvisionCandidateJson: 校验抛错（ssid 空 / token 形态 / port 范围）', () => {
	const ok = { wifi_ssid: 'a', wifi_password: 'b', hub_host: 'h', token: '0123456789abcdef0123456789abcdef' };
	assert.throws(() => buildProvisionCandidateJson({ ...ok, wifi_ssid: ' ' }), /ssid/);
	assert.throws(() => buildProvisionCandidateJson({ ...ok, token: 'xyz' }), /token/);
	assert.throws(() => buildProvisionCandidateJson({ ...ok, hub_port: 0 }), /port/);
	assert.throws(() => buildProvisionCandidateJson({ ...ok, hub_host: '' }), /host/);
});

run('parseDeviceInfo: 固件真实格式（ble_proto_build_info）', () => {
	const info = parseDeviceInfo('{"product":"smart-hid","protocol":"1.0","device_id":"HID-ABCD1234","firmware":"1.1.0","state":"provisioning","provisioned":false}');
	assert.equal(info.device_id, 'HID-ABCD1234');
	assert.equal(info.state, 'provisioning');
	assert.equal(info.provisioned, false);
});

run('parseProvisionStatus: 固件真实格式（含 error:null / error:string）', () => {
	const s1 = parseProvisionStatus('{"state":"connecting_wifi","step":"connecting_wifi","error":null}');
	assert.equal(s1.error, null);
	const s2 = parseProvisionStatus('{"state":"provisioning","step":"wifi_failed","error":"wifi_failed"}');
	assert.equal(s2.error, 'wifi_failed');
	assert.equal(parseProvisionStatus('not json'), null);
	assert.equal(parseDeviceInfo(''), null);
});

run('错误码表：8 个稳定字符串码，提示全覆盖', () => {
	const codes = Object.values(PROVISIONING_ERROR_CODES);
	assert.equal(codes.length, 8);
	assert.deepEqual(codes.sort(), ['controlhub_unreachable', 'invalid_payload', 'mqtt_invalid', 'pairing_expired', 'pairing_invalid', 'pairing_used', 'storage_failed', 'wifi_failed']);
	for (const c of codes) assert.ok(PROVISIONING_ERROR_HINTS[c], `缺提示: ${c}`);
});

run('candidate 分帧尺寸符合设备侧约束（≤128B/帧，≤1024B 总量，≤64 帧）', () => {
	const json = buildProvisionCandidateJson({
		wifi_ssid: '家用的很长名字网络SSID', wifi_password: 'a-very-long-password-64-chars-0123456789012345678901234567',
		hub_host: '192.168.31.233', token: '0123456789abcdef0123456789abcdef'
	});
	const bytes = utf8Encode(json);
	assert.ok(bytes.length <= MAX_ASSEMBLED_BYTES, `candidate ${bytes.length}B 超 ${MAX_ASSEMBLED_BYTES}B`);
	const frames = buildFrames(bytes, chunkSizeForMtu(247));
	assert.ok(frames.length <= 64);
	frames.forEach((f) => assert.ok(f.length - FRAME_HEADER_SIZE <= MAX_CHUNK_BYTES));
	// 交叉验证：小 MTU 也必须能传同一 payload
	const frames17 = buildFrames(bytes, 17);
	assert.equal(frames17.length, Math.ceil(bytes.length / 17));
});

console.log(`\n=== ${passed} passed${process.exitCode ? ', FAILED' : ''} ===`);
