// ble-fixture — Smart BLE macOS 软件对端夹具（phase-2 九项回归配套）。
//
// 把 ESP32 模拟固件的行为移植到 macOS CoreBluetooth，作为「设备侧」对端：
//   · shid  Smart HID 配网模拟器（行为移植自 hardware/esp32/LightBLE/src/shid_sim_main.cpp）
//          广播 SHID-5EEDC0DE + 服务 9f1d1001；INFO/INPUT/STATUS 三特征；
//          INPUT framed-v1 [seq][total][len] 组装 candidate；状态机走链 + 场景注入。
//   · ota   OTA 设备模拟器（行为移植自 hardware/esp32/LightBLE/src/ota_server.cpp）
//          Device Information(180A) 含 2A26 固件版本 + OTA 服务 4FAFC201
//          （CTRL BEB5483E-...C0 / DATA ...C1 / STATUS ...C2）；
//          start/commit/abort 语义 + sha256/size 校验 + 故障注入 + 成功后 2A26 版本切换。
//
// 平台事实（phase-2 实测）：macOS 本机中心收不到本机外设广播，因此本夹具在
// 单机上无法被同机 App 发现；预期使用场景：
//   a) 第二观察端（另一台 Mac / iPhone / ESP32 observer）在场时的对端设备；
//   b) PageSmoke UIS-19/UIS-20 在夹具可见的环境（如 ESP32 真固件广播同 UUID）自动转正。
//
// 输出结构化日志：[FX] t=<epoch> key=value ...（stdout 无缓冲）
// 退出码：0 = 到达 duration 正常收尾；非 0 = 参数/启动失败。

import CoreBluetooth
import CryptoKit
import Foundation

setbuf(stdout, nil)

func log(_ line: String) {
    let ts = Date().timeIntervalSince1970
    print("[FX] t=\(String(format: "%.3f", ts)) \(line)")
}

func fail(_ reason: String) -> Never {
    log("RESULT=FAIL reason=\(reason)")
    exit(1)
}

// ---- 参数 -------------------------------------------------------------------

var args = Array(CommandLine.arguments.dropFirst())
var mode = ""
var duration: Double = 300
var localName = ""
var scenarioOverride = ""     // shid：强制场景（覆盖 candidate 载荷规则）
var fault = ""                // ota：wrong_size | commit_fail | timeout | abort_next
var startVersion = "1.0.0-sim"

func nextArg(_ label: String) -> String {
    guard !args.isEmpty else { fail("missing \(label) value") }
    return args.removeFirst()
}

while !args.isEmpty {
    let a = args.removeFirst()
    switch a {
    case "--mode": mode = nextArg("--mode")
    case "--duration": duration = Double(nextArg("--duration")) ?? 300
    case "--name": localName = nextArg("--name")
    case "--scenario": scenarioOverride = nextArg("--scenario")
    case "--fault": fault = nextArg("--fault")
    case "--start-version": startVersion = nextArg("--start-version")
    default: fail("unknown argument \(a)")
    }
}

// ---- 共用：外设宿主 -----------------------------------------------------------

/// 挂载一组服务并广播；子类提供服务定义与写/读回调。
class FixtureHost: NSObject, CBPeripheralManagerDelegate {
    let peripheralManager = CBPeripheralManager(delegate: nil, queue: nil)
    var services: [CBMutableService] = []
    var advertiseName: String = ""
    var onWrite: ((CBATTRequest) -> CBATTError.Code)?
    var onRead: ((CBATTRequest) -> CBATTError.Code)?
    var startedAt: Date?

