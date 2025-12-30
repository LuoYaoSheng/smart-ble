/**
 * Smart BLE 协议定义
 *
 * 定义项目使用的自定义 BLE 协议，包括 ESP32 灯控服务等
 *
 * @module Protocols/SmartBLE
 */

/**
 * ESP32 灯控服务 UUID
 */
export const ESP32_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'

/**
 * ESP32 权限演示服务 UUID
 */
export const ESP32_PERMISSIONS_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914c'

/**
 * 特征值 UUID 定义
 */
export const ESP32_CHARACTERISTICS = {
  /** 控制特征值（读写+通知） */
  WRITE: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  /** 通知特征值（读写+通知） */
  NOTIFY: 'beb5483e-36e1-4688-b7f5-ea07361b26a9',
  /** 只读特征值 */
  READ_ONLY: 'beb5483e-36e1-4688-b7f5-ea07361b26b0',
  /** 只写特征值 */
  WRITE_ONLY: 'beb5483e-36e1-4688-b7f5-ea07361b26b1',
  /** 只通知特征值 */
  NOTIFY_ONLY: 'beb5483e-36e1-4688-b7f5-ea07361b26b2',
  /** 读写特征值 */
  READ_WRITE: 'beb5483e-36e1-4688-b7f5-ea07361b26b3',
  /** 读和通知特征值 */
  READ_NOTIFY: 'beb5483e-36e1-4688-b7f5-ea07361b26b4',
  /** 写和通知特征值 */
  WRITE_NOTIFY: 'beb5483e-36e1-4688-b7f5-ea07361b26b5',
  /** 读写和通知特征值 */
  ALL: 'beb5483e-36e1-4688-b7f5-ea07361b26b6'
} as const

/**
 * LED 闪烁模式
 */
export enum LEDMode {
  /** 关闭 */
  OFF = 0,
  /** 常亮 */
  ON = 1,
  /** 快闪 (200ms) */
  FAST_BLINK = 2,
  /** 慢闪 (1000ms) */
  SLOW_BLINK = 3
}

/**
 * LED 模式名称映射
 */
export const LED_MODE_NAMES: Record<LEDMode, string> = {
  [LEDMode.OFF]: '关闭',
  [LEDMode.ON]: '常亮',
  [LEDMode.FAST_BLINK]: '快闪',
  [LEDMode.SLOW_BLINK]: '慢闪'
}

/**
 * LED 控制命令
 */
export interface LEDCommand {
  /** 命令头（固定 0xFF） */
  header: number
  /** 参数 */
  param: LEDMode
}

/**
 * LED 控制命令常量
 */
export const LED_COMMANDS = {
  /** 开灯（常亮） */
  ON: { header: 0xFF, param: LEDMode.ON },
  /** 关灯 */
  OFF: { header: 0xFF, param: LEDMode.OFF },
  /** 快闪 */
  FAST_BLINK: { header: 0xFF, param: LEDMode.FAST_BLINK },
  /** 慢闪 */
  SLOW_BLINK: { header: 0xFF, param: LEDMode.SLOW_BLINK }
} as const

/**
 * 响应消息类型
 */
export enum ResponseType {
  /** 写入响应 */
  WRITE_RESPONSE = 'write_response',
  /** 设备状态 */
  DEVICE_STATUS = 'device_status',
  /** 系统信息 */
  SYSTEM_INFO = 'system_info',
  /** 连接状态 */
  CONNECTION = 'connection',
  /** 定期状态 */
  STATUS = 'status'
}

/**
 * 写入响应数据结构
 */
export interface WriteResponse {
  type: ResponseType.WRITE_RESPONSE
  command: string
  led_state: 'on' | 'off'
  blink_pattern: number
  mode: string
}

/**
 * 设备状态数据结构
 */
export interface DeviceStatus {
  type: ResponseType.DEVICE_STATUS
  led_state: 'on' | 'off'
  blink_pattern: number
  uptime: number
  device_name: string
  firmware_version: string
}

/**
 * 系统信息数据结构
 */
export interface SystemInfo {
  type: ResponseType.SYSTEM_INFO
  free_heap: number
  heap_size: number
  cpu_freq: number
  sdk_version: string
  cycle_count: number
  flash_size: number
  flash_speed: number
}

/**
 * 连接状态数据结构
 */
export interface ConnectionStateData {
  type: ResponseType.CONNECTION
  status: 'connected' | 'disconnected'
}

/**
 * 定期状态数据结构
 */
export interface StatusUpdate {
  type: ResponseType.STATUS
  led_state: boolean
  uptime: number
}

/**
 * 协议数据类型（联合类型）
 */
export type ProtocolData =
  | WriteResponse
  | DeviceStatus
  | SystemInfo
  | ConnectionStateData
  | StatusUpdate

/**
 * 协议编解码器
 */
