# Electron native BLE dependencies

Electron remains pinned to 44.7.0, with renderer sandbox and context isolation enabled.

`@abandonware/noble` supplies the existing CoreBluetooth and WinRT N-API bindings. Its Linux HCI socket dependency is overridden with the exact npm alias `@stoprocent/bluetooth-hci-socket@2.3.0`. This fork implements the same socket API used by noble (`bindRaw`, `bindUser`, `start`, `stop`, `isDevUp`, `write`, `setFilter`, EventEmitter data/error), using N-API instead of NAN/V8 APIs. It also retains the optional USB transport.

The legacy HCI dependency's locked NAN 2.24 does not compile against Electron 44's V8 15.2: `External::Value`, internal field pointer access and property accessors changed. Skipping native rebuilds would leave Linux without its real BLE backend. The alias keeps native rebuilding enabled and removes that V8 ABI dependency.

`node-gyp` is explicitly pinned to 12.4.0 for install scripts and overridden throughout the dependency tree. The previous root version 10.3.1 did not recognize Visual Studio 18/2026 on current Windows builders. Version 12.4 recognizes that toolchain. The Windows WinRT backend itself continues to use N-API.

After changing these versions, use a clean `npm ci`, build on Linux and Windows, and check loading the native bindings under the target Electron runtime. Compilation and API checks do not replace real adapter/GATT verification.
