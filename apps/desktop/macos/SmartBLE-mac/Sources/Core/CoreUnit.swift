//
// CoreUnit.swift — 纯逻辑单测（r6-M6a · --unit-core 启动时运行后即退出）
// 覆盖：framed-v1 分帧边界 / shid://pair 严格解析 / candidate 校验 / DeviceInfo 身份验证 /
// state·step→四行映射 / 8 错误码→四分流 / SemVer / 写队列与轮询常量。
// 输出口径与 PageSmoke 一致（[UNIT] CU-xx result=PASS/FAIL + SUMMARY；失败退出码 1）。
//

import Foundation

@MainActor
enum CoreUnit {
    private static var failures = 0
    private static var total = 0

    private static func check(_ id: String, _ ok: Bool, _ detail: String) {
        total += 1
        if !ok { failures += 1 }
        print("[UNIT] \(id) result=\(ok ? "PASS" : "FAIL") detail=\"\(detail)\"")
    }

    /// --unit-core 时运行全部单测并退出；返回 true 表示已接管本次启动
    @discardableResult
    static func runIfRequested() -> Bool {
        guard CommandLine.arguments.contains("--unit-core") else { return false }
        run()
        print("[UNIT] SUMMARY failures=\(failures) total=\(total)")
        exit(failures == 0 ? 0 : 1)
    }

    static func run() {
        testFraming()
        testQrParse()
        testCandidate()
        testIdentity()
        testMapRows()
        testRecoveryAndHints()
        testSemVer()
        testConstants()
    }

    // MARK: - CU-01.. framed-v1 分帧

    private static func testFraming() {
        // chunkSizeForMtu：MTU 23（默认保守）→ 17B；封顶 128；线性段
        check("CU-01", HidFraming.chunkSize(forMtu: 23) == 17, "mtu23=\(HidFraming.chunkSize(forMtu: 23))")
        check("CU-02", HidFraming.chunkSize(forMtu: 50) == 44, "mtu50=\(HidFraming.chunkSize(forMtu: 50))")
        check("CU-03", HidFraming.chunkSize(forMtu: 185) == 128, "mtu185 封顶=\(HidFraming.chunkSize(forMtu: 185))")
        check("CU-04", HidFraming.chunkSize(forMtu: 10) == 17, "mtu10 回落默认=\(HidFraming.chunkSize(forMtu: 10))")

        // 300B / chunk 128 → 3 帧：[0,3,128][1,3,128][2,3,44]，负载可还原
        let payload = (0..<300).map { UInt8($0 % 251) }
        let frames = try! HidFraming.buildFrames(payload, chunkSize: 128)
        check("CU-05", frames.count == 3, "frames=\(frames.count)")
        check("CU-06", frames[0][0] == 0 && frames[0][1] == 3 && frames[0][2] == 128, "帧0头 \(frames[0].prefix(3).map(String.init).joined(separator: ","))")
        check("CU-07", frames[2][2] == 44, "末帧len=\(frames[2][2])")
        let reassembled = frames.flatMap { Array($0.dropFirst(HidFraming.frameHeaderSize)) }
        check("CU-08", reassembled == payload, "重组一致 \(reassembled.count)B")

        // 组装上限：1024B → 8 帧 OK；1025B → tooLarge
        let maxPayload = [UInt8](repeating: 0xAB, count: HidFraming.maxAssembledBytes)
        let okFrames = try? HidFraming.buildFrames(maxPayload, chunkSize: 128)
        check("CU-09", okFrames?.count == 8, "1024B→\(okFrames?.count ?? -1) 帧")
        do {
            _ = try HidFraming.buildFrames([UInt8](repeating: 1, count: HidFraming.maxAssembledBytes + 1), chunkSize: 128)
            check("CU-10", false, "1025B 应抛 tooLarge")
        } catch { check("CU-10", true, "tooLarge 已拦截") }

        // 帧数上限：chunk 1 → 64 帧边界
        let f64 = try? HidFraming.buildFrames([UInt8](repeating: 2, count: 64), chunkSize: 1)
        check("CU-11", f64?.count == 64, "64B/chunk1→\(f64?.count ?? -1) 帧")
        do {
            _ = try HidFraming.buildFrames([UInt8](repeating: 2, count: 65), chunkSize: 1)
            check("CU-12", false, "65 帧应抛 tooManyFrames")
        } catch { check("CU-12", true, "tooManyFrames 已拦截") }

        do {
            _ = try HidFraming.buildFrames([], chunkSize: 128)
            check("CU-13", false, "空 payload 应抛错")
        } catch { check("CU-13", true, "空 payload 已拦截") }
    }

    // MARK: - CU-14.. shid://pair 严格解析

