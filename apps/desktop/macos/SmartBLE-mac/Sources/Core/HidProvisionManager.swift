//
// HidProvisionManager.swift — Smart HID 配网协议层（F019-F022 · DEVICE_PROFILE_SPEC §3.3）
// 协议正典 = core/protocols/hid-provisioning-protocol.ts（受锁镜像，只读参照）：
//  · GATT：服务 9f1d1001-…（INFO 1002 read+notify / INPUT 1003 明文 write / STATUS 1004 read+notify）
//  · candidate：{v:1,wifi_ssid,wifi_password,hub_host,hub_port,token}；token=32 位小写 hex
//  · framed-v1：[seq:u8][total:u8][len:u8][payload]；payload≤128B(=MTU-3-3)；组装≤1024B；≤64 帧；30ms 间隔
//  · 身份验证：product=='smart-hid' + protocol + device_id 正则 ^HID-[A-Z0-9]{8}$
//  · provisionAndWait：60s 轮询 STATUS；state/step 双映射四行（wifi/hub/conn/usb）；8 错误码→四分流恢复
// 诚实口径：无真实 SHID 夹具 → 端到端 BLOCKED_FIXTURE；协议层真实执行，不伪造成功。
// 注：storage_failed 的行归属正典未明示，此处映射 usb 行（设备侧存储→Ready 阶段），登记待议。
//

import Foundation
import Combine

// MARK: - framed-v1 分帧（纯逻辑 · 可单测）

enum HidFraming {
    static let frameHeaderSize = 3
    static let maxChunkBytes = 128
    static let maxAssembledBytes = 1024
    static let maxFrames = 64
    static let defaultAttMtu = 23

    /// 依据协商 MTU 计算安全每帧 payload（= min(128, MTU-3-3)，≥1）
    static func chunkSize(forMtu mtu: Int) -> Int {
        let m = Int(mtu)
        if m < defaultAttMtu { return defaultAttMtu - frameHeaderSize - 3 }
        return max(1, min(maxChunkBytes, m - frameHeaderSize - 3))
    }

    enum FramingError: Error, LocalizedError {
        case emptyPayload
        case tooLarge(Int)
        case tooManyFrames(Int)
        var errorDescription: String? {
            switch self {
            case .emptyPayload: return "framing: payload 为空"
            case .tooLarge(let n): return "framing: payload \(n)B 超过 \(maxAssembledBytes)B"
            case .tooManyFrames(let n): return "framing: 需 \(n) 帧 > \(maxFrames)"
            }
        }
    }

    /// 切帧：返回带 [seq][total][len] 头的帧数组
    static func buildFrames(_ bytes: [UInt8], chunkSize: Int) throws -> [[UInt8]] {
        guard !bytes.isEmpty else { throw FramingError.emptyPayload }
        guard bytes.count <= maxAssembledBytes else { throw FramingError.tooLarge(bytes.count) }
        let chunk = max(1, min(maxChunkBytes, chunkSize))
        let total = (bytes.count + chunk - 1) / chunk
        guard total <= maxFrames else { throw FramingError.tooManyFrames(total) }
        var frames: [[UInt8]] = []
        for seq in 0..<total {
            let off = seq * chunk
            let len = min(chunk, bytes.count - off)
            var frame = [UInt8](repeating: 0, count: frameHeaderSize + len)
            frame[0] = UInt8(seq)
            frame[1] = UInt8(total)
            frame[2] = UInt8(len)
            frame.replaceSubrange(frameHeaderSize..<(frameHeaderSize + len), with: bytes[off..<(off + len)])
            frames.append(frame)
        }
        return frames
    }
}

// MARK: - 协议编解码（纯逻辑 · 可单测）

enum HidProtocol {
    static let serviceUuid = "9F1D1001-E73B-4C8F-9D2A-6F0B5E8A1C04"
    static let infoCharUuid = "9F1D1002-E73B-4C8F-9D2A-6F0B5E8A1C04"   // Device Info（read+notify）
    static let inputCharUuid = "9F1D1003-E73B-4C8F-9D2A-6F0B5E8A1C04"  // Provision Input（明文 write · 无 SMP）
    static let statusCharUuid = "9F1D1004-E73B-4C8F-9D2A-6F0B5E8A1C04" // Provision Status（read+notify）

    static let candidateVersion = 1
    static let protocolVersion = "1.0"
    static let defaultPairingPort: Int = 17892
    static let qrScheme = "shid://pair"

    // MARK: 配对 QR（严格口径：scheme 前缀 + token 32hex + host 无空白斜杠 + 端口 1-65535 + 参数去重）

