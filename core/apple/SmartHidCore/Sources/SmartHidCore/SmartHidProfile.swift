public enum SmartHidProfile {
    public enum MatchLevel: String, Equatable, Sendable {
        case strong
        case weak
    }

    public static func match(name: String, serviceUUIDs: [String]) -> MatchLevel? {
        if serviceUUIDs.contains(where: { $0.caseInsensitiveCompare(HidProtocol.serviceUuid) == .orderedSame }) {
            return .strong
        }
        if name.uppercased().hasPrefix(HidProtocol.namePrefix) {
            return .weak
        }
        return nil
    }
}
