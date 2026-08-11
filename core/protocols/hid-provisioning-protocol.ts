/**
 * Smart HID BLE Provisioning Protocol 公开定义
 *
 * 定义 Smart HID 设备的 BLE 配网协议：设备识别、Device Info、ControlHub Pairing、
 * Wi-Fi 配置、状态查询、诊断与恢复。
 *
 * BLE 只负责配置与诊断，不负责 HID 实时控制（实时控制走 ControlHub → MQTT → ESP32）。
 *
 * 事实源：本文件。依据：smart-hid-development-pack-v1.0
 *        docs/03_BLE_PROVISIONING_PROTOCOL_V1.1.md
 *
 * @module Protocols/SmartHID/Provisioning
 */

/**
 * Smart HID Provisioning Service UUID
 *
 * 小程序用它从 BLE 扫描结果中过滤 Smart HID 设备。
 * 设备进入 Provisioning Mode 时以此 UUID 广播。
 */
export const SMART_HID_PROVISIONING_SERVICE_UUID = '0000fe5a-0000-1000-8000-00805f9b34fb'

/**
 * 设备名前缀（广播名形如 SHID-A82F94C1）。
 * 8 位十六进制/大写字母后缀由设备出厂分配。
 */
export const SMART_HID_NAME_PREFIX = 'SHID-'

/**
 * 自定义 Endpoint（GATT 特征值集合或 Protocomm endpoint）
 *
 * - hid-info:    读取设备信息（get_info）
 * - hub-config:  写入 ControlHub 配对信息与 Wi-Fi 凭据（set）
 * - hid-action:  状态查询 / 重启 / reset_network / reset_hub（get_status 等）
 */
export const SMART_HID_ENDPOINTS = {
  /** 设备信息读取 */
  HID_INFO: 'hid-info',
  /** ControlHub 配对 + Wi-Fi 配置写入 */
  HUB_CONFIG: 'hub-config',
  /** 状态查询与设备动作 */
  HID_ACTION: 'hid-action'
} as const

/** hid-info 支持的操作 */
export type HidInfoOperation = 'get_info'

/** hub-config 支持的操作 */
export type HubConfigOperation = 'set'

/** hid-action 支持的操作 */
export type HidActionOperation = 'get_status' | 'reboot' | 'reset_network' | 'reset_hub'

/**
 * Device Info（hid-info/get_info 返回）
 *
 * 设备连接后读取，用于识别设备身份（不依赖设备二维码）。
 */
export interface SmartHidDeviceInfo {
  /** 固定值 'smart-hid' */
  product: 'smart-hid'
  /** 设备唯一标识，格式 HID-XXXXXXXX */
  device_id: string
  /** 硬件型号，如 'S3-01' */
  hardware: string
  /** 固件版本，如 '1.0.0' */
  firmware: string
  /** 配网协议版本，如 '1.0' */
  protocol: string
  /** 是否已完成 ControlHub + Wi-Fi 配置 */
  configured: boolean
  /** USB HID 是否就绪（已枚举 Keyboard + Mouse） */
  usb_hid_ready: boolean
}

/**
 * ControlHub 动态 Pairing QR 载荷
 *
 * 当前唯一需要二维码的环节。Pairing Token 短期、一次性、随机、成功后立即失效。
 */
export interface ControlHubPairingQR {
  /** QR 载荷版本 */
  v: 1
  /** ControlHub 实例 ID */
  hub_id: string
  /** ControlHub LAN 地址（点分十进制 IPv4） */
  host: string
  /** 配对 HTTP 端口（默认 17892） */
  pairing_port: number
  /** 一次性短期配对令牌 */
  token: string
  /** 过期 Unix 时间戳（秒） */
  expires_at: number
}

/**
 * ControlHub 配对成功后下发给 ESP32 的 MQTT 凭据。
 * ESP32 POST /api/v1/pairing/device 成功后获得。
 */
export interface MqttCredential {
  mqtt_host: string
  mqtt_port: number
  mqtt_username: string
  mqtt_credential: string
}

/**
 * Wi-Fi 配置状态
 */
export enum WifiConfigState {
  UNCONFIGURED = 'unconfigured',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed'
}

/**
 * ControlHub 配对状态
 */
export enum HubPairingState {
  UNCONFIGURED = 'unconfigured',
  CONFIGURED = 'configured',
  PAIRING = 'pairing',
  PAIRED = 'paired',
  FAILED = 'failed'
}

/**
 * 控制连接（MQTT）状态
 */
export enum ControlConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected'
}

/**
 * USB HID 状态
 */
export enum UsbHidState {
  NOT_READY = 'not_ready',
  READY = 'ready',
  ERROR = 'error'
}

/**
 * 设备综合状态（hid-action/get_status 返回）
 */
export interface SmartHidDeviceStatus {
  wifi: WifiConfigState
  hub: HubPairingState
  control_connection: ControlConnectionState
  usb: UsbHidState
}

/**
 * 错误码（hid-info / hub-config / hid-action 通用）
 *
 * 分段：
 *   1xxx 请求级错误
 *   2xxx 设备级错误
 *   3xxx ControlHub / MQTT 错误
 *   4xxx 安全 / 会话错误
 *   5xxx 系统级错误
 */
