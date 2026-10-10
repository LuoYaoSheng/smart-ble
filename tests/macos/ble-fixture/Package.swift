// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ble-fixture",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "ble-fixture", targets: ["ble-fixture"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "ble-fixture",
            dependencies: [],
            path: "Sources"
        )
    ]
)
