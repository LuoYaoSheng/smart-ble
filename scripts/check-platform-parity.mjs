#!/usr/bin/env node
// scripts/check-platform-parity.mjs —— Smart HID V1 跨语言协议向量 parity 总调度。
//
// 单源向量：core/protocols/smart-hid-v1-vectors.json（常量由 check-smart-hid-contract.mjs
// 对照正典契约锁定）。本脚本把各平台实现对到同一组向量上：
//
//   js      进程内经 tests/target ESM 桥加载 TS 镜像 + framing.js + workflow.js
//           （桥对 .ts 做类型剥离，需 Node >= 22.18 / >= 23.6；verify-target 同款口径）
//   dart    spawn `dart run tool/smart_hid_parity.dart`（apps/flutter，纯 Dart）
//   kotlin  gradle 调 JUnit 向量执行器（core/profile/SmartHidVectorParityTest），
//           读 apps/android/app/build/smart-hid-parity-kotlin.json（需 JDK 17–19 运行 Gradle 8.2）
//   swift   spawn `swift test` 执行 core/apple/SmartHidCore 的 XCTest 向量消费者
//
// 退出码：所有「已执行」平台零失败 → 0；任一平台断言失败 → 1。
// NOT_IMPLEMENTED / DEFERRED / BLOCKED(toolchain) 是在册状态，不判失败。
//
// 用法：node scripts/check-platform-parity.mjs [--platform=js,dart] [--vectors=<path>]

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importTarget } from '../tests/target/lib/import-target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const platformArg = args.find((a) => a.startsWith('--platform='));
const platformsWanted = platformArg ? platformArg.split('=')[1].split(',') : ['js', 'dart', 'kotlin', 'swift'];
const vectorsArg = args.find((a) => a.startsWith('--vectors='));
const VECTORS_PATH = vectorsArg ? resolve(ROOT, vectorsArg.split('=')[1]) : join(ROOT, 'core/protocols/smart-hid-v1-vectors.json');

const vectors = JSON.parse(readFileSync(VECTORS_PATH, 'utf8'));
const { constants, suites } = vectors;
const line = (s = '') => process.stdout.write(`${s}\n`);

function suiteCaseCount(name) {
  return suites[name]?.cases?.length ?? 0;
}

