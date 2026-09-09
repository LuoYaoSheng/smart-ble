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
        )
    ]
)
