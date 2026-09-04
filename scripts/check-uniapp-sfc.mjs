#!/usr/bin/env node
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const uniappRoot = join(root, 'apps/uniapp')

// Locate HBuilderX's bundled @vue/compiler-sfc across hosts:
// 1. UNIAPP_COMPILER_SFC_PATH env (exact package path)
// 2. HBUILDERX_CLI env -> derive the install root
// 3. Common install roots per OS (macOS /Applications, Windows D:\ or Program Files)
async function resolveCompilerPath() {
  if (process.env.UNIAPP_COMPILER_SFC_PATH) return process.env.UNIAPP_COMPILER_SFC_PATH
  const relativeCompiler = 'plugins/uniapp-cli-vite/node_modules/@vue/compiler-sfc'
  const candidates = []
  if (process.env.HBUILDERX_CLI) candidates.push(resolve(dirname(process.env.HBUILDERX_CLI), relativeCompiler))
  if (process.platform === 'win32') {
    candidates.push('D:/HBuilderX', 'C:/Program Files/HBuilderX', 'C:/HBuilderX')
  } else {
    candidates.push('/Applications/HBuilderX.app/Contents/HBuilderX')
  }
  const candidateIsPackage = (base) => existsSync(join(base, 'package.json'))
  for (const base of candidates) {
    const candidate = base.endsWith(relativeCompiler) || base.endsWith('@vue/compiler-sfc')
      ? base
      : join(base, relativeCompiler)
    if (candidateIsPackage(candidate)) return candidate
  }
  // None found: return the first candidate path so the load error names it.
  return candidates[0].endsWith(relativeCompiler)
    ? candidates[0]
    : join(candidates[0], relativeCompiler)
}

const compilerPath = await resolveCompilerPath()

let parse
try {
  ({ parse } = createRequire(import.meta.url)(compilerPath))
} catch (error) {
  throw new Error(
    `Unable to load @vue/compiler-sfc from ${compilerPath}. `
      + 'Install HBuilderX or set UNIAPP_COMPILER_SFC_PATH to its compiler package.',
    { cause: error }
  )
}

const vueFiles = []

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'unpackage') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path)
    else if (entry.name.endsWith('.vue')) vueFiles.push(path)
  }
}

await walk(uniappRoot)

if (vueFiles.length === 0) {
  throw new Error(`No Vue SFC files found under ${uniappRoot}`)
}

const failures = []
for (const file of vueFiles) {
  const source = await readFile(file, 'utf8')
  const { errors } = parse(source, { filename: file })
  for (const error of errors) {
    failures.push(`${relative(root, file)}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  throw new Error(`UniApp SFC parse failures:\n${failures.join('\n')}`)
}

console.log(`UniApp SFC parse PASS (${vueFiles.length} files)`)