    private static func testQrParse() {
        let token32 = "3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b4"
        let valid = "shid://pair?token=\(token32)&host=192.168.1.8&port=17892"
        let q = HidProtocol.parsePairingQr(valid)
        check("CU-14", q?.token == token32 && q?.host == "192.168.1.8" && q?.port == 17892,
              "valid=\(q != nil) port=\(q?.port ?? -1)")

        // 默认端口
        let noPort = HidProtocol.parsePairingQr("shid://pair?token=\(token32)&host=hub.lan")
        check("CU-15", noPort?.port == 17892, "默认端口=\(noPort?.port ?? -1)")

        // 大写 token 归一化（正典 lowercase 后校验）
        let upper = HidProtocol.parsePairingQr("shid://pair?token=3F9A7C1E5B6D48C2A1E0F7B3D5C6A9B4&host=h1")
        check("CU-16", upper?.token == token32, "大写归一=\(upper?.token ?? "nil")")

        // 非法：错 scheme / 31 位 token / 重复参数 / host 带斜杠 / 坏端口
        check("CU-17", HidProtocol.parsePairingQr("https://pair?token=\(token32)&host=h") == nil, "错 scheme 拒绝")
        check("CU-18", HidProtocol.parsePairingQr("shid://pair?token=3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b&host=h") == nil, "31 位 token 拒绝")
        check("CU-19", HidProtocol.parsePairingQr("shid://pair?token=\(token32)&token=\(token32)&host=h") == nil, "重复参数拒绝")
        check("CU-20", HidProtocol.parsePairingQr("shid://pair?token=\(token32)&host=192.168.1.8/abc") == nil, "host 带斜杠拒绝")
        check("CU-21", HidProtocol.parsePairingQr("shid://pair?token=\(token32)&host=h&port=99999") == nil, "端口越界拒绝")
        check("CU-22", HidProtocol.parsePairingQr("shid://pair?host=h") == nil, "缺 token 拒绝")
    }

    // MARK: - CU-23.. candidate 构造与校验

    private static func testCandidate() {
        // 合法最小集
        let json = try? HidProtocol.buildCandidateJson(ssid: "Home-2.4G", password: "secret",
                                                        hubAddress: "192.168.1.8:17892",
                                                        token: "3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b4")
        check("CU-23", json?.contains("\"v\":1") == true && json?.contains("\"hub_port\":17892") == true,
              "json=\(json?.prefix(60) ?? "nil")…")

        // host 不带端口 → 默认 17892
        let json2 = try? HidProtocol.buildCandidateJson(ssid: "s", password: "", hubAddress: "hub.lan",
                                                        token: "3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b4")
        check("CU-24", json2?.contains("\"hub_port\":17892") == true, "默认端口注入")

        // 桌面双口径：t= 短令牌放行（交设备侧裁决）
        let json3 = try? HidProtocol.buildCandidateJson(ssid: "s", password: "", hubAddress: "h:1",
                                                        token: "tok-3f9a7c1e")
        check("CU-25", json3 != nil, "短令牌宽口径=\(json3 != nil)")

        // 非法分支
        check("CU-26", (try? HidProtocol.buildCandidateJson(ssid: "", password: "", hubAddress: "h", token: "3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b4")) == nil, "空 SSID 拒绝")
        check("CU-27", (try? HidProtocol.buildCandidateJson(ssid: String(repeating: "a", count: 33), password: "", hubAddress: "h", token: "3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b4")) == nil, "SSID>32 拒绝")
        check("CU-28", (try? HidProtocol.buildCandidateJson(ssid: "s", password: String(repeating: "p", count: 65), hubAddress: "h", token: "3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b4")) == nil, "密码>64 拒绝")
        check("CU-29", (try? HidProtocol.buildCandidateJson(ssid: "s", password: "", hubAddress: "", token: "3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b4")) == nil, "空 Hub 拒绝")
        check("CU-30", (try? HidProtocol.buildCandidateJson(ssid: "s", password: "", hubAddress: "h:notaport", token: "3f9a7c1e5b6d48c2a1e0f7b3d5c6a9b4")) == nil, "坏端口拒绝")
        check("CU-31", (try? HidProtocol.buildCandidateJson(ssid: "s", password: "", hubAddress: "h", token: "xyz")) == nil, "坏 token 拒绝")
    }

    // MARK: - CU-32.. DeviceInfo 解析 + 身份验证