    func launch() {
        peripheralManager.delegate = self
        RunLoop.main.run()
    }

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        log("PERIPHERAL_STATE=\(peripheral.state.rawValue)")
        guard peripheral.state == .poweredOn else {
            if peripheral.state == .unsupported { fail("bluetooth unsupported") }
            return
        }
        for service in services { peripheralManager.add(service) }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        guard error == nil else { fail("add service failed err=\(error.map { "\($0)" } ?? "nil")") }
        log("EVENT=service_added uuid=\(service.uuid.uuidString)")
        guard services.allSatisfy({ added(service, contains: $0) }) else { return }
        peripheralManager.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: services.filter(\.isPrimary).map(\.uuid),
            CBAdvertisementDataLocalNameKey: advertiseName,
        ])
    }

    private func added(_ added: CBService, contains pending: CBMutableService) -> Bool {
        added.uuid == pending.uuid
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        guard error == nil else { fail("advertising failed err=\(error.map { "\($0)" } ?? "nil")") }
        startedAt = Date()
        log("EVENT=advertising_started name=\(advertiseName)")
        DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
            self.peripheralManager.stopAdvertising()
            log("EVENT=advertising_stopped")
            log("RESULT=DONE mode=\(mode)")
            exit(0)
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        guard let handler = onRead else {
            peripheralManager.respond(to: request, withResult: .readNotPermitted)
            return
        }
        peripheralManager.respond(to: request, withResult: handler(request))
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            guard let handler = onWrite else {
                peripheralManager.respond(to: request, withResult: .writeNotPermitted)
                return
            }
            let result = handler(request)
            guard result == .success else {
                peripheralManager.respond(to: request, withResult: result)
                return
            }
        }
        peripheralManager.respond(to: requests[0], withResult: .success)
    }

    /// 读回调缺省实现：返回特征当前值（带 offset 校验）
    static func readValue(_ peripheralManager: CBPeripheralManager,
                          _ request: CBATTRequest, from characteristic: CBMutableCharacteristic) -> CBATTError.Code {
        guard request.characteristic == characteristic else { return .attributeNotFound }
        let value = characteristic.value ?? Data()
        guard request.offset <= value.count else { return .invalidOffset }
        request.value = value.subdata(in: request.offset..<value.count)
        return .success
    }
}

func hex(_ data: Data) -> String {
    data.map { String(format: "%02x", $0) }.joined()
}

// ==============================================================================
// mode: shid —— Smart HID 配网模拟器（shid_sim_main.cpp 行为移植）
// ==============================================================================

final class ShidFixture: FixtureHost {
    // 协议常量（与 core/apple/SmartHidCore HidProtocol 一致）
    static let serviceUuid = CBUUID(string: "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04")
    static let infoUuid = CBUUID(string: "9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04")
    static let inputUuid = CBUUID(string: "9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04")
    static let statusUuid = CBUUID(string: "9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04")

    let deviceName = "SHID-5EEDC0DE"
    let deviceId = "HID-5EEDC0DE"
    let firmware = "1.2.0-sim"

    let infoChar: CBMutableCharacteristic
    let inputChar: CBMutableCharacteristic
    let statusChar: CBMutableCharacteristic
    var infoJson = ""
    var statusJson = ""

    // 分帧组装（≤1024B，与固件一致）
    static let maxAssembled = 1024
    var asmBuf = Data()
    var asmExpect = 0
    var asmTotal = 0
    var asmActive = false

    // 走链状态机
    let steps = ["received", "connecting_wifi", "wifi_connected", "pairing",
                 "pairing_success", "mqtt_connecting", "ready"]
    var walking = false
    var stepIdx = -1
    var nextStepAt = Date()
    var stepDelay: TimeInterval = 0.6
    var scenarioErr = ""   // 非空 → 到注入点后转 error
    var failAfterIdx = -1
    var provisioned = false
    var walkTimer: Timer?

