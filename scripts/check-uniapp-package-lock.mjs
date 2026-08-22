import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appDir = path.join(root, 'apps/uniapp')
const packageJson = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'))
const packageLock = JSON.parse(fs.readFileSync(path.join(appDir, 'package-lock.json'), 'utf8'))

assert.ok(packageLock.packages?.[''], 'package-lock.json is missing its root package entry')
assert.deepEqual(
	packageLock.packages[''].dependencies || {},
	packageJson.dependencies || {},
	'UniApp package.json dependencies do not match package-lock.json; run npm install --package-lock-only'
)

console.log('UniApp package lock gate PASS')
