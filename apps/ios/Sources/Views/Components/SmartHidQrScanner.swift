import SmartHidCore
import SwiftUI

#if os(iOS)
import AVFoundation
import UIKit
#endif

struct SmartHidQrScanner: View {
    @Environment(\.dismiss) private var dismiss
    @State private var pastedValue = ""
    @State private var scannerMessage = "将二维码对准取景框"
    let onCode: (String) -> Bool

    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                NativeQrCameraView(
                    onCode: handle,
                    onUnavailable: { scannerMessage = $0 }
                )
                .frame(height: 260)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(NativeDS.line))

                Text(scannerMessage)
                    .font(.footnote)
                    .foregroundColor(NativeDS.muted)

                VStack(alignment: .leading, spacing: 8) {
                    Text("无法扫码？粘贴配对码")
                        .font(.headline)
                    TextField("shid://pair?token=…&host=…", text: $pastedValue)
                        .textFieldStyle(.roundedBorder)
                    Button("解析并回填") {
                        _ = handle(pastedValue)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(pastedValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .nativeCard()

                Spacer()
            }
            .padding(16)
            .background(NativeDS.page.ignoresSafeArea())
            .navigationTitle("扫描 ControlHub 配对码")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
            }
        }
    }

    @discardableResult
    private func handle(_ raw: String) -> Bool {
        let accepted = onCode(raw)
        if accepted {
            scannerMessage = "配对码已获取"
            dismiss()
        } else {
            scannerMessage = "二维码无效：需要完整的 shid://pair 配对码"
        }
        return accepted
    }
}

#if os(iOS)
private struct NativeQrCameraView: UIViewControllerRepresentable {
    let onCode: (String) -> Bool
    let onUnavailable: (String) -> Void

    func makeUIViewController(context: Context) -> NativeQrScannerViewController {
        NativeQrScannerViewController(onCode: onCode, onUnavailable: onUnavailable)
    }

    func updateUIViewController(_ uiViewController: NativeQrScannerViewController, context: Context) {}
}

private final class NativeQrScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    private let session = AVCaptureSession()
    private let onCode: (String) -> Bool
    private let onUnavailable: (String) -> Void
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var configured = false

    init(onCode: @escaping (String) -> Bool, onUnavailable: @escaping (String) -> Void) {
        self.onCode = onCode
        self.onUnavailable = onUnavailable
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        authorizeAndStart()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if session.isRunning { session.stopRunning() }
    }

    private func authorizeAndStart() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configureAndStart()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.configureAndStart()
                    } else {
                        self?.onUnavailable("相机权限被拒绝，可在系统设置开启或粘贴配对码")
                    }
                }
            }
        default:
            onUnavailable("相机权限不可用，可在系统设置开启或粘贴配对码")
        }
    }

    private func configureAndStart() {
        if !configured {
            guard let camera = AVCaptureDevice.default(for: .video),
                  let input = try? AVCaptureDeviceInput(device: camera),
                  session.canAddInput(input) else {
                onUnavailable("当前设备没有可用相机，请粘贴配对码")
                return
            }
            let output = AVCaptureMetadataOutput()
            guard session.canAddOutput(output) else {
                onUnavailable("无法启动二维码识别，请粘贴配对码")
                return
            }
            session.addInput(input)
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]

            let preview = AVCaptureVideoPreviewLayer(session: session)
            preview.videoGravity = .resizeAspectFill
            view.layer.addSublayer(preview)
            previewLayer = preview
            configured = true
        }
        if !session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.session.startRunning()
            }
        }
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = object.stringValue else { return }
        if onCode(value) {
            session.stopRunning()
        }
    }
}
#else
private struct NativeQrCameraView: View {
    let onCode: (String) -> Bool
    let onUnavailable: (String) -> Void

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "qrcode.viewfinder")
                .font(.system(size: 48))
            Text("相机扫码仅在 iOS 真机可用")
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear { onUnavailable("当前运行环境不支持相机，请粘贴配对码") }
    }
}
#endif
