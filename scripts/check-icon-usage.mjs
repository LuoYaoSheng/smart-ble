#!/usr/bin/env node
// UI-PARITY-G0 · 图标使用门禁（docs/specs/07_design_system/ICON_CATALOG.md / ICON_USAGE_MATRIX.md）
//
// 检查（业务 UI 范围）：
//   1. Flutter：无 Icons.* / CupertinoIcons.* 字体图标
//   2. UniApp：无 Unicode 字符图标（✓ ✕ ▶ ▼ › × ⌁ 等作 UI 图标；
//      例外：'·'（正典 stIcon active/pending 点位与文案分隔符，ICON_USAGE_MATRIX §11 登记）
//   3. UniApp：无未登记 <image> 图片图标（登记资产见 ICON_CATALOG §6）
//   4. 双端镜像一致：uniapp APP_ICON_NAMES === flutter kAppIconNames（35 枚受锁定镜像）
//   5. 业务代码引用的 icon id 均在目录内（非法 id 会静默兜底 info，故静态拦截）
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const uniappRoot = join(root, 'apps/uniapp')
const flutterRoot = join(root, 'apps/flutter')

const failures = []

async function walk(directory, accept, skip = []) {
  const out = []
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    if (['node_modules', 'unpackage', '.git', 'build', '.dart_tool'].includes(entry.name)) continue
    if (skip.includes(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path, accept, skip)))
    else if (accept(entry.name)) out.push(path)
  }
  return out
}

// 注释剥离（//、/* */、<!-- -->）——注释中的符号不作违例
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, '')
}

// ── 1. Flutter：无字体图标 ────────────────────────────────────────────────
const dartFiles = await walk(join(flutterRoot, 'lib'), (n) => n.endsWith('.dart'))
for (const file of dartFiles) {
  const source = stripComments(await readFile(file, 'utf8'))
  const lines = source.split('\n')
  lines.forEach((line, i) => {
    if (/\bIcons\.[a-zA-Z]/.test(line) || /\bCupertinoIcons\.[a-zA-Z]/.test(line)) {
      failures.push(`${relative(root, file)}:${i + 1}: Flutter 字体图标违例 → ${line.trim().slice(0, 80)}`)
    }
  })
}

// ── 2. UniApp：无 Unicode 字符图标 ────────────────────────────────────────
const BANNED_SYMBOLS = /[\u2022\u2023\u25A0\u25A1\u25B2\u25B3\u25B4\u25B6\u25B7\u25BC\u25BD\u25BE\u25C0\u25C1\u25C6\u25C7\u25CF\u25CB\u2605\u2606\u2713\u2714\u2715\u2717\u2718\u203A\u2039\u2326\u2301\u00D7\u2764\u23F5\u23F8\u23F9\u27F3\u21BB\u2B50\u26A0]/g
const vueFiles = await walk(join(uniappRoot, 'pages'), (n) => n.endsWith('.vue'))
vueFiles.push(...(await walk(join(uniappRoot, 'components'), (n) => n.endsWith('.vue'))))
for (const file of vueFiles) {
  const source = stripComments(await readFile(file, 'utf8'))
  const lines = source.split('\n')
  lines.forEach((line, i) => {
    const hit = line.match(BANNED_SYMBOLS)
    if (hit) {
      failures.push(`${relative(root, file)}:${i + 1}: Unicode 字符图标违例 [${hit.join(' ')}] → ${line.trim().slice(0, 80)}`)
    }
  })
}

// ── 3. UniApp：未登记 <image> 图标 ────────────────────────────────────────
const REGISTERED_IMAGE_ASSETS = [
  'static/logo.png', 'static/share.png',
  'static/tabs/scan.png', 'static/tabs/scan_active.png',
  'static/tabs/link.png', 'static/tabs/link_active.png',
  'static/tabs/cast.png', 'static/tabs/cast_active.png',
  'static/tabs/info.png', 'static/tabs/info_active.png',
]
for (const file of vueFiles) {
  const source = await readFile(file, 'utf8')
  const lines = source.split('\n')
  lines.forEach((line, i) => {
    const m = line.match(/<(image|img)\b[^>]*?(?:src|:src)="([^"]+)"/)
    if (m) {
      const src = m[2].replace(/^@\//, '').replace(/^\.\.\//, '').replace(/^\//, '')
      if (!REGISTERED_IMAGE_ASSETS.some((a) => src.endsWith(a))) {
        failures.push(`${relative(root, file)}:${i + 1}: 未登记图片资产 <image src="${m[2]}">（ICON_CATALOG §6）`)
      }
    }
  })
}

// ── 3b. tabBar PNG 烤色校验 ──────────────────────────────────────────────
// 2026-09-09 真机复现缺陷：gen-tabs 曾丢弃 <g> 开标签的 stroke=currentColor，
// 产物全黑且常态/激活同色（静默失败）。此处纯 Node 解码 PNG 逐对校验。
import { inflateSync } from 'node:zlib'

function decodeRgbaPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png')
  let pos = 8
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]; interlace = data[12]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += len + 12
  }
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`unsupported png (depth=${bitDepth} color=${colorType} interlace=${interlace})`)
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const out = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    const cur = out.subarray(y * stride, (y + 1) * stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0
      const b = prev ? prev[x] : 0
      const c = x >= 4 && prev ? prev[x - 4] : 0
      let v = line[x]
      if (filter === 1) v = (v + a) & 0xff
      else if (filter === 2) v = (v + b) & 0xff
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff
      }
      cur[x] = v
    }
  }
  return { width, height, data: out }
}

const TAB_EXPECT = { normal: [0x7b, 0x8f, 0xa5], active: [0x1b, 0x6d, 0xff] }
for (const base of ['scan', 'link', 'cast', 'info']) {
  const rel = `apps/uniapp/static/tabs/${base}.png / ${base}_active.png`
  try {
    const samples = {}
    for (const [file, kind] of [[`${base}.png`, 'normal'], [`${base}_active.png`, 'active']]) {
      const png = decodeRgbaPng(await readFile(join(uniappRoot, 'static/tabs', file)))
      const counts = new Map()
      for (let i = 0; i < png.data.length; i += 4) {
        if (png.data[i + 3] < 200) continue
        const key = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`
        counts.set(key, (counts.get(key) || 0) + 1)
      }
      const top = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]
      if (!top) throw new Error(`${file}: 无不透明像素（空图）`)
      samples[kind] = top[0].split(',').map(Number)
      const expect = TAB_EXPECT[kind]
      if (Math.abs(samples[kind][0] - expect[0]) > 4 || Math.abs(samples[kind][1] - expect[1]) > 4 || Math.abs(samples[kind][2] - expect[2]) > 4) {
        throw new Error(`${file}: 主色 rgb(${samples[kind]}) ≠ 烤色目标 rgb(${expect})（烤色失败/黑块回归）`)
      }
    }
    if (samples.normal.join() === samples.active.join()) {
      throw new Error(`${rel}: 常态与激活同色（烤色空操作回归）`)
    }
  } catch (error) {
    failures.push(`tabBar 资产校验 ${rel}: ${error.message}`)
  }
}

// ── 4. 双端镜像一致 ──────────────────────────────────────────────────────
const jsMirror = await readFile(join(uniappRoot, 'services/design/app-icons.js'), 'utf8')
const dartMirror = await readFile(join(flutterRoot, 'lib/core/design/app_icons.dart'), 'utf8')
const jsNames = [...jsMirror.matchAll(/APP_ICON_NAMES\s*=\s*\[([^\]]*)\]/g)][0]?.[1]
  .split(',').map((x) => x.trim().replace(/['"]/g, '')).filter(Boolean)
const dartNames = [...dartMirror.matchAll(/kAppIconNames\s*=\s*(?:<String>)?\[([^\]]*)\]/g)][0]?.[1]
  .split(',').map((x) => x.trim().replace(/['"]/g, '')).filter(Boolean)
if (!jsNames || !dartNames) {
  failures.push('icon mirror: 无法解析 APP_ICON_NAMES / kAppIconNames')
} else {
  const onlyJs = jsNames.filter((n) => !dartNames.includes(n))
  const onlyDart = dartNames.filter((n) => !jsNames.includes(n))
  if (onlyJs.length || onlyDart.length) {
    failures.push(`icon mirror 不同步: uniapp-only=[${onlyJs}] flutter-only=[${onlyDart}]`)
  }
}

// ── 5. 业务代码 icon id 在目录内 ─────────────────────────────────────────
const catalog = jsNames || dartNames || []
const idPatterns = [
  // uniapp: 仅校验静态 name="id" / ill="name"（动态 :name 绑定不作静态判定）
  { re: /<(?:app-icon|AppIcon)\b[^>]*\sname="([a-z0-9-]+)"/g, files: vueFiles },
  { re: /<(?:app-ill|AppIll)\b[^>]*\sill="([a-z0-9-]+)"/g, files: vueFiles },
]
for (const { re, files } of idPatterns) {
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const m of source.matchAll(re)) {
      const ok = re.source.includes('ill')
        ? ['radar', 'link', 'doc', 'box'].includes(m[1])
        : catalog.includes(m[1])
      if (!ok) failures.push(`${relative(root, file)}: 未登记 icon id "${m[1]}"`)
    }
  }
}
const dartUsage = [
  { re: /\bAppIcon\(\s*'([a-z0-9-]+)'/g, list: catalog },
  { re: /\bAppIll\(\s*'([a-z0-9-]+)'/g, list: ['radar', 'link', 'doc', 'box'] },
]
for (const { re, list } of dartUsage) {
  for (const file of dartFiles) {
    const source = stripComments(await readFile(file, 'utf8'))
    for (const m of source.matchAll(re)) {
      if (!list.includes(m[1])) failures.push(`${relative(root, file)}: 未登记 icon id "${m[1]}"`)
    }
  }
}

if (failures.length > 0) {
  console.error(`check-icon-usage: FAIL (${failures.length})`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`check-icon-usage: PASS (dart ${dartFiles.length} 文件 · vue ${vueFiles.length} 文件 · 目录 ${catalog.length} 枚 · 镜像同步)`)
