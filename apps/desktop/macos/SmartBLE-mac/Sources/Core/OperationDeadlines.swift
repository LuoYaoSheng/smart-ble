import Foundation

/// A deadline belongs to one request token. Cancellation or reusing the same
/// characteristic key cannot let an old timer expire the replacement request.
@MainActor
final class OperationDeadlines {
    private struct Entry {
        let token: UUID
        let work: DispatchWorkItem
    }
    private var entries: [String: Entry] = [:]

    @discardableResult
    func begin(key: String, timeout: TimeInterval, onTimeout: @escaping () -> Void) -> Bool {
        guard entries[key] == nil else { return false }
        let token = UUID()
        let work = DispatchWorkItem { [weak self] in
            Task { @MainActor in
                guard let self, self.entries[key]?.token == token else { return }
                self.entries.removeValue(forKey: key)
                onTimeout()
            }
        }
        entries[key] = Entry(token: token, work: work)
        DispatchQueue.main.asyncAfter(deadline: .now() + timeout, execute: work)
        return true
    }

    @discardableResult
    func complete(key: String) -> Bool {
        guard let entry = entries.removeValue(forKey: key) else { return false }
        entry.work.cancel()
        return true
    }

    func cancelAll() {
        entries.values.forEach { $0.work.cancel() }
        entries.removeAll()
    }
}

/// Canonical GATT identity within one device session. A characteristic UUID
/// alone is insufficient when multiple services expose that same UUID.
struct GattCharacteristicAddress: Hashable {
    let serviceUUID: String
    let characteristicUUID: String
    init(serviceUUID: String, characteristicUUID: String) {
        self.serviceUUID = Self.canonicalUUID(serviceUUID)
        self.characteristicUUID = Self.canonicalUUID(characteristicUUID)
    }
    static func canonicalUUID(_ value: String) -> String {
        let upper = value.uppercased()
        if (upper.count == 4 || upper.count == 8) && upper.allSatisfy({ $0.isASCII && $0.isHexDigit }) {
            let prefix = String(repeating: "0", count: 8 - upper.count) + upper
            return "\(prefix)-0000-1000-8000-00805F9B34FB"
        }
        return upper
    }
    var key: String { "\(serviceUUID):\(characteristicUUID)" }
}

/// User intent never becomes confirmed notification state before the native ACK.
struct NotificationConfirmation {
    private(set) var confirmed: Set<GattCharacteristicAddress> = []
    mutating func observe(address: GattCharacteristicAddress, isNotifying: Bool, succeeded: Bool) {
        guard succeeded else { return }
        if isNotifying { confirmed.insert(address) }
        else { confirmed.remove(address) }
    }
    mutating func clear() { confirmed.removeAll() }
    func contains(_ address: GattCharacteristicAddress) -> Bool { confirmed.contains(address) }
}