export class ProtocolCodec {
  /**
   * 编码 LED 控制命令为 HEX 字符串
   */
  static encodeLEDCommand(command: LEDCommand): string {
    const byte1 = command.header.toString(16).padStart(2, '0').toUpperCase()
    const byte2 = command.param.toString(16).padStart(2, '0').toUpperCase()
    return byte1 + byte2
  }

  /**
   * 编码 LED 模式为 HEX 字符串
   */
  static encodeLEDMode(mode: LEDMode): string {
    return this.encodeLEDCommand({ header: 0xFF, param: mode })
  }

  /**
   * 解码 HEX 命令为 LED 命令
   */
  static decodeLEDCommand(hex: string): LEDCommand | null {
    const cleanHex = hex.replace(/\s/g, '')
    if (cleanHex.length !== 4) return null

    const header = parseInt(cleanHex.substring(0, 2), 16)
    const param = parseInt(cleanHex.substring(2, 4), 16) as LEDMode

    if (header !== 0xFF) return null

    return { header, param }
  }

  /**
   * 将 JSON 对象编码为字符串
   */
  static encodeJSON(data: Record<string, unknown>): string {
    return JSON.stringify(data)
  }

  /**
   * 解码 JSON 字符串
   */
  static decodeJSON<T = Record<string, unknown>>(json: string): T | null {
    try {
      return JSON.parse(json) as T
    } catch {
      return null
    }
  }

  /**
   * 解析协议数据
   */
  static parseProtocolData(json: string): ProtocolData | null {
    const data = this.decodeJSON<ProtocolData>(json)
    if (!data) return null

    // 验证 type 字段
    if (!this.isValidResponseType(data.type)) {
      return null
    }

    return data
  }

  /**
   * 验证响应类型是否有效
   */
  private static isValidResponseType(type: string): type is ResponseType {
    return Object.values(ResponseType).includes(type as ResponseType)
  }

  /**
   * 创建写入响应
   */
  static createWriteResponse(command: string, ledState: boolean, blinkPattern: LEDMode): WriteResponse {
    return {
      type: ResponseType.WRITE_RESPONSE,
      command,
      led_state: ledState ? 'on' : 'off',
      blink_pattern: blinkPattern,
      mode: LED_MODE_NAMES[blinkPattern]
    }
  }

  /**
   * 创建设备状态
   */
  static createDeviceStatus(
    ledState: boolean,
    blinkPattern: LEDMode,
    uptime: number,
    deviceName: string,
    firmwareVersion: string
  ): DeviceStatus {
    return {
      type: ResponseType.DEVICE_STATUS,
      led_state: ledState ? 'on' : 'off',
      blink_pattern: blinkPattern,
      uptime,
      device_name: deviceName,
      firmware_version: firmwareVersion
    }
  }

  /**
   * 创建系统信息
   */
  static createSystemInfo(
    freeHeap: number,
    heapSize: number,
    cpuFreq: number,
    sdkVersion: string
  ): SystemInfo {
    return {
      type: ResponseType.SYSTEM_INFO,
      free_heap: freeHeap,
      heap_size: heapSize,
      cpu_freq: cpuFreq,
      sdk_version: sdkVersion,
      cycle_count: 0, // ESP.getCycleCount()
      flash_size: 0, // ESP.getFlashChipSize()
      flash_speed: 0 // ESP.getFlashChipSpeed()
    }
  }

  /**
   * 创建连接状态
   */
  static createConnectionState(connected: boolean): ConnectionStateData {
    return {
      type: ResponseType.CONNECTION,
      status: connected ? 'connected' : 'disconnected'
    }
  }

  /**
   * 创建状态更新
   */
  static createStatusUpdate(ledState: boolean, uptime: number): StatusUpdate {
    return {
      type: ResponseType.STATUS,
      led_state: ledState,
      uptime
    }
  }
}

/**
 * ESP32 设备信息
 */
export const ESP32_DEVICE_INFO = {
  /** 设备名称 */
  NAME: 'BLEToolkit-Server',
  /** 固件版本 */
  FIRMWARE_VERSION: '1.0.0',
  /** LED 引脚 */
  LED_PIN: 2,
  /** 闪烁间隔 */
  BLINK_INTERVALS: {
    [LEDMode.FAST_BLINK]: 200,
    [LEDMode.SLOW_BLINK]: 1000
  },
  /** 状态推送间隔 */
  STATUS_PUSH_INTERVAL: 5000
} as const

/**
 * 导出协议常量
 */
export const PROTOCOL_CONSTANTS = {
  SERVICE_UUID: ESP32_SERVICE_UUID,
  PERMISSIONS_SERVICE_UUID: ESP32_PERMISSIONS_SERVICE_UUID,
  CHARACTERISTICS: ESP32_CHARACTERISTICS,
  DEVICE_INFO: ESP32_DEVICE_INFO,
  LED_MODES: LED_MODE_NAMES,
  COMMANDS: LED_COMMANDS
} as const
