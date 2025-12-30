/**
 * BLE 适配器接口
 *
 * 这是跨平台 BLE 抽象层的核心接口定义。
 * 所有平台实现（uni-app、Flutter、Android、iOS）都需要遵循此接口。
 *
 * @module BLECore
 * @interface IBLEAdapter
 */

/**
 * 蓝牙适配器状态
 */
export enum AdapterState {
  /** 未知状态 */
  UNKNOWN = 'unknown',
  /** 未初始化 */
  UNINITIALIZED = 'uninitialized',
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 已初始化，可用 */
  INITIALIZED = 'initialized',
  /** 正在扫描 */
  SCANNING = 'scanning',
  /** 不支持 */
  UNSUPPORTED = 'unsupported'
}

/**
 * 设备连接状态
 */
export enum ConnectionState {
  /** 未连接 */
  DISCONNECTED = 'disconnected',
  /** 连接中 */
  CONNECTING = 'connecting',
  /** 已连接 */
  CONNECTED = 'connected',
  /** 断开中 */
  DISCONNECTING = 'disconnecting',
  /** 连接失败 */
  FAILED = 'failed'
}

/**
 * 特征值属性
 */
export enum CharacteristicProperty {
  /** 可读 */
  READ = 0x01,
  /** 可写（有响应） */
  WRITE = 0x02,
  /** 可写（无响应） */
  WRITE_NO_RESPONSE = 0x04,
  /** 可通知 */
  NOTIFY = 0x08,
  /** 可指示 */
  INDICATE = 0x10
}

/**
 * 写入类型
 */
export enum WriteType {
  /** 有响应写入 */
  WITH_RESPONSE = 'with_response',
  /** 无响应写入 */
  WITHOUT_RESPONSE = 'without_response'
}

/**
 * 扫描选项
 */
export interface ScanOptions {
  /** 是否允许重复上报同一设备 */
  allowDuplicatesKey?: boolean
  /** 扫描时长（毫秒），0 表示不自动停止 */
  duration?: number
  /** 服务 UUID 过滤 */
  serviceUuids?: string[]
  /** 设备名称前缀过滤 */
  namePrefix?: string
  /** 信号强度过滤，只显示大于等于此值的设备 */
  rssiThreshold?: number
  /** 是否隐藏无名称设备 */
  hideNoName?: boolean
}

/**
 * 扫描结果
 */
export interface ScanResult {
  /** 设备 ID */
  deviceId: string
  /** 设备名称 */
  name: string
  /** 信号强度 */
  rssi: number
  /** 广播数据 */
  advertisData: ArrayBuffer
  /** 广播服务 UUID 列表 */
  advertisServiceUUIDs: string[]
  /** 发现时间戳 */
  timestamp: number
}

/**
 * 连接选项
 */
export interface ConnectOptions {
  /** 连接超时时间（毫秒） */
  timeout?: number
  /** 自动重连次数 */
  retryCount?: number
}

/**
 * 服务信息
 */
export interface Service {
  /** 服务 UUID */
  uuid: string
  /** 是否为主服务 */
  isPrimary?: boolean
}

/**
 * 特征值信息
 */
export interface Characteristic {
  /** 特征值 UUID */
  uuid: string
  /** 服务 UUID */
  serviceUuid: string
  /** 属性位掩 */
  properties: CharacteristicProperty[]
  /** 当前值 */
  value?: ArrayBuffer
  /** 是否正在监听 */
  notifying?: boolean
}

/**
 * 描述符信息
 */
export interface Descriptor {
  /** 描述符 UUID */
  uuid: string
  /** 特征值 UUID */
  characteristicUuid: string
  /** 当前值 */
  value?: ArrayBuffer
}

/**
 * 数据缓冲区（跨平台数据表示）
 */
export interface DataBuffer {
  /** 原始数据 */
  buffer: ArrayBuffer
  /** 数据长度 */
  length: number
  /** 转换为 Hex 字符串 */
  toHex(): string
  /** 转换为 UTF-8 字符串 */
  toUtf8(): string
  /** 获取字节数组 */
  toBytes(): number[]
}

/**
 * 广播选项
 */
export interface AdvertisingOptions {
  /** 设备名称 */
  deviceName?: string
  /** 服务 UUID 列表 */
  serviceUuids?: string[]
  /** 厂商 ID */
  manufacturerId?: number
  /** 厂商数据 */
  manufacturerData?: string | ArrayBuffer
  /** 广播模式（仅 Android） */
  advertiseMode?: number
  /** 发射功率（仅 Android） */
  txPowerLevel?: number
  /** 是否可连接 */
  connectable?: boolean
  /** 是否包含设备名称 */
  includeDeviceName?: boolean
}

/**
 * 广播状态
 */
export interface AdvertisingStatus {
  /** 是否正在广播 */
  isAdvertising: boolean
  /** 是否支持广播 */
  isSupported: boolean
}

/**
 * 回调函数类型定义
 */
export type AdapterStateCallback = (state: AdapterState) => void
export type DeviceFoundCallback = (device: ScanResult) => void
export type ConnectionStateCallback = (deviceId: string, state: ConnectionState) => void
export type CharacteristicChangedCallback = (
  deviceId: string,
  serviceUuid: string,
  characteristicUuid: string,
  value: DataBuffer
) => void
export type ErrorCallback = (error: BLEError) => void

/**
 * BLE 错误
 */
export interface BLEError {
  /** 错误码 */
  code: number
  /** 错误消息 */
  message: string
  /** 错误类型 */
  type?: 'init' | 'scan' | 'connect' | 'service' | 'characteristic' | 'advertising'
  /** 设备 ID（如果有） */
  deviceId?: string
}

