/**
 * Smart HID BLE Provisioning Protocol 公开定义
 *
 * 事实源：Smart-HID-Workspace `protocols/ble/PROVISIONING_V1.md`（canonical）。
 * 本文件是其在 BLE Toolkit+ 侧的镜像定义，两侧同步修改。
 * 历史版本（v1.1，Protocomm endpoint + fe5a UUID + 数字错误码）已废弃，
 * 溯源见 Smart-HID-Workspace docs/archive/03。
 *
 * BLE 只负责：设备发现 / 配网 / 状态查询。
 * HID 实时控制不走 BLE（走 ControlHub HTTP → MQTT → ESP32）。
 *
 * @module Protocols/SmartHID/Provisioning
 */

/* ------------------------------------------------------------------ */
/* GATT 结构（PROVISIONING_V1 §2）                                     */
/* ------------------------------------------------------------------ */

/**
 * Smart HID Provisioning Service UUID（128-bit，广播中携带，可据此过滤扫描）
 */
export const SMART_HID_PROVISIONING_SERVICE_UUID = '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'

/**
 * 三个 GATT 特征（UUID 仅末尾一段不同：1002 info / 1003 input / 1004 status）
 */
export const SMART_HID_CHARACTERISTIC_UUIDS = {
  /** Device Info：read + notify */
  INFO: '9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04',
  /** Provision Input：write（要求加密链路，bonding Just Works） */
  INPUT: '9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04',
  /** Provision Status：read + notify */
  STATUS: '9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04'
} as const

/**
 * 设备名前缀（Scan Response 广播名形如 SHID-ABCD1234，= device_id 8 位尾码）
 */
export const SMART_HID_NAME_PREFIX = 'SHID-'

/* ------------------------------------------------------------------ */
/* 常量                                                                 */
/* ------------------------------------------------------------------ */

export const PROVISIONING_CONSTANTS = {
  /** Provision Input JSON 的 v 字段（协议版本，当前仅 1） */
  CANDIDATE_VERSION: 1,
  /** Device Info 中的 protocol 字段 */
  PROTOCOL_VERSION: '1.0',
  /** Device ID 正则（HID- + 8 位大写字母数字） */
  DEVICE_ID_PATTERN: /^HID-[A-Z0-9]{8}$/,
  /** 广播设备名正则（SHID- + 6~8 位） */
  DEVICE_NAME_PATTERN: /^SHID-[A-Z0-9]{6,8}$/,
  /** ControlHub Pairing 默认端口 */
  DEFAULT_PAIRING_PORT: 17892,
  /** Pairing token 形态（32 位小写十六进制） */
  TOKEN_PATTERN: /^[0-9a-f]{32}$/,
  /** 配网 QR URI scheme */
  QR_SCHEME: 'shid://pair'
} as const

/* ------------------------------------------------------------------ */
/* Provision Input（一次分帧写入的完整 candidate，PROVISIONING_V1 §4）   */
/* ------------------------------------------------------------------ */

/**
 * 配网候选配置。V1 为**单次写入**（Wi-Fi + hub + token 一个 JSON），
 * 设备侧 stage 到 NVS pending、全链路成功才 promote 为 active——
 * 因此不存在「先写 Wi-Fi 再写 hub」的两段式（那是 v1.1 旧设计）。
 */
export interface ProvisionCandidateInput {
  wifi_ssid: string
  wifi_password: string
  /** ControlHub LAN 地址（来自配对 QR） */
  hub_host: string
  /** 可省略，默认 17892 */
  hub_port?: number
  /** ControlHub pairing session 一次性 token（5 分钟） */
  token: string
}

/** 组装后的 Provision Input JSON 形态 */
export interface ProvisionCandidate extends ProvisionCandidateInput {
  v: 1
}

/**
 * 构造并发送用的 candidate JSON 字符串。
 * 校验失败抛 Error（UI 层捕获后提示用户检查输入）。
 */
