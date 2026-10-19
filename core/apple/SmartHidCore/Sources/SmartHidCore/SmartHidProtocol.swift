import Foundation

public enum HidProtocol {
    public static let serviceUuid = "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04"
    public static let infoCharUuid = "9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04"
    public static let inputCharUuid = "9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04"
    public static let statusCharUuid = "9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04"
    public static let namePrefix = "SHID-"
    public static let protocolVersion = "1.0"
    public static let candidateVersion = 1
    public static let deviceIdPattern = "^HID-[A-Z0-9]{8}$"
    public static let deviceNamePattern = "^SHID-[A-Z0-9]{6,8}$"
    public static let tokenPattern = "^[0-9a-f]{32}$"
    public static let qrScheme = "shid://pair"
    public static let defaultPairingPort = 17_892

    public struct PairingQr: Equatable, Sendable {
        public let token: String
        public let host: String
        public let port: Int

        public init(token: String, host: String, port: Int) {
            self.token = token
            self.host = host
            self.port = port
        }
    }

    public enum CandidateError: Error, LocalizedError, Equatable, Sendable {
        case ssidEmpty
        case ssidTooLong
        case passwordTooLong
        case hostInvalid
        case portInvalid
        case tokenInvalid

        public var errorDescription: String? {
            switch self {
            case .ssidEmpty:
                return "wifi_ssid 不能为空"
            case .ssidTooLong:
                return "wifi_ssid 超长（≤32 字符）"
            case .passwordTooLong:
                return "wifi_password 超长（≤64 字符）"
            case .hostInvalid:
                return "hub_host 非法（请检查配对二维码）"
            case .portInvalid:
                return "hub_port 非法"
            case .tokenInvalid:
                return "token 形态非法（需 32 位小写十六进制）"
            }
        }
    }

    public struct DeviceInfo: Equatable, Sendable {
        public let product: String
        public let protocolVersion: String
        public let deviceId: String
        public let firmware: String
        public let state: String
        public let provisioned: Bool

        public init(
            product: String,
            protocolVersion: String,
            deviceId: String,
            firmware: String,
            state: String,
            provisioned: Bool
        ) {
            self.product = product
            self.protocolVersion = protocolVersion
            self.deviceId = deviceId
            self.firmware = firmware
            self.state = state
            self.provisioned = provisioned
        }
    }

    public struct ProvisionStatus: Equatable, Sendable {
        public let state: String
        public let step: String
        public let error: String?

        public init(state: String, step: String, error: String?) {
            self.state = state
            self.step = step
            self.error = error
        }
    }

    public static func parsePairingQr(_ raw: String) -> PairingQr? {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard value.lowercased().hasPrefix(qrScheme) else { return nil }

        let suffix = String(value.dropFirst(qrScheme.count))
        guard suffix.isEmpty || suffix.first == "?" || suffix.first == "&" else { return nil }
        let query = suffix.isEmpty ? "" : String(suffix.dropFirst())
        var parameters: [String: String] = [:]

        for pair in query.split(separator: "&", omittingEmptySubsequences: true) {
            guard let equals = pair.firstIndex(of: "="), equals != pair.startIndex else { return nil }
            let key = String(pair[..<equals]).lowercased()
            guard parameters[key] == nil else { return nil }
            let encoded = String(pair[pair.index(after: equals)...])
            guard let decoded = encoded.removingPercentEncoding else { return nil }
            parameters[key] = decoded
        }

        let token = (parameters["token"] ?? "").lowercased()
        let host = (parameters["host"] ?? "").trimmingCharacters(in: .whitespaces)
        guard matches(token, pattern: tokenPattern), isValidHost(host) else { return nil }

        let port: Int
        if let rawPort = parameters["port"], !rawPort.isEmpty {
            guard let parsed = Int(rawPort), (1...65_535).contains(parsed) else { return nil }
            port = parsed
        } else {
            port = defaultPairingPort
        }
        return PairingQr(token: token, host: host, port: port)
    }