export enum ProvisioningErrorCode {
  INVALID_REQUEST = 1001,
  UNSUPPORTED_OPERATION = 1002,
  UNSUPPORTED_VERSION = 1003,
  INVALID_PARAMETER = 1004,
  INVALID_STATE = 1005,

  DEVICE_BUSY = 2001,
  CONFIG_WRITE_FAILED = 2002,
  NVS_ERROR = 2003,

  HUB_NOT_CONFIGURED = 3001,
  HUB_UNREACHABLE = 3002,
  PAIR_TOKEN_INVALID = 3003,
  PAIR_TOKEN_EXPIRED = 3004,
  PAIR_TOKEN_USED = 3005,
  HUB_REJECTED = 3006,
  MQTT_AUTH_FAILED = 3007,
  MQTT_CONNECT_FAILED = 3008,

  SECURITY_SESSION_REQUIRED = 4001,
  AUTH_FAILED = 4002,
  SESSION_EXPIRED = 4003,
  PERMISSION_DENIED = 4004,

  INTERNAL_ERROR = 5001,
  TIMEOUT = 5002,
  NETWORK_ERROR = 5003
}

/**
 * 错误码 → 可读名称
 */
export const PROVISIONING_ERROR_NAMES: Record<ProvisioningErrorCode, string> = {
  [ProvisioningErrorCode.INVALID_REQUEST]: 'INVALID_REQUEST',
  [ProvisioningErrorCode.UNSUPPORTED_OPERATION]: 'UNSUPPORTED_OPERATION',
  [ProvisioningErrorCode.UNSUPPORTED_VERSION]: 'UNSUPPORTED_VERSION',
  [ProvisioningErrorCode.INVALID_PARAMETER]: 'INVALID_PARAMETER',
  [ProvisioningErrorCode.INVALID_STATE]: 'INVALID_STATE',
  [ProvisioningErrorCode.DEVICE_BUSY]: 'DEVICE_BUSY',
  [ProvisioningErrorCode.CONFIG_WRITE_FAILED]: 'CONFIG_WRITE_FAILED',
  [ProvisioningErrorCode.NVS_ERROR]: 'NVS_ERROR',
  [ProvisioningErrorCode.HUB_NOT_CONFIGURED]: 'HUB_NOT_CONFIGURED',
  [ProvisioningErrorCode.HUB_UNREACHABLE]: 'HUB_UNREACHABLE',
  [ProvisioningErrorCode.PAIR_TOKEN_INVALID]: 'PAIR_TOKEN_INVALID',
  [ProvisioningErrorCode.PAIR_TOKEN_EXPIRED]: 'PAIR_TOKEN_EXPIRED',
  [ProvisioningErrorCode.PAIR_TOKEN_USED]: 'PAIR_TOKEN_USED',
  [ProvisioningErrorCode.HUB_REJECTED]: 'HUB_REJECTED',
  [ProvisioningErrorCode.MQTT_AUTH_FAILED]: 'MQTT_AUTH_FAILED',
  [ProvisioningErrorCode.MQTT_CONNECT_FAILED]: 'MQTT_CONNECT_FAILED',
  [ProvisioningErrorCode.SECURITY_SESSION_REQUIRED]: 'SECURITY_SESSION_REQUIRED',
  [ProvisioningErrorCode.AUTH_FAILED]: 'AUTH_FAILED',
  [ProvisioningErrorCode.SESSION_EXPIRED]: 'SESSION_EXPIRED',
  [ProvisioningErrorCode.PERMISSION_DENIED]: 'PERMISSION_DENIED',
  [ProvisioningErrorCode.INTERNAL_ERROR]: 'INTERNAL_ERROR',
  [ProvisioningErrorCode.TIMEOUT]: 'TIMEOUT',
  [ProvisioningErrorCode.NETWORK_ERROR]: 'NETWORK_ERROR'
}

/**
 * 配网协议常量
 */
export const PROVISIONING_CONSTANTS = {
  /** 协议版本字符串 */
  PROTOCOL_VERSION: '1.1',
  /** Device ID 正则（HID- + 8 位大写字母数字） */
  DEVICE_ID_PATTERN: /^HID-[A-Z0-9]{8}$/,
  /** 设备名正则 */
  DEVICE_NAME_PATTERN: /^SHID-[A-Z0-9]{6,8}$/,
  /** ControlHub Pairing 默认端口 */
  DEFAULT_PAIRING_PORT: 17892
} as const

/**
 * 配网响应 envelope（各 endpoint 通用）
 */
export interface ProvisioningResponse<T = unknown> {
  /** 操作名 */
  op: string
  /** 是否成功 */
  ok: boolean
  /** 成功时的返回数据 */
  data?: T
  /** 失败时的错误码 */
  code?: ProvisioningErrorCode
  /** 失败时的可读消息 */
  message?: string
}

/**
 * 恢复原则（实现侧参考，非协议字段）：
 *   - Wi-Fi 失败：只退回 Wi-Fi 步骤
 *   - Pair Token 过期：只重新获取 ControlHub QR
 *   - MQTT 失败：进入诊断，不重做 Wi-Fi
 *   - 微信切后台：恢复后重新连接并 get_status
 */