export function buildProvisionCandidateJson(input: ProvisionCandidateInput): string {
  const ssid = String(input?.wifi_ssid || '').trim()
  const password = String(input?.wifi_password ?? '')
  const host = String(input?.hub_host || '').trim()
  const token = String(input?.token || '').trim()
  const port = Number(input?.hub_port ?? PROVISIONING_CONSTANTS.DEFAULT_PAIRING_PORT)

  if (!ssid) throw new Error('wifi_ssid 不能为空')
  if (ssid.length > 32) throw new Error('wifi_ssid 超长（≤32 字符）')
  if (password.length > 64) throw new Error('wifi_password 超长（≤64 字符）')
  if (!host) throw new Error('hub_host 不能为空（请检查配对二维码）')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('hub_port 非法')
  if (!PROVISIONING_CONSTANTS.TOKEN_PATTERN.test(token)) throw new Error('token 形态非法（需 32 位十六进制）')

  return JSON.stringify({ v: 1, wifi_ssid: ssid, wifi_password: password, hub_host: host, hub_port: port, token })
}

/* ------------------------------------------------------------------ */
/* 配对 QR（PROVISIONING_V1 §1）                                        */
/* ------------------------------------------------------------------ */

/** QR 解析结果（敏感：token 仅内存持有，不持久化） */
export interface PairingQrPayload {
  token: string
  host: string
  port: number
}

/**
 * 解析 ControlHub 动态配对二维码载荷：
 *   shid://pair?token=<32hex>&host=<hub-lan-ip>&port=<17892>
 *
 * 解析失败返回 null（不抛错，扫码流程按「非 Smart HID 码」处理）。
 */
export function parsePairingQrPayload(text: string): PairingQrPayload | null {
  const s = String(text || '').trim()
  const scheme = PROVISIONING_CONSTANTS.QR_SCHEME
  if (s.toLowerCase().indexOf(scheme) !== 0) return null
  const query = s.slice(scheme.length)
  if (query && query[0] !== '?' && query[0] !== '&') return null

  const params: Record<string, string> = {}
  query.replace(/^[?&]/, '').split('&').forEach((kv) => {
    if (!kv) return
    const eq = kv.indexOf('=')
    if (eq <= 0) return
    params[decodeURIComponent(kv.slice(0, eq)).toLowerCase()] = decodeURIComponent(kv.slice(eq + 1))
  })

  const token = (params.token || '').toLowerCase()
  const host = (params.host || '').trim()
  if (!PROVISIONING_CONSTANTS.TOKEN_PATTERN.test(token)) return null
  if (!host || /[\s/]/.test(host)) return null
  let port = PROVISIONING_CONSTANTS.DEFAULT_PAIRING_PORT
  if (params.port != null && params.port !== '') {
    const p = Number(params.port)
    if (!Number.isInteger(p) || p < 1 || p > 65535) return null
    port = p
  }
  return { token, host, port }
}

/* ------------------------------------------------------------------ */
/* Device Info / Provision Status（PROVISIONING_V1 §5 §6）              */
/* ------------------------------------------------------------------ */

/** Device Info 特征返回（读 / notify） */
export interface SmartHidDeviceInfo {
  product: string
  protocol: string
  device_id: string
  firmware: string
  state: string
  provisioned: boolean
}

/** 设备侧状态机取值（provisioning 组件状态） */
export const PROVISIONING_STATES = [
  'boot', 'load_config', 'unprovisioned', 'provisioning', 'connecting_wifi',
  'pairing', 'mqtt_connecting', 'ready', 'recovery', 'error'
] as const
export type ProvisioningState = (typeof PROVISIONING_STATES)[number]

/** 配网过渡步骤取值 */
export const PROVISIONING_STEPS = [
  'received', 'connecting_wifi', 'wifi_connected', 'pairing',
  'pairing_success', 'mqtt_connecting', 'ready'
] as const
export type ProvisioningStep = (typeof PROVISIONING_STEPS)[number]

/** Provision Status 特征返回（读 / notify） */
export interface SmartHidProvisionStatus {
  state: string
  step: string
  error: string | null
}