/**
 * BLE 适配器接口
 *
 * 所有平台实现都需要实现此接口，保证跨平台 API 一致性。
 */
export interface IBLEAdapter {
  /**
   * 初始化蓝牙适配器
   *
   * @returns Promise<void>
   * @throws {BLEError} 蓝牙不支持或未开启
   */
  initialize(): Promise<void>

  /**
   * 获取适配器当前状态
   *
   * @returns Promise<AdapterState>
   */
  getState(): Promise<AdapterState>

  /**
   * 注册状态变化监听器
   *
   * @param callback - 状态变化回调函数
   */
  onStateChanged(callback: AdapterStateCallback): void

  /**
   * 移除状态变化监听器
   */
  offStateChanged(): void

  // ==================== 扫描相关 ====================

  /**
   * 开始扫描设备
   *
   * @param options - 扫描选项
   * @returns Promise<void>
   * @throws {BLEError} 初始化失败或权限不足
   */
  startScan(options?: ScanOptions): Promise<void>

  /**
   * 停止扫描设备
   *
   * @returns Promise<void>
   */
  stopScan(): Promise<void>

  /**
   * 注册设备发现监听器
   *
   * @param callback - 设备发现回调函数
   */
  onDeviceFound(callback: DeviceFoundCallback): void

  /**
   * 移除设备发现监听器
   */
  offDeviceFound(): void

  // ==================== 连接管理 ====================

  /**
   * 连接设备
   *
   * @param deviceId - 设备 ID
   * @param options - 连接选项
   * @returns Promise<void>
   * @throws {BLEError} 连接失败或超时
   */
  connect(deviceId: string, options?: ConnectOptions): Promise<void>

  /**
   * 断开设备连接
   *
   * @param deviceId - 设备 ID
   * @returns Promise<void>
   */
  disconnect(deviceId: string): Promise<void>

  /**
   * 获取设备连接状态
   *
   * @param deviceId - 设备 ID
   * @returns Promise<ConnectionState>
   */
  getConnectionState(deviceId: string): Promise<ConnectionState>

  /**
   * 注册连接状态变化监听器
   *
   * @param callback - 连接状态变化回调函数
   */
  onConnectionStateChanged(callback: ConnectionStateCallback): void

  /**
   * 移除连接状态变化监听器
   */
  offConnectionStateChanged(): void

  // ==================== 服务和特征值 ====================

  /**
   * 发现服务
   *
   * @param deviceId - 设备 ID
   * @returns Promise<Service[]> 服务列表
   */
  discoverServices(deviceId: string): Promise<Service[]>

  /**
   * 发现特征值
   *
   * @param deviceId - 设备 ID
   * @param serviceUuid - 服务 UUID
   * @returns Promise<Characteristic[]> 特征值列表
   */
  discoverCharacteristics(deviceId: string, serviceUuid: string): Promise<Characteristic[]>

  /**
   * 读取特征值
   *
   * @param deviceId - 设备 ID
   * @param serviceUuid - 服务 UUID
   * @param characteristicUuid - 特征值 UUID
   * @returns Promise<DataBuffer> 特征值数据
   */
  readCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string
  ): Promise<DataBuffer>

  /**
   * 写入特征值
   *
   * @param deviceId - 设备 ID
   * @param serviceUuid - 服务 UUID
   * @param characteristicUuid - 特征值 UUID
   * @param data - 写入数据
   * @param writeType - 写入类型
   * @returns Promise<void>
   */
  writeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    data: string | ArrayBuffer | DataBuffer,
    writeType?: WriteType
  ): Promise<void>

  /**
   * 设置特征值通知
   *
   * @param deviceId - 设备 ID
   * @param serviceUuid - 服务 UUID
   * @param characteristicUuid - 特征值 UUID
   * @param enable - true 启用通知，false 禁用通知
   * @returns Promise<void>
   */
  setCharacteristicNotification(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    enable: boolean
  ): Promise<void>

  /**
   * 注册特征值变化监听器
   *
   * @param callback - 特征值变化回调函数
   */
  onCharacteristicChanged(callback: CharacteristicChangedCallback): void

  /**
   * 移除特征值变化监听器
   */
  offCharacteristicChanged(): void

  // ==================== 广播（可选） ====================

  /**
   * 检查是否支持广播
   *
   * @returns Promise<AdvertisingStatus>
   */
  getAdvertisingStatus(): Promise<AdvertisingStatus>

  /**
   * 开始广播
   *
   * @param options - 广播选项
   * @returns Promise<void>
   * @throws {BLEError} 不支持广播或启动失败
   */
  startAdvertising(options: AdvertisingOptions): Promise<void>

  /**
   * 停止广播
   *
   * @returns Promise<void>
   */
  stopAdvertising(): Promise<void>

  // ==================== 清理 ====================

  /**
   * 释放资源
   * 关闭所有连接，停止扫描，释放蓝牙适配器
   *
   * @returns Promise<void>
   */
  dispose(): Promise<void>
}

/**
 * BLE 适配器工厂接口
 */
export interface IBLEAdapterFactory {
  /**
   * 创建适配器实例
   *
   * @returns IBLEAdapter
   */
  create(): IBLEAdapter

  /**
   * 获取平台名称
   *
   * @returns string
   */
  getPlatformName(): string

  /**
   * 检查平台是否支持
   *
   * @returns boolean
   */
  isSupported(): boolean
}
