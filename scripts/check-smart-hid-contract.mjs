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
// Hash the committed content identity (LF), not the working-tree checkout:
// Windows autocrlf checkouts carry CRLF bytes that differ from the locked digest.
const contractBytes = Buffer.from((await readFile(contractPath, 'utf8')).replace(/\r\n/g, '\n'), 'utf8')
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

// ---------------------------------------------------------------------------
// 跨语言测试向量单源（core/protocols/smart-hid-v1-vectors.json）与正典契约对锁：
// 常量漂移在这里拦截，parity 各线（js/dart/kotlin/swift）只消费向量、不自带常量。
// ---------------------------------------------------------------------------
const vectors = JSON.parse(await readFile(resolve(root, 'core/protocols/smart-hid-v1-vectors.json'), 'utf8'))
const vc = vectors.constants
const ble = contract.ble_provisioning
const vectorChecks = [
  ['serviceUuid/gatt', vc.serviceUuid === ble.gatt.service_uuid],
  ['serviceUuid/advertisement', vc.serviceUuid === ble.advertisement.service_uuid],
  ['charInfo', vc.characteristicUuids.info === ble.gatt.characteristics.info.uuid],
  ['charInput', vc.characteristicUuids.input === ble.gatt.characteristics.input.uuid],
  ['charStatus', vc.characteristicUuids.status === ble.gatt.characteristics.status.uuid],
  ['namePrefix', vc.namePrefix === ble.advertisement.name_prefix],
  ['protocolVersion', vc.protocolVersion === ble.device_info.protocol],
  ['candidateVersion', vc.candidateVersion === ble.candidate.version],
  ['defaultPairingPort', vc.defaultPairingPort === ble.candidate.optional.hub_port],
  ['tokenPattern', vc.tokenPattern === ble.candidate.token.pattern],
  ['qrScheme', vc.qrScheme === ble.qr.scheme],
  ['frame.maxChunkBytes', vc.frame.maxChunkBytes === ble.frame.payload_max_bytes],
  ['frame.maxAssembledBytes', vc.frame.maxAssembledBytes === ble.frame.assembly_max_bytes],
  ['frame.maxFrames', vc.frame.maxFrames === ble.frame.total_max],
  ['states', JSON.stringify(vc.states) === JSON.stringify(ble.states)],
  ['steps', JSON.stringify(vc.steps) === JSON.stringify(ble.steps)],
  ['errorCodes', JSON.stringify(vc.errorCodes) === JSON.stringify(ble.errors)]
]
for (const [name, ok] of vectorChecks) {
  if (!ok) throw new Error(`Smart HID vectors drifted from canonical contract: ${name}`)
}
if (JSON.stringify(Object.keys(vc.errorHints)) !== JSON.stringify(vc.errorCodes)) {
  throw new Error('Smart HID vectors errorHints keys must equal errorCodes')
}

console.log(`Smart HID contract lock PASS (${digest}, canonical ${lock.canonical_commit}, vectors ×${Object.values(vectors.suites).reduce((n, s) => n + s.cases.length, 0)} cases canon-locked)`)
