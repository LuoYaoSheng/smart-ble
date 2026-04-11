//
// SmartBLE - Command Queue (iOS)
//

import Foundation
import CoreBluetooth

/// 指令状态
enum CommandStatus: String {
    case pending = "pending"
    case sending = "sending"
    case success = "success"
    case failed = "failed"
}

/// 指令队列项
struct CommandItem: Identifiable {
    let id: String
    let deviceId: String
    let serviceUuid: String
    let characteristicUuid: String
    let data: Data
    let withoutResponse: Bool
    let displayHex: String
    
    var status: CommandStatus = .pending
    var error: String? = nil
    var sentAt: Date? = nil
}

/// 指令发送回调 (Send Closure)
typealias CommandSender = (CommandItem) async throws -> Void

/// BLE 指令队列管理器
@MainActor
class CommandQueue: ObservableObject {
    @Published private(set) var queue: [CommandItem] = []
    @Published private(set) var history: [CommandItem] = []
    
    @Published var isRunning: Bool = false
    @Published var isPaused: Bool = false
    @Published var isLooping: Bool = false
    
    @Published var targetLoopCount: Int = 0
    @Published var currentLoop: Int = 0
    
    var intervalMs: Int = 50
    
    private let sender: CommandSender
    private var loopTemplate: [CommandItem]? = nil
    
    // Callbacks
    var onCommandStart: ((CommandItem) -> Void)?
    var onCommandComplete: ((CommandItem) -> Void)?
    var onCommandError: ((CommandItem) -> Void)?
    var onQueueEmpty: (() -> Void)?
    
    init(intervalMs: Int = 50, sender: @escaping CommandSender) {
        self.intervalMs = intervalMs
        self.sender = sender
    }
    
    var pendingCount: Int {
        return queue.count
    }
    
    func enqueue(_ command: CommandItem) {
        queue.append(command)
        startProcessing()
    }
    
    func enqueueBatch(_ commands: [CommandItem]) {
        queue.append(contentsOf: commands)
        startProcessing()
    }
    
    func startLoop(_ commands: [CommandItem], loopCount: Int = 0) {
        stopLoop()
        isLooping = true
        targetLoopCount = loopCount
        currentLoop = 0
        loopTemplate = commands
        enqueueNextLoop()
    }
    
    func stopLoop() {
        isLooping = false
        loopTemplate = nil
        targetLoopCount = 0
        currentLoop = 0
    }
    
    func pause() {
        isPaused = true
    }
    
    func resume() {
        isPaused = false
        startProcessing()
    }
    
    func clear() {
        queue.removeAll()
        stopLoop()
        isRunning = false
        isPaused = false
    }
    
    func clearHistory() {
        history.removeAll()
    }
    
    private func startProcessing() {
        if isRunning || isPaused || queue.isEmpty {
            return
        }
        isRunning = true
        Task {
            await processNext()
        }
    }
    
    private func processNext() async {
        if isPaused || queue.isEmpty {
            isRunning = false
            if queue.isEmpty && !isLooping {
                onQueueEmpty?()
            }
            if queue.isEmpty && isLooping {
                enqueueNextLoop()
                if !queue.isEmpty {
                    await processNext()
                } else {
                    isRunning = false
                }
            }
            return
        }
        
        var command = queue.removeFirst()
        command.status = .sending
        command.sentAt = Date()
        self.onCommandStart?(command)
        
        do {
            try await sender(command)
            command.status = .success
            self.onCommandComplete?(command)
        } catch {
            command.status = .failed
            command.error = error.localizedDescription
            self.onCommandError?(command)
        }
        
        history.append(command)
        
        if !queue.isEmpty || isLooping {
            try? await Task.sleep(nanoseconds: UInt64(intervalMs) * 1_000_000)
            await processNext()
        } else {
            isRunning = false
            self.onQueueEmpty?()
        }
    }
    
    private func enqueueNextLoop() {
        guard isLooping, let template = loopTemplate else { return }
        
        if targetLoopCount > 0 && currentLoop >= targetLoopCount {
            isLooping = false
            loopTemplate = nil
            onQueueEmpty?()
            return
        }
        
        currentLoop += 1
        
        let newCommands = template.map { item in
            CommandItem(
                id: "\(item.id)_loop\(currentLoop)",
                deviceId: item.deviceId,
                serviceUuid: item.serviceUuid,
                characteristicUuid: item.characteristicUuid,
                data: item.data,
                withoutResponse: item.withoutResponse,
                displayHex: item.displayHex
            )
        }
        
        queue.append(contentsOf: newCommands)
    }
}
