//
// SmartBLE Desktop for macOS - BLE Manager
// r3：对齐产品正典口径 —— 日志六色（sys/err/read/write/recv/ok）、名称多级 fallback（F005）、
// 广播数据捕获（F004）、Profile 匹配（探针启发式）、连接 10s 超时 + 3 次退避重试（PAGE006）。
// r6（M1）：多设备并行会话（F006/F013）—— [deviceId: DeviceSession] 会话表，
// 每设备独立状态机/超时/服务缓存/监听集合；P006 展示「活动会话」（activeDeviceId），
// 活动会话由连接动作与 P007 点卡分流设定；connectedDevice/connectionState/services
// 保留为活动会话的镜像 Published（页面层零侵入）。
// 已知限制（诚实口径，见 verification）：
//  · Profile 匹配为探针启发式（smart-hid 服务 UUID 强匹配 / 名称前缀弱匹配），
//    正式 Profile 注册表属共享层（Windows 主线）。
//

import Foundation
import CoreBluetooth
import Combine
import SmartHidCore

// MARK: - Connection State
enum ConnectionState {
    case disconnected
    case connecting
    case connected
    case disconnecting
    /// 被动断线后的自动重连期（F012 · SM §2：1s/3s/5s 退避 ×3）
    case reconnecting
}

// MARK: - 写队列项（F009 · DATA_MODEL §3.3 WriteQueueItem）
struct WriteQueueItem {
    enum State { case pending, sending, done, failed, cancelled }
    let itemId: String
    let characteristicUuid: String
    let serviceUuid: String
    let data: Data
    let display: String            // 展示用载荷文本（HEX 串或原文本）
    let withoutResponse: Bool
    let priority: Bool             // 优先级插队（PRD §4.2：配网/OTA 帧可插队）
    let enqueuedAt: Date
    var state: State = .pending

    init(itemId: String, characteristicUuid: String, data: Data, display: String,
         withoutResponse: Bool, priority: Bool = false, serviceUuid: String = "") {
        self.itemId = itemId
        self.characteristicUuid = characteristicUuid
        self.serviceUuid = serviceUuid
        self.data = data
        self.display = display
        self.withoutResponse = withoutResponse
        self.priority = priority
        self.enqueuedAt = Date()
    }
}

// MARK: - 设备会话（F006/F013 · 每设备一份）
@MainActor
final class DeviceSession {
    let id: String
    let device: BLEDevice
    let peripheral: CBPeripheral
    var state: ConnectionState = .connecting
    var services: [BLEService] = []
    var notificationState = NotificationConfirmation()
    var notifyingCharacteristics: Set<String> { notificationState.confirmed }
    let readDeadlines = OperationDeadlines()
    let notificationDeadlines = OperationDeadlines()
    /// Reject value/ACK callbacks immediately while cancelling an unsafe link.
    var retiringConnection = false
    /// 重连成功后需恢复监听的特征（被动断线时从 notifyingCharacteristics 转存）
    var resubscribeSet: Set<String> = []
    /// 连接 10s 超时计时（每会话独立）
    var connectTimer: Timer?
    /// 主动断开标记（重连判定用：主动断开不自动重连）
    var userInitiatedDisconnect = false
    /// F012 自动重连：已尝试次数（1...3）
    var reconnectAttempt = 0
    /// 重连退避任务（1s/3s/5s）
    var reconnectTask: DispatchWorkItem?
    /// OTA 接管期间禁自动重连（SM §2）
    var suppressAutoReconnect = false
    /// Smart HID 配网会话标记（正典：不进 P007 列表，但计入 P001 已连接计数）
    var isProvisioningSession = false
    // ---- 写队列（F009 · 同设备串行 / 超时 5s / 深 16）----
    var writeQueue: [WriteQueueItem] = []
    var writeInFlight: WriteQueueItem?
    var writeTimeoutTask: DispatchWorkItem?
    var writeSeq = 0

    init(device: BLEDevice) {
        self.id = device.id
        self.device = device
        self.peripheral = device.peripheral
    }

    var writeDepth: Int { writeQueue.count + (writeInFlight != nil ? 1 : 0) }
}

// MARK: - 蓝牙适配器状态（P001 导航栏三态口径）
enum BTState {
    case unknown, on, off, unsupported, unauthorized

    var word: String {
        switch self {
        case .on: return "蓝牙就绪"
        case .off: return "蓝牙未开启"
        case .unsupported: return "平台不支持"
        case .unauthorized: return "未授权"
        case .unknown: return "检测中…"
        }
    }
}

// MARK: - 广播数据报告（F004 · 广播数据弹窗的数据源）
/// 字段缺失用 nil 表示 —— 弹窗中标注「本轮平台 API 未提供此字段」（R04 口径）。
struct AdvReport {
    var localName: String?
    var serviceUUIDs: [String]?
    var manufacturerIdHex: String?      // 前两字节
    var manufacturerDataHex: String?    // 去掉前两字节后的负载
    var txPower: Int?
    var serviceDataHex: String?
    /// 可组合出的 AD 段（CoreBluetooth 不回吐原始 AD 结构，此处按已解析字段重建展示段）
    var segments: [(type: String, name: String, len: Int, hex: String)]
    var byteLength: Int { segments.reduce(0) { $0 + $1.len } }
    var rawHex: String { segments.map(\.hex).joined(separator: " ") }
}

// MARK: - Profile 匹配（探针启发式 · 正式注册表在共享层）
struct ProfileMatch: Equatable {
    let level: String    // STRONG / WEAK
    let profileId: String
}

// MARK: - BLE Models
struct BLEDevice: Identifiable, Hashable {
    let id: String
    let name: String              // 多级 fallback 后的显示名（F005）
    let rawName: String           // 平台原始名（可能为空）
    let rssi: Int
    let peripheral: CBPeripheral
    var adv: AdvReport?
    var profileMatch: ProfileMatch?
    var isConnected: Bool = false

    /// 信号四格分档（-60/-70/-80，PAGE001 数据展示规则）
    var signalQuality: Int {
        if rssi >= -60 { return 4 }
        if rssi >= -70 { return 3 }
        if rssi >= -80 { return 2 }
        return 1
    }

    static func == (lhs: BLEDevice, rhs: BLEDevice) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct BLEService: Identifiable {
    let id: String
    let uuid: String
    let name: String
    var characteristics: [BLECharacteristic] = []
    var peripheralService: CBService?
}

struct BLECharacteristic: Identifiable {
    let id: String
    let uuid: String
    let name: String
    var properties: CharacteristicProperties
    var value: String?
    var peripheralCharacteristic: CBCharacteristic?
}

struct CharacteristicProperties: OptionSet {
    let rawValue: UInt8

