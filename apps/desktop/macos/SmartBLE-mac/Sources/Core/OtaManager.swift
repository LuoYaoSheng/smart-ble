//
// OtaManager.swift — OTA 事务（F025 · SM §6 · REVERSE_ANALYSIS §4.6.1）
// 真实调用链：选包(.bin)→包校验(manifest 可选：SemVer+size+sha256 实测比对；无 manifest 跳过)
// →接管会话（WORKFLOW:'ota-manager' · 禁自动重连）→订阅版本回读特征
// →CTRL 写 {op:start,target,size,chunk_size,sha256} →等 ready(30s)
// →DATA 分块 writeNoResponse(块间隔 20ms)→{op:commit} 等 success(30s)
// →重连回读 2A26 firmware_version 比对(OTA_VERSION_MISMATCH)→成功 2s 自动关闭；取消 {op:abort}。
// 诚实口径：端到端 BLOCKED（P-03 · 固件侧暂未开放升级通道）——无固件配合时流程真实执行并
// 停在等待/失败态，不伪造传输进度或成功。
// 注：manifest 六字段白名单精确清单【待 legacy 实证固化】（API_SPEC §16），此处按
// version/size/sha256 三硬字段 + SemVer 校验实现，多余字段忽略并记日志。
//

import Foundation
import Combine
import CryptoKit

@MainActor
final class OtaManager: ObservableObject {
    static let serviceUuid = "4FAFC201-1FB5-459E-914D-914D0CDFF40D"
    static let ctrlCharUuid = "BEB5483E-36E1-4688-B7F5-EA07361B26C0"   // OTA 控制（write+notify）
    static let dataCharUuid = "BEB5483E-36E1-4688-B7F5-EA07361B26C1"   // OTA 数据（writeNoResponse）
    static let statusCharUuid = "BEB5483E-36E1-4688-B7F5-EA07361B26C2" // 版本回读（read+notify）
    static let firmwareVersionCharUuid = "2A26"                         // DeviceInfo 固件版本（验证回读）

    // MARK: - 相位（SM §6 流程视图；枚举全集以 legacy ota-manager.js 为准【未逐行核对】）
    enum Phase: Equatable {
        case idle                                  // 选包
        case validating                            // 包校验
        case ready                                 // 就绪等待（校验通过/无 manifest）
        case waitingReady                          // op=start → ready(30s)
        case transferring(percent: Int)            // 传输（180B/20ms）
        case committing                            // op=commit → success(30s)
        case verifying                             // 版本验证（回读 firmware_version）
        case success                               // 成功（2s 自动关闭）
        case failed(code: String, message: String) // 终止（六包错误码/运行错误）
        case cancelled                             // 取消（op=abort）

        var word: String {
            switch self {
            case .idle: return "选包"
            case .validating: return "包校验"
            case .ready: return "就绪"
            case .waitingReady: return "等待设备就绪"
            case .transferring(let p): return "传输 \(p)%"
            case .committing: return "提交"
            case .verifying: return "版本验证"
            case .success: return "成功"
            case .failed: return "失败"
            case .cancelled: return "已取消"
            }
        }

        var isTerminal: Bool {
            switch self {
            case .success, .failed, .cancelled: return true
            default: return false
            }
        }
    }

    // MARK: - Published（弹窗绑定）
    @Published private(set) var phase: Phase = .idle
    @Published private(set) var fileName: String?
    @Published private(set) var fileSize = 0
    @Published private(set) var sentBytes = 0
    /// 成功/终止后的自动关闭回调（成功 2s）
    var onFinished: (() -> Void)?

    private weak var ble: BLEManager?
    private var deviceId: String?
    private var firmware: Data?
    private var firmwareSha256 = ""
    private var manifestVersion: String?
    private var chunkSize = 180
    private var chunkOffset = 0
    private var verifyReadSent = false
    private var waitTimer: DispatchWorkItem?
    /// 会话所有权接管标记（释放用）
    private var ownershipTaken = false

    init(ble: BLEManager) {
        self.ble = ble
        ble.otaStatusHandler = { [weak self] did, data in
            guard let self, did == self.deviceId else { return }
            self.handleStatus(data)
        }
    }

