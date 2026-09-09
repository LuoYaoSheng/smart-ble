//
// HidProvisionManager.swift — Smart HID 配网会话编排（F019-F022）
// 协议、分帧、状态与恢复语义由 core/apple/SmartHidCore 单源提供；
// 本文件只负责 AppKit BLE 会话、计时器、写队列和页面回调。
//

import Foundation
import Combine
import SmartHidCore

// MARK: - 配网流程管理器（P002 驱动 · 复用 GATT 调试域基础设施 PR-4）

@MainActor
final class HidProvisionManager: ObservableObject {
    enum Stage: Equatable {
        case idle
        case connecting
        case verifying          // 连接成功 → 读 Device Info 验证身份
        case verified           // 身份通过 → 可填表下 发
        case sending            // framed-v1 写 INPUT
        case waiting            // provisionAndWait 60s
        case done
        case failed(code: String, message: String, recovery: String)
    }

    @Published private(set) var stage: Stage = .idle
    @Published private(set) var rows: [String: String] = ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]
    @Published private(set) var deviceInfo: HidProtocol.DeviceInfo?

    /// P002 绑定：状态/行变化回调（页面字段映射 + rebuild）
    var onUpdate: (() -> Void)?
    /// 配网成功（state=ready）→ P002 生成快照并 redirect P003
    var onProvisioned: (() -> Void)?
    /// STATUS 原值旁路（P005 诊断消费：任意阶段收到的 Provision Status 均回调）
    var onStatusRaw: ((String, HidProtocol.ProvisionStatus?) -> Void)?

    private weak var ble: BLEManager?
    private var deviceId: String?
    private var cancellables = Set<AnyCancellable>()
    private var pollTimer: Timer?
    private var pollDeadline: Date?
    private var frameTimers: [DispatchWorkItem] = []
    /// 身份验证 8s 判定期已 armed（防重复挂表）
    private var verifyArmed = false
    /// token 获取时间（TTL 5 分钟，客户端侧提示用）
    var tokenAcquiredAt: Date?

    static let pollTimeoutSec: TimeInterval = 60
    static let tokenTtlSec: TimeInterval = 300

    init(ble: BLEManager) {
        self.ble = ble
        // INFO/STATUS 特征值转发（BLEManager.hidValueHandler）
        ble.hidValueHandler = { [weak self] did, uuid, data in
            guard let self, did == self.deviceId else { return }
            let text = String(data: data, encoding: .utf8) ?? ""
            switch uuid {
            case HidProtocol.infoCharUuid: self.handleDeviceInfo(text)
            case HidProtocol.statusCharUuid: self.handleStatus(text)
            default: break
            }
        }
        // 连接状态联动：connected + 服务就绪 → 自动验证身份（进入向导即自动连接+验证）
        ble.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in Task { @MainActor [weak self] in self?.autoVerifyIfReady() } }
            .store(in: &cancellables)
    }

    // MARK: - 阶段一：连接 + 身份验证

    func begin(deviceId: String) {
        self.deviceId = deviceId
        tokenAcquiredAt = nil
        rows = ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]
        deviceInfo = nil
        verifyArmed = false
        stopPolling()
        stage = .connecting
        ble?.markProvisioningSession(deviceId: deviceId, on: true)
        onUpdate?()
    }

    func abandon() {
        if let deviceId, stage == .connecting || stage == .verifying {
            ble?.markProvisioningSession(deviceId: deviceId, on: false)
        }
        stopPolling()
        stage = .idle
    }

    private func autoVerifyIfReady() {
        guard stage == .connecting, let did = deviceId, let ble else { return }
        guard let session = ble.sessions[did], session.state == .connected else { return }
        let services = ble.sessionServices(did)
        guard !services.isEmpty else { return }

        // 8s 判定期 armed once：期内未通过验证 → 按服务有无分流错误
        if !verifyArmed {
            verifyArmed = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 8.0) { [weak self] in
                Task { @MainActor [weak self] in
                    guard let self, let did = self.deviceId, let ble = self.ble,
                          self.stage == .verifying || self.stage == .connecting else { return }
                    let hasService = ble.sessionServices(did).contains {
                        $0.uuid.uppercased().hasPrefix("9F1D1001")
                    }
                    if !hasService {
                        // 普通设备（无配网服务）：诚实 BLOCKED_FIXTURE 错误，不伪造验证；断开配网会话
                        self.fail(code: "smart_hid_service_missing",
                                  message: "未在设备上发现 smart-hid 配网服务（需真实 SHID 设备 · BLOCKED_FIXTURE）",
                                  recovery: "form")
                        ble.disconnect(deviceId: did)
                    } else {
                        self.fail(code: "identity_failed",
                                  message: "设备未返回合法 Device Info（8s）或身份验证未通过",
                                  recovery: "form")
                        ble.disconnect(deviceId: did)
                    }
                    self.onUpdate?()
                }
            }
        }
        guard stage == .connecting else { return }
        stage = .verifying
        // INFO 特征已枚举 → 订阅 INFO/STATUS + 读 Device Info（进入向导即订阅，正典口径）
        let infoFound = services.flatMap(\.characteristics).contains {
            $0.uuid.uppercased() == HidProtocol.infoCharUuid
        }
        guard infoFound else { return }   // 特征尚在枚举，等下一轮 objectWillChange
        ble.log("Smart HID 身份验证中 · 读 Device Info（INFO 1002）")
        ble.setNotification(characteristicUUID: HidProtocol.infoCharUuid, enabled: true, on: session)
        ble.setNotification(characteristicUUID: HidProtocol.statusCharUuid, enabled: true, on: session)
        ble.readCharacteristic(deviceId: did, characteristicUUID: HidProtocol.infoCharUuid)
        onUpdate?()
    }

    private func handleDeviceInfo(_ text: String) {
        guard stage == .verifying || stage == .verified else { return }
        guard let info = HidProtocol.parseDeviceInfo(text) else {
            ble?.log("Smart HID Device Info 解析失败：\(text.prefix(80))", .err)
            return
        }
        deviceInfo = info
        ble?.log("Device Info · product=\(info.product) protocol=\(info.protocolVersion) device_id=\(info.deviceId) state=\(info.state)", .recv)
        if HidProtocol.verifyIdentity(info) {
            guard stage == .verifying else { return }
            stage = .verified
            ble?.log("Smart HID 身份验证通过（product/protocol/deviceId）", .ok)
        } else if stage == .verifying {
            fail(code: "identity_failed",
                 message: "设备身份验证未通过（product=\(info.product) · protocol=\(info.protocolVersion) · device_id=\(info.deviceId)），已断开",
                 recovery: "form")
            if let did = deviceId {
                ble?.disconnect(deviceId: did)
            }
        }
        onUpdate?()
    }

    // MARK: - 阶段三：下发（candidate → framed-v1 → INPUT 30ms）+ 60s 状态跟踪

    /// token TTL 客户端侧判定（正典：仅内存、5 分钟）
    var tokenExpired: Bool {
        guard let t = tokenAcquiredAt else { return false }
        return Date().timeIntervalSince(t) > Self.tokenTtlSec
    }

    func submit(ssid: String, password: String, hubAddress: String, token: String) {
        guard stage == .verified, let did = deviceId, let ble else { return }
        // token TTL
        if tokenExpired {
            fail(code: "pairing_expired", message: "配对令牌已超过 5 分钟有效期，请重新扫码", recovery: "pairing")
            onUpdate?()
            return
        }
        // candidate 构造（校验失败 → form 错误）
        let json: String
        do {
            json = try HidProtocol.buildCandidateJson(ssid: ssid, password: password,
                                                      hubAddress: hubAddress, token: token)
        } catch {
            fail(code: "invalid_payload", message: error.localizedDescription, recovery: "form")
            onUpdate?()
            return
        }
        // 分帧（framed-v1）
        let bytes = Array(json.utf8)
        let mtuCap = ble.sessions[did]?.peripheral.maximumWriteValueLength(for: .withResponse) ?? HidFraming.defaultAttMtu
        let frames: [[UInt8]]
        do {
            frames = try HidFraming.buildFrames(bytes, chunkSize: HidFraming.chunkSize(forMtu: mtuCap))
        } catch {
            fail(code: "invalid_payload", message: error.localizedDescription, recovery: "form")
            onUpdate?()
            return
        }
        ble.log("配网下发 · candidate \(bytes.count)B → \(frames.count) 帧（chunk=\(HidFraming.chunkSize(forMtu: mtuCap))B · 30ms 间隔 · INPUT 明文 write）", .write)
        stage = .sending
        rows = ["wifi": "active", "hub": "pending", "conn": "pending", "usb": "pending"]
        onUpdate?()

        // 顺序写 INPUT：帧间隔 30ms（正典）；入队失败 2s 重试一次
        for (i, frame) in frames.enumerated() {
            let work = DispatchWorkItem { [weak self] in
                Task { @MainActor [weak self] in
                    guard let self, self.stage == .sending || self.stage == .waiting else { return }
                    let data = Data(frame)
                    let ok = self.ble?.enqueueWrite(deviceId: did, characteristicUUID: HidProtocol.inputCharUuid,
                                                    data: data, display: "配网帧 \(i+1)/\(frames.count)（\(frame.count)B）",
                                                    priority: true) ?? false
                    if !ok {
                        self.ble?.log("配网帧 \(i+1) 入队失败 · 2s 后重试一次（正典：写失败重试）", .err)
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                            Task { @MainActor [weak self] in
                                _ = self?.ble?.enqueueWrite(deviceId: did, characteristicUUID: HidProtocol.inputCharUuid,
                                                           data: data, display: "配网帧 \(i+1) 重试", priority: true)
                            }
                        }
                    }
                    if i == frames.count - 1 {
                        // 全部帧入队完成 → provisionAndWait（60s 轮询 STATUS）
                        self.beginWait()
                    }
                }
            }
            frameTimers.append(work)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.03 * Double(i), execute: work)
        }
    }

    private func beginWait() {
        guard stage == .sending else { return }
        stage = .waiting
        ble?.log("配网下发完成 → provisionAndWait（60s 轮询 STATUS）", .sys)
        pollDeadline = Date().addingTimeInterval(Self.pollTimeoutSec)
        pollTimer?.invalidate()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, let did = self.deviceId, self.stage == .waiting else { return }
                if let deadline = self.pollDeadline, Date() > deadline {
                    self.fail(code: "timeout", message: "等待设备确认超时（60s），可重试下发", recovery: "retry")
                    self.onUpdate?()
                    return
                }
                self.ble?.readCharacteristic(deviceId: did, characteristicUUID: HidProtocol.statusCharUuid)
            }
        }
        // 立即读一次
        if let did = deviceId {
            ble?.readCharacteristic(deviceId: did, characteristicUUID: HidProtocol.statusCharUuid)
        }
        onUpdate?()
    }

    private func handleStatus(_ text: String) {
        let parsed = HidProtocol.parseProvisionStatus(text)
        onStatusRaw?(text, parsed)
        guard stage == .waiting || stage == .sending else { return }
        guard let st = parsed else {
            ble?.log("Provision Status 解析失败：\(text.prefix(80))", .err)
            return
        }
        ble?.log("Provision Status · state=\(st.state) step=\(st.step) error=\(st.error ?? "nil")", .recv)
        rows = HidProtocol.mapRows(state: st.state, step: st.step, error: st.error)
        if st.state == "ready", st.error == nil {
            stopPolling()
            stage = .done
            ble?.markProvisioningSession(deviceId: deviceId ?? "", on: false)
            ble?.log("配网成功 · state=ready 四行全绿", .ok)
            onProvisioned?()
        } else if let err = st.error {
            stopPolling()
            fail(code: err,
                 message: HidProtocol.errorHints[err] ?? "设备侧错误：\(err)",
                 recovery: HidProtocol.recoveryAction(forErrorCode: err))
        }
        onUpdate?()
    }

    // MARK: - 取消 / 失败 / 清理

    func cancelWait() {
        stopPolling()
        stage = .verified   // 回到可再下发状态（取消等待，正典文案）
        ble?.log("已取消等待设备确认")
        onUpdate?()
    }

    private func fail(code: String, message: String, recovery: String) {
        stopPolling()
        stage = .failed(code: code, message: message, recovery: recovery)
        ble?.log("配网失败 · \(code)：\(message)", .err)
    }

    private func stopPolling() {
        pollTimer?.invalidate()
        pollTimer = nil
        pollDeadline = nil
        frameTimers.forEach { $0.cancel() }
        frameTimers.removeAll()
    }
}
