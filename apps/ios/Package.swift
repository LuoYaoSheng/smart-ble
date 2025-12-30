// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SmartBLE",
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
    dependencies: [],
    targets: [
        .executableTarget(
            name: "SmartBLE",
            dependencies: [],
            path: "Sources"
        )
    ]
)