    static let read = CharacteristicProperties(rawValue: 1 << 0)
    static let write = CharacteristicProperties(rawValue: 1 << 1)
    static let writeWithoutResponse = CharacteristicProperties(rawValue: 1 << 2)
    static let notify = CharacteristicProperties(rawValue: 1 << 3)
    static let indicate = CharacteristicProperties(rawValue: 1 << 4)
}

// MARK: - BLE Manager
@MainActor
class BLEManager: NSObject, ObservableObject {
    // MARK: - Published Properties
    @Published var isScanning = false
    @Published var isAdvertising = false
    @Published var discoveredDevices: [BLEDevice] = []
    @Published var logs: [LogEntry] = []
    @Published var btState: BTState = .unknown
    @Published var peripheralReady = false
    /// P008 徽章「已停止」态（停止后置位）
    @Published var lastAdvStopped = false
    /// 最近一次扫描完成文案（P001 工具条标签 + toast）
    @Published var lastScanSummary: String = "待开始扫描"

    // ---- 多设备会话（F006/F013 · r6-M1）----
    /// 会话表：deviceId → 会话（connecting/connected/disconnecting）
    @Published private(set) var sessions: [String: DeviceSession] = [:]
    /// 活动会话（P006 展示对象）：由 connect 动作 / P007 点卡分流设定
    @Published var activeDeviceId: String?

    // ---- 活动会话镜像（页面层兼容面：P006/P002 等直接读取）----
    @Published var connectedDevice: BLEDevice?
    @Published var connectionState: ConnectionState = .disconnected
    @Published var services: [BLEService] = []

    // MARK: - Filter Properties
    @Published var filterRSSI: Int = -100
    @Published var filterNamePrefix: String = ""
    @Published var hideNoNameDevices: Bool = false

    // MARK: - Computed Properties
    var filteredScanResults: [BLEDevice] {
        var result = discoveredDevices
        if filterRSSI > -100 {
            result = result.filter { $0.rssi >= filterRSSI }
        }
        if !filterNamePrefix.isEmpty {
            result = result.filter { $0.name.lowercased().hasPrefix(filterNamePrefix.lowercased()) }
        }
        if hideNoNameDevices {
            result = result.filter { !$0.rawName.isEmpty }
        }
        return result.sorted { $0.rssi > $1.rssi }
    }

    /// 筛选空态 B 判定：有结果但被筛选清空（两种空文案，PAGE001 状态列表）
    var filteredToEmpty: Bool {
        !discoveredDevices.isEmpty && filteredScanResults.isEmpty
    }

    /// 已连接设备列表（P007 · 仅 connected 态且非配网会话；SHID 配网会话不进此列表，正典口径）
    var connectedDevices: [BLEDevice] {
        sessions.values
            .filter { $0.state == .connected && !$0.isProvisioningSession }
            .sorted { $0.device.rssi > $1.device.rssi }
            .map { s in
                var d = s.device
                d.isConnected = true
                return d
            }
    }

    /// 通用连接数 + SHID 配网会话在线（P001 已连接计数正典口径）
    var connectedCountForBadge: Int {
        sessions.values.filter { $0.state == .connected }.count
    }

    /// SHID 配网会话在线（P007 空态文案/徽标口径：配网连接进行中）
    var provisioningSessionOnline: Bool {
        sessions.values.contains { $0.isProvisioningSession && $0.state == .connected }
    }

    /// 配网会话标记（P002 进出向导时切换）
    func markProvisioningSession(deviceId: String, on: Bool) {
        sessions[deviceId]?.isProvisioningSession = on
    }

    /// 活动会话对象
    var activeSession: DeviceSession? {
        activeDeviceId.flatMap { sessions[$0] }
    }

    // MARK: - Log Entry（六色：sys/err/read/write/recv/ok）
    struct LogEntry {
        enum Kind {
            case sys, err, read, write, recv, ok

            var label: String {
                switch self {
                case .sys: return "系统"
                case .err: return "错误"
                case .read: return "读取"
                case .write: return "写入"
                case .recv: return "接收"
                case .ok: return "成功"
                }
            }
        }
        let message: String
        let kind: Kind
        let timestamp: Date

        var timeText: String {
            let f = DateFormatter()
            f.dateFormat = "HH:mm:ss"
            return f.string(from: timestamp)
        }
    }

    // MARK: - 全部断开（allSettled 口径 · P007）
    struct DisconnectAllReport {
        let succeeded: [String]   // 设备名
        let failed: [String]      // 设备名（3s 内未确认断开）
    }
    /// 全部断开结算回调（P007 设置后调用 disconnectAll）
    var onDisconnectAllSettled: ((DisconnectAllReport) -> Void)?
    /// OTA STATUS 特征值转发（F025 · OtaManager 订阅）：(deviceId, data)
    var otaStatusHandler: ((String, Data) -> Void)?
    /// Smart HID INFO/STATUS 特征值转发（F019-F022 · HidProvisionManager 订阅）：(deviceId, charUuidUpper, data)
    var hidValueHandler: ((String, String, Data) -> Void)?
    /// 写队列结算回调（F025 分块节拍用）：(deviceId, itemId, success)
    var onWriteSettled: ((String, String, Bool) -> Void)?
    private var disconnectAllTargets: [String: String] = [:]
    private var pendingDisconnectAll: [String: String] = [:]   // id → name
    private var disconnectAllTimer: Timer?

    // MARK: - Private Properties
    private var centralManager: CBCentralManager?
    private var peripheralManager: CBPeripheralManager?
    /// OTA 事务（F025 · 独占会话，全局单事务）
    lazy var ota: OtaManager = OtaManager(ble: self)
    /// Smart HID 配网流程（F019-F022 · 全局单会话）
    lazy var hid: HidProvisionManager = HidProvisionManager(ble: self)

    // 扫描 5s 会话自动停（正典 PAGE001：启动 5s 扫描会话）
    private var autoStopTimer: Timer?
    // 每次连接尝试 10s；终态确认后按 F012 的 1s/3s/5s 重试。

    // MARK: - Initialization
    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }

    // MARK: - Logging
    func log(_ message: String, _ kind: LogEntry.Kind = .sys) {
        let entry = LogEntry(message: message, kind: kind, timestamp: Date())
        logs.insert(entry, at: 0)
        if logs.count > 500 {
            logs.removeLast()
        }
        print("[BLE] \(message)")
    }

