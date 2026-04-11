//
//  OtaUpgradeDialog.swift
//  SmartBLE
//

import SwiftUI
import UniformTypeIdentifiers

struct OtaUpgradeDialog: View {
    @StateObject var otaManager: OtaManager
    @Binding var isPresented: Bool
    @State private var showingFilePicker = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("OTA 固件升级")
                    .font(.headline)
                Spacer()
                Button(action: {
                    if otaManager.state.isInProgress {
                        otaManager.cancelOta()
                    }
                    isPresented = false
                }) {
                    Image(systemName: "xmark")
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            
            Divider()
            
            // Content
            VStack(alignment: .leading, spacing: 20) {
                // File Selection
                VStack(alignment: .leading, spacing: 10) {
                    Text("选择固件文件 (.bin)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        if let fileName = otaManager.state.fileName {
                            Image(systemName: "doc.fill")
                                .foregroundColor(.blue)
                            Text(fileName)
                                .lineLimit(1)
                            Spacer()
                            Text("\(Double(otaManager.state.fileSize) / 1024.0, specifier: "%.1f") KB")
                                .font(.caption)
                                .foregroundColor(.gray)
                        } else {
                            Text("未选择文件")
                                .foregroundColor(.gray)
                            Spacer()
                        }
                        
                        Button("浏览...") {
                            showingFilePicker = true
                        }
                        .disabled(otaManager.state.isInProgress)
                        .buttonStyle(.bordered)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(.systemGray4), lineWidth: 1)
                    )
                }
                
                // Progress
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("当前状态")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("\(otaManager.state.progressPercent)%")
                            .font(.headline)
                            .foregroundColor(otaManager.state.isCompleted ? .green : .blue)
                    }
                    
                    ProgressView(value: Double(otaManager.state.progressPercent), total: 100)
                        .tint(otaManager.state.isCompleted ? .green : .blue)
                    
                    HStack {
                        Text(otaManager.state.statusMessage)
                            .font(.caption)
                            .foregroundColor(otaManager.state.isCompleted ? .green : .primary)
                        
                        if let error = otaManager.state.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                        
                        Spacer()
                        Text("\(otaManager.state.sentBytes) / \(otaManager.state.totalBytes) B")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding()
            
            Divider()
            
            // Footer
            HStack(spacing: 16) {
                if otaManager.state.isInProgress {
                    Button(action: {
                        otaManager.cancelOta()
                    }) {
                        Text("取消升级")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                } else {
                    Button(action: {
                        otaManager.startOta()
                    }) {
                        Text("开始 OTA 升级")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(otaManager.state.fileUrl == nil)
                }
            }
            .padding()
        }
        .frame(maxWidth: 400)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .shadow(radius: 10)
        .fileImporter(
            isPresented: $showingFilePicker,
            allowedContentTypes: [UTType.data],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                if let url = urls.first {
                    otaManager.selectFile(url: url)
                }
            case .failure(let error):
                print("Failed to select file: \(error.localizedDescription)")
            }
        }
    }
}
