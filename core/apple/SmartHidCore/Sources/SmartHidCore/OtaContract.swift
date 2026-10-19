//
//  OtaContract.swift — OTA 契约纯逻辑（R-1/R-2 对齐 · Apple 双端共享）
//
//  契约事实源：contracts/target/ota-package.schema.json（manifest 六字段：format_version /
//  target 枚举 / hardware / firmware_version SemVer / size / sha256）与固件 handleStart
//  校验链（hardware/esp32/LightBLE/src/ota_server.cpp：missing_target / invalid_target /
//  missing_target_version / invalid_sha256）；BLE STATUS 帧为
//  {"type":"ota","status":"ready|error|success|aborted"}（notifyStatus）。
//  决策记录：docs/specs/06_review/OTA_CONTRACT_R1_R2_DECISION.md（方案 A：App 对齐冻结契约）。
//

import Foundation
import CryptoKit

// MARK: - 状态帧分类（R-2）

public enum OtaDeviceEvent: Equatable {
    case ready
    case success
    case ok
    case error(String)
}

public enum OtaStatusClassifier {
    /// 判定设备状态/版本回读帧；无关键词命中返回 nil（调用方静默忽略，如版本串）。
    /// JSON 分支同样按**子串**匹配（旧实现整值精确匹配漏检 "failed"/"aborted" → 拖 30s 超时），
    /// 固件 abort 通知纳入错误类。顺序：ready → success/ok → 错误类。
    public static func classify(_ data: Data) -> OtaDeviceEvent? {
        let text = String(data: data, encoding: .utf8) ?? ""
        if let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
            let values = json.values.compactMap { $0 as? String }.map { $0.lowercased() }
            if values.contains(where: { $0.contains("ready") }) { return .ready }
            if values.contains(where: { $0.contains("success") }) { return .success }
            if values.contains(where: { $0.contains("ok") }) { return .ok }
            if values.contains(where: { $0.contains("error") || $0.contains("fail") || $0.contains("abort") }) {
                return .error(text)
            }
            return nil
        }
        let lower = text.lowercased()
        if lower.contains("ready") { return .ready }
        if lower.contains("success") { return .success }
        if lower.contains("ok") { return .ok }
        if lower.contains("error") || lower.contains("fail") || lower.contains("abort") { return .error(text) }
        return nil
    }
}

// MARK: - start 帧构造（R-1）

public enum OtaStartPayload {
    public static let validTargets: Set<String> = ["lightble-peripheral", "lightble-observer"]

    public static func isValidTarget(_ s: String) -> Bool { validTargets.contains(s) }

    /// 契约 start 帧：op/target/target_version/size/chunk_size/sha256；
    /// manifest 缺项时省略对应键（不伪造枚举/版本，真固件以 missing_target 诚实拒绝）。
    public static func build(manifestTarget: String?, manifestVersion: String?,
                             fileSize: Int, chunkSize: Int, sha256: String) -> [String: Any] {
        var p: [String: Any] = [
            "op": "start",
            "size": fileSize,
            "chunk_size": chunkSize,
            "sha256": sha256,
        ]
        if let t = manifestTarget, isValidTarget(t) { p["target"] = t }
        if let v = manifestVersion, !v.isEmpty { p["target_version"] = v }
        return p
    }

    /// 日志用展示串（不含 sha256 全文）
    public static func display(_ p: [String: Any]) -> String {
        ["op", "target", "target_version", "size", "chunk_size"]
            .compactMap { k -> String? in p[k].map { "\(k)=\($0)" } }
            .joined(separator: " ")
    }
}

// MARK: - manifest sidecar 解析（契约六字段 · legacy "version" 兼容）

public enum OtaManifestError: Error, Equatable {
    case invalidTarget(String)
    case invalidSemVer(key: String, value: String)
    case sizeMismatch(manifest: Int, actual: Int)
    case hashMismatch
}

public struct OtaManifestInfo: Equatable {
    public let target: String?
    public let version: String?
    public let ignoredKeys: [String]
    public init(target: String?, version: String?, ignoredKeys: [String]) {
        self.target = target
        self.version = version
        self.ignoredKeys = ignoredKeys
    }
}

public enum OtaManifest {
    public static func isSemVer(_ v: String) -> Bool {
        v.range(of: #"^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$"#, options: .regularExpression) != nil
    }

    public static func sha256Hex(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private static let knownKeys = ["format_version", "target", "hardware", "firmware_version", "version", "size", "sha256"]

    /// 校验顺序：target 枚举 → firmware_version(legacy version) SemVer → size 实测 → sha256 实测。
    public static func parse(_ json: [String: Any], fileSize: Int, actualSha256: String) -> Result<OtaManifestInfo, OtaManifestError> {
        var target: String?
        if let t = json["target"] as? String {
            guard OtaStartPayload.isValidTarget(t) else { return .failure(.invalidTarget(t)) }
            target = t
        }
        var version: String?
        let versionKey = (json["firmware_version"] as? String) != nil ? "firmware_version" : "version"
        if let v = json[versionKey] as? String {
            guard isSemVer(v) else { return .failure(.invalidSemVer(key: versionKey, value: v)) }
            version = v
        }
        if let size = json["size"] as? Int, size != fileSize {
            return .failure(.sizeMismatch(manifest: size, actual: fileSize))
        }
        if let sha = json["sha256"] as? String, sha.lowercased() != actualSha256 {
            return .failure(.hashMismatch)
        }
        let ignored = json.keys.filter { !knownKeys.contains($0) }.sorted()
        return .success(OtaManifestInfo(target: target, version: version, ignoredKeys: ignored))
    }
}
