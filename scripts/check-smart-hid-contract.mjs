#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const lock = JSON.parse(await readFile(resolve(root, 'core/protocols/smart-hid-contract.lock.json'), 'utf8'))
const canonicalRoot = process.env.SMART_HID_WORKSPACE
  ? resolve(process.env.SMART_HID_WORKSPACE)
  : resolve(root, '../Smart-HID-Workspace')
const contractPath = resolve(canonicalRoot, 'protocols/contracts/smart-hid-v1.json')
const contractBytes = await readFile(contractPath)
const digest = createHash('sha256').update(contractBytes).digest('hex')
if (digest !== lock.contract_sha256) {
  throw new Error(`Smart HID contract SHA-256 mismatch: got ${digest}, lock expects ${lock.contract_sha256}`)
}

const contract = JSON.parse(contractBytes)
if (contract.contract_version !== lock.contract_version) {
  throw new Error(`Smart HID contract version mismatch: got ${contract.contract_version}, lock expects ${lock.contract_version}`)
}
const mirror = await readFile(resolve(root, 'core/protocols/hid-provisioning-protocol.ts'), 'utf8')
const required = [
  contract.ble_provisioning.gatt.service_uuid,
  ...Object.values(contract.ble_provisioning.gatt.characteristics).map(({ uuid }) => uuid),
  contract.ble_provisioning.advertisement.name_prefix,
  contract.ble_provisioning.qr.scheme,
  contract.ble_provisioning.candidate.token.pattern
]
for (const value of required) {
  if (!mirror.includes(value)) throw new Error(`Smart HID TypeScript mirror is missing canonical value: ${value}`)
}
console.log(`Smart HID contract lock PASS (${digest}, canonical ${lock.canonical_commit})`)
