/**
 * Smart HID MQTT Command Schema 公开定义
 *
 * 定义 ControlHub → ESP32-S3 的 HID 控制命令、ACK 与状态。
 * 实时控制本地优先，不经过云。
 *
 * 事实源：本文件。依据：smart-hid-development-pack-v1.0
 *        docs/04_MQTT_AND_CONTROLHUB_API_PROTOCOL_V1.0.md
 *
 * @module Protocols/SmartHID/Command
 */

/**
 * MQTT Topic 模板
 *
 *   smart-hid/v1/devices/{device_id}/command   QoS1  retain=false
 *   smart-hid/v1/devices/{device_id}/ack       QoS1  retain=false
 *   smart-hid/v1/devices/{device_id}/status    QoS1  retain=true
 *   smart-hid/v1/devices/{device_id}/event     QoS0/1 retain=false
 *
 * 严禁 retained command。
 */
export const SMART_HID_TOPIC = {
  COMMAND: 'smart-hid/v1/devices/{device_id}/command',
  ACK: 'smart-hid/v1/devices/{device_id}/ack',
  STATUS: 'smart-hid/v1/devices/{device_id}/status',
  EVENT: 'smart-hid/v1/devices/{device_id}/event'
} as const

/** Command envelope protocol 版本 */
export const COMMAND_PROTOCOL_VERSION = '1.0'

/**
 * 渲染 topic：把 {device_id} 替换为实际 Device ID。
 */
export function buildTopic(template: string, deviceId: string): string {
  return template.replace('{device_id}', deviceId)
}

/** Command 类型 */
export type CommandType = 'keyboard' | 'mouse' | 'system'

/** Keyboard action */
export type KeyboardAction = 'tap' | 'hotkey' | 'key_down' | 'key_up'

/** Mouse action（V1 仅 relative mouse，不支持 absolute） */
export type MouseAction = 'move' | 'click' | 'button_down' | 'button_up' | 'wheel'

/** System action */
export type SystemAction = 'release_all'

/** Keyboard payload */
export interface KeyboardPayload {
  /** tap / hotkey 时使用 */
  key?: string
  /** hotkey 时使用 */
  keys?: string[]
  /** 按压时长（毫秒），默认 40-50 */
  hold_ms?: number
  /** key_down / button_down 必须带，lease 超时自动释放 */
  lease_ms?: number
}

/** Mouse payload */
export interface MousePayload {
  /** move: 相对位移 */
  dx?: number
  dy?: number
  /** click / button_down / button_up: 按钮标识 */
  button?: string
  /** click: 点击次数 */
  count?: number
  /** wheel: 滚轮增量 */
  delta?: number
  /** button_down 必须带，lease 超时自动释放 */
  lease_ms?: number
}

/** System payload（release_all 无字段） */
export type SystemPayload = Record<string, never>

/**
 * Smart HID Command envelope
 *
 * QoS1 至少一次交付，ESP32 必须按 request_id 去重。
 * target_boot_id 必须匹配设备当前 boot_id，否则拒绝（STALE_DEVICE_SESSION）。
 */
export interface SmartHidCommand {
  /** 固定 '1.0' */
  protocol: typeof COMMAND_PROTOCOL_VERSION
  /** 全局唯一请求 ID（用于去重，长度 ≤ 96） */
  request_id: string
  /** 目标设备 ID，格式 HID-XXXXXXXX */
  device_id: string
  /** 目标启动会话 ID（防旧命令重放） */
  target_boot_id: string
  /** 命令大类 */
  type: CommandType
  /** 具体动作 */
  action: KeyboardAction | MouseAction | SystemAction
  /** 命令有效期（毫秒），范围 100-10000 */
  ttl_ms: number
  /** 动作载荷，随 type/action 变化 */
  payload: KeyboardPayload | MousePayload | SystemPayload
}

/**
 * ACK 状态
 *
 *   received   ESP32 已收到
 *   executing  正在执行
 *   executed   已执行
 *   rejected   拒绝（鉴权 / 状态 / 参数）
 *   expired    超出 TTL
 *   duplicate  request_id 去重命中（不重复执行 HID）
 */
export type AckStatus = 'received' | 'executing' | 'executed' | 'rejected' | 'expired' | 'duplicate'

/**
 * Smart HID ACK envelope
 */
export interface SmartHidAck {
  protocol: typeof COMMAND_PROTOCOL_VERSION
  /** 对应 Command 的 request_id */
  request_id: string
  device_id: string
  /** 设备当前 boot_id */
  boot_id: string
  status: AckStatus
  /** 0 表示成功，非 0 为错误码 */
  code: number
  /** 执行耗时（毫秒） */
  execution_ms?: number
}

/**
 * 设备状态（status topic，retain=true）
 *
 * 设备上线 / 离线 / 配置变化时发布。ControlHub 启动时读取 retained status
 * 重建设备在线视图。
 */
export interface SmartHidStatus {
  protocol: typeof COMMAND_PROTOCOL_VERSION
  device_id: string
  /** 是否在线 */
  online: boolean
  /** 当前 boot_id（每次启动新生成） */
  boot_id: string
  /** USB HID 是否就绪 */
  usb_hid_ready: boolean
  /** 固件版本 */
  firmware?: string
  /** 最后一次状态更新 Unix 时间戳（秒） */
  timestamp: number
}

/**
 * 设备事件（event topic）
 *
 * 用于 MQTT 断开、release_all 触发、queue full 等非 Command 驱动的事件。
 */
export interface SmartHidEvent {
  protocol: typeof COMMAND_PROTOCOL_VERSION
  device_id: string
  /** 事件类型，如 'release_all_triggered' / 'queue_full' / 'mqtt_disconnected' */
  event: string
  /** 事件详情 */
  detail?: Record<string, unknown>
  timestamp: number
}

/**
 * Command 常量
 */
export const COMMAND_CONSTANTS = {
  /** Command 队列大小（ESP32 侧） */
  COMMAND_QUEUE_SIZE: 32,
  /** 单条 Command payload 最大字节数 */
  PAYLOAD_MAX_BYTES: 2048,
  /** request_id 去重缓存条数（RAM） */
  DEDUP_CACHE_SIZE: 256,
  /** ttl_ms 范围 */
  TTL_MS_MIN: 100,
  TTL_MS_MAX: 10000,
  /** Device ID 正则 */
  DEVICE_ID_PATTERN: /^HID-[A-Z0-9]{8}$/,
  /** request_id 最大长度 */
  REQUEST_ID_MAX_LENGTH: 96,
  /** boot_id 不匹配时的错误标识 */
  STALE_DEVICE_SESSION: 'STALE_DEVICE_SESSION'
} as const

/**
 * V1 不支持的能力（实现与文档须保持一致）：
 *   - Shell / Script / Process launch
 *   - File transfer
 *   - Clipboard read
 *   - Screen capture
 *   - Key logging
 *   - Arbitrary code execution
 *   - Absolute mouse（V1 仅 relative mouse）
 *   - Macro Script Engine
 *   - Remote Desktop
 */
export const V1_UNSUPPORTED = [
  'shell',
  'script',
  'process_launch',
  'file_transfer',
  'clipboard_read',
  'screen_capture',
  'key_logging',
  'arbitrary_code_execution',
  'absolute_mouse',
  'macro_script_engine',
  'remote_desktop'
] as const
