#!/usr/bin/env node
// F023 / W3 static gate — 零本地持久化 + 已移除功能残留扫描.
//
// Canon:
//   - docs/specs/08_development/STORAGE_POLICY.md §1/§2 (Z-2 零本地持久化：无任何本地存储键、
//     无 App 主动文件写入)、§6 (剪贴板=瞬态通道，不算存储)、§8 (known_devices 落档/90 天 TTL/
//     20 条上限/首页 prune 不得复刻)
//   - docs/specs/02_product/PRD.md 2026-09-02 变更记录 (PAGE004 历史页、首页「已配置 Smart HID」
//     面板、本地存储键 smart_ble.smart_hid.known_devices.v1 随 F023 一并移除)
//   - AGENTS.md: Smart HID 仅允许 pages/hid/{add,detail,diagnostics} 三个二级路由，不占 Tab
//
// Scope decisions (documented, deterministic):
//   - Active product source trees only (AGENTS.md platform tiers; apps/ios 仅 Sources).
//     ESP32 firmware is a test peripheral, not a product app — out of scope.
//   - Tests are excluded: W1 rewrote known-devices/history tests as reverse guards that
//     legitimately name banned APIs to assert absence.
//   - Comment lines (// /* *) are skipped; only executable lines count.
//   - Guard constants that list banned API names as strings (e.g. uniapp
//     provisioning.js FORBIDDEN_TOKEN_SINKS) do not match because every pattern requires
//     call syntax.

import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

// Product source sets: name → { dir, exts[], skipDirs[] }
const SOURCES = [
  { name: 'uniapp', dir: 'apps/uniapp', exts: ['.vue', '.js', '.ts'], skipDirs: ['node_modules', 'unpackage'] },
  { name: 'flutter', dir: 'apps/flutter/lib', exts: ['.dart'], skipDirs: [] },
  { name: 'android', dir: 'apps/android/app/src/main', exts: ['.kt', '.xml'], skipDirs: [] },
  { name: 'ios', dir: 'apps/ios/Sources', exts: ['.swift'], skipDirs: [] },
  { name: 'electron', dir: 'apps/desktop/electron', exts: ['.js', '.ts', '.html'], skipDirs: ['node_modules'] },
  { name: 'tauri-web', dir: 'apps/desktop/tauri/src', exts: ['.js', '.ts', '.html'], skipDirs: [] },
  { name: 'tauri-rs', dir: 'apps/desktop/tauri/src-tauri/src', exts: ['.rs'], skipDirs: [] },
  { name: 'macos', dir: 'apps/desktop/macos', exts: ['.swift'], skipDirs: ['.build'] },
  { name: 'avalonia', dir: 'apps/desktop/avalonia', exts: ['.cs'], skipDirs: [] },
  { name: 'core', dir: 'core', exts: ['.js', '.ts'], skipDirs: ['node_modules', 'tests'] },
]

const DEFAULT_SKIP_DIRS = ['node_modules', 'unpackage', 'build', '.dart_tool', 'target', 'dist', '.git', '.gradle']

const LANG_BY_EXT = {
  '.js': 'js', '.ts': 'js', '.html': 'js', '.vue': 'js',
  '.dart': 'dart',
  '.kt': 'kt', '.xml': 'kt',
  '.swift': 'swift',
  '.rs': 'rs',
  '.cs': 'cs',
}