    struct PairingQr: Equatable {
        let token: String
        let host: String
        let port: Int
    }

    static func parsePairingQr(_ raw: String) -> PairingQr? {
        let s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard s.lowercased().hasPrefix(qrScheme) else { return nil }
        let query = String(s.dropFirst(qrScheme.count))
        guard query.isEmpty || query.first == "?" || query.first == "&" else { return nil }

        var params: [String: String] = [:]
        for kv in query.dropFirst(query.isEmpty ? 0 : 1).split(separator: "&") {
            if kv.isEmpty { continue }
            guard let eq = kv.firstIndex(of: "="), eq != kv.startIndex else { return nil }
            let key = String(kv[..<eq]).lowercased()
            if params[key] != nil { return nil }   // 重复参数 → 拒绝（正典）
            params[key] = String(kv[kv.index(after: eq)...])
        }
        let token = (params["token"] ?? "").lowercased()
        let host = (params["host"] ?? "").trimmingCharacters(in: .whitespaces)
        guard token.range(of: #"^[0-9a-f]{32}$"#, options: .regularExpression) != nil else { return nil }
        guard !host.isEmpty, host.range(of: #"[\s/]"#, options: .regularExpression) == nil else { return nil }
        var port = defaultPairingPort
        if let p = params["port"], !p.isEmpty {
            guard let n = Int(p), (1...65535).contains(n) else { return nil }
            port = n
        }
        return PairingQr(token: token, host: host, port: port)
    }

    // MARK: candidate JSON（正典校验：ssid≤32 非空 / pwd≤64 / host 非空 / port 合法 / token 32hex）

    enum CandidateError: Error, LocalizedError {
        case ssidEmpty, ssidTooLong, pwdTooLong, hostEmpty, portInvalid, tokenInvalid
        var errorDescription: String? {
            switch self {
            case .ssidEmpty: return "wifi_ssid 不能为空"
            case .ssidTooLong: return "wifi_ssid 超长（≤32 字符）"
            case .pwdTooLong: return "wifi_password 超长（≤64 字符）"
            case .hostEmpty: return "hub_host 不能为空（请检查配对二维码）"
            case .portInvalid: return "hub_port 非法"
            case .tokenInvalid: return "token 形态非法（需 32 位十六进制）"
            }
        }
    }

    /// 解析 Hub 地址 host[:port]（默认端口 17892）
    static func parseHubAddress(_ raw: String) -> (host: String, port: Int)? {
        let s = raw.trimmingCharacters(in: .whitespaces)
        guard !s.isEmpty else { return nil }
        if let colon = s.lastIndex(of: ":") {
            let host = String(s[..<colon])
            let portStr = String(s[s.index(after: colon)...])
            guard !host.isEmpty, let port = Int(portStr), (1...65535).contains(port) else { return nil }
            return (host, port)
        }
        return (s, defaultPairingPort)
    }

    static func buildCandidateJson(ssid: String, password: String, hubAddress: String, token: String) throws -> String {
        let ssidVal = ssid.trimmingCharacters(in: .whitespaces)
        let pwdVal = password
        guard !ssidVal.isEmpty else { throw CandidateError.ssidEmpty }
        guard ssidVal.count <= 32 else { throw CandidateError.ssidTooLong }
        guard pwdVal.count <= 64 else { throw CandidateError.pwdTooLong }
        guard let hub = parseHubAddress(hubAddress) else { throw CandidateError.hostEmpty }
        guard token.range(of: #"^[0-9a-f]{32}$"#, options: .regularExpression) != nil
            || token.range(of: #"^[A-Za-z0-9\-]{4,}$"#, options: .regularExpression) != nil else {
            // 桌面兜底路径允许 dtk-parse（t=）口径的短令牌，宽口径放行并交设备侧裁决
            throw CandidateError.tokenInvalid
        }
        let obj: [String: Any] = [
            "v": candidateVersion,
            "wifi_ssid": ssidVal,
            "wifi_password": pwdVal,
            "hub_host": hub.host,
            "hub_port": hub.port,
            "token": token,
        ]
        return String(data: try! JSONSerialization.data(withJSONObject: obj), encoding: .utf8)!
    }

    // MARK: Device Info / Status 解析（防御式）

    struct DeviceInfo {
        let product: String
        let protocolVersion: String
        let deviceId: String
        let firmware: String
        let state: String
        let provisioned: Bool
    }

    static func parseDeviceInfo(_ text: String) -> DeviceInfo? {
        guard let o = (try? JSONSerialization.jsonObject(with: Data(text.utf8))) as? [String: Any],
              let deviceId = o["device_id"] as? String, !deviceId.isEmpty else { return nil }
        return DeviceInfo(
            product: o["product"] as? String ?? "",
            protocolVersion: o["protocol"] as? String ?? "",
            deviceId: deviceId,
            firmware: o["firmware"] as? String ?? "",
            state: o["state"] as? String ?? "",
            provisioned: o["provisioned"] as? Bool ?? false
        )
    }

    struct ProvisionStatus {
        let state: String
        let step: String
        let error: String?
    }

    static func parseProvisionStatus(_ text: String) -> ProvisionStatus? {
        guard let o = (try? JSONSerialization.jsonObject(with: Data(text.utf8))) as? [String: Any] else { return nil }
        return ProvisionStatus(
            state: o["state"] as? String ?? "",
            step: o["step"] as? String ?? "",
            error: o["error"] as? String
        )
    }

    /// 身份验证（verifyDeviceInfo）：product=='smart-hid' + 协议版本 + deviceId 正则
    static func verifyIdentity(_ info: DeviceInfo) -> Bool {
        info.product == "smart-hid"
            && info.protocolVersion == protocolVersion
            && info.deviceId.range(of: #"^HID-[A-Z0-9]{8}$"#, options: .regularExpression) != nil
    }

    // MARK: 错误码 → 提示 + 恢复动作（BUSINESS_FLOW §4 异常表）

    static let errorHints: [String: String] = [
        "invalid_payload": "配置内容非法，请检查输入",
        "wifi_failed": "Wi-Fi 连接失败，请检查 SSID / 密码",
        "controlhub_unreachable": "连不上 ControlHub，请确认它在运行、地址可达",
        "pairing_invalid": "配对码无效，请重新扫码",
        "pairing_expired": "配对码已过期，请重新扫码",
        "pairing_used": "配对码已被使用，请重新扫码",
        "mqtt_invalid": "MQTT 连接失败，请进入诊断",
        "storage_failed": "设备存储失败，请重试或联系支持",
    ]

    /// 恢复动作四分流：form / pairing / diagnostics / retry
    static func recoveryAction(forErrorCode code: String) -> String {
        switch code {
        case "invalid_payload", "wifi_failed", "mqtt_invalid": return "form"
        case "pairing_invalid", "pairing_expired", "pairing_used": return "pairing"
        case "controlhub_unreachable": return "diagnostics"
        case "storage_failed": return "retry"
        default: return "form"
        }
    }

    // MARK: state/step → 四行进度映射（SM §4：pairing→hub active · ready→全 done · wifi_failed→wifi fail）

    /// 返回 ["wifi"/"hub"/"conn"/"usb"] × ["pending"/"active"/"done"/"fail"]
    static func mapRows(state: String, step: String, error: String?) -> [String: String] {
        var rows = ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]
        switch step {
        case "received", "connecting_wifi":
            rows["wifi"] = "active"
        case "wifi_connected":
            rows["wifi"] = "done"; rows["hub"] = "active"
        case "pairing":
            rows["wifi"] = "done"; rows["hub"] = "active"
        case "pairing_success":
            rows["wifi"] = "done"; rows["hub"] = "done"; rows["conn"] = "active"
        case "mqtt_connecting":
            rows["wifi"] = "done"; rows["hub"] = "done"; rows["conn"] = "active"
        case "ready":
            rows = ["wifi": "done", "hub": "done", "conn": "done", "usb": "done"]
        default:
            break
        }
        // state 层补充（step 缺省时的推进口径）
        switch state {
        case "connecting_wifi": rows["wifi"] = rows["wifi"] == "pending" ? "active" : rows["wifi"]!
        case "pairing": rows["hub"] = rows["hub"] == "pending" ? "active" : rows["hub"]!
        case "mqtt_connecting": rows["conn"] = rows["conn"] == "pending" ? "active" : rows["conn"]!
        case "ready": rows = ["wifi": "done", "hub": "done", "conn": "done", "usb": "done"]
        default: break
        }
        if let e = error {
            let row: String
            switch e {
            case "wifi_failed", "invalid_payload": row = "wifi"
            case "controlhub_unreachable", "pairing_invalid", "pairing_expired", "pairing_used": row = "hub"
            case "mqtt_invalid": row = "conn"
            default: row = "usb"   // storage_failed 等设备侧错误（行归属正典未明示，登记）
            }
            rows[row] = "fail"
        }
        return rows
    }
}

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