    // MARK: - Scan Methods
    func startScan() {
        guard let centralManager = centralManager else { return }
        guard centralManager.state == .poweredOn else {
            btState = mapState(centralManager.state)
            log("扫描启动失败：蓝牙适配器未就绪（\(btState.word)）", .err)
            return
        }

        discoveredDevices.removeAll()
        isScanning = true
        log("开始扫描 · 5s 会话")

        centralManager.scanForPeripherals(withServices: nil, options: [
            CBCentralManagerScanOptionAllowDuplicatesKey: true
        ])

        autoStopTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.isScanning else { return }
                self.stopScan(userInitiated: false)
                self.log("扫描完成 · 发现 \(self.discoveredDevices.count) 台设备", .ok)
                self.lastScanSummary = "扫描完成 · 发现 \(self.discoveredDevices.count) 台"
            }
        }
    }

    func stopScan(userInitiated: Bool = true) {
        autoStopTimer?.invalidate()
        autoStopTimer = nil
        centralManager?.stopScan()
        guard isScanning else { return }
        isScanning = false
        if userInitiated {
            log("已停止扫描（reason=user）")
            lastScanSummary = "已停止扫描"
        }
    }

    // MARK: - Session Queries（页面层多设备查询面）

    func sessionState(_ deviceId: String) -> ConnectionState? {
        sessions[deviceId]?.state
    }

    func sessionServices(_ deviceId: String) -> [BLEService] {
        sessions[deviceId]?.services ?? []
    }

    func isDeviceConnected(_ deviceId: String) -> Bool {
        sessions[deviceId]?.state == .connected
    }

    /// 活动会话切换（P007 点卡分流 / 复用连接时进入 P006）
    func setActive(deviceId: String) {
        guard sessions[deviceId] != nil else { return }
        activeDeviceId = deviceId
        syncActiveMirror()
    }

    // MARK: - Connection Methods（多设备 · F006 复用 / F013 并行）
    func connect(device: BLEDevice) {
        guard let centralManager = centralManager,
              centralManager.state == .poweredOn else {
            log("连接失败：蓝牙适配器未就绪", .err)
            return
        }

        stopScan(userInitiated: false)

        // F006 会话复用：已连接/连接中 → 不重建
        if let existing = sessions[device.id] {
            switch existing.state {
            case .connected:
                activeDeviceId = device.id
                log("会话复用 · \(device.name) 已连接", .ok)
                syncActiveMirror()
                return
            case .connecting, .reconnecting:
                activeDeviceId = device.id
                log("连接进行中 · \(device.name)")
                syncActiveMirror()
                return
            case .disconnecting:
                log("等待旧连接断开确认 · \(device.name)")
                return
            case .disconnected:
                break
            }
        }

        let session = sessions[device.id] ?? DeviceSession(device: device)
        session.state = .connecting
        session.retiringConnection = false
        session.userInitiatedDisconnect = false
        session.reconnectTask?.cancel()
        session.reconnectTask = nil
        session.reconnectAttempt = 0
        sessions[device.id] = session
        activeDeviceId = device.id
        log("连接 \(device.name) · 暂存路由上下文")
        centralManager.connect(session.peripheral, options: nil)
        armConnectTimeout(for: session)
        syncActiveMirror()
    }

    private func armConnectTimeout(for session: DeviceSession) {
        session.connectTimer?.invalidate()
        session.connectTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: false) { [weak self, weak session] _ in
            Task { @MainActor [weak self, weak session] in
                guard let self, let session, self.sessions[session.id] === session,
                      session.state == .connecting || session.state == .reconnecting else { return }
                self.log("连接超时（10s）· 取消当前连接尝试 · \(session.device.name)", .err)
                // Wait for didFailToConnect/didDisconnect before issuing another
                // connection. CoreBluetooth has no connection-attempt request ID.
                session.retiringConnection = true
                session.state = .disconnecting
                session.connectTimer = nil
                self.centralManager?.cancelPeripheralConnection(session.peripheral)
                self.syncActiveMirror()
            }
        }
    }

    // MARK: - 断线自动重连（F012 · SM §2：被动断线 1s/3s/5s ×3；主动断开/OTA 接管永不重连）
    private let reconnectBackoffs: [Double] = [1.0, 3.0, 5.0]

    /// 会话当前重连进度（reconnecting 态时返回已尝试次数）
    func reconnectInfo(deviceId: String) -> Int? {
        guard let s = sessions[deviceId], s.state == .reconnecting else { return nil }
        return s.reconnectAttempt
    }

    private func scheduleReconnect(_ session: DeviceSession) {
        guard sessions[session.id] === session, !session.userInitiatedDisconnect,
              !session.suppressAutoReconnect else { return }
        if session.state == .reconnecting && session.reconnectTask != nil { return }
        session.reconnectTask?.cancel()
        session.connectTimer?.invalidate()
        session.connectTimer = nil
        let attempt = session.reconnectAttempt + 1
        guard attempt <= reconnectBackoffs.count else {
            log("自动重连 3 次未成功 · \(session.device.name) → 会话结束（FAILED）", .err)
            session.reconnectAttempt = 0
            sessions.removeValue(forKey: session.id)
            if activeDeviceId == session.id {
                activeDeviceId = sessions.values.first(where: { $0.state == .connected })?.id
            }
            syncActiveMirror()
            return
        }
        session.reconnectAttempt = attempt
        session.state = .reconnecting
        let backoff = reconnectBackoffs[attempt - 1]
        log("被动断线 · \(Int(backoff))s 后自动重连 · \(session.device.name)（\(attempt)/3）", .err)
        let work = DispatchWorkItem { [weak self, weak session] in
            Task { @MainActor [weak self, weak session] in
                guard let self, let session,
                      session.state == .reconnecting,
                      !session.userInitiatedDisconnect,
                      self.sessions[session.id] === session else { return }
                session.reconnectTask = nil
                session.retiringConnection = false
                log("正在自动重连 · \(session.device.name)（\(session.reconnectAttempt)/3）")
                self.centralManager?.connect(session.peripheral, options: nil)
                self.armConnectTimeout(for: session)
                if session.id == self.activeDeviceId { self.syncActiveMirror() }
            }
        }
        session.reconnectTask = work
        DispatchQueue.main.asyncAfter(deadline: .now() + backoff, execute: work)
        if session.id == activeDeviceId { syncActiveMirror() }
    }

    /// 断开指定设备（P006 断开按钮 / P007 卡片断开；含取消进行中的重连）
    func disconnect(deviceId: String) {
        guard let session = sessions[deviceId] else { return }
        session.userInitiatedDisconnect = true
        session.retiringConnection = true
        session.readDeadlines.cancelAll()
        session.notificationDeadlines.cancelAll()
        abortWrites(session, reason: "主动断开")
        session.connectTimer?.invalidate()
        session.connectTimer = nil
        session.reconnectTask?.cancel()
        session.reconnectTask = nil
        switch session.state {
        case .connected, .connecting, .reconnecting:
            session.state = .disconnecting
            log("断开连接中… · \(session.device.name)")
            centralManager?.cancelPeripheralConnection(session.peripheral)
            if deviceId == activeDeviceId { syncActiveMirror() }
        case .disconnected, .disconnecting:
            sessions.removeValue(forKey: deviceId)
            if deviceId == activeDeviceId { activeDeviceId = nil }
            syncActiveMirror()
        }
    }

    /// 断开活动会话（兼容口径：P006 顶部断开 / 退出清理）
    func disconnect() {
        if let id = activeDeviceId {
            disconnect(deviceId: id)
        } else {
            connectionState = .disconnected
            connectedDevice = nil
            services.removeAll()
        }
    }

    /// 全部断开（P007 · allSettled 口径：逐台 cancel，3s 内未确认断开计为失败）
    func disconnectAll() {
        let targets = sessions.values.filter {
            $0.state == .connected || $0.state == .connecting || $0.state == .reconnecting
        }
        guard !targets.isEmpty else {
            onDisconnectAllSettled?(DisconnectAllReport(succeeded: [], failed: []))
            return
        }
        disconnectAllTargets = Dictionary(uniqueKeysWithValues: targets.map { ($0.id, $0.device.name) })
        pendingDisconnectAll = disconnectAllTargets
        disconnectAllTimer?.invalidate()
        disconnectAllTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in self?.settleDisconnectAll() }
        }
        for t in targets { disconnect(deviceId: t.id) }
    }

    private func settleDisconnectAll() {
        disconnectAllTimer?.invalidate()
        disconnectAllTimer = nil
        let report = Self.disconnectReport(targets: disconnectAllTargets, stillPending: Set(pendingDisconnectAll.keys))
        disconnectAllTargets.removeAll()
        pendingDisconnectAll.removeAll()
        onDisconnectAllSettled?(report)
    }

    static func disconnectReport(targets: [String: String], stillPending: Set<String>) -> DisconnectAllReport {
        DisconnectAllReport(
            succeeded: targets.filter { !stillPending.contains($0.key) }.values.sorted(),
            failed: targets.filter { stillPending.contains($0.key) }.values.sorted()
        )
    }

    // MARK: - Service Discovery（按会话）
    func discoverServices() {
        guard let session = activeSession else {
            log("无已连接设备", .err)
            return
        }
        log("服务发现中… · \(session.device.name)")
        session.peripheral.discoverServices(nil)
    }

    private func discoverCharacteristics(for service: CBService, of session: DeviceSession) {
        session.peripheral.discoverCharacteristics(nil, for: service)
    }

    // MARK: - Characteristic Operations（作用于活动会话）
    func readCharacteristic(characteristicUUID: String) {
        guard let session = activeSession else { log("无已连接设备", .err); return }
        readCharacteristic(deviceId: session.id, characteristicUUID: characteristicUUID)
    }

    static let readTimeoutSec: TimeInterval = 3.0

    func readCharacteristic(deviceId: String, characteristicUUID: String) {
        guard let session = sessions[deviceId], session.state == .connected, !session.retiringConnection,
              let char = findCharacteristic(characteristicUUID, in: session.services),
              char.properties.contains(.read), let peripheralChar = char.peripheralCharacteristic else {
            log("读取失败：设备未连接或特征不支持读取 · \(characteristicUUID)", .err)
            return
        }
        let key = characteristicKey(peripheralChar)
        guard session.readDeadlines.begin(key: key, timeout: Self.readTimeoutSec, onTimeout: { [weak self, weak session] in
            guard let self, let session, self.sessions[session.id] === session, session.state == .connected else { return }
            self.log("[\(session.device.name)] 读取超时（3s）· \(characteristicUUID)", .err)
            self.retireUnsafeConnection(session, reason: "读取超时")
        }) else { log("读取仍在等待设备回执 · \(characteristicUUID)", .err); return }
        log("[\(session.device.name)] 读取 \(char.name)…（3s 超时）", .read)
        session.peripheral.readValue(for: peripheralChar)
    }

    // MARK: - 写队列（F009 · 同设备串行 / 跨设备并行 / 超时 5s / 深 16 / 优先级插队）
    static let writeQueueMaxDepth = 16
    static let writeTimeoutSec: TimeInterval = 5.0

    /// 当前设备的写队列深度（P006 展示/日志用）
    func writeQueueDepth(deviceId: String) -> Int {
        sessions[deviceId]?.writeDepth ?? 0
    }

    /// 写入统一入口：入队串行发送（正典 F009：写队列串行化 = 本功能）
    /// - Parameter forceWithoutResponse: OTA DATA 分块等协议固定 writeNoResponse 时置 true
    ///   （特征属性不含 writeWithoutResponse 时自动回落 withResponse 并记一条日志）
    @discardableResult
    func enqueueWrite(deviceId: String? = nil, characteristicUUID: String,
                      data: Data, display: String, priority: Bool = false,
                      forceWithoutResponse: Bool = false) -> Bool {
        let session = deviceId == nil ? activeSession : sessions[deviceId!]
        guard let session else {
            log("写入失败：无会话", .err)
            return false
        }
        guard let char = findCharacteristic(characteristicUUID, in: session.services),
              let peripheralChar = char.peripheralCharacteristic else {
            log("特征未找到：\(characteristicUUID)", .err)
            return false
        }
        guard session.state == .connected, !session.retiringConnection else {
            log("写入失败：设备未连接 · \(session.device.name)", .err)
            return false
        }
        guard session.writeDepth < Self.writeQueueMaxDepth else {
            log("写队列已满（\(Self.writeQueueMaxDepth)）· 丢弃本次写入 · \(session.device.name)", .err)
            return false
        }
        guard char.properties.contains(.write) || char.properties.contains(.writeWithoutResponse) else {
            log("写入失败：特征不可写 · \(char.name)", .err)
            return false
        }
        var useWithoutResponse = forceWithoutResponse
            ? char.properties.contains(.writeWithoutResponse)
            : !char.properties.contains(.write) && char.properties.contains(.writeWithoutResponse)
        if forceWithoutResponse && !useWithoutResponse {
            useWithoutResponse = false
            log("[\(session.device.name)] 协议要求 writeNoResponse 但特征仅支持 withResponse · 回落（\(char.name)）", .sys)
        }
        let writeType: CBCharacteristicWriteType = useWithoutResponse ? .withoutResponse : .withResponse
        guard data.count <= session.peripheral.maximumWriteValueLength(for: writeType) else {
            log("写入失败：单帧长度超出设备能力 · \(char.name)", .err)
            return false
        }
        session.writeSeq += 1
        let item = WriteQueueItem(
            itemId: "w-\(session.writeSeq)",
            characteristicUuid: peripheralChar.uuid.uuidString,
            data: data,
            display: display,
            withoutResponse: writeType == .withoutResponse,
            priority: priority,
            serviceUuid: peripheralChar.service?.uuid.uuidString ?? ""
        )
        if priority {
            session.writeQueue.insert(item, at: 0)
        } else {
            session.writeQueue.append(item)
        }
        log("[\(session.device.name)] 入队 \(item.itemId) · \(char.name)：\(display)（队列 \(session.writeDepth)/\(Self.writeQueueMaxDepth)）", .write)
        pumpWrites(session)
        return true
    }

    /// P006 写入弹窗入口（TEXT/HEX 编码后入队）
    func writeCharacteristic(characteristicUUID: String, text: String, isHex: Bool) {
        let data: Data
        var display = text
        if isHex {
            let bytes = text.split(whereSeparator: { $0 == " " }).compactMap { UInt8($0, radix: 16) }
            data = Data(bytes)
            display = data.map { String(format: "%02X", $0) }.joined(separator: " ")
        } else {
            data = Data(text.utf8)
        }
        _ = enqueueWrite(characteristicUUID: characteristicUUID, data: data,
                         display: "\(isHex ? "HEX" : "TEXT"): \(display)")
    }

    private func pumpWrites(_ session: DeviceSession) {
        guard session.writeInFlight == nil, !session.writeQueue.isEmpty else { return }
        guard sessions[session.id] === session, session.state == .connected, !session.retiringConnection else { return }
        var item = session.writeQueue.removeFirst()
        guard let char = findCharacteristic(item.characteristicUuid, serviceUUID: item.serviceUuid, in: session.services),
              let peripheralChar = char.peripheralCharacteristic else {
            item.state = .failed
            log("[\(session.device.name)] \(item.itemId) 发送失败：特征已失效", .err)
            pumpWrites(session)
            return
        }
        if item.withoutResponse, !session.peripheral.canSendWriteWithoutResponse {
            // 流控未就绪：等 peripheralIsReady 回调后再泵（该项放回队首）
            session.writeQueue.insert(item, at: 0)
            if session.writeTimeoutTask == nil {
                armWriteTimeout(session, item: item)
            }
            return
        }
        session.writeTimeoutTask?.cancel()
        session.writeTimeoutTask = nil
        item.state = .sending
        session.writeInFlight = item
        log("[\(session.device.name)] 发送 \(item.itemId) · \(char.name)（5s 超时）", .write)

        armWriteTimeout(session, item: item)

        session.peripheral.writeValue(item.data, for: peripheralChar,
                                       type: item.withoutResponse ? .withoutResponse : .withResponse)
        if item.withoutResponse {
            // without-response 无完成回调：立即结算并续泵
            session.writeTimeoutTask?.cancel()
            session.writeTimeoutTask = nil
            session.writeInFlight = nil
            log("[\(session.device.name)] \(item.itemId) 已发送（withoutResponse）", .ok)
            onWriteSettled?(session.id, item.itemId, true)
            pumpWrites(session)
        }
    }

    private func armWriteTimeout(_ session: DeviceSession, item: WriteQueueItem) {
        let timeout = DispatchWorkItem { [weak self, weak session] in
            Task { @MainActor in
                guard let self, let session, self.sessions[session.id] === session,
                      session.writeInFlight?.itemId == item.itemId || session.writeQueue.first?.itemId == item.itemId else { return }
                self.log("[\(session.device.name)] 写入超时（5s）· \(item.itemId)", .err)
                self.retireUnsafeConnection(session, reason: "写入超时")
            }
        }
        session.writeTimeoutTask = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.writeTimeoutSec, execute: timeout)
    }

    private func retireUnsafeConnection(_ session: DeviceSession, reason: String) {
        guard sessions[session.id] === session, !session.retiringConnection else { return }
        session.retiringConnection = true
        session.state = .disconnecting
        session.readDeadlines.cancelAll()
        session.notificationDeadlines.cancelAll()
        abortWrites(session, reason: reason)
        syncActiveMirror()
        centralManager?.cancelPeripheralConnection(session.peripheral)
    }

    /// 写队列 abort（F012：重连期间 PENDING→CANCELLED；主动断开/会话结束同样清空）
    private func abortWrites(_ session: DeviceSession, reason: String) {
        let items = session.writeQueue + (session.writeInFlight.map { [$0] } ?? [])
        let n = items.count
        session.writeTimeoutTask?.cancel()
        session.writeTimeoutTask = nil
        session.writeQueue.removeAll()
        session.writeInFlight = nil
        items.forEach { onWriteSettled?(session.id, $0.itemId, false) }
        guard n > 0 else { return }
        log("写队列 abort · \(n) 项 CANCELLED（\(reason)）· \(session.device.name)", .err)
    }

    func setNotification(characteristicUUID: String, enabled: Bool) {
        guard let session = activeSession else {
            log("特征未找到：\(characteristicUUID)", .err)
            return
        }
        setNotification(characteristicUUID: characteristicUUID, enabled: enabled, on: session)
    }

    func setNotification(characteristicUUID: String, enabled: Bool, on session: DeviceSession) {
        guard sessions[session.id] === session, session.state == .connected, !session.retiringConnection,
              let char = findCharacteristic(characteristicUUID, in: session.services),
              char.properties.contains(.notify) || char.properties.contains(.indicate),
              let peripheralChar = char.peripheralCharacteristic else {
            log("监听失败：会话失效或特征不支持通知 · \(characteristicUUID)", .err)
            return
        }
        let key = characteristicKey(peripheralChar)
        guard session.notificationDeadlines.begin(key: key, timeout: 5, onTimeout: { [weak self, weak session] in
            guard let self, let session, self.sessions[session.id] === session else { return }
            self.log("监听设置超时（5s）· \(characteristicUUID) · \(session.device.name)", .err)
            self.retireUnsafeConnection(session, reason: "监听回执超时")
        }) else { log("监听设置仍在等待设备回执 · \(characteristicUUID)", .err); return }
        log("[\(session.device.name)] \(enabled ? "开始监听" : "停止监听") \(char.name) · 等待设备回执")
        session.peripheral.setNotifyValue(enabled, for: peripheralChar)
    }

    func isNotifying(characteristicUUID: String) -> Bool {
        activeSession?.notificationState.contains(characteristicUUID) ?? false
    }

    private func characteristicKey(_ characteristic: CBCharacteristic) -> String {
        "\(characteristic.service?.uuid.uuidString ?? ""):\(characteristic.uuid.uuidString)".uppercased()
    }

    private func findCharacteristic(_ uuid: String, serviceUUID: String? = nil, in services: [BLEService]) -> BLECharacteristic? {
        Self.resolveCharacteristic(uuid, serviceUUID: serviceUUID, in: services)
    }

    static func resolveCharacteristic(_ uuid: String, serviceUUID: String? = nil, in services: [BLEService]) -> BLECharacteristic? {
        let matches = services.filter { serviceUUID == nil || $0.uuid.caseInsensitiveCompare(serviceUUID!) == .orderedSame }
            .flatMap(\.characteristics).filter { $0.uuid.caseInsensitiveCompare(uuid) == .orderedSame }
        // UUID-only callers must not silently target a same-UUID characteristic
        // from another service. Require an unambiguous characteristic.
        return matches.count == 1 ? matches[0] : nil
    }

    private func callbackSession(_ peripheral: CBPeripheral, characteristic: CBCharacteristic) -> DeviceSession? {
        guard let session = session(for: peripheral), session.state == .connected, !session.retiringConnection,
              Self.ownsCharacteristic(characteristic, in: session.services) else { return nil }
        return session
    }

    static func ownsCharacteristic(_ characteristic: CBCharacteristic, in services: [BLEService]) -> Bool {
        services.flatMap(\.characteristics).contains { $0.peripheralCharacteristic === characteristic }
    }

    // MARK: - 活动会话镜像同步（页面兼容面）
    private func syncActiveMirror() {
        if let session = activeSession {
            connectedDevice = session.device
            connectionState = session.state
            services = session.services
        } else {
            connectedDevice = nil
            connectionState = .disconnected
            services = []
        }
    }

    // MARK: - Peripheral/Advertising Methods（P008 · 真实 CBPeripheralManager）
    func checkPeripheralSupport() -> Bool {
        let ready = peripheralManager?.state == .poweredOn
        peripheralReady = ready
        if ready {
            log("桌面原生层 CoreBluetooth（macOS）· 蓝牙从机已就绪 · 支持 peripheral 广播（能力判定待 D2 spike，不预判）", .sys)
        } else {
            log("外围模式未就绪：\(peripheralManager.map { String(describing: $0.state) } ?? "nil")", .err)
        }
        return ready
    }

    func startAdvertising(name: String, serviceUUID: String) {
        guard let peripheralManager = peripheralManager,
              peripheralManager.state == .poweredOn else {
            log("外围模式未就绪，无法开始广播", .err)
            return
        }
        stopScan(userInitiated: false)

        var advertisement: [String: Any] = [CBAdvertisementDataLocalNameKey: name]
        if !serviceUUID.isEmpty {
            advertisement[CBAdvertisementDataServiceUUIDsKey] = [CBUUID(string: serviceUUID)]
        }
        log("开始广播 · name=\(name) uuid=\(serviceUUID) platform=Desktop·macOS")
        peripheralManager.startAdvertising(advertisement)
    }

    func stopAdvertising() {
        peripheralManager?.stopAdvertising()
        guard isAdvertising else { return }
        isAdvertising = false
        log("广播已停止")
    }

    // MARK: - Filter Methods
    func resetFilters() {
        filterRSSI = -100
        filterNamePrefix = ""
        hideNoNameDevices = false
    }

    private func mapState(_ state: CBManagerState) -> BTState {
        switch state {
        case .poweredOn: return .on
        case .poweredOff: return .off
        case .unsupported: return .unsupported
        case .unauthorized: return .unauthorized
        default: return .unknown
        }
    }

    private func session(for peripheral: CBPeripheral) -> DeviceSession? {
        guard let session = sessions[peripheral.identifier.uuidString], session.peripheral === peripheral else { return nil }
        return session
    }
}

