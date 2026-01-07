# SmartBLE Desktop for macOS

Native macOS BLE debugging tool built with AppKit and CoreBluetooth.

## Features

- **Device Scanning**: Scan for nearby BLE devices with real-time RSSI updates
- **Device Connection**: Connect to discovered devices
- **Service Discovery**: Discover services and characteristics
- **Read/Write**: Read and write characteristic values
- **Notifications**: Subscribe to characteristic notifications
- **Operation Log**: View detailed operation logs

## Requirements

- macOS 13.0+
- Xcode 14.0+

## Building

### Using Swift Package Manager

```bash
cd apps/desktop/macos/SmartBLE-mac
swift build
swift run
```

### Using Xcode

1. Open Terminal and navigate to the project:
   ```bash
   cd apps/desktop/macos/SmartBLE-mac
   ```

2. Generate an Xcode project:
   ```bash
   swift package generate-xcodeproj
   ```

3. Open the project:
   ```bash
   open SmartBLE-mac.xcodeproj
   ```

4. Select the "SmartBLE-mac" scheme and run (Cmd+R).

## Permissions

The app requires Bluetooth permissions. On first run, macOS will prompt you to allow Bluetooth access.

## Project Structure

```
SmartBLE-mac/
├── Package.swift           # Swift Package Manager manifest
├── Sources/
│   ├── main.swift          # Entry point
│   ├── Core/
│   │   ├── AppDelegate.swift        # Application delegate
│   │   └── BLEManager.swift         # BLE core logic
│   └── UI/
│       ├── MainWindowController.swift      # Main window
│       ├── ScanViewController.swift         # Device scan view
│       ├── DeviceDetailViewController.swift # Device details view
│       └── LogViewController.swift           # Operation log view
└── README.md
```

## Usage

1. Click "Start Scan" to begin scanning for BLE devices
2. Select a device from the list to connect
3. Browse services and characteristics in the detail view
4. Use Read/Write/Notify buttons to interact with characteristics
5. View operation logs in the log panel

## Differences from iOS Version

- Uses **AppKit** instead of SwiftUI (for better desktop experience and text input)
- Split-view interface for better screen utilization
- Toolbar-based actions
- Separate log window

## Troubleshooting

**Bluetooth not working:**
- Make sure Bluetooth is enabled in System Settings
- Check that the app has Bluetooth permissions
- Try restarting Bluetooth (turn off/on)

**Can't see devices:**
- Make sure devices are advertising and in range
- Try clicking "Stop Scan" then "Start Scan" again

## License

MIT
