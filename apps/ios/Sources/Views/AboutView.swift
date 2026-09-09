import SwiftUI

struct AboutView: View {
    @State private var versionRoute: AboutVersionRoute?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                heroCard
                sectionCard(title: "产品定位") {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Smart BLE 是跨平台 BLE 控制台与统一协议内核，不是单一端上的小工具。")
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Text("它把扫描、连接、读写特征值、通知监听、广播模式和硬件联动收进同一套工作流里，既适合现场调试，也适合作为多平台 BLE 参考实现。")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                sectionCard(title: "核心能力") {
                    VStack(spacing: 14) {
                        FeatureRow(icon: "dot.radiowaves.left.and.right", title: "设备扫描", text: "快速发现附近 BLE 设备并实时展示 RSSI 状态")
                        FeatureRow(icon: "link", title: "连接与服务发现", text: "建立会话后继续查看服务树和特征值层级")
                        FeatureRow(icon: "arrow.up.arrow.down", title: "读写与监听", text: "支持 HEX / UTF-8 写入、读取和通知订阅")
                        FeatureRow(icon: "dot.radiowaves.up.forward", title: "广播模式", text: "验证设备名称、UUID 与广播载荷的配置效果")
                        FeatureRow(icon: "cpu", title: "硬件联动", text: "与 ESP32 / 固件示例配套使用，形成协议验证闭环")
                    }
                }

                sectionCard(title: "平台矩阵") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            PlatformChip(icon: "iphone", label: "iOS")
                            PlatformChip(icon: "laptopcomputer", label: "macOS")
                            PlatformChip(icon: "desktopcomputer", label: "Windows")
                            PlatformChip(icon: "antenna.radiowaves.left.and.right", label: "UniApp")
                            PlatformChip(icon: "swift", label: "Native")
                            PlatformChip(icon: "cpu", label: "Hardware")
                        }
                    }
                }

                sectionCard(title: "相关链接") {
                    VStack(spacing: 12) {
                        LinkRow(icon: "globe", title: "项目主页", subtitle: "查看平台矩阵、下载入口与架构说明", url: "https://lightble.i2kai.com/")
                        ActionLinkRow(icon: "clock.arrow.circlepath", title: "版本记录", subtitle: "查看 Release Metadata 与当前限制") {
                            versionRoute = AboutVersionRoute(id: "versions")
                        }
                        LinkRow(icon: "square.stack.3d.up", title: "架构白皮书", subtitle: "统一协议内核、组件拆分与交互流规范", url: "https://lightble.i2kai.com/MASTER_ARCHITECTURE")
                        LinkRow(icon: "chevron.left.forwardslash.chevron.right", title: "源码仓库", subtitle: "查看全部平台实现与共享资产生成器", url: "https://github.com/luoyaosheng/smart-ble")
                        LinkRow(icon: "ladybug", title: "问题反馈", subtitle: "提交 issue 或查看已知问题", url: "https://github.com/luoyaosheng/smart-ble/issues")
                    }
                }

                Text("© 2026 Smart BLE\nReleased under MIT License")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)
            }
            .padding()
            .frame(maxWidth: 860)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                colors: [Color(red: 0.96, green: 0.98, blue: 1.0), Color(red: 0.93, green: 0.96, blue: 1.0)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
        )
        .nativePageCover(item: $versionRoute) { _ in
            VersionHistoryView()
        }
    }

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            brandHeroImage
                .resizable()
                .scaledToFill()
                .frame(height: 220)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 24))

            HStack(spacing: 16) {
                brandIconImage
                    .resizable()
                    .scaledToFill()
                    .frame(width: 68, height: 68)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .shadow(color: .blue.opacity(0.16), radius: 12, y: 8)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Smart BLE")
                        .font(.system(size: 30, weight: .bold))
                    Text("原生 Apple 运行面")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.blue)
                }
                Spacer()
            }

            HStack(spacing: 10) {
                MetaChip(text: "Version 2.0.0")
                MetaChip(text: "SwiftUI")
                MetaChip(text: "CoreBluetooth")
            }

            Text("跨平台 BLE 控制台与统一协议内核，用原生 Apple 体验承接扫描、连接、广播和设备调试。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 28)
                .fill(
                    LinearGradient(
                        colors: [Color.white.opacity(0.98), Color(red: 0.95, green: 0.98, blue: 1.0)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 28)
                .stroke(Color.blue.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.05), radius: 18, y: 10)
    }

    private func sectionCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title3.weight(.bold))
            content()
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(Color.white.opacity(0.94))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.blue.opacity(0.06), lineWidth: 1)
        )
    }
}

private struct AboutVersionRoute: Identifiable {
    let id: String
}

private extension AboutView {
    var brandHeroImage: Image {
        #if SWIFT_PACKAGE
        Image("about_hero", bundle: .module)
        #else
        Image("AboutHero")
        #endif
    }

    var brandIconImage: Image {
        #if SWIFT_PACKAGE
        Image("brand_icon", bundle: .module)
        #else
        Image("BrandIcon")
        #endif
    }
}

private struct FeatureRow: View {
    let icon: String
    let title: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 42, height: 42)
                Image(systemName: icon)
                    .foregroundStyle(.blue)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(text)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()
        }
    }
}

private struct PlatformChip: View {
    let icon: String
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
            Text(label)
                .font(.caption.weight(.semibold))
        }
        .foregroundStyle(.blue)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Capsule().fill(Color.blue.opacity(0.08)))
    }
}

private struct MetaChip: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.blue)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Capsule().fill(Color.blue.opacity(0.08)))
    }
}

private struct LinkRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let url: String

    var body: some View {
        Link(destination: URL(string: url)!) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.blue.opacity(0.1))
                        .frame(width: 42, height: 42)
                    Image(systemName: icon)
                        .foregroundStyle(.blue)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()

                Image(systemName: "arrow.up.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}

private struct ActionLinkRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.blue.opacity(0.1))
                        .frame(width: 42, height: 42)
                    Image(systemName: icon).foregroundStyle(.blue)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                    Text(subtitle).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}
