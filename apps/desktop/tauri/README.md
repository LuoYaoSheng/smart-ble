# SmartBLE Desktop - Tauri Version

Lightweight cross-platform BLE debugging tool built with Rust (Tauri).

## Features

- **Device Scanning**: Scan for nearby BLE devices with real-time RSSI updates
- **Device Connection**: Connect/disconnect from BLE devices
- **Service Discovery**: Discover services and characteristics
- **Read/Write**: Read and write characteristic values (HEX and UTF-8 formats)
- **Notifications**: Subscribe to characteristic notifications
- **Operation Logs**: Track all BLE operations

## Requirements

- Rust 1.70+ with Cargo
- Node.js 16+ (for Tauri CLI)
- Platform-specific BLE libraries

## Building

### 1. Install Tauri CLI

```bash
cargo install tauri-cli
```

### 2. Build the Application

```bash
cd apps/desktop/tauri

# Development mode (with hot reload)
cargo tauri dev

# Production build
cargo tauri build
```

### 3. Run the Built Application

Built applications are located in:
- **macOS**: `src-tauri/target/release/bundle/macos/SmartBLE.app`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `appimage/`

## Permissions

The app requires Bluetooth permissions:

### macOS
- Bluetooth access permission will be requested on first run
- If using a built app, ensure it's signed or the user has explicitly allowed it

### Windows
- No special permissions required for standard BLE operations

### Linux
- May need to run with appropriate Bluetooth permissions:
  ```bash
  sudo usermod -a -G bluetooth $USER
  ```

## Project Structure

```
tauri/
├── src/                    # Frontend (Web)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src-tauri/              # Backend (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
└── README.md
```

## Troubleshooting

### Bluetooth not working

**macOS:**
- Make sure Bluetooth is enabled in System Settings
- Grant Bluetooth permission when prompted
- Try resetting Bluetooth module if needed

**Windows:**
- Ensure Bluetooth is enabled in Windows Settings
- Some Windows versions may require developer mode for BLE access

**Linux:**
```bash
# Install BlueZ
sudo apt-get install bluez

# Start Bluetooth service
sudo systemctl start bluetooth

# Check Bluetooth status
bluetoothctl
```

### Build errors

- Ensure Rust is up to date: `rustup update`
- Clean and rebuild: `cargo tauri build --no-bundle`

## Technical Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: Rust with Tauri 1.5
- **BLE Library**: btleplug 0.11

## Differences from Electron

- **Smaller bundle size** (~10MB vs ~100MB+)
- **Lower memory usage**
- **Better performance**
- **No peripheral mode** (btleplug limitation)

## License

MIT
