/**
 * BLE 核心公共类型定义
 *
 * @module BLECore/Types
 */

import type { DataBuffer } from '../interfaces/adapter'

/**
 * 数据格式枚举
 */
export enum DataFormat {
  /** UTF-8 文本 */
  UTF8 = 'utf8',
  /** 十六进制 */
  HEX = 'hex',
  /** Base64 */
  BASE64 = 'base64'
}

/**
 * UUID 类型
 */
export enum UUIDType {
  /** 标准 16 位 UUID */
  STANDARD_16 = 'standard_16',
  /** 标准 32 位 UUID */
  STANDARD_32 = 'standard_32',
  /** 标准 128 位 UUID */
  STANDARD_128 = 'standard_128',
  /** 自定义 128 位 UUID */
  CUSTOM_128 = 'custom_128'
}

/**
 * UUID 信息
 */
export interface UUIDInfo {
  /** 完整 UUID 字符串 */
  full: string
  /** 短 UUID（如果是标准 UUID） */
  short?: string
  /** UUID 类型 */
  type: UUIDType
  /** 是否为标准 UUID */
  isStandard: boolean
}

/**
 * 日志级别
 */
export enum LogLevel {
  /** 调试 */
  DEBUG = 'debug',
  /** 信息 */
  INFO = 'info',
  /** 警告 */
  WARN = 'warn',
  /** 错误 */
  ERROR = 'error'
}

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: number
  /** 日志级别 */
  level: LogLevel
  /** 日志类型（可选分类） */
  type?: string
  /** 日志消息 */
  message: string
  /** 关联的设备 ID（可选） */
  deviceId?: string
  /** 额外数据（可选） */
  data?: unknown
}

/**
 * 设备信息扩展
 */
export interface DeviceInfo {
  /** 设备 ID */
  deviceId: string
  /** 设备名称 */
  name: string
  /** 信号强度 */
  rssi: number
  /** 广播数据 */
  advertisData: {
    /** 原始数据 */
    raw: ArrayBuffer
    /** 服务 UUID 列表 */
    serviceUuids: string[]
    /** 厂商 ID */
    manufacturerId?: number
    /** 厂商数据 */
    manufacturerData?: ArrayBuffer
    /** 服务数据 */
    serviceData?: Map<string, ArrayBuffer>
  }
  /** 连接状态 */
  connected: boolean
  /** 最后更新时间 */
  lastSeen: number
  /** 设备类型标签 */
  type?: string
}

/**
 * 服务信息扩展
 */
export interface ServiceInfo {
  /** 服务 UUID */
  uuid: string
  /** 服务名称（标准服务） */
  name?: string
  /** 是否为主服务 */
  isPrimary: boolean
  /** 特征值列表 */
  characteristics: CharacteristicInfo[]
  /** 是否展开（UI 状态） */
  expanded?: boolean
}

/**
 * 特征值信息扩展
 */
export interface CharacteristicInfo {
  /** 特征值 UUID */
  uuid: string
  /** 所属服务 UUID */
  serviceUuid: string
  /** 特征值名称（标准特征值） */
  name?: string
  /** 属性 */
  properties: {
    /** 可读 */
    read: boolean
    /** 可写 */
    write: boolean
    /** 可写无响应 */
    writeNoResponse: boolean
    /** 可通知 */
    notify: boolean
    /** 可指示 */
    indicate: boolean
  }
  /** 当前值 */
  value?: {
    /** 原始数据 */
    raw: ArrayBuffer
    /** UTF-8 字符串 */
    utf8?: string
    /** Hex 字符串 */
    hex?: string
  }
  /** 是否正在监听 */
  notifying: boolean
}

/**
 * 数据转换选项
 */
export interface DataConversionOptions {
  /** 输入格式 */
  inputFormat?: DataFormat
  /** 输出格式 */
  outputFormat?: DataFormat
  /** 是否添加分隔符（Hex 格式） */
  separator?: boolean
}

/**
 * 数据转换器接口
 */
export interface DataConverter {
  /**
   * 字符串转 ArrayBuffer
   */
  stringToBuffer(str: string, encoding?: 'utf8' | 'ascii'): ArrayBuffer

  /**
   * ArrayBuffer 转字符串
   */
  bufferToString(buffer: ArrayBuffer, encoding?: 'utf8' | 'ascii'): string

  /**
   * Hex 字符串转 ArrayBuffer
   */
  hexToBuffer(hex: string): ArrayBuffer

  /**
   * ArrayBuffer 转 Hex 字符串
   */
  bufferToHex(buffer: ArrayBuffer, separator?: boolean): string

  /**
   * Base64 字符串转 ArrayBuffer
   */
  base64ToBuffer(base64: string): ArrayBuffer

  /**
   * ArrayBuffer 转 Base64 字符串
   */
  bufferToBase64(buffer: ArrayBuffer): string

  /**
   * 自动检测格式并转换为目标格式
   */
  convert(
    data: string | ArrayBuffer,
    options?: DataConversionOptions
  ): ArrayBuffer | string

  /**
   * 创建 DataBuffer 实例
   */
  createDataBuffer(buffer: ArrayBuffer): DataBuffer
}

/**
 * UUID 工具接口
 */
export interface UUIDHelper {
  /**
   * 格式化 UUID（统一格式）
   */
  format(uuid: string): string

  /**
   * 获取短 UUID
   * 标准 UUID 返回后 4 位，自定义 UUID 返回完整无破折号格式
   */
  getShortUUID(uuid: string): string

  /**
   * 解析 UUID 信息
   */
  parse(uuid: string): UUIDInfo

  /**
   * 验证 UUID 格式
   */
  validate(uuid: string): boolean

  /**
   * 比较两个 UUID 是否相等
   */
  equal(uuid1: string, uuid2: string): boolean

  /**
   * 获取标准服务名称
   */
  getServiceName(uuid: string): string

  /**
   * 获取标准特征值名称
   */
  getCharacteristicName(uuid: string): string
}

/**
 * 日志记录器接口
 */
export interface Logger {
  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void

  /**
   * 获取日志级别
   */
  getLevel(): LogLevel

  /**
   * 添加日志监听器
   */
  onLog(callback: (entry: LogEntry) => void): void

  /**
   * 移除日志监听器
   */
  offLog(): void

  /**
   * 记录调试日志
   */
  debug(message: string, data?: unknown): void

  /**
   * 记录信息日志
   */
  info(message: string, data?: unknown): void

  /**
   * 记录警告日志
   */
  warn(message: string, data?: unknown): void

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error | unknown): void

  /**
   * 获取日志历史
   */
  getHistory(): LogEntry[]

  /**
   * 清空日志历史
   */
  clear(): void
}

/**
 * 配置选项
 */
export interface BLEConfig {
  /** 扫描超时时间（毫秒） */
  scanTimeout?: number
  /** 连接超时时间（毫秒） */
  connectTimeout?: number
  /** 操作超时时间（毫秒） */
  operationTimeout?: number
  /** 是否启用调试日志 */
  debug?: boolean
  /** 最大日志数量 */
  maxLogSize?: number
  /** 是否自动重连 */
  autoReconnect?: boolean
  /** 重连次数 */
  reconnectAttempts?: number
  /** MTU 大小（0 表示使用默认） */
  mtu?: number
}
