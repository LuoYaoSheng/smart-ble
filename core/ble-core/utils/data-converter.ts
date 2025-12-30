/**
 * 数据转换工具
 *
 * 提供各种数据格式之间的转换功能
 *
 * @module BLECore/Utils
 */

import type {
  DataBuffer,
  DataConverter,
  DataConversionOptions,
  DataFormat
} from '../types'

/**
 * 标准 BLE 服务 UUID 映射
 */
export const BLE_SERVICES: Record<string, string> = {
  '1800': '通用访问',
  '1801': '通用属性',
  '180A': '设备信息',
  '180F': '电池服务',
  '1812': '人机接口设备',
  '1813': '扫描参数',
  '1819': '位置和导航'
}

/**
 * 标准 BLE 特征值 UUID 映射
 */
export const BLE_CHARACTERISTICS: Record<string, string> = {
  '2A00': '设备名称',
  '2A01': '外观',
  '2A02': '外围隐私标志',
  '2A03': '重连地址',
  '2A04': '外围首选连接参数',
  '2A05': '服务更改',
  '2A19': '电池电量',
  '2A23': '系统ID',
  '2A24': '型号',
  '2A25': '序列号',
  '2A26': '固件版本',
  '2A27': '硬件版本',
  '2A28': '软件版本',
  '2A29': '制造商名称'
}

/**
 * 数据转换器实现
 */
export class DataConverterImpl implements DataConverter {
  /**
   * 字符串转 ArrayBuffer
   */
  stringToBuffer(str: string, encoding: 'utf8' | 'ascii' = 'utf8'): ArrayBuffer {
    const encoder = new TextEncoder()
    return encoder.encode(str).buffer
  }

  /**
   * ArrayBuffer 转字符串
   */
  bufferToString(buffer: ArrayBuffer, encoding: 'utf8' | 'ascii' = 'utf8'): string {
    const decoder = new TextDecoder(encoding)
    return decoder.decode(buffer)
  }

  /**
   * Hex 字符串转 ArrayBuffer
   * @param hex - Hex 字符串，可以包含空格、破折号等分隔符
   */
  hexToBuffer(hex: string): ArrayBuffer {
    // 移除所有非十六进制字符
    const cleanHex = hex.replace(/[^0-9A-Fa-f]/g, '')

    // 验证长度
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Hex 字符串长度必须为偶数')
    }

    const buffer = new ArrayBuffer(cleanHex.length / 2)
    const view = new Uint8Array(buffer)

    for (let i = 0; i < cleanHex.length; i += 2) {
      view[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
    }

    return buffer
  }

  /**
   * ArrayBuffer 转 Hex 字符串
   */
  bufferToHex(buffer: ArrayBuffer, separator: boolean = false): string {
    const bytes = new Uint8Array(buffer)
    const hexArray = Array.from(bytes, byte =>
      byte.toString(16).padStart(2, '0').toUpperCase()
    )
    return separator ? hexArray.join(' ') : hexArray.join('')
  }

  /**
   * Base64 字符串转 ArrayBuffer
   */
  base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const buffer = new ArrayBuffer(binaryString.length)
    const view = new Uint8Array(buffer)

    for (let i = 0; i < binaryString.length; i++) {
      view[i] = binaryString.charCodeAt(i)
    }

    return buffer
  }

  /**
   * ArrayBuffer 转 Base64 字符串
   */
  bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binaryString = ''
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i])
    }
    return btoa(binaryString)
  }

  /**
   * 自动检测格式并转换为目标格式
   */
  convert(
    data: string | ArrayBuffer,
    options: DataConversionOptions = {}
  ): ArrayBuffer | string {
    const { inputFormat, outputFormat, separator = false } = options

    // 如果输入和输出格式相同，直接返回
    if (inputFormat === outputFormat) {
      return data as ArrayBuffer & string
    }

    // 将输入转换为 ArrayBuffer（中间格式）
    let buffer: ArrayBuffer

    if (typeof data === 'string') {
      // 检测输入格式
      const detectedFormat = inputFormat || this.detectStringFormat(data)

      switch (detectedFormat) {
        case DataFormat.HEX:
          buffer = this.hexToBuffer(data)
          break
        case DataFormat.BASE64:
          buffer = this.base64ToBuffer(data)
          break
        case DataFormat.UTF8:
        default:
          buffer = this.stringToBuffer(data)
          break
      }
    } else {
      buffer = data
    }

    // 将 ArrayBuffer 转换为输出格式
    const targetFormat = outputFormat || DataFormat.HEX

    switch (targetFormat) {
      case DataFormat.HEX:
        return this.bufferToHex(buffer, separator)
      case DataFormat.BASE64:
        return this.bufferToBase64(buffer)
      case DataFormat.UTF8:
      default:
        return this.bufferToString(buffer)
    }
  }

  /**
   * 检测字符串格式
   */
  private detectStringFormat(str: string): DataFormat {
    // 检查是否为 Base64
    if (/^[A-Za-z0-9+/]+=*$/.test(str) && str.length % 4 === 0) {
      return DataFormat.BASE64
    }

    // 检查是否为 Hex
    const cleanStr = str.replace(/[^0-9A-Fa-f]/g, '')
    if (cleanStr.length >= 2 && cleanStr.length % 2 === 0) {
      // 检查是否包含足够多的十六进制字符
      if (cleanStr.length >= str.length * 0.7) {
        return DataFormat.HEX
      }
    }

    // 默认为 UTF-8
    return DataFormat.UTF8
  }

  /**
   * 创建 DataBuffer 实例
   */
  createDataBuffer(buffer: ArrayBuffer): DataBuffer {
    return {
      buffer,
      length: buffer.byteLength,
      toHex: () => this.bufferToHex(buffer, true),
      toUtf8: () => this.bufferToString(buffer),
      toBytes: () => Array.from(new Uint8Array(buffer))
    }
  }
}

