//
// SmartBLE Desktop for macOS - BLE Manager
// r3：对齐产品正典口径 —— 日志六色（sys/err/read/write/recv/ok）、名称多级 fallback（F005）、
// 广播数据捕获（F004）、Profile 匹配（探针启发式）、连接 10s 超时 + 3 次退避重试（PAGE006）。
// 已知限制（诚实口径，见 verification r3）：
//  · 多设备并行会话未支持（单连接）；P007 列表只呈现当前唯一会话。
//  · Profile 匹配为探针启发式（smart-hid 服务 UUID 强匹配 / 名称前缀弱匹配），
//    正式 Profile 注册表属共享层（Windows 主线）。
//

import Foundation
import CoreBluetooth
import Combine

// MARK: - Connection State
enum ConnectionState {
    case disconnected
    case connecting
    case connected
    case disconnecting
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
    @Published var connectedDevice: BLEDevice?
    @Published var connectionState: ConnectionState = .disconnected
    @Published var services: [BLEService] = []
    @Published var logs: [LogEntry] = []
    @Published var btState: BTState = .unknown
    @Published var peripheralReady = false
    /// P008 徽章「已停止」态（停止后置位）
    @Published var lastAdvStopped = false
    /// 最近一次扫描完成文案（P001 工具条标签 + toast）
    @Published var lastScanSummary: String = "待开始扫描"

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

    // MARK: - Private Properties
    private var centralManager: CBCentralManager?
    private var peripheralManager: CBPeripheralManager?
    private var connectedPeripheral: CBPeripheral?

    // 扫描 5s 会话自动停（正典 PAGE001：启动 5s 扫描会话）
    private var autoStopTimer: Timer?
    // 连接 10s 超时 + 3 次退避重试（正典 PAGE006：10s 超时 · 重试 3 次退避 n×2s）
    private var connectTimeoutTimer: Timer?
    private var retryCount = 0
    private let maxRetries = 3

    private var notifyingCharacteristics: Set<String> = []

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
        retryCount = 0
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

    // MARK: - Connection Methods
    func connect(device: BLEDevice) {
        guard let centralManager = centralManager,
              centralManager.state == .poweredOn else {
            log("连接失败：蓝牙适配器未就绪", .err)
            return
        }

        stopScan(userInitiated: false)
        connectionState = .connecting
        connectedDevice = device
        log("连接 \(device.name) · 暂存路由上下文")
        centralManager.connect(device.peripheral, options: nil)
        armConnectTimeout(for: device)
    }

    private func armConnectTimeout(for device: BLEDevice) {
        connectTimeoutTimer?.invalidate()
        connectTimeoutTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.connectionState == .connecting else { return }
                if self.retryCount < self.maxRetries {
                    self.retryCount += 1
                    let backoff = Double(self.retryCount) * 2.0
                    self.log("连接超时（10s）· 自动重连中（\(self.retryCount)/\(self.maxRetries)）· \(Int(backoff))s backoff", .err)
                    self.connectedDevice = device
                    self.centralManager?.connect(device.peripheral, options: nil)
                    // 退避后仍未回调则再触发超时判定：直接重挂超时计时
                    DispatchQueue.main.asyncAfter(deadline: .now() + backoff) { [weak self] in
                        Task { @MainActor [weak self] in
                            guard let self, self.connectionState == .connecting else { return }
                            self.armConnectTimeout(for: device)
                        }
                    }
                } else {
                    self.log("连接超时（10s），已自动重试 \(self.maxRetries) 次仍未成功。", .err)
                    self.connectionState = .disconnected
                    self.connectedDevice = nil
                }
            }
        }
    }

    func disconnect() {
        connectTimeoutTimer?.invalidate()
        connectTimeoutTimer = nil
        retryCount = 0
        guard let peripheral = connectedPeripheral else {
            connectionState = .disconnected
            connectedDevice = nil
            services.removeAll()
            return
        }

        connectionState = .disconnecting
        log("断开连接中…")
        centralManager?.cancelPeripheralConnection(peripheral)
    }

    // MARK: - Service Discovery
    func discoverServices() {
        guard let peripheral = connectedPeripheral else {
            log("无已连接设备", .err)
            return
        }
        log("服务发现中…")
        peripheral.discoverServices(nil)
    }

    private func discoverCharacteristics(for service: CBService) {
        guard let peripheral = connectedPeripheral else { return }
        peripheral.discoverCharacteristics(nil, for: service)
    }

    // MARK: - Characteristic Operations
    func readCharacteristic(characteristicUUID: String) {
        guard let char = findCharacteristic(characteristicUUID),
              let peripheralChar = char.peripheralCharacteristic else {
            log("特征未找到：\(characteristicUUID)", .err)
            return
        }
        log("读取 \(char.name)…（3s 超时）", .read)
        connectedPeripheral?.readValue(for: peripheralChar)
    }

    func writeCharacteristic(characteristicUUID: String, text: String, isHex: Bool) {
        guard let char = findCharacteristic(characteristicUUID),
              let peripheralChar = char.peripheralCharacteristic else {
            log("特征未找到：\(characteristicUUID)", .err)
            return
        }
        let data: Data
        if isHex {
            let bytes = text.split(whereSeparator: { $0 == " " }).compactMap { UInt8($0, radix: 16) }
            data = Data(bytes)
        } else {
            data = Data(text.utf8)
        }
        let hexString = data.map { String(format: "%02X", $0) }.joined(separator: " ")
        log("写入 \(char.name)：\(isHex ? "HEX" : "TEXT"): \(isHex ? hexString : text)", .write)
        let writeType: CBCharacteristicWriteType =
            char.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse
        connectedPeripheral?.writeValue(data, for: peripheralChar, type: writeType)
    }

    func setNotification(characteristicUUID: String, enabled: Bool) {
        guard let char = findCharacteristic(characteristicUUID),
              let peripheralChar = char.peripheralCharacteristic else {
            log("特征未找到：\(characteristicUUID)", .err)
            return
        }
        log("\(enabled ? "开始监听" : "停止监听") \(char.name) · 防抖去重 300ms")
        connectedPeripheral?.setNotifyValue(enabled, for: peripheralChar)

        if enabled {
            notifyingCharacteristics.insert(characteristicUUID)
        } else {
            notifyingCharacteristics.remove(characteristicUUID)
        }
    }

    func isNotifying(characteristicUUID: String) -> Bool {
        notifyingCharacteristics.contains(characteristicUUID)
    }

    private func findCharacteristic(_ uuid: String) -> BLECharacteristic? {
        for s in services {
            if let c = s.characteristics.first(where: { $0.uuid == uuid }) {
                return c
            }
        }
        return nil
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
            isConnected: connectedPeripheral == peripheral
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
        connectTimeoutTimer?.invalidate()
        connectTimeoutTimer = nil
        retryCount = 0
        log("连接成功 · \(peripheral.name ?? "设备")", .ok)
        connectedPeripheral = peripheral
        connectionState = .connected
        if var d = connectedDevice, d.id == peripheral.identifier.uuidString {
            d.isConnected = true
            connectedDevice = d
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            Task { @MainActor [weak self] in self?.discoverServices() }
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral,
                       error: Error?) {
        connectedPeripheral = nil
        connectionState = .disconnected
        if connectedDevice?.id == peripheral.identifier.uuidString {
            connectedDevice = nil
        }
        services.removeAll()
        notifyingCharacteristics.removeAll()

        if let error = error {
            log("连接已断开（\(error.localizedDescription)）", .err)
        } else {
            log("已断开连接")
        }
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral,
                       error: Error?) {
        log("连接失败：\(error?.localizedDescription ?? "未知错误")", .err)
        if retryCount >= maxRetries {
            connectionState = .disconnected
            connectedDevice = nil
        }
    }
}