/** 解析 Device Info JSON（防御式；非法返回 null） */
export function parseDeviceInfo(text: string): SmartHidDeviceInfo | null {
  try {
    const o = JSON.parse(String(text || ''))
    if (!o || typeof o !== 'object') return null
    if (typeof o.device_id !== 'string' || !o.device_id) return null
    return {
      product: String(o.product || ''),
      protocol: String(o.protocol || ''),
      device_id: o.device_id,
      firmware: String(o.firmware || ''),
      state: String(o.state || ''),
      provisioned: Boolean(o.provisioned)
    }
  } catch {
    return null
  }
}

/** 解析 Provision Status JSON（防御式；非法返回 null） */
export function parseProvisionStatus(text: string): SmartHidProvisionStatus | null {
  try {
    const o = JSON.parse(String(text || ''))
    if (!o || typeof o !== 'object') return null
    return {
      state: String(o.state || ''),
      step: String(o.step || ''),
      error: o.error == null ? null : String(o.error)
    }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* 错误码（PROVISIONING_V1 §6，字符串，稳定勿改；可扩展新码）            */
/* ------------------------------------------------------------------ */

export const PROVISIONING_ERROR_CODES = {
  INVALID_PAYLOAD: 'invalid_payload',
  WIFI_FAILED: 'wifi_failed',
  CONTROLHUB_UNREACHABLE: 'controlhub_unreachable',
  PAIRING_INVALID: 'pairing_invalid',
  PAIRING_EXPIRED: 'pairing_expired',
  PAIRING_USED: 'pairing_used',
  MQTT_INVALID: 'mqtt_invalid',
  STORAGE_FAILED: 'storage_failed'
} as const
export type ProvisioningErrorCode = (typeof PROVISIONING_ERROR_CODES)[keyof typeof PROVISIONING_ERROR_CODES]

/** 错误码 → 客户端提示（PROVISIONING_V1 §6 表；新增档案可扩展自己的码表） */
export const PROVISIONING_ERROR_HINTS: Record<string, string> = {
  [PROVISIONING_ERROR_CODES.INVALID_PAYLOAD]: '配置内容非法，请检查输入',
  [PROVISIONING_ERROR_CODES.WIFI_FAILED]: 'Wi-Fi 连接失败，请检查 SSID / 密码',
  [PROVISIONING_ERROR_CODES.CONTROLHUB_UNREACHABLE]: '连不上 ControlHub，请确认它在运行、地址可达',
  [PROVISIONING_ERROR_CODES.PAIRING_INVALID]: '配对码无效，请重新扫码',
  [PROVISIONING_ERROR_CODES.PAIRING_EXPIRED]: '配对码已过期，请重新扫码',
  [PROVISIONING_ERROR_CODES.PAIRING_USED]: '配对码已被使用，请重新扫码',
  [PROVISIONING_ERROR_CODES.MQTT_INVALID]: 'MQTT 连接失败，请进入诊断',
  [PROVISIONING_ERROR_CODES.STORAGE_FAILED]: '设备存储失败，请重试或联系支持'
}

/* ------------------------------------------------------------------ */
/* 与 ControlHub 的契约（非 BLE 载荷，供文档/联调对照）                  */
/* ------------------------------------------------------------------ */

/**
 * ControlHub 配对成功后下发给 ESP32 的 MQTT 凭据。
 * ESP32 POST /api/v1/pairing/device 成功后获得；**不经过小程序**。
 */
export interface MqttCredential {
  mqtt_host: string
  mqtt_port: number
  mqtt_username: string
  mqtt_credential: string
}

/*
 * 恢复原则（PROVISIONING_V1 §6，实现侧参考）：
 *   - Wi-Fi 失败：只退回 Wi-Fi 步骤，不重做 ControlHub
 *   - token 失效 / 已用：只重新扫码，不重做 Wi-Fi
 *   - MQTT 失败：进入诊断，不重做 Wi-Fi
 *   - 小程序切后台：恢复后重新连接并读 Status
 */
