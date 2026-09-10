#if DEBUG
import Foundation
import SmartHidCore
import SwiftUI

enum NativePreviewScenario: String {
    case p001FilterExpanded = "p001-filter-expanded"
    case p001FilterEmpty = "p001-filter-empty"
    case p001ScanFailed = "p001-scan-failed"
    case p001BluetoothOff = "p001-bluetooth-off"
    case p001Unsupported = "p001-unsupported"
    case p002Configure = "p002-configure"
    case p002IdentityFailed = "p002-identity-failed"
    case p002Success = "p002-success"
    case p002WifiFailed = "p002-wifi-failed"
    case p003Detail = "p003-detail"
    case p003MissingFields = "p003-missing-fields"
    case p003Empty = "p003-empty"
    case p005Diagnostics = "p005-diagnostics"
    case p005Offline = "p005-offline"
    case p005Error = "p005-error"
    case p006Gatt = "p006-gatt"
    case p009About = "p009"
    case p010Versions = "p010"
    case tabConnected = "tab-connected"
    case tabBroadcast = "tab-broadcast"

    static func fromArguments(_ arguments: [String] = ProcessInfo.processInfo.arguments) -> NativePreviewScenario? {
        guard let argument = arguments.first(where: { $0.hasPrefix("--ui-preview=") }) else { return nil }
        return NativePreviewScenario(rawValue: String(argument.dropFirst("--ui-preview=".count)))
    }
}

struct NativePreviewRoot: View {
    @EnvironmentObject private var bleManager: BLEManager
    let scenario: NativePreviewScenario
    private let transport: PreviewHidTransport
    @StateObject private var hidManager: HidProvisionManager

    init(scenario: NativePreviewScenario) {
        self.scenario = scenario
        let transport = PreviewHidTransport()
        self.transport = transport
        _hidManager = StateObject(wrappedValue: HidProvisionManager(transport: transport))
    }

    var body: some View {
        Group {
            switch scenario {
            case .p001FilterExpanded:
                ContentView(scanPreviewScenario: .filterExpanded)
            case .p001FilterEmpty:
                ContentView(scanPreviewScenario: .filterEmpty)
            case .p001ScanFailed:
                ContentView(scanPreviewScenario: .scanFailed)
            case .p001BluetoothOff:
                ContentView(scanPreviewScenario: .bluetoothOff)
            case .p001Unsupported:
                ContentView(scanPreviewScenario: .unsupported)
            case .p002Configure, .p002IdentityFailed, .p002Success, .p002WifiFailed:
                ProvisioningView(manager: hidManager, device: device, previewSeed: provisioningSeed)
            case .p003Detail, .p003MissingFields, .p003Empty:
                HidDeviceDetailView(deviceId: device.id)
            case .p005Diagnostics:
                HidDiagnosticsView(manager: hidManager, deviceId: device.id, autoRun: true)
            case .p005Offline, .p005Error:
                HidDiagnosticsView(manager: hidManager, deviceId: device.id, autoRun: false)
            case .p006Gatt:
                DeviceDetailView(deviceId: device.id)
            case .p009About:
                ContentView(initialTab: .about, connectedCountOverride: 3)
            case .p010Versions:
                VersionHistoryView()
            case .tabConnected:
                ContentView(initialTab: .connected, connectedCountOverride: 3)
            case .tabBroadcast:
                ContentView(initialTab: .broadcast, connectedCountOverride: 3)
            }
        }
        .environmentObject(bleManager)
        .onAppear { configureScenario() }
    }

    private var device: ScanResult {
        ScanResult(
            id: "SHID-9F3E2A1C",
            name: "SHID-9F3E2A1C",
            rssi: -52,
            peripheral: nil,
            serviceUUIDs: [HidProtocol.serviceUuid]
        )
    }

