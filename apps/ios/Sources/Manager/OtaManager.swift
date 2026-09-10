//
//  OtaManager.swift
//  SmartBLE
//

import Foundation
import CoreBluetooth
import SwiftUI
import SmartHidCore

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

    // R-1 契约对齐（docs/specs/06_review/OTA_CONTRACT_R1_R2_DECISION.md）
    private var manifestTarget: String? = nil
    private var manifestVersion: String? = nil
    private var firmwareSha256: String = ""
    /// commit 帧（契约 op 口径 · 常量便于测试断言）
    static let commitFrame = Data(#"{"op":"commit"}"#.utf8)
    
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

            // R-1 契约对齐：sha256 实测 + manifest sidecar（共享 OtaManifest 解析，legacy "version" 兼容）
            self.firmwareSha256 = OtaManifest.sha256Hex(data)
            self.manifestTarget = nil
            self.manifestVersion = nil
            let manifestUrl = url.deletingPathExtension().appendingPathExtension("manifest.json")
            if let mdata = try? Data(contentsOf: manifestUrl),
               let json = (try? JSONSerialization.jsonObject(with: mdata)) as? [String: Any] {
                switch OtaManifest.parse(json, fileSize: data.count, actualSha256: firmwareSha256) {
                case .success(let info):
                    manifestTarget = info.target
                    manifestVersion = info.version
                    if !info.ignoredKeys.isEmpty {
                        Logger.shared.info("manifest 附加字段忽略: \(info.ignoredKeys.joined(separator: ", "))", deviceId: deviceId)
                    }
                case .failure(let err):
                    state.errorMessage = "manifest 校验失败：\(err)"
                    Logger.shared.error(state.errorMessage!, deviceId: deviceId)
                }
            }

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
        
        // 发送开始控制指令（契约 op 口径 · R-1）：op/target/target_version/size/chunk_size/sha256，
        // 无 manifest 契约字段时省略 target/target_version（不伪造枚举，真固件按 missing_target 拒绝）
        let startPayload = OtaStartPayload.build(manifestTarget: manifestTarget, manifestVersion: manifestVersion,
                                                 fileSize: state.fileSize, chunkSize: otaChunkSize, sha256: firmwareSha256)
        if manifestTarget == nil || manifestVersion == nil {
            Logger.shared.warning("OTA start 帧省略 target/target_version（无 manifest 契约字段），真固件将拒绝", deviceId: deviceId)
        }
        guard let startData = try? JSONSerialization.data(withJSONObject: startPayload) else { return }

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
            // 发送完成，发送结束指令（契约 op 口径）
            state.statusMessage = "数据发送完毕，等待设备确认..."
            let commitData = Self.commitFrame

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
        
        ble.writeCharacteristic(
            deviceId: deviceId,
            serviceUUID: service.uuid,
            characteristicUUID: characteristic.uuid,
            data: data,
            withoutResponse: withoutResponse
        )
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
        // 设备订阅通知回调：共享 OtaStatusClassifier 分类（R-2：failed/aborted 不再漏检）
        let frameData = DataConverter.hexToBytes(hexString)
        let text = String(data: frameData, encoding: .utf8) ?? ""
        Logger.shared.receive("OTA回复: \(text)", deviceId: deviceId)

        switch OtaStatusClassifier.classify(frameData) {
        case .success, .ok:
            state.statusMessage = "设备已确认接收成功"
        case .error(let t):
            failOta(reason: "设备报告错误: \(t)")
        case .ready, nil:
            break
        }
    }
}
