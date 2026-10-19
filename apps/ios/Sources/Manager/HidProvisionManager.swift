import Combine
import Foundation
import SmartHidCore

enum HidProvisionTransportEvent {
    case connectionChanged(deviceId: String, connected: Bool)
    case servicesChanged(deviceId: String)
    case value(deviceId: String, characteristicUUID: String, data: Data)
}

@MainActor
protocol HidProvisionTransport: AnyObject {
    var hidEventHandler: ((HidProvisionTransportEvent) -> Void)? { get set }

    func connectForProvisioning(deviceId: String) -> Bool
    func disconnectForProvisioning(deviceId: String)
    func isProvisioningDeviceConnected(_ deviceId: String) -> Bool
    func hasProvisioningCharacteristic(deviceId: String, characteristicUUID: String) -> Bool
    func setProvisioningNotification(deviceId: String, characteristicUUID: String, enabled: Bool) -> Bool
    func readProvisioningCharacteristic(deviceId: String, characteristicUUID: String) -> Bool
    func writeProvisioningCharacteristic(deviceId: String, characteristicUUID: String, data: Data) -> Bool
    func provisioningAttMtu(deviceId: String) -> Int
    func logProvisioning(_ message: String, deviceId: String, isError: Bool)
}

@MainActor
final class HidProvisionManager: ObservableObject {
    enum Stage: Equatable {
        case idle
        case connecting
        case verifying
        case verified
        case sending
        case waiting
        case done
        case failed(code: String, message: String, recovery: String)
    }

    @Published private(set) var stage: Stage = .idle
    @Published private(set) var rows = [
        "wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending",
    ]
    @Published private(set) var deviceInfo: HidProtocol.DeviceInfo?
    @Published private(set) var latestStatus: HidProtocol.ProvisionStatus?

    var onProvisioned: (() -> Void)?
    var onStatusRaw: ((String, HidProtocol.ProvisionStatus?) -> Void)?

    private weak var transport: (any HidProvisionTransport)?
    private let identityTimeoutNanoseconds: UInt64
    private let frameIntervalNanoseconds: UInt64
    private let pollIntervalNanoseconds: UInt64
    private let pollTimeoutNanoseconds: UInt64
    private var deviceId: String?
    private var ownsConnection = false
    private var generation = 0
    private var identityTask: Task<Void, Never>?
    private var frameTask: Task<Void, Never>?
    private var pollTask: Task<Void, Never>?
    private var tokenAcquiredAt: Date?
    private var diagnosticsMode = false

    static let identityTimeoutSeconds: TimeInterval = 8
    static let pollTimeoutSeconds: TimeInterval = 60
    static let tokenTtlSeconds: TimeInterval = 300
    private static let pendingRows = [
        "wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending",
    ]

    init(
        transport: any HidProvisionTransport,
        identityTimeoutNanoseconds: UInt64 = 8_000_000_000,
        frameIntervalNanoseconds: UInt64 = 30_000_000,
        pollIntervalNanoseconds: UInt64 = 2_000_000_000,
        pollTimeoutNanoseconds: UInt64 = 60_000_000_000
    ) {
        self.transport = transport
        self.identityTimeoutNanoseconds = identityTimeoutNanoseconds
        self.frameIntervalNanoseconds = frameIntervalNanoseconds
        self.pollIntervalNanoseconds = pollIntervalNanoseconds
        self.pollTimeoutNanoseconds = pollTimeoutNanoseconds
        transport.hidEventHandler = { [weak self] event in
            self?.handle(event)
        }
    }

    func begin(deviceId: String) {
        generation += 1
        cancelTasks()
        self.deviceId = deviceId
        ownsConnection = !(transport?.isProvisioningDeviceConnected(deviceId) ?? false)
        deviceInfo = nil
        latestStatus = nil
        diagnosticsMode = false
        tokenAcquiredAt = nil
        rows = Self.pendingRows
        stage = .connecting

        if transport?.isProvisioningDeviceConnected(deviceId) == true {
            startVerificationIfReady()
        } else if transport?.connectForProvisioning(deviceId: deviceId) != true {
            fail(code: "device_missing", message: "扫描结果已失效，请返回重新扫描", recovery: "form")
        }
    }