    private func configureScenario() {
        if scenario == .p001FilterExpanded {
            bleManager.lockBluetoothStateForPreview(.poweredOn)
            bleManager.scanResults = previewScanResults
            bleManager.filteredScanResults = previewScanResults
            return
        }
        if scenario == .p001FilterEmpty || scenario == .p001ScanFailed {
            bleManager.lockBluetoothStateForPreview(.poweredOn)
            bleManager.scanResults = []
            bleManager.filteredScanResults = []
            return
        }
        if scenario == .p001BluetoothOff {
            bleManager.lockBluetoothStateForPreview(.poweredOff)
            bleManager.scanResults = []
            bleManager.filteredScanResults = []
            return
        }
        if scenario == .p001Unsupported {
            bleManager.lockBluetoothStateForPreview(.unsupported)
            bleManager.scanResults = []
            bleManager.filteredScanResults = []
            return
        }
        if scenario == .p009About || scenario == .p010Versions || scenario == .tabConnected || scenario == .tabBroadcast {
            return
        }
        if scenario == .p003Empty {
            return
        }
        if scenario == .p005Offline {
            hidManager.configurePreview(deviceId: device.id, stage: .idle)
            return
        }
        if scenario == .p005Error {
            hidManager.configurePreview(
                deviceId: device.id,
                stage: .failed(
                    code: "diagnostic_connect_failed",
                    message: "连接超时：请让设备进入配网/恢复模式后重试（READY 设备会关闭蓝牙广播）。",
                    recovery: "form"
                )
            )
            return
        }

        bleManager.connectionStates[device.id] = .connected
        bleManager.connectedDevices[device.id] = device
        bleManager.servicesByDevice[device.id] = previewServices
        bleManager.saveHidSessionSnapshot(previewSnapshot)

        if scenario == .p002IdentityFailed {
            hidManager.configurePreview(
                deviceId: device.id,
                stage: .failed(
                    code: "identity_failed",
                    message: "设备身份验证失败：Device Info 返回 product≠smart-hid，已断开连接。",
                    recovery: "form"
                )
            )
            return
        }
        if scenario == .p002Success {
            hidManager.configurePreview(
                deviceId: device.id,
                stage: .done,
                rows: ["wifi": "done", "hub": "done", "conn": "done", "usb": "done"],
                deviceInfo: previewDeviceInfo,
                latestStatus: HidProtocol.ProvisionStatus(state: "ready", step: "ready", error: nil)
            )
            return
        }
        if scenario == .p002WifiFailed {
            hidManager.configurePreview(
                deviceId: device.id,
                stage: .failed(
                    code: "wifi_failed",
                    message: "设备侧报告 Wi-Fi 连接失败，请核对 SSID 与密码。",
                    recovery: "form"
                ),
                rows: ["wifi": "fail", "hub": "pending", "conn": "pending", "usb": "pending"],
                deviceInfo: previewDeviceInfo,
                latestStatus: HidProtocol.ProvisionStatus(state: "wifi_failed", step: "wifi", error: "wifi_failed")
            )
            return
        }

        Task { @MainActor in
            await Task.yield()
            if scenario == .p002Configure {
                transport.emitValue(uuid: HidProtocol.infoCharUuid, text: previewInfo)
            } else if scenario == .p005Diagnostics {
                transport.emitValue(uuid: HidProtocol.infoCharUuid, text: previewInfo)
                transport.emitValue(uuid: HidProtocol.statusCharUuid, text: #"{"state":"ready","step":"ready","error":null}"#)
            }
        }
    }

    private var provisioningSeed: ProvisioningPreviewSeed? {
        switch scenario {
        case .p002Success:
            return ProvisioningPreviewSeed(
                ssid: "Home-5G",
                hubHost: "192.168.1.8",
                hubPort: 17892,
                token: "0123456789abcdef0123456789abcdef",
                submitted: true
            )
        case .p002WifiFailed:
            return ProvisioningPreviewSeed(
                ssid: "Home-5G",
                hubHost: "192.168.1.8",
                hubPort: 17892,
                token: "0123456789abcdef0123456789abcdef",
                submitted: true
            )
        default:
            return nil
        }
    }

    private var previewDeviceInfo: HidProtocol.DeviceInfo {
        HidProtocol.DeviceInfo(
            product: "smart-hid",
            protocolVersion: "1.0",
            deviceId: "HID-9F3E2A1C",
            firmware: "1.1.1",
            state: "ready",
            provisioned: true
        )
    }

    private var previewSnapshot: HidSessionSnapshot {
        let missing = scenario == .p003MissingFields
        return HidSessionSnapshot(
            deviceId: device.id,
            name: device.name,
            protocolVersion: missing ? nil : "1.0",
            firmware: missing ? nil : "1.1.1",
            lastWifi: missing ? "" : "Home-5G",
            lastHub: missing ? "" : "192.168.1.8:17892"
        )
    }

    private var previewScanResults: [ScanResult] {
        [
            device,
            ScanResult(id: "D8:A6:3A:41:F2:09", name: "Mi Smart Band 8", rssi: -66, peripheral: nil),
            ScanResult(id: "EF:6B:12:0C:AA:77", name: "", rssi: -78, peripheral: nil),
            ScanResult(
                id: "LightBLE-DevKit",
                name: "LightBLE-DevKit",
                rssi: -59,
                peripheral: nil,
                serviceUUIDs: ["FFF0"]
            ),
            ScanResult(id: "C4:11:9E:02:3B:5F", name: "", rssi: -85, peripheral: nil),
        ]
    }

    private var previewInfo: String {
        #"{"product":"smart-hid","protocol":"1.0","device_id":"HID-9F3E2A1C","firmware":"1.1.0","state":"ready","provisioned":true}"#
    }

    private var previewServices: [BLEService] {
        var info = BLEService(id: HidProtocol.serviceUuid, uuid: HidProtocol.serviceUuid, name: "Smart HID 配网服务")
        info.characteristics = [
            BLECharacteristic(
                id: HidProtocol.infoCharUuid,
                uuid: HidProtocol.infoCharUuid,
                name: "Device Info",
                serviceUUID: HidProtocol.serviceUuid,
                properties: [.read, .notify]
            ),
            BLECharacteristic(
                id: HidProtocol.inputCharUuid,
                uuid: HidProtocol.inputCharUuid,
                name: "Provision Input",
                serviceUUID: HidProtocol.serviceUuid,
                properties: [.write]
            ),
            BLECharacteristic(
                id: HidProtocol.statusCharUuid,
                uuid: HidProtocol.statusCharUuid,
                name: "Provision Status",
                serviceUUID: HidProtocol.serviceUuid,
                properties: [.read, .notify]
            ),
        ]
        return [info]
    }
}

@MainActor
private final class PreviewHidTransport: HidProvisionTransport {
    var hidEventHandler: ((HidProvisionTransportEvent) -> Void)?

    func connectForProvisioning(deviceId: String) -> Bool { true }
    func disconnectForProvisioning(deviceId: String) {}
    func isProvisioningDeviceConnected(_ deviceId: String) -> Bool { true }
    func hasProvisioningCharacteristic(deviceId: String, characteristicUUID: String) -> Bool { true }
    func setProvisioningNotification(deviceId: String, characteristicUUID: String, enabled: Bool) -> Bool { true }
    func readProvisioningCharacteristic(deviceId: String, characteristicUUID: String) -> Bool { true }
    func writeProvisioningCharacteristic(deviceId: String, characteristicUUID: String, data: Data) -> Bool { true }
    func provisioningAttMtu(deviceId: String) -> Int { 185 }
    func logProvisioning(_ message: String, deviceId: String, isError: Bool) {}

    func emitValue(uuid: String, text: String) {
        hidEventHandler?(.value(deviceId: "SHID-9F3E2A1C", characteristicUUID: uuid, data: Data(text.utf8)))
    }
}
#endif