    override init() {
        infoChar = CBMutableCharacteristic(type: Self.infoUuid, properties: [.read, .notify],
                                           value: nil, permissions: [.readable])
        inputChar = CBMutableCharacteristic(type: Self.inputUuid, properties: [.write],
                                            value: nil, permissions: [.writeable])
        statusChar = CBMutableCharacteristic(type: Self.statusUuid, properties: [.read, .notify],
                                             value: nil, permissions: [.readable])
        super.init()
        advertiseName = localName.isEmpty ? deviceName : localName
        let service = CBMutableService(type: Self.serviceUuid, primary: true)
        service.characteristics = [infoChar, inputChar, statusChar]
        services = [service]
        onWrite = { [weak self] request in self?.handleInputWrite(request) ?? .attributeNotFound }
        onRead = { [weak self] request in
            guard let self else { return .attributeNotFound }
            if request.characteristic == self.infoChar {
                request.value = Data(self.infoJson.utf8)
                return .success
            }
            if request.characteristic == self.statusChar {
                request.value = Data(self.statusJson.utf8)
                return .success
            }
            return .attributeNotFound
        }
        publishInfo()
        publishStatus("unprovisioned", "", nil)
        if !scenarioOverride.isEmpty {
            applyScenarioOverride(scenarioOverride)
        }
    }

    // ---- INFO / STATUS 发布 ----

    func publishInfo() {
        let json = "{\"product\":\"smart-hid\",\"protocol\":\"1.0\","
            + "\"device_id\":\"\(deviceId)\",\"firmware\":\"\(firmware)\","
            + "\"state\":\"\(provisioned ? "ready" : "unprovisioned")\","
            + "\"provisioned\":\(provisioned ? "true" : "false")}"
        infoJson = json
        log("info \(json)")
    }

    func publishStatus(_ state: String, _ step: String, _ err: String?) {
        let errJson = err.map { "\"\($0)\"" } ?? "null"
        let json = "{\"state\":\"\(state)\",\"step\":\"\(step)\",\"error\":\(errJson)}"
        statusJson = json
        _ = peripheralManager.updateValue(Data(json.utf8), for: statusChar, onSubscribedCentrals: nil)
        log("status \(json)")
    }

    // ---- INPUT 写入：framed-v1 组装 ----

    func handleInputWrite(_ request: CBATTRequest) -> CBATTError.Code {
        guard request.characteristic == inputChar, let data = request.value else {
            return .attributeNotFound
        }
        guard data.count >= 3 else {
            log("frame short=\(data.count)B ignored")
            return .success
        }
        let seq = data[data.startIndex]
        let total = data[data.startIndex + 1]
        let plen = data[data.startIndex + 2]
        guard data.count == 3 + Int(plen) else {
            log("frame len mismatch: got \(data.count) header says \(3 + Int(plen))")
            return .success
        }
        if seq == 0 {
            asmActive = true
            asmTotal = Int(total)
            asmExpect = 0
            asmBuf = Data()
        }
        guard asmActive, Int(seq) == asmExpect, Int(total) == asmTotal,
              asmBuf.count + Int(plen) <= Self.maxAssembled else {
            log("frame out-of-order seq=\(seq) total=\(total) expect=\(asmExpect)")
            asmActive = false
            return .success
        }
        asmBuf.append(data.subdata(in: data.startIndex + 3..<data.endIndex))
        asmExpect += 1
        log("frame seq=\(seq)/\(total) len=\(plen)")
        if asmExpect == asmTotal {
            asmActive = false
            log("candidate assembled \(asmBuf.count)B")
            handleCandidate(asmBuf)
        }
        return .success
    }

    // ---- candidate 校验 + 场景（规则与固件一致；password 不落日志） ----

    func isHex32(_ v: String) -> Bool {
        v.count == 32 && v.allSatisfy { $0.isHexDigit }
    }

    func handleCandidate(_ data: Data) {
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            log("candidate JSON parse failed")
            failNow("invalid_payload")
            return
        }
        let v = obj["v"] as? Int ?? -1
        let ssid = obj["wifi_ssid"] as? String ?? ""
        let pwd = obj["wifi_password"] as? String ?? ""
        let host = obj["hub_host"] as? String ?? ""
        let token = obj["token"] as? String ?? ""
        let port = obj["hub_port"] as? Int ?? 0