const RULES = [
  {
    id: 'z2-storage-call',
    desc: 'storage/file-persistence API call sites (STORAGE_POLICY Z-2)',
    langs: {
      js: [
        /\b(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem|clear)\s*\(/,
        /\bindexedDB\s*\.\s*open\s*\(/,
        /\b(?:uni|wx)\s*\.\s*(?:set|get|remove|clear)Storage(?:Sync)?\s*\(/,
        /\bplus\s*\.\s*storage\b/,
        /\b(?:writeFile|writeFileSync)\s*\(/,
      ],
      dart: [
        /\bSharedPreferences\b/,
        /getApplicationDocumentsDirectory\s*\(/,
        /\bwriteAs(?:String|Bytes)\s*\(/,
        /\bHive\s*\.\s*(?:openBox|init)\b/,
        /\bsqflite\b/,
      ],
      kt: [
        /\bgetSharedPreferences\s*\(/,
        /\bSharedPreferences\b/,
        /\bDataStore\b/,
        /\bRoomDatabase\b/,
        /\bopenFileOutput\s*\(/,
        /\.(?:filesDir|cacheDir)\b/,
      ],
      swift: [
        /\bUserDefaults\b/,
        /\bNSKeyedArchiver\b/,
      ],
      rs: [
        /\bfs::write\s*\(/,
        /\bFile::create\s*\(/,
        /\btauri_plugin_(?:store|fs)\b/,
      ],
      cs: [
        /\bPreferences\b/,
        /\bFile\s*\.\s*Write/,
      ],
    },
  },
  {
    id: 'f023-legacy-key',
    desc: 'removed known_devices persistence key / homepage prune API (STORAGE_POLICY §8)',
    langs: {
      js: [/smart_ble\.smart_hid\.known_devices/, /known_devices\.v1/, /pruneKnownDevices/],
      dart: [/smart_ble\.smart_hid\.known_devices/, /knownDevices\.v1/, /pruneKnownDevices/],
      kt: [/smart_ble\.smart_hid\.known_devices/, /pruneKnownDevices/],
      swift: [/smart_ble\.smart_hid\.known_devices/, /pruneKnownDevices/],
      rs: [/smart_ble\.smart_hid\.known_devices/, /pruneKnownDevices/],
      cs: [/smart_ble\.smart_hid\.known_devices/, /pruneKnownDevices/],
    },
  },
  {
    id: 'page004-route',
    desc: 'PAGE004 hid history page residue (PRD 2026-09-02: 不得复刻)',
    langs: {
      js: [/hid\/history/, /\bHidHistory\b/, /\bhidHistory\b/],
      dart: [/\bHidHistory\w*/],
      kt: [/\bHidHistory\w*/, /hid_history/],
      swift: [/\bHidHistory\w*/],
      rs: [/\bHidHistory\w*/, /hid_history/],
      cs: [/\bHidHistory\w*/],
    },
  },
  {
    id: 'homepage-panel-string',
    desc: 'removed homepage panel strings 「已配置 Smart HID」/「全部历史」(PRD 2026-09-02)',
    langs: {
      js: [/已配置\s*Smart\s*HID/, /全部历史/],
      dart: [/已配置\s*Smart\s*HID/, /全部历史/],
      kt: [/已配置\s*Smart\s*HID/, /全部历史/],
      swift: [/已配置\s*Smart\s*HID/, /全部历史/],
      rs: [/已配置\s*Smart\s*HID/, /全部历史/],
      cs: [/已配置\s*Smart\s*HID/, /全部历史/],
    },
  },
]

const HID_ROUTE_ALLOWLIST = new Set(['pages/hid/add', 'pages/hid/detail', 'pages/hid/diagnostics'])

function isTestPath(relPath, base) {
  const rel = relative(base, relPath).replaceAll('\\', '/')
  if (/(^|\/)(test|tests|androidTest|__tests__)(\/|$)/.test(rel)) return true
  const name = rel.split('/').pop()
  return /\.(test|spec)\.[^.]+$/.test(name) || /_test\.dart$/.test(name) || /Test\.kt$/.test(name)
}

function isCommentLine(line) {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')
}

async function walk(dir, exts, skipDirs, out = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (skipDirs.includes(e.name)) continue
      await walk(p, exts, skipDirs, out)
    } else if (exts.some((x) => e.name.endsWith(x))) {
      out.push(p)
    }
  }
  return out
}

const violations = []
let scannedFiles = 0

for (const src of SOURCES) {
  const abs = resolve(root, src.dir)
  const skip = [...new Set([...DEFAULT_SKIP_DIRS, ...src.skipDirs])]
  const files = await walk(abs, src.exts, skip)
  for (const file of files) {
    if (isTestPath(file, abs)) continue
    const lang = LANG_BY_EXT['.' + file.split('.').pop()]
    const text = await readFile(file, 'utf8')
    scannedFiles += 1
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (isCommentLine(line)) continue
      for (const rule of RULES) {
        const patterns = rule.langs[lang]
        if (!patterns) continue
        if (patterns.some((re) => re.test(line))) {
          violations.push({ rule: rule.id, file: relative(root, file).replaceAll('\\', '/'), line: i + 1, text: line.trim().slice(0, 160) })
          break // one report per line is enough
        }
      }
    }
  }
}

// Structural check: uniapp pages.json — Smart HID 三二级路由白名单 + 不占 Tab
try {
  const pagesJson = JSON.parse(await readFile(resolve(root, 'apps/uniapp/pages.json'), 'utf8'))
  const allPages = [...(pagesJson.pages || []), ...(pagesJson.subPackages || []).flatMap((s) => (s.pages || []).map((p) => ({ path: `${s.root}/${p.path}` })))]
  for (const p of allPages) {
    if (/^pages\/hid\//.test(p.path) && !HID_ROUTE_ALLOWLIST.has(p.path)) {
      violations.push({ rule: 'uniapp-hid-route', file: 'apps/uniapp/pages.json', line: 0, text: `hid route not in allowlist: ${p.path}` })
    }
  }
  for (const t of (pagesJson.tabBar || {}).list || []) {
    if (/^pages\/hid\//.test(t.pagePath)) {
      violations.push({ rule: 'uniapp-hid-route', file: 'apps/uniapp/pages.json', line: 0, text: `Smart HID must not occupy a tab: ${t.pagePath}` })
    }
  }
} catch (e) {
  console.error(`FAIL cannot parse apps/uniapp/pages.json: ${e.message}`)
  process.exit(1)
}

if (violations.length > 0) {
  console.error(`FAIL F023 zero-persistence & residue scan — ${violations.length} violation(s):`)
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}:${v.line}  ${v.text}`)
  }
  process.exit(1)
}

console.log(`F023 zero-persistence & residue PASS (${scannedFiles} product source files scanned; Z-2 storage calls / §8 known_devices / PAGE004 routes / homepage panel strings / uniapp hid-route allowlist all clean)`)
