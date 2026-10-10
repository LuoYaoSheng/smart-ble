#!/usr/bin/env node
// F030 / W5 static gate — 不做国际化：产品级语言切换与 i18n 接线残留扫描.
//
// Canon:
//   - docs/specs/02_product/PRD.md §5 F030（locale 文件就绪但未接线 · UI 全中文硬编码）、
//     §8 R30（现状确认：UI 文案全部硬编码中文）、2026-09-02 变更记录（P-05/F030 i18n 关闭：不做）
//   - docs/plans/2026-09-09-windows-first-mac-followup-development-plan.md W5：
//     「F030：明确不做国际化，增加静态守卫，禁止重新出现产品级语言切换」
//
// Scope decisions (documented, deterministic):
//   - Active product source trees only (AGENTS.md platform tiers; apps/ios 仅 Sources).
//   - Tests are excluded; comment lines (// /* *) are skipped.
//   - apps/flutter/lib/l10n/** is ALLOWLISTED: PRD F030 明示「locale 文件就绪但未接线」
//     是在册现状——脚手架文件可存在，但产品代码（l10n 目录之外）不得引用 AppLocalizations
//     做任何接线（delegate 挂载 / .of(context) 取串均禁）。
//   - Flutter main.dart 的 GlobalMaterialLocalizations/GlobalWidgets/GlobalCupertino
//     delegates + supportedLocales 是框架级基建（Material 内建控件串本地化，FLUTTER-G1-004
//     在册决议），不构成产品级语言切换：产品文案仍硬编码中文，无语言切换入口 → 允许。
//   - localeCompare 是字符串排序 API，与 i18n 无关，不在规则内。
//   - 结构检查：各线 locale 资产目录（uniapp locale(s)/、desktop locales/、
//     Android values-<locale> 限定符目录）必须不存在。

import { access, readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

const SOURCES = [
  { name: 'uniapp', dir: 'apps/uniapp', exts: ['.vue', '.js', '.ts'], skipDirs: ['node_modules', 'unpackage'] },
  { name: 'flutter', dir: 'apps/flutter/lib', exts: ['.dart'], skipDirs: [], allowDirs: ['l10n'] },
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
    id: 'i18n-machinery',
    desc: 'i18n 引擎/字典机制残留（I18nManager、data-i18n、vue-i18n、setLocale、NSLocalizedString…）',
    langs: {
      js: [
        /\bI18n\w*\b/,
        /\bwindow\.i18n\b/,
        /data-i18n/,
        /language-changed/,
        /vue-i18n/,
        /\b(?:uni|wx)\s*\.\s*setLocale\s*\(/,
        /\bi18n\s*\.\s*t\s*\(/,
        /\/locales\/[\w.-]+\.json/,
      ],
      dart: [
        /AppLocalizations/,
        /\bI18n\w*\b/,
      ],
      kt: [
        /\bI18n\w*\b/,
        /AppCompatDelegate\s*\.\s*setApplicationLocales/,
        /\bLocaleListCompat\b/,
      ],
      swift: [
        /\bI18n\w*\b/,
        /\bNSLocalizedString\b/,
        /String\s*\(\s*localized\s*:/,
      ],
      rs: [
        /\bI18n\w*\b/,
        /rust_i18n/,
      ],
      cs: [
        /\bI18n\w*\b/,
        /\bIStringLocalizer\b/,
      ],
    },
  },
  {
    id: 'language-switch-ui',
    desc: '产品级语言切换入口（UI 文案/回调名）',
    langs: {
      js: [/切换语言/, /语言切换/, /语言设置/, /\bswitchLanguage\b/, /\bchangeLanguage\b/],
      dart: [/切换语言/, /语言切换/, /语言设置/, /\bswitchLanguage\b/, /\bchangeLanguage\b/],
      kt: [/切换语言/, /语言切换/, /语言设置/, /\bswitchLanguage\b/, /\bchangeLanguage\b/],
      swift: [/切换语言/, /语言切换/, /语言设置/, /\bswitchLanguage\b/, /\bchangeLanguage\b/],
      rs: [/切换语言/, /语言切换/, /语言设置/, /\bswitchLanguage\b/, /\bchangeLanguage\b/],
      cs: [/切换语言/, /语言切换/, /语言设置/, /\bswitchLanguage\b/, /\bchangeLanguage\b/],
    },
  },
  {
    id: 'android-locale-config',
    desc: 'Android 每应用语言（localeConfig / android:localeConfig）',
    langs: {
      kt: [/android:localeConfig/, /\blocaleConfig\b/],
    },
  },
]

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

function inAllowDir(file, absBase, allowDirs) {
  if (!allowDirs || allowDirs.length === 0) return false
  const rel = relative(absBase, file).replaceAll('\\', '/')
  return allowDirs.some((d) => rel === d || rel.startsWith(`${d}/`))
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
    if (inAllowDir(file, abs, src.allowDirs)) continue
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
          break
        }
      }
    }
  }
}

// Structural checks: locale 资产必须不存在
async function assertNoEntry(path, why) {
  try {
    await access(resolve(root, path))
    violations.push({ rule: 'locale-asset', file: path, line: 0, text: why })
  } catch {
    /* absent = pass */
  }
}

await assertNoEntry('apps/uniapp/locale', 'uni-app 官方 i18n 目录（locale/index.js）不得存在')
await assertNoEntry('apps/uniapp/locales', 'uniapp locale 字典目录不得存在')
await assertNoEntry('apps/desktop/electron/public/locales', 'E-WIN locale 字典不得存在（F030 移除后不得回潮）')
await assertNoEntry('apps/desktop/tauri/src/locales', 'T-WIN locale 字典不得存在（F030 移除后不得回潮）')
await assertNoEntry('apps/desktop/electron/public/I18nManager.js', 'E-WIN I18nManager 不得存在（F030 移除后不得回潮）')
await assertNoEntry('apps/desktop/tauri/src/I18nManager.js', 'T-WIN I18nManager 不得存在（F030 移除后不得回潮）')

// Android res/ 下不得出现 values-<locale> 限定符目录（values-night 等非语言限定符不匹配）
try {
  const resDir = resolve(root, 'apps/android/app/src/main/res')
  for (const e of await readdir(resDir, { withFileTypes: true })) {
    if (e.isDirectory() && /^values-[a-z]{2}(-r[A-Z]{2})?$/.test(e.name)) {
      violations.push({ rule: 'locale-asset', file: `apps/android/app/src/main/res/${e.name}`, line: 0, text: 'Android 语言限定符资源目录不得存在（F030 不做国际化）' })
    }
  }
} catch {
  /* res dir absent = nothing to check */
}

if (violations.length > 0) {
  console.error(`FAIL F030 no-i18n gate — ${violations.length} violation(s):`)
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}:${v.line}  ${v.text}`)
  }
  process.exit(1)
}

console.log(`F030 no-i18n gate PASS (${scannedFiles} product source files scanned; i18n machinery / language-switch UI / Android localeConfig / locale assets all clean; flutter l10n scaffold documented-unwired allowlist)`)