/**
 * UUID 工具类
 */
export class UUIDHelper {
  /**
   * 格式化 UUID（统一格式：大写无破折号）
   */
  static format(uuid: string): string {
    return uuid.replace(/-/g, '').toUpperCase()
  }

  /**
   * 获取短 UUID
   */
  static getShortUUID(uuid: string): string {
    const formatted = this.format(uuid)

    // 标准 128 位 UUID: 0000xxxx-0000-1000-8000-00805F9B34FB
    if (
      formatted.length === 32 &&
      formatted.startsWith('0000') &&
      formatted.endsWith('00001000800000805F9B34FB')
    ) {
      return formatted.substring(4, 8)
    }

    // 标准 32 位 UUID: xxxxxxxx-0000-1000-8000-00805F9B34FB
    if (
      formatted.length === 32 &&
      formatted.endsWith('00001000800000805F9B34FB')
    ) {
      return formatted.substring(0, 8)
    }

    // 自定义 UUID 返回完整格式
    return formatted
  }

  /**
   * 解析 UUID 信息
   */
  static parse(uuid: string) {
    const formatted = this.format(uuid)
    const short = this.getShortUUID(uuid)

    let type: 'standard_16' | 'standard_32' | 'standard_128' | 'custom_128'
    let isStandard = false

    if (short.length === 4) {
      type = 'standard_16'
      isStandard = true
    } else if (short.length === 8) {
      type = 'standard_32'
      isStandard = true
    } else {
      type = 'custom_128'
      isStandard = false
    }

    return {
      full: formatted,
      short: short !== formatted ? short : undefined,
      type,
      isStandard
    }
  }

  /**
   * 验证 UUID 格式
   */
  static validate(uuid: string): boolean {
    // 完整 128 位 UUID 格式
    const fullPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    // 短 UUID 格式（4 或 8 位）
    const shortPattern = /^[0-9a-fA-F]{4,8}$/

    return fullPattern.test(uuid) || shortPattern.test(uuid)
  }

  /**
   * 比较两个 UUID 是否相等
   */
  static equal(uuid1: string, uuid2: string): boolean {
    return this.format(uuid1) === this.format(uuid2)
  }

  /**
   * 获取标准服务名称
   */
  static getServiceName(uuid: string): string {
    const short = this.getShortUUID(uuid)
    return BLE_SERVICES[short] || '未知服务'
  }

  /**
   * 获取标准特征值名称
   */
  static getCharacteristicName(uuid: string): string {
    const short = this.getShortUUID(uuid)
    return BLE_CHARACTERISTICS[short] || '未知特征值'
  }
}

/**
 * 日志记录器实现
 */
export class LoggerImpl {
  private level: LogLevel = LogLevel.INFO
  private history: LogEntry[] = []
  private maxHistorySize = 100
  private listeners: ((entry: LogEntry) => void)[] = []

  constructor(maxHistorySize = 100) {
    this.maxHistorySize = maxHistorySize
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  getLevel(): LogLevel {
    return this.level
  }

  onLog(callback: (entry: LogEntry) => void): void {
    this.listeners.push(callback)
  }

  offLog(): void {
    this.listeners = []
  }

  private log(level: LogLevel, type: string | undefined, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      type,
      message,
      data
    }

    // 添加到历史
    this.history.push(entry)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }

    // 触发监听器
    this.listeners.forEach(listener => listener(entry))

    // 控制台输出
    if (this.shouldLog(level)) {
      const prefix = `[${new Date(entry.timestamp).toLocaleTimeString()}] [${level.toUpperCase()}`
      const typeStr = type ? ` [${type}]` : ''
      console.log(`${prefix}${typeStr}] ${message}`, data || '')
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    return levels.indexOf(level) >= levels.indexOf(this.level)
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, undefined, message, data)
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, undefined, message, data)
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, undefined, message, data)
  }

  error(message: string, error?: Error | unknown): void {
    this.log(LogLevel.ERROR, undefined, message, error)
  }

  getHistory(): LogEntry[] {
    return [...this.history]
  }

  clear(): void {
    this.history = []
  }
}

/**
 * 日志级别枚举（用于外部引用）
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志条目类型（用于外部引用）
 */
export interface LogEntry {
  timestamp: number
  level: LogLevel
  type?: string
  message: string
  data?: unknown
}

// 导出单例实例
export const dataConverter = new DataConverterImpl()
export const logger = new LoggerImpl()
