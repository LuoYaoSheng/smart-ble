//
// QrScannerController.swift — 摄像头二维码扫描（F020 桌面主路径 · AVFoundation）
// 取景器实时预览 + AVCaptureMetadataOutput(.qr) 识别；识别后停止并回调。
// 权限口径：macOS 相机需 TCC 授权（打包链补 NSCameraUsageDescription +
// com.apple.security.device.camera，见 scripts/macos）；未授权/无摄像头 →
// 如实呈现状态并由粘贴/手输兜底接管（不伪造识别）。
//

import Foundation
import AVFoundation
import AppKit

@MainActor
final class QrScannerController: NSObject, ObservableObject {
    enum CameraState: Equatable {
        case idle          // 未启动
        case requesting    // 请求授权中
        case running       // 取景中
        case denied        // 已拒绝/受限
        case unavailable   // 无摄像头/启动失败
    }

    @Published private(set) var cameraState: CameraState = .idle

    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var configured = false
    private var onScanned: ((String) -> Void)?

    /// 在给定视图内启动取景器；识别到二维码后回调（主线程）并自动停止
    func start(in view: NSView, onScanned: @escaping (String) -> Void) {
        self.onScanned = onScanned
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupAndRun(in: view)
        case .notDetermined:
            cameraState = .requesting
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if granted {
                        self.setupAndRun(in: view)
                    } else {
                        self.cameraState = .denied
                    }
                }
            }
        default:
            cameraState = .denied
        }
    }

    func stop() {
        session.stopRunning()
        previewLayer?.removeFromSuperlayer()
        previewLayer = nil
        if cameraState == .running { cameraState = .idle }
    }

    private func setupAndRun(in view: NSView) {
        guard !configured else {
            attachPreview(in: view)
            runSession()
            return
        }
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            cameraState = .unavailable
            return
        }
        session.beginConfiguration()
        guard session.canAddInput(input) else {
            session.commitConfiguration()
            cameraState = .unavailable
            return
        }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else {
            session.commitConfiguration()
            cameraState = .unavailable
            return
        }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = output.availableMetadataObjectTypes.filter { $0 == .qr }
        session.commitConfiguration()
        configured = true

        attachPreview(in: view)
        runSession()
    }

    private func attachPreview(in view: NSView) {
        previewLayer?.removeFromSuperlayer()
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        layer.autoresizingMask = [.layerWidthSizable, .layerHeightSizable]
        view.layer = layer
        view.wantsLayer = true
        previewLayer = layer
    }

    private func runSession() {
        DispatchQueue.global(qos: .userInteractive).async { [weak self] in
            guard let self else { return }
            self.session.startRunning()
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.cameraState = self.session.isRunning ? .running : .unavailable
            }
        }
    }
}

extension QrScannerController: AVCaptureMetadataOutputObjectsDelegate {
    nonisolated func metadataOutput(_ output: AVCaptureMetadataOutput,
                                    didOutput metadataObjects: [AVMetadataObject],
                                    from connection: AVCaptureConnection) {
        guard let obj = metadataObjects.compactMap({ $0 as? AVMetadataMachineReadableCodeObject }).first,
              obj.type == .qr,
              let value = obj.stringValue else { return }
        Task { @MainActor [weak self] in
            guard let self, self.cameraState == .running else { return }
            self.stop()
            self.onScanned?(value)
        }
    }
}
