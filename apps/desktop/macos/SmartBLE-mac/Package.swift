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
            swiftSettings: [
                .unsafeFlags(["-parse-as-library"])
            ]
        )
    ]
)
