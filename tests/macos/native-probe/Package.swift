// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "native-probe",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "native-probe", targets: ["native-probe"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "native-probe",
            dependencies: [],
            path: "Sources"
        )
    ]
)
