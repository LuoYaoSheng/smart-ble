//
//  DeviceListViewModel.swift
//  SmartBLE
//
//  设备列表 ViewModel
//

import Foundation
import Combine

@MainActor
class DeviceListViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var devices: [BleDevice] = []
    @Published var isScanning = false
    @Published var bluetoothState: BluetoothState = .unknown
    @Published var errorMessage: String?

    // MARK: - Private Properties

    private let bleManager = BleManager()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Computed Properties

    var isBluetoothReady: Bool {
        bluetoothState == .on
    }

    var stateMessage: String? {
        switch bluetoothState {
        case .unavailable:
            return "此设备不支持蓝牙低功耗(BLE)"
        case .unauthorized:
            return "请允许蓝牙权限"
        case .off:
            return "蓝牙未开启，请在设置中开启"
        case .on:
            return nil
        case .resetting:
            return "蓝牙正在重置"
        case .unknown:
            return "正在初始化蓝牙..."
        }
    }

    // MARK: - Initialization

    init() {
        setupBindings()
    }

    // MARK: - Private Methods

    private func setupBindings() {
        // 监听蓝牙状态
        bleManager.$bluetoothState
            .receive(on: DispatchQueue.main)
            .assign(to: &$bluetoothState)

        // 监听扫描结果
        bleManager.$scanResults
            .map { results in
                results.map { $0.device }
            }
            .receive(on: DispatchQueue.main)
            .assign(to: &$devices)

        // 监听扫描状态
        bleManager.$isScanning
            .receive(on: DispatchQueue.main)
            .assign(to: &$isScanning)

        // 监听错误
        bleManager.$errorMessage
            .receive(on: DispatchQueue.main)
            .assign(to: &$errorMessage)
    }

    // MARK: - Public Methods

    /// 开始扫描
    func startScan() {
        guard isBluetoothReady else {
            errorMessage = "蓝牙未就绪"
            return
        }
        bleManager.startScan()
    }

    /// 停止扫描
    func stopScan() {
        bleManager.stopScan()
    }

    /// 切换扫描状态
    func toggleScan() {
        if isScanning {
            stopScan()
        } else {
            startScan()
        }
    }

    /// 连接设备
    func connect(deviceId: String) -> Bool {
        return bleManager.connect(deviceId: deviceId)
    }

    /// 清除错误
    func clearError() {
        errorMessage = nil
    }

    /// 获取 BLE Manager (用于传递给设备详情页)
    func getBleManager() -> BleManager {
        return bleManager
    }
}
