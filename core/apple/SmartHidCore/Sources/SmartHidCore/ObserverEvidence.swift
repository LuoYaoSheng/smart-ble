// ObserverEvidence.swift — F017 观察侧证据匹配（服务层就绪 · 无页面消费）
// 语义对齐正典实现 apps/uniapp/services/broadcast/observer-evidence-adapter.js：
// 广播内容（App 端构建的负载）与观察端上报 JSON 交叉匹配，不修改观察端固件解析器。

import Foundation

/// 观察端上报事件。宽容解析别名：type/t、services/uuids、manufacturer/mfg、timestamp/ts。
public struct ObserverEvent: Equatable {
    /// 上报是否属于广播事件（type == "advertisement" 或 t == "obs"，与 JS 判定一致）
    public let isAdvertisement: Bool
    public let name: String
    public let services: [String]
    /// 原始厂商数据字段（可含冒号/大写，匹配前统一归一化为纯小写 hex）
    public let manufacturerRaw: String?
    public let rssi: Int?
    public let timestampMs: Double?

    public init(isAdvertisement: Bool,
                name: String = "",
                services: [String] = [],
                manufacturerRaw: String? = nil,
                rssi: Int? = nil,
                timestampMs: Double? = nil) {
        self.isAdvertisement = isAdvertisement
        self.name = name
        self.services = services
        self.manufacturerRaw = manufacturerRaw
        self.rssi = rssi
        self.timestampMs = timestampMs
    }

    /// 从观察端上报 JSON 解析（[String: Any]，兼容别名键）。
    public init(json: [String: Any]) {
        let type = (json["type"] as? String) ?? ""
        let t = (json["t"] as? String) ?? ""
        self.isAdvertisement = type == "advertisement" || t == "obs"
        self.name = json["name"] as? String ?? ""
        self.services = (json["services"] as? [String]) ?? (json["uuids"] as? [String]) ?? []
        self.manufacturerRaw = (json["manufacturer"] as? String) ?? (json["mfg"] as? String)
        self.rssi = (json["rssi"] as? NSNumber)?.intValue
        self.timestampMs = (json["timestamp"] as? NSNumber)?.doubleValue ?? (json["ts"] as? NSNumber)?.doubleValue
    }
}

/// App 端广播证据负载：与观察端上报交叉匹配的期望值。
/// 设备名/服务 UUID 为空约束（nil/空串）时不参与匹配，与 JS 口径一致。
public struct BroadcastEvidencePayload: Equatable {
    public let deviceName: String?
    public let serviceUuid: String?
    public let manufacturerId: UInt16?
    /// 厂商数据为 UTF-8 文本（与 payload-builder 的 manufacturer.data 口径一致）
    public let manufacturerData: String?

    public init(deviceName: String? = nil,
                serviceUuid: String? = nil,
                manufacturerId: UInt16? = nil,
                manufacturerData: String? = nil) {
        self.deviceName = deviceName
        self.serviceUuid = serviceUuid
        self.manufacturerId = manufacturerId
        self.manufacturerData = manufacturerData
    }
}

/// 交叉匹配结果：matched 总判定 + 三项分检查（供诊断展示，不参与页面消费）。
public struct EvidenceMatchReport: Equatable {
    public let matched: Bool
    public let nameMatched: Bool
    public let serviceMatched: Bool
    public let manufacturerMatched: Bool
    public let rssi: Int?
    public let timestampMs: Double
}

public enum ObserverEvidenceMatcher {

    /// 交叉匹配主入口（语义逐条对齐 matchObserverEvidence）。
    public static func match(_ event: ObserverEvent,
                             payload: BroadcastEvidencePayload,
                             nowMs: Double? = nil) -> EvidenceMatchReport {
        let nameMatched: Bool
        if let expected = payload.deviceName, !expected.isEmpty {
            nameMatched = event.name == expected || event.name.contains(expected)
        } else {
            nameMatched = true
        }

        let serviceMatched: Bool
        if let expected = payload.serviceUuid, !expected.isEmpty {
            serviceMatched = event.services.contains { sameUuid($0, expected) }
        } else {
            serviceMatched = true
        }

        var manufacturerMatched = true
        if let id = payload.manufacturerId {
            let observed = normalizeHex(event.manufacturerRaw ?? "")
            let idLe = String(format: "%02x%02x", id & 0xff, (id >> 8) & 0xff)
            let idBe = String(format: "%02x%02x", (id >> 8) & 0xff, id & 0xff)
            manufacturerMatched = observed.contains(idLe) || observed.contains(idBe)
            if let data = payload.manufacturerData, !data.isEmpty {
                manufacturerMatched = manufacturerMatched && observed.contains(utf8Hex(data))
            }
        }

        return EvidenceMatchReport(
            matched: event.isAdvertisement && nameMatched && serviceMatched && manufacturerMatched,
            nameMatched: nameMatched,
            serviceMatched: serviceMatched,
            manufacturerMatched: manufacturerMatched,
            rssi: event.rssi,
            timestampMs: event.timestampMs ?? nowMs ?? Date().timeIntervalSince1970 * 1000
        )
    }

    /// JSON 直入口：解析 + 匹配。
    public static func match(observerJson: [String: Any],
                             payload: BroadcastEvidencePayload,
                             nowMs: Double? = nil) -> EvidenceMatchReport {
        match(ObserverEvent(json: observerJson), payload: payload, nowMs: nowMs)
    }

    // MARK: - 归一化（与 JS normalizeHex/normalizeUuid/utf8ToHex 一致）

    /// 仅保留十六进制字符并转小写（容忍 "AA:BB-CC" → "aabbcc"）。
    public static func normalizeHex(_ value: String) -> String {
        String(value.lowercased().filter { ($0 >= "0" && $0 <= "9") || ($0 >= "a" && $0 <= "f") })
    }

    /// UUID 去连字符转小写比较。
    public static func sameUuid(_ a: String, _ b: String) -> Bool {
        let na = a.replacingOccurrences(of: "-", with: "").lowercased()
        let nb = b.replacingOccurrences(of: "-", with: "").lowercased()
        return !na.isEmpty && !nb.isEmpty && na == nb
    }

    /// UTF-8 文本转 hex（与 JS encodeURIComponent 路径等价：非 ASCII 同样展开为 UTF-8 字节）。
    public static func utf8Hex(_ text: String) -> String {
        Data(text.utf8).map { String(format: "%02x", $0) }.joined()
    }
}
