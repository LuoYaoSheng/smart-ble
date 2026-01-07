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
    dependencies: [],
    targets: [
        .executableTarget(
            name: "SmartBLE-mac",
            dependencies: [],
            path: "Sources",
            sources: [
                "main.swift",
                "Core/BLEManager.swift",
                "UI/MainWindowController.swift",
                "UI/ScanViewController.swift",
                "UI/DeviceDetailViewController.swift",
                "UI/LogViewController.swift"
            ],
            resources: nil,
            swiftSettings: [
                .unsafeFlags(["-parse-as-library"])
            ]
        )
    ]
)