        var problems = ""
        if v != 1 { problems += "v " }
        if ssid.isEmpty || ssid.count > 32 { problems += "wifi_ssid " }
        if pwd.count > 64 { problems += "wifi_password " }
        if host.isEmpty { problems += "hub_host " }
        if !(1...65_535).contains(port) { problems += "hub_port " }
        if !isHex32(token) { problems += "token " }
        if !problems.isEmpty {
            log("candidate invalid fields: \(problems)")
            failNow("invalid_payload")
            return
        }

        var errCode = ""
        var failAfter = -1
        var delayMs = 0.6
        if ssid == "FAIL-WIFI" { errCode = "wifi_failed"; failAfter = 1 }
        else if ssid == "FAIL-HUB" { errCode = "controlhub_unreachable"; failAfter = 3 }
        else if ssid == "FAIL-MQTT" { errCode = "mqtt_invalid"; failAfter = 5 }
        else if ssid == "FAIL-STORE" { errCode = "storage_failed"; failAfter = 5 }
        else if token.hasPrefix("ff") { errCode = "pairing_expired"; failAfter = 3 }
        else if token.hasPrefix("ee") { errCode = "pairing_used"; failAfter = 3 }
        else if token.hasPrefix("dd") { errCode = "pairing_invalid"; failAfter = 3 }
        else if ssid.hasPrefix("SLOW") { delayMs = 8.0 }

        log("candidate ok ssid=\(ssid) hub=\(host):\(port) token=***(32hex 已脱敏) scenario=\(errCode.isEmpty ? (delayMs > 1 ? "slow-success" : "success") : errCode)")
        startWalk(delayMs, errCode, failAfter)
    }

    // ---- 走链 ----

    func applyScenarioOverride(_ name: String) {
        // 强制场景：收到 candidate 后不按载荷规则，直接用覆盖场景
        log("scenario override=\(name)（candidate 载荷规则将被覆盖）")
        pendingOverride = name
    }

    var pendingOverride = ""

    func startWalk(_ delayIn: TimeInterval, _ errCodeIn: String, _ failAfterIn: Int) {
        var delay = delayIn
        var errCode = errCodeIn
        var failAfter = failAfterIn
        if !pendingOverride.isEmpty {
            switch pendingOverride {
            case "success": errCode = ""; failAfter = -1
            case "wifi_failed": errCode = "wifi_failed"; failAfter = 1
            case "controlhub_unreachable": errCode = "controlhub_unreachable"; failAfter = 3
            case "mqtt_invalid": errCode = "mqtt_invalid"; failAfter = 5
            case "storage_failed": errCode = "storage_failed"; failAfter = 5
            case "pairing_expired": errCode = "pairing_expired"; failAfter = 3
            case "pairing_used": errCode = "pairing_used"; failAfter = 3
            case "pairing_invalid": errCode = "pairing_invalid"; failAfter = 3
            case "slow": errCode = ""; failAfter = -1; delay = 8.0
            default: break
            }
            pendingOverride = ""
        }
        walking = true
        stepIdx = 0
        stepDelay = delay
        scenarioErr = errCode
        failAfterIdx = failAfter
        provisioned = false
        publishInfo()
        publishStatus("provisioning", steps[0], nil)
        nextStepAt = Date().addingTimeInterval(delay)
        walkTimer?.invalidate()
        walkTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            self?.walkLoop()
        }
    }

    func failNow(_ errCode: String) {
        walking = false
        provisioned = false
        publishInfo()
        publishStatus("error", stepIdx >= 0 && stepIdx < steps.count ? steps[stepIdx] : "", errCode)
        log("terminal error=\(errCode)")
    }

    func walkLoop() {
        guard walking, Date() >= nextStepAt else { return }
        stepIdx += 1
        guard stepIdx < steps.count else {
            walking = false
            return
        }
        if !scenarioErr.isEmpty && stepIdx == failAfterIdx + 1 {
            publishStatus("provisioning", steps[stepIdx], nil)
            log("step -> \(steps[stepIdx]) (将注入 \(scenarioErr))")
            Thread.sleep(forTimeInterval: 0.08)   // 让客户端先收到该步 notify
            failNow(scenarioErr)
            return
        }
        if stepIdx == steps.count - 1 {
            provisioned = true
            walking = false
            publishInfo()
            publishStatus("ready", "ready", nil)
            log("terminal ready provisioned=1")
            return
        }
        publishStatus("provisioning", steps[stepIdx], nil)
        log("step -> \(steps[stepIdx])")
        nextStepAt = Date().addingTimeInterval(stepDelay)
    }
}

