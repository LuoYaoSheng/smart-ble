import Foundation

struct ReleaseMetadata: Decodable, Equatable {
    struct PublicSurface: Decodable, Equatable {
        let name: String
        let role: String
        let capabilityStatus: String?
        let releaseStatus: String

        enum CodingKeys: String, CodingKey {
            case name, role
            case capabilityStatus = "capability_status"
            case releaseStatus = "release_status"
        }
    }

    let channel: String
    let releaseTag: String?
    let appVersion: String
    let appBuildCode: Int
    let commit: String?
    let overallStatus: String
    let publicSurfaces: [String: PublicSurface]
    let knownLimitations: [String]
    let artifacts: [Artifact]

    struct Artifact: Decodable, Equatable {
        let name: String?
        let url: String?
        let sha256: String?
    }

    enum CodingKeys: String, CodingKey {
        case channel, artifacts, commit
        case releaseTag = "release_tag"
        case appVersion = "app_version"
        case appBuildCode = "app_build_code"
        case overallStatus = "overall_status"
        case publicSurfaces = "public_surfaces"
        case knownLimitations = "known_limitations"
    }

    static func load() -> ReleaseMetadata {
        for bundle in candidateBundles {
            let url = bundle.url(forResource: "release-manifest", withExtension: "json", subdirectory: "Release")
                ?? bundle.url(forResource: "release-manifest", withExtension: "json")
            if let url, let data = try? Data(contentsOf: url),
               let metadata = try? JSONDecoder().decode(ReleaseMetadata.self, from: data) {
                return metadata
            }
        }
        return unavailable
    }

    private static var candidateBundles: [Bundle] {
        #if SWIFT_PACKAGE
        [Bundle.module, .main]
        #else
        [.main]
        #endif
    }

    private static var unavailable: ReleaseMetadata {
        ReleaseMetadata(
            channel: "unknown",
            releaseTag: nil,
            appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
            appBuildCode: Int(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") ?? 0,
            commit: nil,
            overallStatus: "METADATA_UNAVAILABLE",
            publicSurfaces: [:],
            knownLimitations: ["Release Metadata 未打包，当前版本状态不可验证"],
            artifacts: []
        )
    }
}