    @discardableResult
    func acceptPairingQr(_ raw: String) -> HidProtocol.PairingQr? {
        guard let result = HidProtocol.parsePairingQr(raw) else { return nil }
        tokenAcquiredAt = Date()
        return result
    }

    var tokenExpired: Bool {
        guard let tokenAcquiredAt else { return false }
        return Date().timeIntervalSince(tokenAcquiredAt) > Self.tokenTtlSeconds
    }

    func submit(
        ssid: String,
        password: String,
        hubHost: String,
        hubPort: Int?,
        token: String
    ) {
        guard stage == .verified, let deviceId, let transport else { return }
        guard !tokenExpired else {
            fail(code: "pairing_expired", message: "配对令牌已超过 5 分钟有效期，请重新扫码", recovery: "pairing")
            return
        }

        let json: String
        do {
            json = try HidProtocol.buildCandidateJson(
                ssid: ssid,
                password: password,
                hubHost: hubHost,
                hubPort: hubPort,
                token: token
            )
        } catch {
            fail(code: "invalid_payload", message: error.localizedDescription, recovery: "form")
            return
        }

        guard transport.hasProvisioningCharacteristic(
            deviceId: deviceId,
            characteristicUUID: HidProtocol.inputCharUuid
        ) else {
            fail(code: "input_missing", message: "设备缺少 Provision Input 特征值（1003）", recovery: "retry")
            return
        }

        let frames: [[UInt8]]
        do {
            frames = try HidFraming.buildFrames(
                Array(json.utf8),
                chunkSize: HidFraming.chunkSize(forMtu: transport.provisioningAttMtu(deviceId: deviceId))
            )
        } catch {
            fail(code: "invalid_payload", message: error.localizedDescription, recovery: "form")
            return
        }

        stage = .sending
        rows = ["wifi": "active", "hub": "pending", "conn": "pending", "usb": "pending"]
        let activeGeneration = generation
        frameTask = Task { [weak self] in
            guard let self else { return }
            for (index, frame) in frames.enumerated() {
                guard !Task.isCancelled, self.generation == activeGeneration, self.stage == .sending else { return }
                guard transport.writeProvisioningCharacteristic(
                    deviceId: deviceId,
                    characteristicUUID: HidProtocol.inputCharUuid,
                    data: Data(frame)
                ) else {
                    self.fail(code: "write_failed", message: "配网帧 \(index + 1)/\(frames.count) 写入失败", recovery: "retry")
                    return
                }
                if index < frames.count - 1, self.frameIntervalNanoseconds > 0 {
                    try? await Task.sleep(nanoseconds: self.frameIntervalNanoseconds)
                }
            }
            guard !Task.isCancelled, self.generation == activeGeneration else { return }
            self.beginWaiting(generation: activeGeneration)
        }
    }

    func cancelWait() {
        guard stage == .waiting || stage == .sending else { return }
        frameTask?.cancel()
        frameTask = nil
        pollTask?.cancel()
        pollTask = nil
        stage = .verified
        transport?.logProvisioning("已取消等待设备确认", deviceId: deviceId ?? "", isError: false)
    }

    func resumeConfiguration() {
        guard deviceInfo != nil, let deviceId, transport?.isProvisioningDeviceConnected(deviceId) == true else {
            return
        }
        cancelTasks()
        rows = Self.pendingRows
        stage = .verified
    }