// ==============================================================================
// mode: ota —— OTA 设备模拟器（ota_server.cpp 行为移植）
// ==============================================================================

final class OtaFixture: FixtureHost {
    // OTA 服务（与 App OtaManager 常量一致）
    static let otaServiceUuid = CBUUID(string: "4FAFC201-1FB5-459E-914D-914D0CDFF40D")
    static let ctrlUuid = CBUUID(string: "BEB5483E-36E1-4688-B7F5-EA07361B26C0")
    static let dataUuid = CBUUID(string: "BEB5483E-36E1-4688-B7F5-EA07361B26C1")
    static let statusUuid = CBUUID(string: "BEB5483E-36E1-4688-B7F5-EA07361B26C2")
    static let deviceInfoServiceUuid = CBUUID(string: "180A")
    static let fwVersionUuid = CBUUID(string: "2A26")

    let ctrlChar: CBMutableCharacteristic
    let dataChar: CBMutableCharacteristic
    let statusChar: CBMutableCharacteristic
    let fwVersionChar: CBMutableCharacteristic
    var statusJson = "{\"type\":\"ota\",\"status\":\"idle\"}"

    enum OtaState: String { case idle, starting, ready, receiving, committing, success, failed, aborted }

    var state: OtaState = .idle
    var expectedSize = 0
    var receivedSize = 0
    var chunkSize = 180
    var expectedSha256 = ""
    var hasher = SHA256()
    var hashing = false
    var currentVersion: String
    var targetVersion = ""

    override init() {
        ctrlChar = CBMutableCharacteristic(type: Self.ctrlUuid, properties: [.read, .write],
                                           value: nil, permissions: [.readable, .writeable])
        dataChar = CBMutableCharacteristic(type: Self.dataUuid, properties: [.writeWithoutResponse],
                                           value: nil, permissions: [.writeable])
        statusChar = CBMutableCharacteristic(type: Self.statusUuid, properties: [.read, .notify],
                                             value: nil, permissions: [.readable])
        fwVersionChar = CBMutableCharacteristic(type: Self.fwVersionUuid, properties: [.read],
                                                value: nil, permissions: [.readable])
        currentVersion = startVersion
        super.init()
        advertiseName = localName.isEmpty ? "LightBLE-OTA-SIM" : localName
        // 平台限制：CBPeripheralManager 不能发布标准服务（180A → CBError code=8）。
        // 2A26 版本特征挂入自定义 OTA 服务 —— App readCharacteristic 跨服务按 UUID 命中，语义等价。
        let otaService = CBMutableService(type: Self.otaServiceUuid, primary: true)
        otaService.characteristics = [ctrlChar, dataChar, statusChar, fwVersionChar]
        services = [otaService]

        onWrite = { [weak self] request in self?.handleWrite(request) ?? .attributeNotFound }
        onRead = { [weak self] request in
            guard let self else { return .attributeNotFound }
            if request.characteristic == self.ctrlChar {
                let json = "{\"type\":\"ota\",\"status\":\"\(self.state.rawValue)\","
                    + "\"received\":\(self.receivedSize),\"total\":\(self.expectedSize),"
                    + "\"firmware_version\":\"\(self.currentVersion)\"}"
                request.value = Data(json.utf8)
                return .success
            }
            if request.characteristic == self.fwVersionChar {
                return FixtureHost.readValue(self.peripheralManager, request, from: self.fwVersionChar)
            }
            if request.characteristic == self.statusChar {
                request.value = Data(self.statusJson.utf8)
                return .success
            }
            return .attributeNotFound
        }

        fwVersionChar.value = Data(currentVersion.utf8)
        log("boot start_version=\(currentVersion) fault=\(fault.isEmpty ? "none" : fault)")
        log("contract_note=固件期望 target=lightble-peripheral|observer + target_version 字段；App 实发 target=<版本/文件名> 且无 target_version —— 本模拟器按 App 实际形态收口（差异已登记 phase-7 调和）")
    }

