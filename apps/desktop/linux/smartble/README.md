# Smart BLE - Linux 原生版本

## 技术栈

- **语言**: C++17
- **UI 框架**: Qt 6.x
- **BLE API**: BlueZ (D-Bus)
- **构建系统**: CMake
- **支持平台**: Ubuntu 20.04+, Fedora 35+, Debian 11+

## 项目结构

```
smartble/
├── src/
│   ├── core/
│   │   ├── ble/
│   │   │   ├── ble_manager.cpp
│   │   │   ├── ble_scanner.cpp
│   │   │   └── ble_connection.cpp
│   │   ├── model/
│   │   │   ├── ble_device.cpp
│   │   │   └── ble_characteristic.cpp
│   │   └── utils/
│   │       ├── data_converter.cpp
│   │       └── uuid_helper.cpp
│   ├── ui/
│   │   ├── mainwindow.cpp
│   │   ├── scan_view.cpp
│   │   └── device_detail_view.cpp
│   └── main.cpp
├── include/
├── CMakeLists.txt
└── README.md
```

## 依赖

- Qt 6.x (Core, Widgets, Bluetooth)
- BlueZ (通过 Qt Bluetooth)
- CMake 3.16+

## 开发计划

- [ ] 初始化 Qt 项目
- [ ] 实现 BlueZ BLE 集成
- [ ] 实现设备扫描
- [ ] 实现连接/读写
- [ ] 实现 Qt UI
- [ ] 打包为 .deb / .AppImage

## 运行

```bash
mkdir build && cd build
cmake ..
make
./smartble
```

## 打包

```bash
# .deb
cpack -G DEB

# .AppImage (需要 linuxdeploy)
linuxdeploy-x86_64.AppImage --appdir AppDir --executable smartble ...
```