// MARK: - 名称多级 fallback（F005：name→localName→Profile 名→「未命名 BLE · ID后四位」）
private extension BLEManager {
    func resolveDisplayName(peripheral: CBPeripheral, adv: AdvReport?) -> (display: String, raw: String) {
        let platformName = peripheral.name ?? ""
        let localName = adv?.localName ?? ""
        let candidate = platformName.isEmpty ? localName : platformName
        if !candidate.isEmpty {
            return (candidate, platformName.isEmpty ? "" : candidate)
        }
        let suffix = String(peripheral.identifier.uuidString.suffix(4))
        return ("未命名 BLE · \(suffix)", "")
    }

    func resolveProfileMatch(adv: AdvReport?, displayName: String) -> ProfileMatch? {
        // 探针启发式：smart-hid 配网服务 UUID 强匹配；名称前缀弱匹配。正式注册表在共享层。
        let shidService = "9F1D1001-E73B-4C8F-9D2A-6F0B5E8A1C04"
        if let uuids = adv?.serviceUUIDs, uuids.contains(where: { $0.uppercased() == shidService }) {
            return ProfileMatch(level: "STRONG", profileId: "smart-hid")
        }
        if displayName.uppercased().hasPrefix("SHID") {
            return ProfileMatch(level: "WEAK", profileId: "smart-hid")
        }
        return nil
    }
}