    func notifyStatus(_ status: String, code: String? = nil, detail: String? = nil,
                      includeProgress: Bool = false, rebooting: Bool = false, maxChunk: Bool = false) {
        var obj: [String: Any] = ["type": "ota", "status": status]
        if let code { obj["code"] = code }
        if let detail { obj["detail"] = detail; obj["message"] = detail }
        if includeProgress {
            obj["received"] = receivedSize
            obj["total"] = expectedSize
            obj["percent"] = expectedSize == 0 ? 0 : receivedSize * 100 / expectedSize
        }
        if rebooting { obj["rebooting"] = true }
        if maxChunk { obj["max_chunk"] = chunkSize }
        let json = String(data: try! JSONSerialization.data(withJSONObject: obj), encoding: .utf8)!
        statusJson = json
        _ = peripheralManager.updateValue(Data(json.utf8), for: statusChar, onSubscribedCentrals: nil)
        log("notify_status \(json)")
    }

    func handleWrite(_ request: CBATTRequest) -> CBATTError.Code {
        guard let data = request.value else { return .invalidAttributeValueLength }
        if request.characteristic == dataChar {
            receivedSize += data.count
            if hashing { hasher.update(data: data) } else { hasher = SHA256(); hasher.update(data: data); hashing = true }
            if receivedSize % 10 * chunkSize == 0 || receivedSize >= expectedSize {
                log("data chunk bytes=\(data.count) received=\(receivedSize)/\(expectedSize)")
            }
            return .success
        }
        guard request.characteristic == ctrlChar else { return .attributeNotFound }
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let op = obj["op"] as? String else {
            log("ctrl non-JSON write bytes=\(data.count)")
            return .success
        }
        switch op {
        case "start": handleStart(obj)
        case "commit": handleCommit()
        case "abort":
            log("ctrl op=abort → reset")
            state = .aborted
            notifyStatus("aborted")
            state = .idle
            return .success
        default:
            log("ctrl unknown op=\(op)")
            return .success
        }
        return .success
    }

