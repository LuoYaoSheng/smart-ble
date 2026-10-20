import Foundation
import Combine
import SmartHidCore

@MainActor
final class OtaManager: ObservableObject {
    static let serviceUuid = OtaBluetoothSession.serviceUUID
    static let ctrlCharUuid = OtaBluetoothSession.controlUUID
    static let dataCharUuid = OtaBluetoothSession.dataUUID
    static let statusCharUuid = OtaBluetoothSession.statusUUID
    enum Phase: Equatable {
        case idle, validating, ready, waitingReady, transferring(percent: Int), committing, verifying, success
        case failed(code: String, message: String), cancelled
        var word: String {
            switch self {
            case .idle: return "选包"
            case .validating: return "包校验"
            case .ready: return "就绪"
            case .waitingReady: return "核对设备并等待就绪"
            case .transferring(let p): return "传输 \(p)%"
            case .committing: return "等待固件提交"
            case .verifying: return "等待重启并核对运行版本"
            case .success: return "运行版本已验证"
            case .failed: return "失败"
            case .cancelled: return "跟踪已停止，设备结果待核实"
            }
        }
        var isTerminal: Bool {
            switch self { case .success, .failed, .cancelled: return true; default: return false }
        }
    }
    @Published private(set) var phase: Phase = .idle
    @Published private(set) var fileName: String?
    @Published private(set) var fileSize = 0
    @Published private(set) var sentBytes = 0
    var onFinished: (() -> Void)?
    private weak var ble: BLEManager?
    private var package: OtaLocalPackage?
    private var session: OtaBluetoothSession?
    init(ble: BLEManager) { self.ble = ble }
    func selectFiles(urls: [URL]) {
        guard session?.holdsWriteLane != true else { return }
        session?.onChange = nil
        session = nil
        package = nil; fileName = nil; fileSize = 0; sentBytes = 0; phase = .validating
        do {
            let selected = try OtaLocalPackage.load(urls: urls)
            package = selected; fileName = selected.firmwareURL.lastPathComponent; fileSize = selected.firmware.count
            phase = .ready
            ble?.log("OTA 已校验 \(selected.manifest.target) / \(selected.manifest.hardware) / \(selected.manifest.version)", .ok)
        } catch { phase = .failed(code: "OTA_PACKAGE_INVALID", message: "请选择同目录 .bin 和 manifest.json，六字段必须校验通过：\(error)") }
    }
    nonisolated static func isSemVer(_ value: String) -> Bool { OtaManifest.isSemVer(value) }
    func start(deviceId: String) {
        guard phase == .ready, let package, let ble else { return }
        guard ble.canStartOta(deviceId: deviceId) else {
            phase = .failed(code: "OTA_SESSION_BUSY", message: "设备未连接或写队列仍有任务"); return
        }
        let transfer = ble.makeOtaSession(package: package, deviceId: deviceId)
        session = transfer
        transfer.onChange = { [weak self] transaction in self?.update(transaction) }
        transfer.start()
    }
    func cancel() { session?.cancel() }
    private func update(_ transaction: OtaTransaction) {
        sentBytes = transaction.sentBytes
        switch transaction.phase {
        case .idle: phase = .idle
        case .checkingDevice, .subscribing, .waitingReady: phase = .waitingReady
        case .transferring: phase = .transferring(percent: min(99, fileSize > 0 ? sentBytes * 100 / fileSize : 0))
        case .committing: phase = .committing
        case .waitingReboot, .verifying: phase = .verifying
        case .success: phase = .success
        case .failed: phase = .failed(code: "OTA_FAILED", message: transaction.error ?? "OTA 失败")
        case .cancelled: phase = .cancelled
        }
    }
}
