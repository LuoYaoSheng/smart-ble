# Electron native BLE dependencies

Electron remains pinned to 44.7.0, with renderer sandbox and context isolation enabled.

The application keeps the `@abandonware/noble` import name as an exact npm alias to maintained `@stoprocent/noble@2.8.0`. This supplies CoreBluetooth and WinRT N-API bindings, with the Windows native target compiled in standard C++20 mode without `/await`. Its Linux HCI socket dependency is pinned to `@stoprocent/bluetooth-hci-socket@2.3.0`. This fork implements the same socket API used by noble (`bindRaw`, `bindUser`, `start`, `stop`, `isDevUp`, `write`, `setFilter`, EventEmitter data/error), using N-API instead of NAN/V8 APIs. It also retains the optional USB transport.

The legacy HCI dependency's locked NAN 2.24 does not compile against Electron 44's V8 15.2: `External::Value`, internal field pointer access and property accessors changed. Skipping native rebuilds would leave Linux without its real BLE backend. The alias keeps native rebuilding enabled and removes that V8 ABI dependency.

`node-gyp` is explicitly pinned to 12.4.0 for install scripts and overridden throughout the dependency tree. The previous root version 10.3.1 did not recognize Visual Studio 18/2026 on current Windows builders. Version 12.4 recognizes that toolchain. The Windows WinRT backend itself continues to use N-API. The maintained backend uses `/std:c++20`; this fixes deprecated experimental-coroutine mode rather than adding warning suppression to the application.

After changing these versions, use a clean `npm ci`, build on Linux and Windows, and check loading the native bindings under the target Electron runtime. Compilation and API checks do not replace real adapter/GATT verification.

Native installs run with project `foreground-scripts=true`, and Electron rebuilds explicitly use `nativeRebuilder: sequential`. Multiple addons reference the same `node-addon-api/nothing` gyp target; concurrent install scripts can delete or write its shared output at the same time. Keep lifecycle scripts enabled, but serialize them.

The UI and application product name remain `BLE Toolkit+`. Linux's executable/product filename is `smart-ble-open`; installer artifacts use the ASCII-safe `Smart-BLE-Open-<version>-<os>-<arch>.<ext>` pattern. AppImage's filename validation rejects `+`, so the executable filename is configured separately from the displayed product name.

Windows NSIS and portable outputs use target-specific `-setup.exe` and `-portable.exe` suffixes. Their default extensions are both `.exe`, so the global artifact pattern alone would overwrite one output with the other.

For macOS universal builds, `x64ArchFiles` is limited to the named dependencies’ already-fat `prebuilds/darwin-x64+arm64/*.node` files. `afterPack` checks that every such retained prebuild actually contains x86_64 and arm64 slices. After both packages merge, `afterAllArtifactBuild` verifies the main executable and all packaged Darwin native modules have both slices and loads the packaged CoreBluetooth binding under Electron. The Windows `afterPack` hook verifies the executable PE architecture and loads the packaged WinRT binding under Electron. These checks do not scan or connect to BLE hardware.

The HCI package's file named `prebuilds/darwin-x64+arm64/@stoprocent+bluetooth-hci-socket.node` is actually x86_64-only. It is excluded only from macOS packages, rather than allowed as a fake universal binary. HCI's Darwin default driver is unsupported; Darwin raw USB uses the separate USB implementation. macOS BLE continues to use the retained noble/CoreBluetooth binding. Linux and Windows socket files are unchanged.