// ---------------------------------------------------------------------------
// JS 线：TS 镜像 + framing + workflow（经 ESM 桥，.ts 自动类型剥离）
// ---------------------------------------------------------------------------
async function runJsLane() {
  const failures = [];
  let pass = 0;
  const check = (suite, id, ok, detail) => {
    if (ok) pass += 1;
    else failures.push({ suite, case: id, detail: detail || '' });
  };

  const proto = await importTarget('core/protocols/hid-provisioning-protocol.ts');
  if (!proto.ok) return { status: 'BLOCKED', detail: proto.message, pass: 0, failures: [] };
  const P = proto.module;
  const framed = await importTarget('core/ble-core/provisioning/framing.js');
  if (!framed.ok) return { status: 'BLOCKED', detail: framed.message, pass: 0, failures: [] };
  const F = framed.module;
  const wf = await importTarget('apps/uniapp/services/smart-hid/workflow.js');
  if (!wf.ok) return { status: 'BLOCKED', detail: wf.message, pass: 0, failures: [] };
  const W = wf.module;

  // 正则常量取 .source（TS 导出 RegExp 字面量，String() 会带斜杠——W1 起 3 例比较式
  // 写错且被无条件 PASS 掩盖，本轮修正后 js 应为 71/71）
  const patternStr = (v) => (v instanceof RegExp ? v.source : String(v));

  // constants（含正典错误提示表；JS 独有面）
  const constChecks = {
    serviceUuid: P.SMART_HID_PROVISIONING_SERVICE_UUID === constants.serviceUuid,
    charInfo: P.SMART_HID_CHARACTERISTIC_UUIDS.INFO === constants.characteristicUuids.info,
    charInput: P.SMART_HID_CHARACTERISTIC_UUIDS.INPUT === constants.characteristicUuids.input,
    charStatus: P.SMART_HID_CHARACTERISTIC_UUIDS.STATUS === constants.characteristicUuids.status,
    namePrefix: P.SMART_HID_NAME_PREFIX === constants.namePrefix,
    protocolVersion: P.PROVISIONING_CONSTANTS.PROTOCOL_VERSION === constants.protocolVersion,
    candidateVersion: P.PROVISIONING_CONSTANTS.CANDIDATE_VERSION === constants.candidateVersion,
    deviceIdPattern: patternStr(P.PROVISIONING_CONSTANTS.DEVICE_ID_PATTERN) === constants.deviceIdPattern,
    deviceNamePattern: patternStr(P.PROVISIONING_CONSTANTS.DEVICE_NAME_PATTERN) === constants.deviceNamePattern,
    tokenPattern: patternStr(P.PROVISIONING_CONSTANTS.TOKEN_PATTERN) === constants.tokenPattern,
    qrScheme: P.PROVISIONING_CONSTANTS.QR_SCHEME === constants.qrScheme,
    defaultPairingPort: P.PROVISIONING_CONSTANTS.DEFAULT_PAIRING_PORT === constants.defaultPairingPort,
    frameHeaderSize: F.FRAME_HEADER_SIZE === constants.frame.headerSize,
    maxChunkBytes: F.MAX_CHUNK_BYTES === constants.frame.maxChunkBytes,
    maxAssembledBytes: F.MAX_ASSEMBLED_BYTES === constants.frame.maxAssembledBytes,
    maxFrames: F.MAX_FRAMES === constants.frame.maxFrames,
    defaultAttMtu: F.DEFAULT_ATT_MTU === constants.frame.defaultAttMtu,
    states: JSON.stringify([...P.PROVISIONING_STATES]) === JSON.stringify(constants.states),
    steps: JSON.stringify([...P.PROVISIONING_STEPS]) === JSON.stringify(constants.steps),
    errorCodes: JSON.stringify(Object.values(P.PROVISIONING_ERROR_CODES)) === JSON.stringify(constants.errorCodes),
    errorHints: JSON.stringify(P.PROVISIONING_ERROR_HINTS) === JSON.stringify(constants.errorHints),
  };
  for (const [id, ok] of Object.entries(constChecks)) check('constants', id, ok, `constant mismatch: ${id}`);

  // qr
  for (const c of suites.qr.cases) {
    try {
      const got = P.parsePairingQrPayload(c.input);
      if (!c.expect.ok) check('qr', c.id, got === null, `expected null, got ${JSON.stringify(got)}`);
      else if (got === null) check('qr', c.id, false, 'expected payload, got null');
      else check('qr', c.id, got.token === c.expect.token && got.host === c.expect.host && got.port === c.expect.port,
        `got ${JSON.stringify(got)}`);
    } catch (e) { check('qr', c.id, false, `unexpected throw: ${e.message}`); }
  }

  // candidate
  for (const c of suites.candidate.cases) {
    try {
      const got = P.buildProvisionCandidateJson(c.input);
      if (c.expect.ok) check('candidate', c.id, got === c.expect.json, `expected ${c.expect.json}, got ${got}`);
      else check('candidate', c.id, false, `expected throw, got ${got}`);
    } catch (e) {
      check('candidate', c.id, !c.expect.ok, c.expect.ok ? `unexpected throw: ${e.message}` : '');
    }
  }

  // framingMtu
  for (const c of suites.framingMtu.cases) {
    const got = F.chunkSizeForMtu(c.mtu);
    check('framingMtu', c.id, got === c.expect, `mtu ${c.mtu} -> ${got}, expect ${c.expect}`);
  }

  // frames
  const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
  for (const c of suites.frames.cases) {
    const payload = c.payloadHex != null
      ? new Uint8Array((c.payloadHex.match(/../g) || []).map((h) => parseInt(h, 16)))
      : new Uint8Array(c.fill.length).fill(parseInt(c.fill.byte, 16));
    try {
      const got = F.buildFrames(payload, c.chunkSize).map(hex);
      if (c.expect.ok) check('frames', c.id, JSON.stringify(got) === JSON.stringify(c.expect.frames), `got ${JSON.stringify(got)}`);
      else check('frames', c.id, false, `expected throw, got frames`);
    } catch (e) {
      check('frames', c.id, !c.expect.ok, c.expect.ok ? `unexpected throw: ${e.message}` : '');
    }
  }

  // deviceInfo / status
  for (const c of suites.deviceInfo.cases) {
    const got = P.parseDeviceInfo(c.input);
    if (!c.expect.ok) check('deviceInfo', c.id, got === null, `expected null, got ${JSON.stringify(got)}`);
    else if (got === null) check('deviceInfo', c.id, false, 'expected payload, got null');
    else check('deviceInfo', c.id,
      got.product === c.expect.product && got.protocol === c.expect.protocol && got.device_id === c.expect.device_id
      && got.firmware === c.expect.firmware && got.state === c.expect.state && got.provisioned === c.expect.provisioned,
      `got ${JSON.stringify(got)}`);
  }
  for (const c of suites.status.cases) {
    const got = P.parseProvisionStatus(c.input);
    if (!c.expect.ok) check('status', c.id, got === null, `expected null, got ${JSON.stringify(got)}`);
    else if (got === null) check('status', c.id, false, 'expected payload, got null');
    else check('status', c.id, got.state === c.expect.state && got.step === c.expect.step && got.error === c.expect.error,
      `got ${JSON.stringify(got)}`);
  }

  // errorRecovery（恢复映射：workflow.js）
  for (const c of suites.errorRecovery.cases) {
    const got = W.smartHidRecoveryAction({ error: c.code });
    check('errorRecovery', c.id, got === c.expect, `code ${c.code} -> ${got}, expect ${c.expect}`);
  }

  return { status: failures.length === 0 ? 'PASS' : 'FAIL', pass, failures };
}