// MARK: - CBCentralManagerDelegate
extension BLEManager: @preconcurrency CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        btState = mapState(central.state)
        if central.state != .poweredOn {
            autoStopTimer?.invalidate()
            autoStopTimer = nil
            isScanning = false
            for session in sessions.values {
                session.retiringConnection = true
                session.connectTimer?.invalidate()
                session.reconnectTask?.cancel()
                session.readDeadlines.cancelAll()
                session.notificationDeadlines.cancelAll()
                abortWrites(session, reason: "蓝牙适配器不可用")
            }
            sessions.removeAll()
            activeDeviceId = nil
            syncActiveMirror()
        }
        switch central.state {
        case .poweredOn:
            log("蓝牙已开启", .ok)
        case .poweredOff:
            log("蓝牙未开启（10001）", .err)
            isScanning = false
        case .unauthorized:
            log("蓝牙未授权", .err)
        case .unknown, .resetting, .unsupported:
            log("蓝牙状态：\((central.state))", .err)
        @unknown default:
            break
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                       advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let adv = buildAdvReport(advertisementData)
        let (displayName, rawName) = resolveDisplayName(peripheral: peripheral, adv: adv)
        let id = peripheral.identifier.uuidString

        let device = BLEDevice(
            id: id,
            name: displayName,
            rawName: rawName.isEmpty ? (adv.localName ?? "") : rawName,
            rssi: RSSI.intValue,
            peripheral: peripheral,
            adv: adv,
            profileMatch: resolveProfileMatch(adv: adv, displayName: displayName),
            isConnected: sessions[id]?.state == .connected
        )

        if let index = discoveredDevices.firstIndex(where: { $0.id == id }) {
            discoveredDevices[index] = device
        } else {
            discoveredDevices.append(device)
            log("发现设备：\(displayName)（\(RSSI) dBm）")
        }
        peripheral.delegate = self
    }

    /// 由 advertisementData 重建可展示的 AD 段（CoreBluetooth 不回吐原始结构，R04 缺失口径照标）
    private func buildAdvReport(_ data: [String: Any]) -> AdvReport {
        var report = AdvReport(segments: [])
        if let name = data[CBAdvertisementDataLocalNameKey] as? String, !name.isEmpty {
            report.localName = name
            let hex = name.utf8.map { String(format: "%02X", $0) }
            let payload = hex.joined(separator: " ")
            let len = hex.count + 2
            report.segments.append((type: "0x09", name: "完整本地名称", len: len, hex: String(format: "%02X 09 %@", hex.count, payload)))
        }
        if let uuids = data[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID], !uuids.isEmpty {
            report.serviceUUIDs = uuids.map { $0.uuidString }
            let hexParts = uuids.map { uuid -> String in
                uuid.data.map { String(format: "%02X", $0) }.joined(separator: " ")
            }
            let payload = hexParts.joined(separator: " ")
            let len = payload.split(separator: " ").count + 2
            report.segments.append((type: "0x03/0x07", name: "Service UUID 列表", len: len, hex: String(format: "%02X 03 %@", len - 2, payload)))
        }
        if let mfg = data[CBAdvertisementDataManufacturerDataKey] as? Data, mfg.count >= 2 {
            let hex = mfg.map { String(format: "%02X", $0) }
            report.manufacturerIdHex = hex.prefix(2).joined()
            report.manufacturerDataHex = hex.dropFirst(2).joined(separator: " ")
            let len = hex.count + 2
            report.segments.append((type: "0xFF", name: "厂商数据", len: len, hex: String(format: "%02X FF %@", hex.count, hex.joined(separator: " "))))
        }
        if let sd = data[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data], !sd.isEmpty {
            let parts = sd.map { key, value in
                "\(key.uuidString): " + value.map { String(format: "%02X", $0) }.joined(separator: " ")
            }
            report.serviceDataHex = parts.joined(separator: " · ")
        }
        if let tx = data[CBAdvertisementDataTxPowerLevelKey] as? Int {
            report.txPower = tx
            report.segments.append((type: "0x0A", name: "发射功率", len: 3, hex: String(format: "02 0A %02X", UInt8(bitPattern: Int8(tx)))))
        }
        return report
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        guard let session = session(for: peripheral) else { return }
        guard !session.userInitiatedDisconnect, !session.retiringConnection,
              session.state == .connecting || session.state == .reconnecting else {
            central.cancelPeripheralConnection(peripheral)
            return
        }
        session.connectTimer?.invalidate()
        session.connectTimer = nil
        let wasReconnect = session.state == .reconnecting
        session.reconnectAttempt = 0
        session.state = .connected
        log(wasReconnect ? "自动重连成功 · \(session.device.name)" : "连接成功 · \(session.device.name)", .ok)
        // F006 口径：MTU 247 为 Android 适配器侧语义；macOS 由系统协商，如实记录最大写入长度
        let mtu = peripheral.maximumWriteValueLength(for: .withoutResponse)
        log("ATT 协商 · 最大写入 \(mtu) 字节（withResponse \(peripheral.maximumWriteValueLength(for: .withResponse))）")
        if session.id == activeDeviceId { syncActiveMirror() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self, weak session] in
            Task { @MainActor [weak self, weak session] in
                guard let self, let session, self.sessions[session.id] === session,
                      session.state == .connected, !session.retiringConnection else { return }
                if session.id == self.activeDeviceId {
                    self.discoverServices()
                } else {
                    self.log("服务发现中… · \(session.device.name)")
                    session.peripheral.discoverServices(nil)
                }
            }
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral,
                       error: Error?) {
        guard let session = session(for: peripheral) else { return }
        session.connectTimer?.invalidate()
        session.connectTimer = nil
        session.readDeadlines.cancelAll()
        session.notificationDeadlines.cancelAll()
        let wasActive = session.id == activeDeviceId
        let name = session.device.name

        if let error = error {
            log("连接已断开 · \(name)（\(error.localizedDescription)）", .err)
        } else {
            log("已断开连接 · \(name)")
        }

        // 全部断开结算（allSettled）
        if pendingDisconnectAll[session.id] != nil {
            pendingDisconnectAll.removeValue(forKey: session.id)
            if pendingDisconnectAll.isEmpty { settleDisconnectAll() }
        }

        if session.userInitiatedDisconnect || session.suppressAutoReconnect {
            // 主动断开 / OTA 接管 → 永不自动重连（SM §2），会话结束
            abortWrites(session, reason: "会话结束")
            sessions.removeValue(forKey: session.id)
            if wasActive {
                activeDeviceId = sessions.values.first(where: { $0.state == .connected })?.id
            }
            syncActiveMirror()
        } else {
            // 被动断线 → F012：写队列 abort（PENDING→CANCELLED）后调度自动重连
            abortWrites(session, reason: "被动断线 · 重连期")
            session.services = []
            session.resubscribeSet.formUnion(session.notifyingCharacteristics)
            session.notificationState.clear()
            if wasActive { services = [] }
            scheduleReconnect(session)
        }
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral,
                       error: Error?) {
        guard let session = session(for: peripheral) else { return }
        log("连接失败 · \(session.device.name)：\(error?.localizedDescription ?? "未知错误")", .err)
        // 全部断开结算（取消待连也会走此回调）
        if pendingDisconnectAll[session.id] != nil {
            pendingDisconnectAll.removeValue(forKey: session.id)
            if pendingDisconnectAll.isEmpty { settleDisconnectAll() }
        }
        session.connectTimer?.invalidate()
        session.connectTimer = nil
        session.readDeadlines.cancelAll()
        session.notificationDeadlines.cancelAll()
        abortWrites(session, reason: "连接失败")
        if session.userInitiatedDisconnect || session.suppressAutoReconnect {
            sessions.removeValue(forKey: session.id)
            if activeDeviceId == session.id { activeDeviceId = nil }
            syncActiveMirror()
        } else {
            scheduleReconnect(session)
        }
    }
}

