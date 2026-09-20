//
// SmartBLE Desktop - OTA 契约纯逻辑（R-1/R-2 对齐 · E-WIN/T-WIN 共享）
//
// core/apple/SmartHidCore/Sources/SmartHidCore/OtaContract.swift 的 JS 锁定镜像
// （E-WIN/T-WIN 共用同一字节）。
// 契约事实源：contracts/target/ota-package.schema.json（manifest 六字段：format_version /
// target 枚举 / hardware / firmware_version SemVer / size / sha256）与固件 handleStart
// 校验链（hardware/esp32/LightBLE/src/ota_server.cpp：missing_target / invalid_target /
// missing_target_version / invalid_sha256）；BLE STATUS 帧为
// {"type":"ota","status":"ready|error|success|aborted"}（notifyStatus）。
// 决策记录：docs/specs/06_review/OTA_CONTRACT_R1_R2_DECISION.md（方案 A：App 对齐冻结契约）。
//

(function (root) {
  'use strict';

  // -------------------------------------------------------------------------
  // 状态帧分类（R-2）
  // -------------------------------------------------------------------------

  /**
   * 判定设备状态/版本回读帧；无关键词命中返回 null（调用方静默忽略，如版本串）。
   * JSON 分支同样按子串匹配（旧实现整值精确匹配漏检 "failed"/"aborted" → 拖 30s 超时），
   * 固件 abort 通知纳入错误类。顺序：ready → success/ok → 错误类。
   * @param {string} text UTF-8 文本帧（调用方负责 hex → text）
   * @returns {'ready'|'success'|'ok'|'error'|null} error 时详细串在 .text
   */
  function classify(text) {
    if (typeof text !== 'string') return null;
    let json = null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) json = parsed;
    } catch { /* 文本帧走下方直配 */ }

    if (json) {
      const values = [];
      for (const v of Object.values(json)) {
        if (typeof v === 'string') values.push(v.toLowerCase());
      }
      if (values.some((v) => v.includes('ready'))) return 'ready';
      if (values.some((v) => v.includes('success'))) return 'success';
      if (values.some((v) => v.includes('ok'))) return 'ok';
      if (values.some((v) => v.includes('error') || v.includes('fail') || v.includes('abort'))) {
        return 'error';
      }
      return null;
    }

    const lower = text.toLowerCase();
    if (lower.includes('ready')) return 'ready';
    if (lower.includes('success')) return 'success';
    if (lower.includes('ok')) return 'ok';
    if (lower.includes('error') || lower.includes('fail') || lower.includes('abort')) return 'error';
    return null;
  }

  const OtaStatusClassifier = {
    classify,
  };

  // -------------------------------------------------------------------------
  // start 帧构造（R-1）
  // -------------------------------------------------------------------------

  const VALID_TARGETS = new Set(['lightble-peripheral', 'lightble-observer']);

  function isValidTarget(s) {
    return VALID_TARGETS.has(s);
  }

  /**
   * 契约 start 帧：op/target/target_version/size/chunk_size/sha256；
   * manifest 缺项时省略对应键（不伪造枚举/版本，真固件以 missing_target 诚实拒绝）。
   */
  function buildStartPayload(opts) {
    const p = {
      op: 'start',
      size: opts.fileSize,
      chunk_size: opts.chunkSize,
      sha256: opts.sha256,
    };
    if (opts.manifestTarget && isValidTarget(opts.manifestTarget)) p.target = opts.manifestTarget;
    if (opts.manifestVersion) p.target_version = opts.manifestVersion;
    return p;
  }

  /** 日志用展示串（不含 sha256 全文） */
  function displayPayload(p) {
    return ['op', 'target', 'target_version', 'size', 'chunk_size']
      .filter((k) => p[k] !== undefined)
      .map((k) => `${k}=${p[k]}`)
      .join(' ');
  }

  const OtaStartPayload = {
    isValidTarget,
    build: buildStartPayload,
    display: displayPayload,
  };

  // -------------------------------------------------------------------------
  // manifest 解析（契约六字段 · legacy "version" 兼容）
  // -------------------------------------------------------------------------

  const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/;
  const KNOWN_KEYS = ['format_version', 'target', 'hardware', 'firmware_version', 'version', 'size', 'sha256'];

  function isSemVer(v) {
    return typeof v === 'string' && SEMVER_RE.test(v);
  }

  /**
   * 浏览器侧 sha256（crypto.subtle，HTTPS/file:// Electron 与 Tauri WebView2 均可用）。
   * @param {Uint8Array} bytes
   * @returns {Promise<string>} 小写 hex
   */
  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 校验顺序：target 枚举 → firmware_version(legacy version) SemVer → size 实测 → sha256 实测。
   * @param {object} json manifest 对象
   * @param {number} fileSize 实测固件字节数
   * @param {string} actualSha256 实测 sha256（小写 hex）
   * @returns {{ ok: true, target: string|null, version: string|null, ignoredKeys: string[] }
   *          |{ ok: false, code: 'invalid_target'|'invalid_semver'|'size_mismatch'|'hash_mismatch',
   *             message: string }}
   */
  function parseManifest(json, fileSize, actualSha256) {
    let target = null;
    if (typeof json.target === 'string') {
      if (!isValidTarget(json.target)) {
        return { ok: false, code: 'invalid_target', message: `manifest target 非契约枚举（lightble-peripheral|lightble-observer）：${json.target}` };
      }
      target = json.target;
    }

    let version = null;
    const versionKey = typeof json.firmware_version === 'string' ? 'firmware_version' : 'version';
    if (typeof json[versionKey] === 'string') {
      if (!isSemVer(json[versionKey])) {
        return { ok: false, code: 'invalid_semver', message: `manifest ${versionKey} 非 SemVer：${json[versionKey]}` };
      }
      version = json[versionKey];
    }

    if (typeof json.size === 'number' && json.size !== fileSize) {
      return { ok: false, code: 'size_mismatch', message: `manifest size 不符：${json.size} ≠ 实测 ${fileSize}` };
    }

    if (typeof json.sha256 === 'string' && json.sha256.toLowerCase() !== actualSha256) {
      return { ok: false, code: 'hash_mismatch', message: 'manifest sha256 与实测不符' };
    }

    const ignoredKeys = Object.keys(json)
      .filter((k) => !KNOWN_KEYS.includes(k))
      .sort();

    return { ok: true, target, version, ignoredKeys };
  }

  const OtaManifest = {
    isSemVer,
    sha256Hex,
    parse: parseManifest,
  };

  // -------------------------------------------------------------------------
  // hex ↔ UTF-8 助手（桌面 notify 值以 hex string 送达）
  // -------------------------------------------------------------------------

  function hexToBytes(hex) {
    const clean = String(hex || '').replace(/[^0-9a-fA-F]/g, '');
    const out = new Uint8Array(clean.length >> 1);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return out;
  }

  function bytesToUtf8(bytes) {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      return '';
    }
  }

  root.SmartBLEOtaContract = {
    OtaStatusClassifier,
    OtaStartPayload,
    OtaManifest,
    hexToBytes,
    bytesToUtf8,
  };
})(typeof window !== 'undefined' ? window : globalThis);