    // MARK: - 选包 + 校验

    func selectFile(url: URL) {
        do {
            let data = try Data(contentsOf: url)
            firmware = data
            fileName = url.lastPathComponent
            fileSize = data.count
            sentBytes = 0
            firmwareSha256 = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            phase = .validating
            ble?.log("OTA 选包 · \(url.lastPathComponent)（\(data.count) 字节 · sha256 \(firmwareSha256.prefix(12))…）")

            // manifest 可选 sidecar：<file>.manifest.json（六字段白名单待 legacy 固化：此处硬校验 version/size/sha256）
            let manifestUrl = url.deletingPathExtension().appendingPathExtension("manifest.json")
            if let mdata = try? Data(contentsOf: manifestUrl),
               let json = (try? JSONSerialization.jsonObject(with: mdata)) as? [String: Any] {
                var ok = true
                if let version = json["version"] as? String {
                    if Self.isSemVer(version) {
                        manifestVersion = version
                    } else {
                        ok = false
                        fail(code: "OTA_PACKAGE_INVALID", message: "manifest version 非 SemVer：\(version)")
                    }
                }
                if ok, let size = json["size"] as? Int, size != data.count {
                    ok = false
                    fail(code: "OTA_PACKAGE_INVALID", message: "manifest size 不符：\(size) ≠ 实测 \(data.count)")
                }
                if ok, let sha = json["sha256"] as? String, sha.lowercased() != firmwareSha256 {
                    ok = false
                    fail(code: "OTA_HASH_MISMATCH", message: "manifest sha256 与实测不符")
                }
                if ok {
                    let ignored = json.keys.filter { !["version", "size", "sha256"].contains($0) }
                    if !ignored.isEmpty {
                        ble?.log("OTA manifest 附加字段忽略（白名单待固化）：\(ignored.joined(separator: ", "))")
                    }
                    phase = .ready
                    ble?.log("OTA 包校验通过（manifest：version=\(manifestVersion ?? "—") size=\(data.count)）", .ok)
                }
            } else {
                phase = .ready
                ble?.log("OTA 无 manifest → 跳过包校验（正典允许），版本验证阶段将无版本可比对", .sys)
            }
        } catch {
            fail(code: "OTA_PACKAGE_INVALID", message: "读取文件失败：\(error.localizedDescription)")
        }
    }

