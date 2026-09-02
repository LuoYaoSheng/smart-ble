// tests/target/lib/import-target.mjs
// 目标实现导入桥：apps/uniapp 为 bundler 工程（package.json 无 type:module），
// Node 无法直接以 ESM 加载 .js 源码。本桥把源码（含 ≤3 层相对依赖内联重写）
// 转为 data URL 动态 import，并为平台全局（uni/wx）提供可注入 fake。
// 每次 fresh 导入使用 cache-busting URL；globalThis 注入通过 withInjectedGlobals 可恢复。

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const MAX_DEPTH = 8;
/** @type {Map<string, string>} absPath+bust → data URL */
const urlCache = new Map();
let instanceCounter = 0;
/** @type {Promise<void>} */
let globalInjectionLock = Promise.resolve();

function toDataUrl(source, bust = '') {
  const base = 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
  return bust ? `${base}#${bust}` : base;
}

function cacheKey(absFile, bust) {
  return `${resolve(absFile)}::${bust}`;
}

/** 清空模块 URL 缓存（测试隔离用） */
export function resetImportTargetCache() {
  urlCache.clear();
  instanceCounter = 0;
  globalInjectionLock = Promise.resolve();
}

/**
 * 在注入 globalThis 平台 fake 的 scoped 内执行 fn，结束后恢复（含异常路径）。
 * 并行调用串行化，避免 global 注入竞态。
 * @template T
 * @param {Record<string, unknown>} globals
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withInjectedGlobals(globals, fn) {
  let release;
  const slot = new Promise((r) => { release = r; });
  const prev = globalInjectionLock;
  globalInjectionLock = prev.then(() => slot);
  await prev;
  const saved = [];
  for (const [k, v] of Object.entries(globals || {})) {
    saved.push({ k, prev: globalThis[k], had: Object.prototype.hasOwnProperty.call(globalThis, k) });
    globalThis[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const { k, prev, had } of saved.reverse()) {
      if (had) globalThis[k] = prev;
      else delete globalThis[k];
    }
    release();
  }
}

/** 内联相对 import：把 from './x.js' 重写为被依赖文件自身的 data URL（递归） */
function inlineModule(absFile, depth = 0, bust = '') {
  const key = cacheKey(absFile, bust);
  if (urlCache.has(key)) return urlCache.get(key);
  let src = readFileSync(absFile, 'utf8');
  if (depth >= MAX_DEPTH) {
    const url = toDataUrl(src, bust ? `${bust}-leaf` : '');
    urlCache.set(key, url);
    return url;
  }
  const dir = dirname(absFile);
  src = src.replace(/(\bfrom\s*|\bimport\s*)(['"])(\.\.?\/[^'"]+)\2/g, (m, kw, q, spec) => {
    let dep = resolve(dir, spec);
    if (!existsSync(dep)) {
      for (const ext of ['.js', '.mjs', '/index.js']) {
        if (existsSync(dep + ext)) { dep = dep + ext; break; }
      }
    }
    if (!existsSync(dep)) return m;
    const depUrl = inlineModule(dep, depth + 1, bust);
    return `${kw}${q}${depUrl}${q}`;
  });
  const url = toDataUrl(src, bust);
  urlCache.set(key, url);
  return url;
}

/**
 * @param {string} relPath 仓库相对路径（如 apps/uniapp/utils/ble-utils.js）
 * @param {{globals?: Record<string, unknown>, fresh?: boolean}} opts
 * @returns {Promise<{ok:true,module:object,instanceId:string}|{ok:false,kind:'NOT_IMPLEMENTED'|'IMPORT_ERROR',message:string}>}
 */
export async function importTarget(relPath, opts = {}) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) {
    return { ok: false, kind: 'NOT_IMPLEMENTED', message: `目标模块缺失：${relPath}` };
  }
  const instanceId = opts.fresh ? `i${++instanceCounter}-${createHash('sha1').update(String(Date.now())).digest('hex').slice(0, 8)}` : 'shared';
  const bust = opts.fresh ? instanceId : '';
  try {
    return await withInjectedGlobals(opts.globals || {}, async () => {
      const url = inlineModule(abs, 0, bust);
      const module = await import(url);
      return { ok: true, module, instanceId };
    });
  } catch (e) {
    return { ok: false, kind: 'IMPORT_ERROR', message: `${e.name}: ${e.message}`.slice(0, 300) };
  }
}

/** 目标接口缺失/行为断言失败的统一 FAIL 文案（verify-target 识别 NOT_IMPLEMENTED 前缀） */
export function notImplemented(targetIds, firstBreakpoint) {
  return `NOT_IMPLEMENTED: [${targetIds}] 第一断点: ${firstBreakpoint}`;
}