    func handleStart(_ obj: [String: Any]) {
        state = .starting
        let target = obj["target"] as? String ?? ""
        let size = obj["size"] as? Int ?? 0
        let chunk = obj["chunk_size"] as? Int ?? 180
        let sha = obj["sha256"] as? String ?? ""

        // 固件同款故障：start 直接拒绝
        if fault == "abort_next" {
            log("fault=abort_next → start 拒绝")
            state = .failed
            notifyStatus("failed", code: "OTA_ERR_STATE", detail: "fault_abort")
            state = .idle
            return
        }
        if target.isEmpty { log("start missing_target") }
        if size == 0 { log("start invalid_size") }
        if chunk == 0 || chunk > 512 { log("start invalid_chunk_size=\(chunk)") }
        if !(sha.count == 64 && sha.allSatisfy { $0.isHexDigit }) { log("start invalid_sha256") }
        if target.isEmpty || size == 0 || chunk == 0 || chunk > 512
            || !(sha.count == 64 && sha.allSatisfy { $0.isHexDigit }) {
            state = .failed
            notifyStatus("failed", code: "OTA_ERR_STATE", detail: "invalid_start_params")
            state = .idle
            return
        }

        // 契约差异如实收口：App 的 target 即 manifest 版本（或文件名）；SemVer 才当版本用
        let looksSemVer = target.range(of: #"^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$"#, options: .regularExpression) != nil
        targetVersion = looksSemVer ? target : ""
        expectedSize = size
        receivedSize = 0
        chunkSize = chunk
        expectedSha256 = sha.lowercased()
        hasher = SHA256()
        hashing = true

        log("ctrl op=start target=\(target) size=\(size) chunk=\(chunk) sha=\(sha.prefix(8))… new_version=\(targetVersion.isEmpty ? "(不变)" : targetVersion)")
        state = .ready
        notifyStatus("ready", includeProgress: false, maxChunk: true)
        state = .receiving
    }

    func handleCommit() {
        guard state == .receiving || state == .ready else {
            log("ctrl op=commit in state=\(state.rawValue) → ota_not_started")
            notifyStatus("failed", code: "OTA_ERR_STATE", detail: "ota_not_started")
            return
        }
        state = .committing
        if fault == "timeout" {
            log("fault=timeout → commit 不应答（客户端预期 30s 超时停态）")
            return   // 不 notify：留给客户端超时兜底
        }
        if fault == "commit_fail" {
            log("fault=commit_fail → OTA_ERR_FLASH")
            state = .failed
            notifyStatus("failed", code: "OTA_ERR_FLASH", detail: "fault_commit_fail")
            state = .idle
            return
        }
        guard receivedSize == expectedSize else {
            log("commit size_mismatch received=\(receivedSize) expected=\(expectedSize)")
            state = .failed
            notifyStatus("failed", code: "OTA_SIZE_MISMATCH", detail: "size_mismatch", includeProgress: true)
            state = .idle
            return
        }
        guard hashing else { return }
        let digest = hasher.finalize().map { String(format: "%02x", $0) }.joined()
        if fault == "wrong_size" {
            log("fault=wrong_size → HASH_MISMATCH（按固件 wrongHash 语义）")
            state = .failed
            notifyStatus("failed", code: "OTA_HASH_MISMATCH", detail: "fault_wrong_hash", includeProgress: true)
            state = .idle
            return
        }
        guard digest == expectedSha256 else {
            log("commit sha_mismatch got=\(digest.prefix(8))… expected=\(expectedSha256.prefix(8))…")
            state = .failed
            notifyStatus("failed", code: "OTA_HASH_MISMATCH", detail: "sha256_mismatch", includeProgress: true)
            state = .idle
            return
        }
        // 成功：版本切换（真实固件此处 restart；macOS 外设无法主动断连，
        // 以「commit 后 2A26 值切换」呈现重启后版本，客户端回读比对路径完整）
        let newVersion = targetVersion.isEmpty ? currentVersion : targetVersion
        log("commit ok → success new_version=\(newVersion)（模拟重启：2A26 切换）")
        state = .success
        notifyStatus("success", includeProgress: true, rebooting: true)
        currentVersion = newVersion
        fwVersionChar.value = Data(newVersion.utf8)
        log("fw_version_2a26=\(newVersion)")
        state = .idle
    }
}

// ---- 启动 ---------------------------------------------------------------------

switch mode {
case "shid":
    log("MODE=shid DURATION=\(duration) NAME=\(localName.isEmpty ? "SHID-5EEDC0DE" : localName) SCENARIO=\(scenarioOverride.isEmpty ? "payload-driven" : scenarioOverride)")
    ShidFixture().launch()
case "ota":
    log("MODE=ota DURATION=\(duration) NAME=\(localName.isEmpty ? "LightBLE-OTA-SIM" : localName) START_VERSION=\(startVersion) FAULT=\(fault.isEmpty ? "none" : fault)")
    OtaFixture().launch()
default:
    fail("usage: ble-fixture --mode shid|ota [--duration N] [--name S] [--scenario S] [--fault S] [--start-version V]")
}
