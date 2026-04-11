//
//  OtaManager.swift
//  SmartBLE
//

import Foundation
import CoreBluetooth
import SwiftUI

/// OTA 状态
struct OtaState {
    var fileUrl: URL? = nil
    var fileName: String? = nil
    var fileSize: Int = 0
    var isInProgress: Bool = false
    var isCompleted: Bool = false
    var sentBytes: Int = 0
    var totalBytes: Int = 0
    var progressPercent: Int = 0
    var statusMessage: String = "未开始 OTA"
    var errorMessage: String? = nil
}

/// 基于 CommandQueue 的单例或按设备实例化的 OTA 管理器
@MainActor
class OtaManager: ObservableObject {
    @Published var state = OtaState()
    
    private let deviceId: String
    private weak var bleManager: BLEManager?
    
    private let otaChunkSize = 180
    private var fileData: Data? = nil
    
    // OTA UUIDs
    private let otaServiceUuid = "4FAFC201-1FB5-459E-8FCC-C5C9C331914D"
    private let charControlUuid = "BEB5483E-36E1-4688-B7F5-EA07361B26C0"
    private let charDataUuid = "BEB5483E-36E1-4688-B7F5-EA07361B26C1"
    private let charStatusUuid = "BEB5483E-36E1-4688-B7F5-EA07361B26C2"
    
    init(deviceId: String, bleManager: BLEManager) {
        self.deviceId = deviceId
        self.bleManager = bleManager
    }
    
    func selectFile(url: URL) {
        do {
            _ = url.startAccessingSecurityScopedResource()
            defer { url.stopAccessingSecurityScopedResource() }
            
            let data = try Data(contentsOf: url)
            self.fileData = data
            
            state.fileUrl = url
            state.fileName = url.lastPathComponent
            state.fileSize = data.count
            state.totalBytes = data.count
            state.sentBytes = 0
            state.progressPercent = 0
            state.statusMessage = "文件已选择: \(state.fileName ?? "") (\(state.fileSize) 字节)"
            state.errorMessage = nil
            state.isInProgress = false
            state.isCompleted = false
            
            Logger.shared.info("已加载 OTA 固件文件: \(state.fileName!)", deviceId: deviceId)
        } catch {
            state.errorMessage = "读取文件失败: \(error.localizedDescription)"
            Logger.shared.error(state.errorMessage!, deviceId: deviceId)
        }
    }
    
    func startOta() {
        guard let data = fileData, data.count > 0 else {
            state.errorMessage = "请先选择合法的固件文件"
            return
        }
        
        state.isInProgress = true
        state.isCompleted = false
        state.sentBytes = 0
        state.errorMessage = nil
        state.statusMessage = "正在初始化 OTA..."
        
        Logger.shared.info("开始 OTA 升级流程...", deviceId: deviceId)
        
        // 申请 MTU 与监听等 (如果 iOS 没自动申请)
        // 发送开始控制指令: JSON格式 {"action":"start","size":...,"chunk_size":...,"firmware_version":"..."}
        let startJson = """
            {"action":"start","size":\(state.fileSize),"chunk_size":\(otaChunkSize),"firmware_version":"iOS-build"}
        """
        guard let startData = startJson.data(using: .utf8) else { return }
        
        sendCommand(uuid: charControlUuid, data: startData) { [weak self] success in
            guard let self = self else { return }
            if success {
                self.state.statusMessage = "下发分包数据中..."
                self.sendNextChunk(offset: 0)
            } else {
                self.failOta(reason: "发送 OTA 控制指令失败")
            }
        }
    }
    
    func cancelOta() {
        if state.isInProgress {
            state.isInProgress = false
            state.statusMessage = "已取消 OTA"
            Logger.shared.warning("用户取消了 OTA 升级", deviceId: deviceId)
            
            // 可以发送中止指令 [0x03] 等等
        }
    }
    
    private func sendNextChunk(offset: Int) {
        guard state.isInProgress, let data = fileData else { return }
        
        if offset >= data.count {
            // 发送完成，发送结束指令: JSON格式 {"action":"commit"}
            state.statusMessage = "数据发送完毕，等待设备确认..."
            let commitJson = """
                {"action":"commit"}
            """
            guard let commitData = commitJson.data(using: .utf8) else { return }
            
            sendCommand(uuid: charControlUuid, data: commitData) { [weak self] success in
                guard let self = self else { return }
                if success {
                    self.completeOta()
                } else {
                    self.failOta(reason: "发送结束指令失败")
                }
            }
            return
        }
        
        let chunkEnd = min(offset + otaChunkSize, data.count)
        let chunkData = data.subdata(in: offset..<chunkEnd)
        
        sendCommand(uuid: charDataUuid, data: chunkData, withoutResponse: true) { [weak self] success in
            guard let self = self else { return }
            if success {
                DispatchQueue.main.async {
                    self.state.sentBytes = chunkEnd
                    self.state.progressPercent = Int((Double(self.state.sentBytes) / Double(self.state.totalBytes)) * 100)
                    
                    // 递归发送下一包，为了避免爆栈，使用少许延时或 async
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.02) {
                        self.sendNextChunk(offset: chunkEnd)
                    }
                }
            } else {
                self.failOta(reason: "分包发送失败，偏移: \(offset)")
            }
        }
    }
    
    private func sendCommand(uuid: String, bytes: [UInt8], withoutResponse: Bool = false, completion: @escaping (Bool) -> Void) {
        sendCommand(uuid: uuid, data: Data(bytes), withoutResponse: withoutResponse, completion: completion)
    }
    
    private func sendCommand(uuid: String, data: Data, withoutResponse: Bool = false, completion: @escaping (Bool) -> Void) {
        guard let ble = bleManager else {
            completion(false)
            return
        }
        
        // 查找 Service 和 Characteristic
        guard let service = ble.services.first(where: { $0.uuid.uppercased() == otaServiceUuid.uppercased() }),
              let characteristic = service.characteristics.first(where: { $0.uuid.uppercased() == uuid.uppercased() }) else {
            Logger.shared.error("未找到 OTA 服务或特征值", deviceId: deviceId)
            completion(false)
            return
        }
        
        ble.writeValue(
            hexString: data.map { String(format: "%02hhx", $0) }.joined(),
            to: characteristic.uuid, // Use characteristic UUID
            serviceUuid: service.uuid,
            type: withoutResponse ? .withoutResponse : .withResponse
        )
        // 假设同步执行写入进队列
        completion(true)
    }
    
    private func completeOta() {
        state.isInProgress = false
        state.isCompleted = true
        state.statusMessage = "OTA 升级成功！"
        Logger.shared.success("OTA 固件传送已全部完成！", deviceId: deviceId)
    }
    
    private func failOta(reason: String) {
        state.isInProgress = false
        state.errorMessage = reason
        state.statusMessage = "OTA 失败"
        Logger.shared.error("OTA 失败: \(reason)", deviceId: deviceId)
    }
    
    func handleOtaStatusResponse(_ hexString: String) {
        // 类似 Android 的 applyOtaStatusPayload，针对设备的订阅通知回调，例如设备校验失败或升级百分比提示
        let text = String(data: DataConverter.hexToBytes(hexString), encoding: .utf8) ?? ""
        Logger.shared.receive("OTA回复: \(text)", deviceId: deviceId)
        
        if text.contains("success") || text.contains("OK") {
            state.statusMessage = "设备已确认接收成功"
        } else if text.contains("error") || text.contains("fail") {
            failOta(reason: "设备报告错误: \(text)")
        }
    }
}
