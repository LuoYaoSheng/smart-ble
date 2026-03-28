# Tauri Icons

This directory should contain application icons in the following formats:

- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)

To generate icons:

1. Create a 1024x1024 PNG icon
2. Use an online tool like https://icon.kitchen/ or https://tauri.app/v1/guides/features/icons/
3. Or use the `tauri icon` command:
   ```bash
   cargo install tauri-cli
   tauri icon path/to/your-icon.png
   ```

Example icon source file should be a PNG with:
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Background: Transparent or solid color