// MARK: - CBPeripheralDelegate（按会话路由回调）
extension BLEManager: @preconcurrency CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let session = session(for: peripheral), session.state == .connected, !session.retiringConnection else { return }
        if let error = error {
            log("服务发现失败 · \(session.device.name)：\(error.localizedDescription)", .err)
            return
        }
        guard let peripheralServices = peripheral.services else { return }

        log("服务发现完成 · \(session.device.name)（\(peripheralServices.count) 服务）", .ok)
        session.services = peripheralServices.map { service in
            BLEService(
                id: service.uuid.uuidString,
                uuid: service.uuid.uuidString,
                name: getServiceName(service.uuid),
                peripheralService: service
            )
        }
        if session.id == activeDeviceId { services = session.services }
        if let firstService = peripheralServices.first {
            discoverCharacteristics(for: firstService, of: session)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService,
                    error: Error?) {
        guard let session = session(for: peripheral), session.state == .connected, !session.retiringConnection else { return }
        if let error = error {
            log("特征发现失败：\(error.localizedDescription)", .err)
            return
        }
        guard session.services.contains(where: { $0.peripheralService === service }),
              let characteristics = service.characteristics else { return }

        log("服务 \(getServiceName(service.uuid))：\(characteristics.count) 特征 · \(session.device.name)", .ok)

        if let index = session.services.firstIndex(where: { $0.uuid == service.uuid.uuidString }) {
            session.services[index].characteristics = characteristics.map { char in
                BLECharacteristic(
                    id: char.uuid.uuidString,
                    uuid: char.uuid.uuidString,
                    name: getCharacteristicName(char.uuid),
                    properties: getProperties(char.properties),
                    peripheralCharacteristic: char
                )
            }
            if session.id == activeDeviceId { services = session.services }
        }
        if let serviceIndex = session.services.firstIndex(where: { $0.peripheralService == service }),
           serviceIndex + 1 < session.services.count,
           let nextService = session.services[serviceIndex + 1].peripheralService {
            discoverCharacteristics(for: nextService, of: session)
        } else if !session.resubscribeSet.isEmpty, session.state == .connected {
            // F012：重连成功且特征重发现完成 → 恢复断线前的监听订阅
            let pending = session.resubscribeSet
            session.resubscribeSet = []
            log("重连后恢复监听 · \(session.device.name)（\(pending.count) 特征）")
            for uuid in pending {
                setNotification(characteristicUUID: uuid, enabled: true, on: session)
            }
            if session.id == activeDeviceId { syncActiveMirror() }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic,
                    error: Error?) {
        guard let session = callbackSession(peripheral, characteristic: characteristic) else { return }
        session.readDeadlines.complete(key: characteristicKey(characteristic))
        if let error = error {
            log("读取失败 · \(session.device.name)：\(error.localizedDescription)", .err)
            return
        }
        guard let data = characteristic.value else { return }
        let hexString = data.map { String(format: "%02X", $0) }.joined(separator: " ")
        let text = String(data: data, encoding: .utf8) ?? ""
        log("[\(session.device.name)] HEX: \(hexString)\nTEXT: \(text.isEmpty ? "（解码失败，省略）" : text)", .recv)
        // OTA 状态/版本回读 + Smart HID INFO/STATUS 特征转发（F025/F019-F022）
        let upper = characteristic.uuid.uuidString.uppercased()
        if upper == OtaManager.statusCharUuid || upper == OtaManager.firmwareVersionCharUuid {
            otaStatusHandler?(session.id, data)
        }
        if upper == HidProtocol.infoCharUuid || upper == HidProtocol.statusCharUuid {
            hidValueHandler?(session.id, upper, data)
        }
        if let index = session.services.firstIndex(where: { $0.uuid == characteristic.service?.uuid.uuidString }) {
            if let cIndex = session.services[index].characteristics.firstIndex(where: { $0.uuid == characteristic.uuid.uuidString }) {
                session.services[index].characteristics[cIndex].value = hexString
                if session.id == activeDeviceId { services = session.services }
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic,
                    error: Error?) {
        guard let session = callbackSession(peripheral, characteristic: characteristic) else { return }
        // 写队列结算（F009：withResponse 完成回调驱动串行续泵）
        if let inflight = session.writeInFlight, inflight.characteristicUuid == characteristic.uuid.uuidString,
           inflight.serviceUuid == characteristic.service?.uuid.uuidString {
            session.writeTimeoutTask?.cancel()
            session.writeTimeoutTask = nil
            session.writeInFlight = nil
            if let error = error {
                log("写入失败 · \(inflight.itemId) · \(session.device.name)：\(error.localizedDescription)", .err)
            } else {
                log("写入成功 · \(inflight.itemId) · \(session.device.name)", .ok)
            }
            onWriteSettled?(session.id, inflight.itemId, error == nil)
            pumpWrites(session)
        } else if let error = error {
            log("写入失败 · \(session.device.name)：\(error.localizedDescription)", .err)
        }
    }

    func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
        guard let session = session(for: peripheral), !session.retiringConnection else { return }
        pumpWrites(session)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic,
                    error: Error?) {
        guard let session = callbackSession(peripheral, characteristic: characteristic) else { return }
        session.notificationDeadlines.complete(key: characteristicKey(characteristic))
        session.notificationState.observe(uuid: characteristic.uuid.uuidString,
                                          isNotifying: characteristic.isNotifying, succeeded: error == nil)
        if session.id == activeDeviceId { syncActiveMirror() }
        if let error = error {
            log("监听状态更新失败 · \(session.device.name)：\(error.localizedDescription)", .err)
        } else {
            log("监听\(characteristic.isNotifying ? "已开启" : "已停止") · \(getCharacteristicName(characteristic.uuid)) · \(session.device.name)", .ok)
        }
    }

    // MARK: - Helper Methods
    private func getProperties(_ props: CBCharacteristicProperties) -> CharacteristicProperties {
        var result: CharacteristicProperties = []
        if props.contains(.read) { result.insert(.read) }
        if props.contains(.write) { result.insert(.write) }
        if props.contains(.writeWithoutResponse) { result.insert(.writeWithoutResponse) }
        if props.contains(.notify) { result.insert(.notify) }
        if props.contains(.indicate) { result.insert(.indicate) }
        return result
    }

    private func getServiceName(_ uuid: CBUUID) -> String {
        switch uuid.uuidString {
        case "1800": return "通用访问"
        case "1801": return "通用属性"
        case "180A": return "设备信息"
        case "180F": return "电池服务"
        case "180D": return "心率"
        case "1812": return "HID"
        case "181C": return "用户数据"
        case "4FAFC201-1FB5-459E-914D-914D0CDFF40D": return "OTA 服务"
        case "FFE0": return "串口透传"
        default:
            let uuidStr = uuid.uuidString
            if uuidStr.hasPrefix("0000") && uuidStr.count == 36 {
                let start = uuidStr.index(uuidStr.startIndex, offsetBy: 4)
                let end = uuidStr.index(start, offsetBy: 4)
                return "服务 \(uuidStr[start..<end])"
            }
            return "自定义服务"
        }
    }

    private func getCharacteristicName(_ uuid: CBUUID) -> String {
        switch uuid.uuidString {
        case "2A00": return "设备名"
        case "2A01": return "外观"
        case "2A29": return "制造商名称"
        case "2A24": return "型号"
        case "2A25": return "序列号"
        case "2A27": return "硬件版本"
        case "2A26": return "固件版本"
        case "2A28": return "软件版本"
        case "2A19": return "电量"
        case "2A37": return "心率测量"
        case "2A38": return "传感器位置"
        case "BEB5483E-36E1-4688-B7F5-EA07361B26C0": return "OTA 控制"
        case "BEB5483E-36E1-4688-B7F5-EA07361B26C1": return "OTA 数据"
        case "BEB5483E-36E1-4688-B7F5-EA07361B26C2": return "版本回读"
        default:
            let uuidStr = uuid.uuidString
            if uuidStr.hasPrefix("0000") && uuidStr.count == 36 {
                let start = uuidStr.index(uuidStr.startIndex, offsetBy: 4)
                let end = uuidStr.index(start, offsetBy: 4)
                return "特征值 \(uuidStr[start..<end])"
            }
            return "自定义特征"
        }
    }
}

// MARK: - CBPeripheralManagerDelegate
extension BLEManager: @preconcurrency CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        peripheralReady = peripheral.state == .poweredOn
        switch peripheral.state {
        case .poweredOn:
            log("外围模式已就绪", .ok)
        case .poweredOff:
            log("外围模式未开启", .err)
            isAdvertising = false
        case .unauthorized:
            log("外围模式未授权", .err)
        case .unknown, .resetting, .unsupported:
            log("外围模式状态异常：\(peripheral.state)", .err)
        @unknown default:
            break
        }
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        if let error = error {
            log("广播启动失败：\(error.localizedDescription)", .err)
            isAdvertising = false
        } else {
            log("广播已启动", .ok)
            isAdvertising = true
        }
    }
}