    private static func testIdentity() {
        let good = """
        {"product":"smart-hid","protocol":"1.0","device_id":"HID-9F3E2A1C","firmware":"1.1.1","state":"unprovisioned","provisioned":false}
        """
        guard let info = HidProtocol.parseDeviceInfo(good) else {
            check("CU-32", false, "合法 DeviceInfo 解析失败")
            return
        }
        check("CU-32", info.deviceId == "HID-9F3E2A1C" && info.product == "smart-hid", "解析字段正确")
        check("CU-33", HidProtocol.verifyIdentity(info), "身份验证通过")

        // 三个失败分支：product / protocol / device_id
        check("CU-34", !HidProtocol.verifyIdentity(HidProtocol.DeviceInfo(product: "other", protocolVersion: "1.0", deviceId: "HID-9F3E2A1C", firmware: "", state: "", provisioned: false)), "product 不符拒绝")
        check("CU-35", !HidProtocol.verifyIdentity(HidProtocol.DeviceInfo(product: "smart-hid", protocolVersion: "2.0", deviceId: "HID-9F3E2A1C", firmware: "", state: "", provisioned: false)), "协议版本不符拒绝")
        check("CU-36", !HidProtocol.verifyIdentity(HidProtocol.DeviceInfo(product: "smart-hid", protocolVersion: "1.0", deviceId: "HID-9F3E2A", firmware: "", state: "", provisioned: false)), "device_id 7 位拒绝")

        // Status 解析（防御式）
        check("CU-37", HidProtocol.parseProvisionStatus(#"{"state":"ready","step":"ready","error":null}"#) != nil, "Status 解析")
        check("CU-38", HidProtocol.parseProvisionStatus("not-json") == nil, "非 JSON 返回 nil")
    }

    // MARK: - CU-39.. state/step → 四行映射

    private static func testMapRows() {
        let ready = HidProtocol.mapRows(state: "ready", step: "ready", error: nil)
        check("CU-39", ready.values.allSatisfy { $0 == "done" }, "ready 全 done")

        let pairing = HidProtocol.mapRows(state: "provisioning", step: "pairing", error: nil)
        check("CU-40", pairing["wifi"] == "done" && pairing["hub"] == "active" && pairing["conn"] == "pending", "pairing→hub active")

        let wifiDone = HidProtocol.mapRows(state: "connecting_wifi", step: "wifi_connected", error: nil)
        check("CU-41", wifiDone["wifi"] == "done" && wifiDone["hub"] == "active", "wifi_connected→wifi done")

        let mqtt = HidProtocol.mapRows(state: "mqtt_connecting", step: "mqtt_connecting", error: nil)
        check("CU-42", mqtt["conn"] == "active" && mqtt["wifi"] == "done" && mqtt["hub"] == "done", "mqtt_connecting→conn active")

        let wifiFail = HidProtocol.mapRows(state: "error", step: "connecting_wifi", error: "wifi_failed")
        check("CU-43", wifiFail["wifi"] == "fail", "wifi_failed→wifi fail")

        let pairFail = HidProtocol.mapRows(state: "error", step: "", error: "pairing_expired")
        check("CU-44", pairFail["hub"] == "fail", "pairing_expired→hub fail")

        let mqttFail = HidProtocol.mapRows(state: "error", step: "", error: "mqtt_invalid")
        check("CU-45", mqttFail["conn"] == "fail", "mqtt_invalid→conn fail")

        let storage = HidProtocol.mapRows(state: "error", step: "", error: "storage_failed")
        check("CU-46", storage["usb"] == "fail", "storage_failed→usb fail（行归属正典未明示，登记）")
    }

    // MARK: - CU-47.. 错误码提示 + 四分流

    private static func testRecoveryAndHints() {
        let expect: [String: String] = [
            "invalid_payload": "form", "wifi_failed": "form", "controlhub_unreachable": "diagnostics",
            "pairing_invalid": "pairing", "pairing_expired": "pairing", "pairing_used": "pairing",
            "mqtt_invalid": "form", "storage_failed": "retry",
        ]
        for (code, action) in expect {
            check("CU-47-\(code)", HidProtocol.recoveryAction(forErrorCode: code) == action,
                  "recovery=\(HidProtocol.recoveryAction(forErrorCode: code)) expect=\(action)")
        }
        check("CU-48", HidProtocol.errorHints.count == 8, "8 错误码提示全表=\(HidProtocol.errorHints.count)")
    }

    // MARK: - CU-49 SemVer（OTA manifest）

    private static func testSemVer() {
        check("CU-49", OtaManager.isSemVer("1.2.3") && OtaManager.isSemVer("1.2.3-rc.1")
              && !OtaManager.isSemVer("1.2") && !OtaManager.isSemVer("v1.2.3") && !OtaManager.isSemVer("abc"),
              "SemVer 判定")
    }

    // MARK: - CU-50.. 常量锁定（正典口径）

    private static func testConstants() {
        check("CU-50", BLEManager.writeQueueMaxDepth == 16, "写队列深度 16")
        check("CU-51", BLEManager.writeTimeoutSec == 5.0, "单写超时 5s")
        check("CU-52", HidProvisionManager.pollTimeoutSec == 60, "STATUS 轮询 60s")
        check("CU-53", HidProvisionManager.tokenTtlSec == 300, "token TTL 5min")
        check("CU-54", HidFraming.maxChunkBytes == 128 && HidFraming.maxAssembledBytes == 1024
              && HidFraming.maxFrames == 64 && HidFraming.frameHeaderSize == 3, "framed-v1 常量")
        check("CU-55", HidProtocol.defaultPairingPort == 17892 && HidProtocol.protocolVersion == "1.0",
              "协议常量")
    }
}
