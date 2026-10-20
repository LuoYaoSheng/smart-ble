import Foundation
import CryptoKit
import CoreFoundation

/// Only typed OTA frames are commands/events. Never infer success from arbitrary text,
/// a firmware version, or words inside an error detail.
public enum OtaDeviceEvent: Equatable {
    case ready
    case success
    case ok // Kept for source compatibility; never produced by the frozen protocol.
    case error(String)
}

public enum OtaStatusClassifier {
    public static func classify(_ data: Data) -> OtaDeviceEvent? {
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              json["type"] as? String == "ota", let status = json["status"] as? String else { return nil }
        switch status {
        case "ready": return .ready
        case "success": return .success
        case "error", "failed", "aborted":
            return .error([json["code"] as? String, json["detail"] as? String, status].compactMap { $0 }.joined(separator: ": "))
        default: return nil
        }
    }
}

public enum OtaStartPayload {
    public static let validTargets: Set<String> = ["lightble-peripheral", "lightble-observer"]
    public static func isValidTarget(_ s: String) -> Bool { validTargets.contains(s) }
    public static func build(manifest: OtaManifestInfo, chunkSize: Int) -> [String: Any] {
        ["op": "start", "target": manifest.target, "hardware": manifest.hardware,
         "target_version": manifest.version, "size": manifest.size,
         "chunk_size": chunkSize, "sha256": manifest.sha256]
    }
    public static func display(_ p: [String: Any]) -> String {
        ["op", "target", "hardware", "target_version", "size", "chunk_size"]
            .compactMap { k in p[k].map { "\(k)=\($0)" } }.joined(separator: " ")
    }
}

public enum OtaManifestError: Error, Equatable {
    case invalidFields
    case invalidFormatVersion
    case invalidTarget(String)
    case invalidHardware
    case invalidSemVer(key: String, value: String)
    case invalidSize
    case invalidHash
    case sizeMismatch(manifest: Int, actual: Int)
    case hashMismatch
    case invalidFileSelection
    case fileTooLarge
}

public struct OtaManifestInfo: Equatable {
    public let target: String
    public let hardware: String
    public let version: String
    public let size: Int
    public let sha256: String
}

/// Six mandatory fields, no legacy alias and no additional fields: exactly the package schema.
public enum OtaManifest {
    private static let keys: Set<String> = ["format_version", "target", "hardware", "firmware_version", "size", "sha256"]
    public static func isSemVer(_ v: String) -> Bool {
        guard let range = v.range(of: #"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$"#, options: .regularExpression) else { return false }
        return range == v.startIndex..<v.endIndex
    }
    public static func sha256Hex(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
    private static func integer(_ value: Any?) -> Int? {
        guard let n = value as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(),
              n.doubleValue.isFinite, n.doubleValue.rounded() == n.doubleValue,
              n.doubleValue >= 0, n.doubleValue < Double(Int.max) else { return nil }
        return n.intValue
    }
    public static func parse(_ json: [String: Any], fileSize: Int, actualSha256: String) -> Result<OtaManifestInfo, OtaManifestError> {
        guard Set(json.keys) == keys else { return .failure(.invalidFields) }
        guard integer(json["format_version"]) == 1 else { return .failure(.invalidFormatVersion) }
        let target = json["target"] as? String ?? ""
        guard OtaStartPayload.isValidTarget(target) else { return .failure(.invalidTarget(target)) }
        guard let hardware = json["hardware"] as? String, !hardware.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              hardware == hardware.trimmingCharacters(in: .whitespacesAndNewlines) else { return .failure(.invalidHardware) }
        let version = json["firmware_version"] as? String ?? ""
        guard isSemVer(version) else { return .failure(.invalidSemVer(key: "firmware_version", value: version)) }
        guard let size = integer(json["size"]), size > 0 else { return .failure(.invalidSize) }
        guard size == fileSize else { return .failure(.sizeMismatch(manifest: size, actual: fileSize)) }
        guard let sha = json["sha256"] as? String, sha.count == 64,
              sha.range(of: #"^[0-9a-f]{64}$"#, options: .regularExpression) != nil else { return .failure(.invalidHash) }
        guard sha == actualSha256 else { return .failure(.hashMismatch) }
        return .success(OtaManifestInfo(target: target, hardware: hardware, version: version, size: size, sha256: sha))
    }
}

/// Both selected URLs receive their own security scope. iOS file selection does not grant
/// access to a neighbouring manifest. Require the actual manifest.json from the same folder.
public struct OtaLocalPackage {
    // Current ESP32/S3 partition table and scripts/ota/package-firmware.py use 0x180000.
    public static let maximumFirmwareSize = 0x180000
    public let firmware: Data
    public let manifest: OtaManifestInfo
    public let firmwareURL: URL
    public static func load(urls: [URL]) throws -> OtaLocalPackage {
        guard urls.count == 2,
              let bin = urls.first(where: { $0.pathExtension.lowercased() == "bin" }),
              let manifestURL = urls.first(where: { $0.lastPathComponent == "manifest.json" }),
              bin.deletingLastPathComponent().standardizedFileURL == manifestURL.deletingLastPathComponent().standardizedFileURL else {
            throw OtaManifestError.invalidFileSelection
        }
        let scopes = urls.map { $0.startAccessingSecurityScopedResource() }
        defer { for (url, granted) in zip(urls, scopes) where granted { url.stopAccessingSecurityScopedResource() } }
        let firmware = try readBounded(bin, limit: maximumFirmwareSize)
        let manifestData = try readBounded(manifestURL, limit: 64 * 1024)
        guard let json = try JSONSerialization.jsonObject(with: manifestData) as? [String: Any] else { throw OtaManifestError.invalidFields }
        let manifest = try OtaManifest.parse(json, fileSize: firmware.count, actualSha256: OtaManifest.sha256Hex(firmware)).get()
        return OtaLocalPackage(firmware: firmware, manifest: manifest, firmwareURL: bin)
    }
    private static func readBounded(_ url: URL, limit: Int) throws -> Data {
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        var result = Data()
        while let chunk = try handle.read(upToCount: min(64 * 1024, limit + 1 - result.count)), !chunk.isEmpty {
            result.append(chunk)
            guard result.count <= limit else { throw OtaManifestError.fileTooLarge }
        }
        return result
    }
}
