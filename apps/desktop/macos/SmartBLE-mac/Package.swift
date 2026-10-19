// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SmartBLE-mac",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "SmartBLE-mac", targets: ["SmartBLE-mac"])
    ],
    dependencies: [
        .package(path: "../../../../core/apple/SmartHidCore"),
    ],
    targets: [
        .executableTarget(
            name: "SmartBLE-mac",
            dependencies: [
                .product(name: "SmartHidCore", package: "SmartHidCore"),
            ],
            path: "Sources",
            resources: [
                .process("Resources")
            ],
            swiftSettings: [
                .unsafeFlags(["-parse-as-library"])
            ]
        ),
        // MAC-007：纯逻辑与页面契约测试 target（不依赖 GUI/真实 BLE；
        // 深度验证仍由 scripts/macos/verify-native-macos.sh 承担）。
        .testTarget(
            name: "SmartBLEMacTests",
            dependencies: ["SmartBLE-mac"],
            path: "Tests/SmartBLEMacTests"
        )
    ]
)
