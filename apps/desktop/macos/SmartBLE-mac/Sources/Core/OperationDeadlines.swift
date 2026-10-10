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

/// User intent never becomes confirmed notification state before the native ACK.
struct NotificationConfirmation {
    private(set) var confirmed: Set<String> = []
    mutating func observe(uuid: String, isNotifying: Bool, succeeded: Bool) {
        guard succeeded else { return }
        if isNotifying { confirmed.insert(uuid.uppercased()) }
        else { confirmed.remove(uuid.uppercased()) }
    }
    mutating func clear() { confirmed.removeAll() }
    func contains(_ uuid: String) -> Bool { confirmed.contains(uuid.uppercased()) }
}
