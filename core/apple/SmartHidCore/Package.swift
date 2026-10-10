// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SmartHidCore",
    platforms: [
        .macOS(.v13),
        .iOS(.v15),
    ],
    products: [
        .library(name: "SmartHidCore", targets: ["SmartHidCore"]),
    ],
    targets: [
        .target(name: "SmartHidCore"),
        .testTarget(
            name: "SmartHidCoreTests",
            dependencies: ["SmartHidCore"]
        ),
    ]
)
