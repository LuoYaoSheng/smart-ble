import Foundation
import SwiftUI
import SmartHidCore

struct OtaState {
    var fileUrl: URL?
    var fileName: String?
    var fileSize = 0
    var isInProgress = false
    var isCompleted = false
    var sentBytes = 0
    var totalBytes = 0
    var progressPercent = 0
    var statusMessage = "请选择同目录的 .bin 和 manifest.json，仅支持匹配协议的设备"
    var errorMessage: String?
}

@MainActor
final class OtaManager: ObservableObject {
    @Published var state = OtaState()
    private let deviceId: String
    private weak var bleManager: BLEManager?
    private var package: OtaLocalPackage?
    private var session: OtaBluetoothSession?
    static let commitFrame = Data(#"{"op":"commit"}"#.utf8)
    init(deviceId: String, bleManager: BLEManager) { self.deviceId = deviceId; self.bleManager = bleManager }

    func selectFiles(urls: [URL]) {
        guard session?.holdsWriteLane != true else {
            state.errorMessage = "上次 OTA 正在清理写入回执，请稍后选择文件"
            return
        }
        session?.onChange = nil
        session = nil
        package = nil
        state = OtaState()
        do {
            let selected = try OtaLocalPackage.load(urls: urls)
            package = selected
            state.fileUrl = selected.firmwareURL
            state.fileName = selected.firmwareURL.lastPathComponent
            state.fileSize = selected.firmware.count
            state.totalBytes = selected.firmware.count
            state.statusMessage = "已校验 \(selected.manifest.target) / \(selected.manifest.hardware) / \(selected.manifest.version)"
        } catch {
            state.errorMessage = "固件包校验失败：\(error)。请选择同目录的 .bin 和 manifest.json"
        }
    }
    func startOta() {
        guard let package, let ble = bleManager, !state.isInProgress else { return }
        guard ble.canStartOta(deviceId: deviceId) else {
            state.errorMessage = "设备未连接或写入队列仍有任务，请稍后重试"; return
        }
        let transfer = ble.makeOtaSession(package: package, deviceId: deviceId)
        session = transfer
        transfer.onChange = { [weak self] transaction in self?.update(transaction) }
        transfer.start()
    }
    func cancelOta() { session?.cancel() }
    private func update(_ transaction: OtaTransaction) {
        state.isInProgress = transaction.isActive
        state.isCompleted = transaction.phase == .success
        state.sentBytes = transaction.sentBytes
        let sentPercent = state.totalBytes == 0 ? 0 : state.sentBytes * 100 / state.totalBytes
        state.progressPercent = transaction.phase == .success ? 100 : min(99, sentPercent)
        state.errorMessage = transaction.error
        switch transaction.phase {
        case .idle: break
        case .checkingDevice: state.statusMessage = "正在核对设备型号、硬件及运行版本"
        case .subscribing: state.statusMessage = "正在开启 OTA 状态通知"
        case .waitingReady: state.statusMessage = "等待设备擦除分区并就绪"
        case .transferring: state.statusMessage = "正在发送固件"
        case .committing: state.statusMessage = "等待设备校验并提交固件"
        case .waitingReboot: state.statusMessage = "固件已提交，等待设备真实重启"
        case .verifying: state.statusMessage = "正在重连并核对运行固件版本"
        case .success: state.statusMessage = "OTA 升级成功，运行版本已核实"
        case .failed: state.statusMessage = "OTA 失败"
        case .cancelled: state.statusMessage = "已停止跟踪，已尝试取消；设备结果请重连核实"
        }
    }
}