    public static func parseHubAddress(_ raw: String) -> (host: String, port: Int)? {
        let value = raw.trimmingCharacters(in: .whitespaces)
        guard !value.isEmpty else { return nil }
        guard let colon = value.lastIndex(of: ":") else {
            return isValidHost(value) ? (value, defaultPairingPort) : nil
        }

        let host = String(value[..<colon])
        let portString = String(value[value.index(after: colon)...])
        guard isValidHost(host), let port = Int(portString), (1...65_535).contains(port) else { return nil }
        return (host, port)
    }

    public static func buildCandidateJson(
        ssid: String,
        password: String,
        hubHost: String,
        hubPort: Int?,
        token: String
    ) throws -> String {
        let normalizedSsid = ssid.trimmingCharacters(in: .whitespaces)
        let normalizedHost = hubHost.trimmingCharacters(in: .whitespaces)
        let normalizedToken = token.trimmingCharacters(in: .whitespaces).lowercased()
        let normalizedPort = hubPort ?? defaultPairingPort

        guard !normalizedSsid.isEmpty else { throw CandidateError.ssidEmpty }
        guard normalizedSsid.count <= 32 else { throw CandidateError.ssidTooLong }
        guard password.count <= 64 else { throw CandidateError.passwordTooLong }
        guard isValidHost(normalizedHost) else { throw CandidateError.hostInvalid }
        guard (1...65_535).contains(normalizedPort) else { throw CandidateError.portInvalid }
        guard matches(normalizedToken, pattern: tokenPattern) else { throw CandidateError.tokenInvalid }

        return "{\"v\":\(candidateVersion),"
            + "\"wifi_ssid\":\(try quotedJson(normalizedSsid)),"
            + "\"wifi_password\":\(try quotedJson(password)),"
            + "\"hub_host\":\(try quotedJson(normalizedHost)),"
            + "\"hub_port\":\(normalizedPort),"
            + "\"token\":\(try quotedJson(normalizedToken))}"
    }

    public static func buildCandidateJson(
        ssid: String,
        password: String,
        hubAddress: String,
        token: String
    ) throws -> String {
        guard let hub = parseHubAddress(hubAddress) else { throw CandidateError.hostInvalid }
        return try buildCandidateJson(
            ssid: ssid,
            password: password,
            hubHost: hub.host,
            hubPort: hub.port,
            token: token
        )
    }

    public static func parseDeviceInfo(_ text: String) -> DeviceInfo? {
        guard let object = try? JSONSerialization.jsonObject(with: Data(text.utf8)),
              let dictionary = object as? [String: Any],
              let deviceId = dictionary["device_id"] as? String,
              !deviceId.isEmpty else { return nil }

        return DeviceInfo(
            product: dictionary["product"] as? String ?? "",
            protocolVersion: dictionary["protocol"] as? String ?? "",
            deviceId: deviceId,
            firmware: dictionary["firmware"] as? String ?? "",
            state: dictionary["state"] as? String ?? "",
            provisioned: dictionary["provisioned"] as? Bool ?? false
        )
    }

    public static func parseProvisionStatus(_ text: String) -> ProvisionStatus? {
        guard let object = try? JSONSerialization.jsonObject(with: Data(text.utf8)),
              let dictionary = object as? [String: Any] else { return nil }
        return ProvisionStatus(
            state: dictionary["state"] as? String ?? "",
            step: dictionary["step"] as? String ?? "",
            error: dictionary["error"] as? String
        )
    }

    public static func verifyIdentity(_ info: DeviceInfo) -> Bool {
        info.product == "smart-hid"
            && info.protocolVersion == protocolVersion
            && matches(info.deviceId, pattern: deviceIdPattern)
    }

    private static func isValidHost(_ host: String) -> Bool {
        !host.isEmpty && host.range(of: #"[\s/]"#, options: .regularExpression) == nil
    }

    private static func matches(_ value: String, pattern: String) -> Bool {
        value.range(of: pattern, options: .regularExpression) != nil
    }

    private static func quotedJson(_ value: String) throws -> String {
        let data = try JSONSerialization.data(withJSONObject: [value])
        guard let array = String(data: data, encoding: .utf8), array.count >= 2 else {
            throw CandidateError.hostInvalid
        }
        return String(array.dropFirst().dropLast())
    }
}