    func beginDiagnostics(deviceId: String) {
        generation += 1
        cancelTasks()
        self.deviceId = deviceId
        ownsConnection = false
        diagnosticsMode = true
        deviceInfo = nil
        latestStatus = nil
        rows = Self.pendingRows

        guard let transport, transport.isProvisioningDeviceConnected(deviceId) else {
            fail(code: "connection_lost", message: "设备未连接，无法读取实时诊断", recovery: "form")
            return
        }
        guard transport.hasProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.infoCharUuid),
              transport.hasProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.statusCharUuid) else {
            fail(code: "smart_hid_service_missing", message: "设备缺少 Smart HID 诊断特征值", recovery: "form")
            return
        }

        stage = .verified
        _ = transport.setProvisioningNotification(deviceId: deviceId, characteristicUUID: HidProtocol.infoCharUuid, enabled: true)
        _ = transport.setProvisioningNotification(deviceId: deviceId, characteristicUUID: HidProtocol.statusCharUuid, enabled: true)
        _ = transport.readProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.infoCharUuid)
        _ = transport.readProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.statusCharUuid)
    }

    func refreshDiagnostics() {
        guard diagnosticsMode, let deviceId, let transport,
              transport.isProvisioningDeviceConnected(deviceId) else {
            fail(code: "connection_lost", message: "设备未连接，无法重新检测", recovery: "form")
            return
        }
        latestStatus = nil
        rows = Self.pendingRows
        _ = transport.readProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.infoCharUuid)
        _ = transport.readProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.statusCharUuid)
    }

    func abandon(preserveConnection: Bool) {
        generation += 1
        cancelTasks()
        if ownsConnection, !preserveConnection, let deviceId {
            transport?.disconnectForProvisioning(deviceId: deviceId)
        }
        deviceId = nil
        ownsConnection = false
        tokenAcquiredAt = nil
        deviceInfo = nil
        latestStatus = nil
        diagnosticsMode = false
        rows = Self.pendingRows
        stage = .idle
    }

    private func handle(_ event: HidProvisionTransportEvent) {
        switch event {
        case .connectionChanged(let changedDeviceId, let connected):
            guard changedDeviceId == deviceId else { return }
            if connected {
                startVerificationIfReady()
            } else if stage != .idle && stage != .done {
                fail(code: "connection_lost", message: "蓝牙连接已断开，请重新连接", recovery: "form")
            }
        case .servicesChanged(let changedDeviceId):
            guard changedDeviceId == deviceId else { return }
            startVerificationIfReady()
        case .value(let changedDeviceId, let characteristicUUID, let data):
            guard changedDeviceId == deviceId else { return }
            let text = String(data: data, encoding: .utf8) ?? ""
            if characteristicUUID.caseInsensitiveCompare(HidProtocol.infoCharUuid) == .orderedSame {
                handleDeviceInfo(text)
            } else if characteristicUUID.caseInsensitiveCompare(HidProtocol.statusCharUuid) == .orderedSame {
                handleStatus(text)
            }
        }
    }

    private func startVerificationIfReady() {
        guard stage == .connecting, let deviceId, let transport else { return }
        guard transport.isProvisioningDeviceConnected(deviceId) else { return }
        guard transport.hasProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.infoCharUuid),
              transport.hasProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.statusCharUuid) else {
            return
        }

        guard transport.setProvisioningNotification(
            deviceId: deviceId,
            characteristicUUID: HidProtocol.infoCharUuid,
            enabled: true
        ), transport.setProvisioningNotification(
            deviceId: deviceId,
            characteristicUUID: HidProtocol.statusCharUuid,
            enabled: true
        ), transport.readProvisioningCharacteristic(
            deviceId: deviceId,
            characteristicUUID: HidProtocol.infoCharUuid
        ) else {
            fail(code: "identity_read_failed", message: "无法读取 Device Info（1002）", recovery: "form")
            return
        }

        stage = .verifying
        transport.logProvisioning("Smart HID 身份验证中 · INFO 1002", deviceId: deviceId, isError: false)
        let activeGeneration = generation
        identityTask = Task { [weak self] in
            guard let self else { return }
            try? await Task.sleep(nanoseconds: self.identityTimeoutNanoseconds)
            guard !Task.isCancelled, self.generation == activeGeneration, self.stage == .verifying else { return }
            self.fail(code: "identity_failed", message: "设备未在 8 秒内返回合法 Device Info", recovery: "form")
            if self.ownsConnection {
                transport.disconnectForProvisioning(deviceId: deviceId)
            }
        }
    }

    private func handleDeviceInfo(_ text: String) {
        if diagnosticsMode {
            deviceInfo = HidProtocol.parseDeviceInfo(text)
            return
        }
        guard stage == .verifying else { return }
        guard let info = HidProtocol.parseDeviceInfo(text), HidProtocol.verifyIdentity(info) else {
            fail(code: "identity_failed", message: "设备身份验证未通过，已停止配网", recovery: "form")
            if ownsConnection, let deviceId {
                transport?.disconnectForProvisioning(deviceId: deviceId)
            }
            return
        }
        identityTask?.cancel()
        identityTask = nil
        deviceInfo = info
        stage = .verified
        transport?.logProvisioning("Smart HID 身份验证通过", deviceId: deviceId ?? "", isError: false)
    }

    private func beginWaiting(generation activeGeneration: Int) {
        guard generation == activeGeneration, stage == .sending, let deviceId, let transport else { return }
        stage = .waiting
        _ = transport.readProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: HidProtocol.statusCharUuid)
        let startedAt = DispatchTime.now().uptimeNanoseconds
        pollTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled, self.generation == activeGeneration, self.stage == .waiting {
                try? await Task.sleep(nanoseconds: self.pollIntervalNanoseconds)
                guard !Task.isCancelled, self.generation == activeGeneration, self.stage == .waiting else { return }
                let elapsed = DispatchTime.now().uptimeNanoseconds - startedAt
                guard elapsed < self.pollTimeoutNanoseconds else {
                    self.fail(code: "timeout", message: "等待设备确认超时（60 秒）", recovery: "retry")
                    return
                }
                guard transport.readProvisioningCharacteristic(
                    deviceId: deviceId,
                    characteristicUUID: HidProtocol.statusCharUuid
                ) else {
                    self.fail(code: "connection_lost", message: "状态读取失败，请重新连接", recovery: "form")
                    return
                }
            }
        }
    }

    private func handleStatus(_ text: String) {
        let status = HidProtocol.parseProvisionStatus(text)
        latestStatus = status
        onStatusRaw?(text, status)
        guard stage == .waiting || stage == .sending, let status else { return }
        rows = HidProtocol.mapRows(state: status.state, step: status.step, error: status.error)
        if status.state == "ready", status.error == nil {
            frameTask?.cancel()
            pollTask?.cancel()
            frameTask = nil
            pollTask = nil
            stage = .done
            onProvisioned?()
        } else if let error = status.error {
            fail(
                code: error,
                message: HidProtocol.errorHints[error] ?? "设备侧错误：\(error)",
                recovery: HidProtocol.recoveryAction(forErrorCode: error)
            )
        }
    }

    private func fail(code: String, message: String, recovery: String) {
        identityTask?.cancel()
        identityTask = nil
        frameTask?.cancel()
        frameTask = nil
        pollTask?.cancel()
        pollTask = nil
        stage = .failed(code: code, message: message, recovery: recovery)
        transport?.logProvisioning("配网失败 · \(code)：\(message)", deviceId: deviceId ?? "", isError: true)
    }

    private func cancelTasks() {
        identityTask?.cancel()
        frameTask?.cancel()
        pollTask?.cancel()
        identityTask = nil
        frameTask = nil
        pollTask = nil
    }

    #if DEBUG
    func configurePreview(
        deviceId: String,
        stage: Stage,
        rows: [String: String]? = nil,
        deviceInfo: HidProtocol.DeviceInfo? = nil,
        latestStatus: HidProtocol.ProvisionStatus? = nil
    ) {
        generation += 1
        cancelTasks()
        self.deviceId = deviceId
        ownsConnection = false
        diagnosticsMode = false
        tokenAcquiredAt = nil
        self.rows = rows ?? Self.pendingRows
        self.deviceInfo = deviceInfo
        self.latestStatus = latestStatus
        self.stage = stage
    }
    #endif
}