    nonisolated static func isSemVer(_ v: String) -> Bool {
        v.range(of: #"^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$"#, options: .regularExpression) != nil
    }

    // MARK: - 启动（接管会话 → start → 等就绪）

    func start(deviceId: String) {
        guard phase == .ready, let firmware, let ble else { return }
        guard let session = ble.sessions[deviceId], session.state == .connected else {
            fail(code: "OTA_SESSION_LOST", message: "设备未连接，无法开始 OTA")
            return
        }
        guard ble.sessionServices(deviceId).contains(where: { $0.uuid.uppercased().hasPrefix("4FAFC201") }) else {
            fail(code: "OTA_SERVICE_MISSING", message: "未在设备上发现 OTA 服务（4FAFC201）")
            return
        }
        self.deviceId = deviceId

        // 会话所有权接管：禁自动重连（SM §2/§6 · C-11）
        session.suppressAutoReconnect = true
        ownershipTaken = true
        ble.log("OTA 接管会话（WORKFLOW:'ota-manager'）· 期间禁自动重连", .sys)

        // 订阅「版本回读」特征（notify 可用时；否则依赖 commit 后主动 read）
        let hasNotify = ble.sessionServices(deviceId)
            .flatMap(\.characteristics)
            .first { $0.uuid.uppercased() == Self.statusCharUuid }?
            .properties.contains(.notify) ?? false
        if hasNotify {
            ble.setNotification(characteristicUUID: Self.statusCharUuid, enabled: true, on: session)
        }

        // chunk = min(180, ATT 最大写入-3)（正典：chunk_size 180 · MTU-3 分包）
        let mtuCap = session.peripheral.maximumWriteValueLength(for: .withoutResponse)
        chunkSize = min(180, max(20, mtuCap - 3))
        chunkOffset = 0
        sentBytes = 0
        verifyReadSent = false

        let startJson: [String: Any] = [
            "op": "start",
            "target": manifestVersion ?? fileName ?? "unknown",
            "size": fileSize,
            "chunk_size": chunkSize,
            "sha256": firmwareSha256,
        ]
        phase = .waitingReady
        _ = ble.enqueueWrite(deviceId: deviceId, characteristicUUID: Self.ctrlCharUuid,
                             data: try! JSONSerialization.data(withJSONObject: startJson),
                             display: "op=start size=\(fileSize) chunk=\(chunkSize)", priority: true)
        armWait(seconds: 30, code: "OTA_READY_TIMEOUT", what: "等待设备 ready（30s）")
    }

    // MARK: - 传输（分块 20ms 节拍 · 经写队列优先级通道）

    private func beginTransfer() {
        phase = .transferring(percent: 0)
        sendNextChunk()
    }

    private func sendNextChunk() {
        guard case .transferring = phase, let firmware, let ble, let deviceId else { return }
        if chunkOffset >= firmware.count {
            // 全部分块完成 → 提交
            phase = .committing
            ble.log("OTA 分块传输完成（\(firmware.count) 字节）→ 提交", .ok)
            let commit: [String: Any] = ["op": "commit"]
            _ = ble.enqueueWrite(deviceId: deviceId, characteristicUUID: Self.ctrlCharUuid,
                                 data: try! JSONSerialization.data(withJSONObject: commit),
                                 display: "op=commit", priority: true)
            armWait(seconds: 30, code: "OTA_COMMIT_TIMEOUT", what: "等待设备 success（30s）")
            return
        }
        let end = min(chunkOffset + chunkSize, firmware.count)
        let chunk = firmware.subdata(in: chunkOffset..<end)
        let ok = ble.enqueueWrite(deviceId: deviceId, characteristicUUID: Self.dataCharUuid,
                                  data: chunk, display: "块 @\(chunkOffset)（\(chunk.count)B）",
                                  priority: true, forceWithoutResponse: true)
        guard ok else {
            fail(code: "OTA_TRANSFER_FAILED", message: "分块入队失败（队列满/会话异常）@\(chunkOffset)")
            return
        }
        chunkOffset = end
        sentBytes = end
        let percent = Int(Double(end) / Double(firmware.count) * 100)
        phase = .transferring(percent: percent)
        // 块间隔 20ms（正典）
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.02) { [weak self] in
            Task { @MainActor [weak self] in self?.sendNextChunk() }
        }
    }

    // MARK: - 版本验证（重连回读 2A26）

    private func beginVerify() {
        phase = .verifying
        ble?.log("OTA 设备确认成功 → 版本验证（回读 firmware_version）", .ok)
        // 固件重启回连窗口：轮询会话状态最长 10s，回连后发起 2A26 读取
        verifyPoll(remaining: 10)
    }

