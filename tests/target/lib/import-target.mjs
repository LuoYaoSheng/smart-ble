// tests/target/lib/import-target.mjs
// 目标实现导入桥：apps/uniapp 为 bundler 工程（package.json 无 type:module），
// Node 无法直接以 ESM 加载 .js 源码。本桥把源码（含 ≤3 层相对依赖内联重写）
// 转为 data URL 动态 import，并为平台全局（uni/wx）提供可注入 fake。
// 失败一律返回结构化结果，供目标层测试输出 NOT_IMPLEMENTED / IMPORT_ERROR 与第一断点。

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const MAX_DEPTH = 3;
const urlCache = new Map();
let injectedGlobals = null;

function toDataUrl(source) {
  return 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
}

/** 内联相对 import：把 from './x.js' 重写为被依赖文件自身的 data URL（递归） */
function inlineModule(absFile, depth = 0) {
  const key = resolve(absFile);
  if (urlCache.has(key)) return urlCache.get(key);
  let src = readFileSync(key, 'utf8');
  if (depth >= MAX_DEPTH) return toDataUrl(src);
  const dir = dirname(key);
  src = src.replace(/(\bfrom\s*|\bimport\s*)(['"])(\.\.?\/[^'"]+)\2/g, (m, kw, q, spec) => {
    let dep = resolve(dir, spec);
    if (!existsSync(dep)) {
      for (const ext of ['.js', '.mjs', '/index.js']) {
        if (existsSync(dep + ext)) { dep = dep + ext; break; }
      }
    }
    if (!existsSync(dep)) return m; // 解析失败保留原样，让错误带着真实 specifier 冒出
    const depUrl = inlineModule(dep, depth + 1);
    return `${kw}${q}${depUrl}${q}`;
  });
  const url = toDataUrl(src);
  urlCache.set(key, url);
  return url;
}

/**
 * @param {string} relPath 仓库相对路径（如 apps/uniapp/utils/ble-utils.js）
 * @param {{globals?: Record<string, unknown>}} opts 注入 globalThis 的平台 fake
 * @returns {Promise<{ok:true,module:object}|{ok:false,kind:'NOT_IMPLEMENTED'|'IMPORT_ERROR',message:string}>}
 */
export async function importTarget(relPath, opts = {}) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) {
    return { ok: false, kind: 'NOT_IMPLEMENTED', message: `目标模块缺失：${relPath}` };
  }
  if (opts.globals) {
    injectedGlobals = injectedGlobals || {};
    for (const [k, v] of Object.entries(opts.globals)) {
      injectedGlobals[k] = { had: k in globalThis, prev: globalThis[k] };
      globalThis[k] = v;
    }
  }
  try {
    const url = inlineModule(abs);
    const module = await import(url); // data URL import 不落缓存，无跨用例污染
    return { ok: true, module };
  } catch (e) {
    return { ok: false, kind: 'IMPORT_ERROR', message: `${e.name}: ${e.message}`.slice(0, 300) };
  }
}

/** 目标接口缺失/行为断言失败的统一 FAIL 文案（verify-target 识别 NOT_IMPLEMENTED 前缀） */
export function notImplemented(targetIds, firstBreakpoint) {
  return `NOT_IMPLEMENTED: [${targetIds}] 第一断点: ${firstBreakpoint}`;
}