// MARK: - CBPeripheralDelegate
extension BLEManager: @preconcurrency CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            log("服务发现失败：\(error.localizedDescription)", .err)
            return
        }
        guard let peripheralServices = peripheral.services else { return }

        log("服务发现完成（\(peripheralServices.count) 服务）", .ok)
        services = peripheralServices.map { service in
            BLEService(
                id: service.uuid.uuidString,
                uuid: service.uuid.uuidString,
                name: getServiceName(service.uuid),
                peripheralService: service
            )
        }
        if let firstService = peripheralServices.first {
            discoverCharacteristics(for: firstService)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService,
                    error: Error?) {
        if let error = error {
            log("特征发现失败：\(error.localizedDescription)", .err)
            return
        }
        guard let characteristics = service.characteristics else { return }

        log("服务 \(getServiceName(service.uuid))：\(characteristics.count) 特征", .ok)

        if let index = services.firstIndex(where: { $0.uuid == service.uuid.uuidString }) {
            services[index].characteristics = characteristics.map { char in
                BLECharacteristic(
                    id: char.uuid.uuidString,
                    uuid: char.uuid.uuidString,
                    name: getCharacteristicName(char.uuid),
                    properties: getProperties(char.properties),
                    peripheralCharacteristic: char
                )
            }
        }
        if let serviceIndex = services.firstIndex(where: { $0.peripheralService == service }),
           serviceIndex + 1 < services.count,
           let nextService = services[serviceIndex + 1].peripheralService {
            discoverCharacteristics(for: nextService)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic,
                    error: Error?) {
        if let error = error {
            log("读取失败：\(error.localizedDescription)", .err)
            return
        }
        guard let data = characteristic.value else { return }
        let hexString = data.map { String(format: "%02X", $0) }.joined(separator: " ")
        let text = String(data: data, encoding: .utf8) ?? ""
        log("HEX: \(hexString)\nTEXT: \(text.isEmpty ? "（解码失败，省略）" : text)", .recv)
        if let index = services.firstIndex(where: { $0.uuid == characteristic.service?.uuid.uuidString }) {
            if let cIndex = services[index].characteristics.firstIndex(where: { $0.uuid == characteristic.uuid.uuidString }) {
                services[index].characteristics[cIndex].value = hexString
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic,
                    error: Error?) {
        if let error = error {
            log("写入失败：\(error.localizedDescription)", .err)
        } else {
            log("写入成功", .ok)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic,
                    error: Error?) {
        if let error = error {
            log("监听状态更新失败：\(error.localizedDescription)", .err)
        } else {
            log("监听\(characteristic.isNotifying ? "已开启" : "已停止") · \(getCharacteristicName(characteristic.uuid))", .ok)
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