    private func verifyPoll(remaining: Int) {
        guard case .verifying = phase, let ble, let deviceId else { return }
        if ble.sessionState(deviceId) == .connected {
            if !verifyReadSent {
                verifyReadSent = true
                ble.readCharacteristic(deviceId: deviceId, characteristicUUID: Self.firmwareVersionCharUuid)
                ble.log("OTA 已发起 firmware_version 回读（2A26），等待回值", .sys)
            }
            // 回值经 didUpdateValueFor → otaStatusHandler → handleStatus(verifying 分支) 收口；此处仅超时兜底
            if remaining > 0 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                    Task { @MainActor [weak self] in self?.verifyPoll(remaining: remaining - 1) }
                }
            } else {
                fail(code: "OTA_VERIFY_TIMEOUT", message: "已连接但版本回读 10s 未回值，无法完成一致性验证")
            }
        } else if remaining > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                Task { @MainActor [weak self] in self?.verifyPoll(remaining: remaining - 1) }
            }
        } else {
            fail(code: "OTA_VERIFY_FAILED", message: "固件重启后未能回连（10s），无法回读版本验证")
        }
    }

    private func finishVerify(with version: String) {
        guard let expected = manifestVersion else {
            ble?.log("OTA 无 manifest 版本可比对 → 跳过一致性判定（回读 \(version.isEmpty ? "空" : version)）", .sys)
            succeed()
            return
        }
        if version == expected {
            succeed()
        } else {
            fail(code: "OTA_VERSION_MISMATCH", message: "回读版本 \(version.isEmpty ? "（空）" : version) ≠ manifest \(expected)")
        }
    }

    private func succeed() {
        releaseOwnership()
        phase = .success
        ble?.log("OTA 升级成功 · \(fileName ?? "")", .ok)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            Task { @MainActor [weak self] in
                guard let self, self.phase == .success else { return }
                self.onFinished?()
                self.reset()
            }
        }
    }

    // MARK: - 取消 / 失败

    func cancel() {
        guard !phase.isTerminal, phase != .idle else { return }
        if let deviceId, phase != .ready {
            let abort: [String: Any] = ["op": "abort"]
            _ = ble?.enqueueWrite(deviceId: deviceId, characteristicUUID: Self.ctrlCharUuid,
                                  data: try! JSONSerialization.data(withJSONObject: abort),
                                  display: "op=abort", priority: true)
        }
        releaseOwnership()
        ble?.log("OTA 已取消（op=abort）")
        phase = .cancelled
        reset(keepPhase: true)
    }

    private func fail(code: String, message: String) {
        releaseOwnership()
        phase = .failed(code: code, message: message)
        ble?.log("OTA 失败 · \(code)：\(message)", .err)
    }

    private func releaseOwnership() {
        waitTimer?.cancel()
        waitTimer = nil
        guard ownershipTaken, let deviceId, let ble else { return }
        ble.sessions[deviceId]?.suppressAutoReconnect = false
        ownershipTaken = false
        ble.log("OTA 释放会话所有权 · 恢复自动重连策略", .sys)
    }

    private func reset(keepPhase: Bool = false) {
        firmware = nil
        deviceId = nil
        manifestVersion = nil
        chunkOffset = 0
        if !keepPhase { phase = .idle }
    }

    // MARK: - 设备状态/回读解析（STATUS notify + 2A26 回值统一入口）

    private func armWait(seconds: Double, code: String, what: String) {
        waitTimer?.cancel()
        let work = DispatchWorkItem { [weak self] in
            Task { @MainActor [weak self] in
                guard let self, !self.phase.isTerminal else { return }
                self.fail(code: code, message: "\(what)超时 — 端到端链路 BLOCKED（P-03 · 固件侧暂未开放），无固件配合时预期停在此态")
            }
        }
        waitTimer = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    private func handleStatus(_ data: Data) {
        let text = String(data: data, encoding: .utf8) ?? ""
        ble?.log("OTA 状态/版本回读：\(text)", .recv)
        guard !phase.isTerminal else { return }

        // 版本验证阶段：任何回值按 firmware_version 收口
        if case .verifying = phase {
            finishVerify(with: text.trimmingCharacters(in: .whitespacesAndNewlines))
            return
        }

        // JSON 优先（{"state":"ready"} / {"event":"success"}），非 JSON 回退关键字匹配
        var stateWords: Set<String> = []
        if let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
            for v in json.values {
                if let s = v as? String { stateWords.insert(s.lowercased()) }
            }
        } else {
            let lower = text.lowercased()
            for kw in ["ready", "success", "ok", "error", "fail"] where lower.contains(kw) {
                stateWords.insert(kw)
            }
        }
        if stateWords.contains("ready"), case .waitingReady = phase {
            waitTimer?.cancel()
            ble?.log("OTA 设备 ready → 开始分块传输", .ok)
            beginTransfer()
        } else if stateWords.contains("success") || stateWords.contains("ok") {
            if case .committing = phase {
                waitTimer?.cancel()
                beginVerify()
            }
        } else if stateWords.contains("error") || stateWords.contains("fail") {
            fail(code: "OTA_DEVICE_FAILED", message: "设备报告错误：\(text)")
        }
    }
}
