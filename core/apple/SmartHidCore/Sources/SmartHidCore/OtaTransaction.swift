import Foundation

/// Protocol state machine, independent of CoreBluetooth and UI. A flash receipt alone
/// cannot become success: a real disconnect and a fresh running-image INFO are mandatory.
public struct OtaTransaction {
    public enum Phase: String { case idle, checkingDevice, subscribing, waitingReady, transferring, committing, waitingReboot, verifying, success, failed, cancelled }
    public private(set) var phase: Phase = .idle
    public private(set) var sentBytes = 0
    public private(set) var error: String?
    private var startWritten = false
    private var commitWritten = false
    public let manifest: OtaManifestInfo
    public init(manifest: OtaManifestInfo) { self.manifest = manifest }
    public var isActive: Bool { ![.idle, .success, .failed, .cancelled].contains(phase) }
    public mutating func begin() { guard phase == .idle else { return }; phase = .checkingDevice }
    public mutating func fail(_ message: String) { guard isActive else { return }; error = message; phase = .failed }
    public mutating func cancel() { guard isActive else { return }; phase = .cancelled }
    public mutating func receiveInfo(_ data: Data) {
        guard phase == .checkingDevice || phase == .verifying,
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              json["type"] as? String == "system_info" else { return }
        guard json["target"] as? String == manifest.target,
              json["hardware"] as? String == manifest.hardware else { fail("设备 target/hardware 与固件包不匹配"); return }
        guard let running = json["firmware_version"] as? String, OtaManifest.isSemVer(running) else { fail("设备未提供有效的运行固件版本"); return }
        if phase == .checkingDevice {
            guard running != manifest.version else { fail("设备已运行此版本，请选择不同版本的固件包"); return }
            phase = .subscribing
        } else {
            guard running == manifest.version else { fail("重启后运行版本 \(running) 与目标 \(manifest.version) 不一致"); return }
            phase = .success
        }
    }
    public mutating func notificationConfirmed() { guard phase == .subscribing else { return }; phase = .waitingReady }
    public mutating func sentStart() { if phase == .waitingReady { startWritten = true } }
    public mutating func sentCommit() { if phase == .committing { commitWritten = true } }
    public mutating func receiveStatus(_ data: Data) {
        guard isActive else { return }
        switch OtaStatusClassifier.classify(data) {
        case .ready: if phase == .waitingReady && startWritten { phase = .transferring }
        case .success: if phase == .committing && commitWritten { phase = .waitingReboot }
        case .error(let message): fail(message)
        default: break
        }
    }
    public mutating func wroteChunk(_ count: Int) {
        guard phase == .transferring else { return }
        guard count > 0 && sentBytes + count <= manifest.size else { fail("OTA 分包计数错误"); return }
        sentBytes += count
        if sentBytes == manifest.size { phase = .committing }
    }
    public mutating func disconnected() {
        guard isActive else { return }
        if phase == .waitingReboot { phase = .verifying }
        else { fail("OTA 传输期间连接断开，事务已终止"); }
    }
}