// ---------------------------------------------------------------------------
// Dart 线：spawn 纯 Dart runner，解析 @@PARITY@@ JSON
// ---------------------------------------------------------------------------
function runDartLane() {
  const dartProbe = spawnSync('dart', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (dartProbe.error || dartProbe.status !== 0) {
    return { status: 'BLOCKED', detail: 'dart 工具链不可用（flutter 捆绑 dart 应在 PATH）', pass: 0, failures: [] };
  }
  const runner = join(ROOT, 'apps/flutter/tool/smart_hid_parity.dart');
  if (!existsSync(runner)) {
    return { status: 'NOT_IMPLEMENTED', detail: 'apps/flutter/tool/smart_hid_parity.dart 缺失', pass: 0, failures: [] };
  }
  const r = spawnSync('dart', ['run', 'tool/smart_hid_parity.dart', VECTORS_PATH], {
    cwd: join(ROOT, 'apps/flutter'),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const mark = out.match(/@@PARITY@@ (\{.*\})/);
  if (!mark) {
    return { status: 'BLOCKED', detail: `dart runner 未产出 @@PARITY@@ 结果：${out.slice(-300)}`, pass: 0, failures: [] };
  }
  try {
    const parsed = JSON.parse(mark[1]);
    const failures = (parsed.failures || []).map((f) => ({ suite: f.suite, case: f.case, detail: f.detail }));
    return { status: parsed.fail === 0 ? 'PASS' : 'FAIL', pass: parsed.pass, failures };
  } catch (e) {
    return { status: 'BLOCKED', detail: `parity JSON 解析失败：${e.message}`, pass: 0, failures: [] };
  }
}

// ---------------------------------------------------------------------------
// Kotlin 线：gradle 调 JUnit 向量执行器（SmartHidVectorParityTest），读结果文件
// ---------------------------------------------------------------------------
const KOTLIN_RESULT_FILE = 'apps/android/app/build/smart-hid-parity-kotlin.json';

/** Gradle 8.2 运行时需 JDK 17–19（上限 19）；探测 env JAVA_HOME 与 ~/.jdks */
function resolveGradleJavaHome() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    const jdks = join(home, '.jdks');
    if (existsSync(jdks)) {
      for (const d of readdirSync(jdks)) candidates.push(join(jdks, d));
    }
  }
  for (const dir of candidates) {
    const exe = join(dir, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (!existsSync(exe)) continue;
    const v = spawnSync(exe, ['-version'], { encoding: 'utf8' });
    const m = `${v.stderr || ''}${v.stdout || ''}`.match(/version "(\d+)/);
    if (!m) continue;
    const major = m[1] === '1' ? 8 : parseInt(m[1], 10);
    if (major >= 17 && major <= 19) return dir;
  }
  return null;
}

function runKotlinLane() {
  const protocolFile = join(ROOT, 'apps/android/app/src/main/java/com/smartble/core/profile/SmartHidProtocol.kt');
  const testFile = join(ROOT, 'apps/android/app/src/test/java/com/smartble/core/profile/SmartHidVectorParityTest.kt');
  if (!existsSync(protocolFile) || !existsSync(testFile)) {
    return {
      status: 'NOT_IMPLEMENTED',
      detail: 'K-AND Smart HID 协议层/向量执行器缺失（core/profile/SmartHidProtocol.kt + SmartHidVectorParityTest.kt）',
      pass: 0,
      failures: [],
    };
  }
  const javaHome = resolveGradleJavaHome();
  if (!javaHome) {
    return {
      status: 'BLOCKED',
      detail: '无可用的 JDK 17–19（Gradle 8.2 运行时上限）：设 JAVA_HOME 或安装到 ~/.jdks',
      pass: 0,
      failures: [],
    };
  }
  const resultFile = join(ROOT, KOTLIN_RESULT_FILE);
  if (existsSync(resultFile)) rmSync(resultFile);
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const r = spawnSync(`${gradlew} testDebugUnitTest --tests "*SmartHidVectorParity*" --rerun`, {
    cwd: join(ROOT, 'apps/android'),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: true,
    env: { ...process.env, JAVA_HOME: javaHome },
    timeout: 300000,
  });
  if (!existsSync(resultFile)) {
    const tail = `${r.stdout || ''}${r.stderr || ''}`.trim().slice(-240);
    return {
      status: 'BLOCKED',
      detail: `kotlin 向量测试未产出结果（gradle status=${r.status}${r.error ? ` ${r.error.message}` : ''}）：${tail}`,
      pass: 0,
      failures: [],
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(resultFile, 'utf8'));
    const failures = (parsed.failures || []).map((f) => ({ suite: f.suite, case: f.case, detail: f.detail }));
    return { status: parsed.fail === 0 ? 'PASS' : 'FAIL', pass: parsed.pass, failures };
  } catch (e) {
    return { status: 'BLOCKED', detail: `parity JSON 解析失败：${e.message}`, pass: 0, failures: [] };
  }
}

// ---------------------------------------------------------------------------
// Swift 线：Mac 执行共享 SmartHidCore XCTest；Windows 无 Swift 时如实 BLOCKED
// ---------------------------------------------------------------------------
function runSwiftLane() {
  const swiftProbe = spawnSync('swift', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (swiftProbe.error || swiftProbe.status !== 0) {
    return { status: 'BLOCKED', detail: 'swift 工具链不可用（Windows 阶段允许，Mac Gate 必须执行）', pass: 0, failures: [] };
  }
  const packagePath = join(ROOT, 'core/apple/SmartHidCore');
  if (!existsSync(join(packagePath, 'Package.swift'))) {
    return {
      status: 'NOT_IMPLEMENTED',
      detail: 'core/apple/SmartHidCore 尚未实现',
      pass: 0,
      failures: [],
    };
  }
  const result = spawnSync('swift', ['test', '--package-path', packagePath], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error || result.status !== 0) {
    return {
      status: 'FAIL',
      detail: 'SmartHidCore XCTest failed',
      pass: 0,
      failures: [{ suite: 'swift', case: 'SmartHidCoreTests', detail: output.slice(-1000) }],
    };
  }
  const matches = [...output.matchAll(/Executed (\d+) tests?, with 0 failures/g)];
  const pass = matches.length ? Number(matches.at(-1)[1]) : 1;
  return {
    status: 'PASS',
    detail: 'SmartHidCore XCTest consumes canonical vectors',
    pass,
    failures: [],
  };
}

// ---------------------------------------------------------------------------
const LANES = {
  js: { label: 'js', run: runJsLane, async: true },
  dart: { label: 'dart', run: runDartLane, async: false },
  kotlin: { label: 'kotlin', run: runKotlinLane, async: false },
  swift: { label: 'swift', run: runSwiftLane, async: false },
};

line(`Smart HID V1 platform parity（vectors ${VECTORS_PATH.replace(`${ROOT}/`, '')}）`);
let exitCode = 0;
const totals = {};
for (const name of platformsWanted) {
  const lane = LANES[name];
  if (!lane) {
    line(`  ${name.padEnd(8)} UNKNOWN_PLATFORM`);
    exitCode = 1;
    continue;
  }
  const result = lane.async ? await lane.run() : lane.run();
  totals[name] = result;
  const suiteNote = name === 'js'
    ? `（constants 21, qr ${suiteCaseCount('qr')}, candidate ${suiteCaseCount('candidate')}, framingMtu ${suiteCaseCount('framingMtu')}, frames ${suiteCaseCount('frames')}, deviceInfo ${suiteCaseCount('deviceInfo')}, status ${suiteCaseCount('status')}, errorRecovery ${suiteCaseCount('errorRecovery')}）`
    : name === 'dart'
      ? `（constants 17, qr ${suiteCaseCount('qr')}, candidate ${suiteCaseCount('candidate')}, framingMtu ${suiteCaseCount('framingMtu')}, frames ${suiteCaseCount('frames')}, deviceInfo ${suiteCaseCount('deviceInfo')}, status ${suiteCaseCount('status')}）`
      : name === 'swift'
        ? `（SmartHidCore XCTest consumes all suites declared for swift）`
      : name === 'kotlin'
        ? `（constants 21, qr ${suiteCaseCount('qr')}, candidate ${suiteCaseCount('candidate')}, framingMtu ${suiteCaseCount('framingMtu')}, frames ${suiteCaseCount('frames')}, deviceInfo ${suiteCaseCount('deviceInfo')}, status ${suiteCaseCount('status')}, errorRecovery ${suiteCaseCount('errorRecovery')}）`
        : '';
  if (result.status === 'PASS') {
    line(`  ${name.padEnd(8)} PASS  ${result.pass}/${result.pass}  ${suiteNote}`);
  } else {
    line(`  ${name.padEnd(8)} ${result.status}  ${result.detail || ''}`);
    if (result.status === 'FAIL') {
      exitCode = 1;
      for (const f of result.failures.slice(0, 20)) line(`           ✗ [${f.suite}] ${f.case}: ${f.detail}`);
    }
  }
}
line(`parity ${exitCode === 0 ? 'PASS' : 'FAIL'}（已执行平台零失败；NOT_IMPLEMENTED/DEFERRED/BLOCKED 为在册状态）`);
process.exit(exitCode);
