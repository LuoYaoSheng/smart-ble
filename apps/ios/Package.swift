// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SmartBLE",
    defaultLocalization: "zh-Hans",
    platforms: [
        .macOS(.v13),
        .iOS(.v15)
    ],
    products: [
        .executable(
            name: "SmartBLE",
            targets: ["SmartBLE"]
        )
    ],
    dependencies: [
        .package(path: "../../core/apple/SmartHidCore"),
    ],
    targets: [
        .executableTarget(
            name: "SmartBLE",
            dependencies: [
                .product(name: "SmartHidCore", package: "SmartHidCore"),
            ],
            path: "Sources",
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "SmartBLETests",
            dependencies: [
                "SmartBLE",
                .product(name: "SmartHidCore", package: "SmartHidCore"),
            ],
            path: "Tests/SmartBLETests"
        ),
    ]
)
