//
//  DeviceDetailViewModel.swift
//  SmartBLE
//
//  设备详情 ViewModel
//

import Foundation
import Combine

// MARK: - Log Entry

/// 日志条目
struct LogEntry: Identifiable {
    let id = UUID()
    let message: String
    let type: LogType
    let timestamp: String
}

// MARK: - Log Type

/// 日志类型
enum LogType {
    case info
    case success
    case error
    case receive
}

@MainActor
class DeviceDetailViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var connectionState: ConnectionState = .disconnected
    @Published var services: [BleService] = []
    @Published var logs: [LogEntry] = []
    @Published var isLoading = true
    @Published var errorMessage: String?

    // MARK: - Private Properties

    private let bleManager: BleManager
    private let deviceId: String
    private let deviceName: String
    private var cancellables = Set<AnyCancellable>()

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()

    // MARK: - Computed Properties

    var isConnected: Bool {
        connectionState == .connected
    }

    // MARK: - Initialization

    init(bleManager: BleManager, deviceId: String, deviceName: String) {
        self.bleManager = bleManager
        self.deviceId = deviceId
        self.deviceName = deviceName

        setupBindings()
        connectToDevice()
    }

    // MARK: - Private Methods

    private func setupBindings() {
        // 监听连接状态
        bleManager.$connectionState
            .receive(on: DispatchQueue.main)
            .assign(to: &$connectionState)

        // 监听服务
        bleManager.$services
            .receive(on: DispatchQueue.main)
            .sink { [weak self] services in
                guard let self = self else { return }
                self.isLoading = false
                if !services.isEmpty {
                    self.addLog("发现 \(services.count) 个服务", type: .info)
                }
            }
            .store(in: &cancellables)

        // 监听特征值变化
        bleManager.characteristicChanges
            .sink { [weak self] event in
                guard let self = self else { return }
                let hex = event.value.hexadecimal
                self.addLog("收到通知: \(hex)", type: .receive)
            }
            .store(in: &cancellables)

        // 监听错误
        bleManager.$errorMessage
            .receive(on: DispatchQueue.main)
            .assign(to: &$errorMessage)
    }

    private func connectToDevice() {
        addLog("正在连接设备...", type: .info)
        let success = bleManager.connect(deviceId: deviceId)
        if !success {
            addLog("连接失败", type: .error)
            isLoading = false
        }
    }

    private func addLog(_ message: String, type: LogType) {
        let entry = LogEntry(
            message: message,
            type: type,
            timestamp: dateFormatter.string(from: Date())
        )
        logs.append(entry)
    }

    // MARK: - Public Methods

    /// 断开连接
    func disconnect() {
        addLog("断开连接", type: .info)
        bleManager.disconnect()
    }

    /// 读取特征值
    func readCharacteristic(serviceUuid: String, characteristicUuid: String) {
        guard let service = services.first(where: { $0.uuid == serviceUuid }),
              let characteristic = service.characteristics.first(where: { $0.uuid == characteristicUuid }) else {
            return
        }

        addLog("读取 \(characteristic.displayName)...", type: .info)

        let success = bleManager.readCharacteristic(
            serviceUuid: serviceUuid,
            characteristicUuid: characteristicUuid
        )

        if !success {
            addLog("读取失败", type: .error)
        }
    }

    /// 写入特征值
    func writeCharacteristic(serviceUuid: String, characteristicUuid: String, data: Data) {
        guard let service = services.first(where: { $0.uuid == serviceUuid }),
              let characteristic = service.characteristics.first(where: { $0.uuid == characteristicUuid }) else {
            return
        }

        addLog("写入 \(characteristic.displayName): \(data.hexadecimal)", type: .info)

        let success = bleManager.writeCharacteristic(
            serviceUuid: serviceUuid,
            characteristicUuid: characteristicUuid,
            data: data
        )

        if success {
            addLog("写入成功", type: .success)
        } else {
            addLog("写入失败", type: .error)
        }
    }

    /// 切换通知状态
    func toggleNotification(serviceUuid: String, characteristicUuid: String) {
        guard let service = services.first(where: { $0.uuid == serviceUuid }),
              let characteristic = service.characteristics.first(where: { $0.uuid == characteristicUuid }) else {
            return
        }

        let newState = !characteristic.isNotifying
        let action = newState ? "启用" : "禁用"

        addLog("\(action) 通知 \(characteristic.displayName)...", type: .info)

        let success = bleManager.setNotification(
            serviceUuid: serviceUuid,
            characteristicUuid: characteristicUuid,
            enabled: newState
        )

        // 更新本地状态
        if let serviceIndex = services.firstIndex(where: { $0.uuid == serviceUuid }),
           let charIndex = services[serviceIndex].characteristics.firstIndex(where: { $0.uuid == characteristicUuid }) {
            services[serviceIndex].characteristics[charIndex].isNotifying = newState
        }

        if success {
            addLog("通知已\(action)", type: .success)
        } else {
            addLog("设置通知失败", type: .error)
        }
    }

    /// 清空日志
    func clearLogs() {
        logs.removeAll()
    }
}
