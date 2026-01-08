fn main() {
    tauri_build::build();

    // Add Bluetooth permission to Info.plist on macOS
    #[cfg(target_os = "macos")]
    {
        use std::env;
        use std::fs;
        use std::path::PathBuf;

        // Find the Info.plist file that tauri_build just created
        let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
        let plist_path = out_dir.join("Info.plist");

        if plist_path.exists() {
            // Read the plist content
            if let Ok(content) = fs::read_to_string(&plist_path) {
                // Check if the permission already exists
                if !content.contains("NSBluetoothAlwaysUsageDescription") {
                    // Add the Bluetooth permission
                    let permission_entry = "\t<key>NSBluetoothAlwaysUsageDescription</key>\n\t\t<string>This app needs Bluetooth access to scan for and connect to nearby devices.</string>\n";

                    // Find the position to insert (before the closing </dict> tag)
                    if let Some(pos) = content.find("</dict>") {
                        let mut new_content = content.clone();
                        new_content.insert_str(pos, permission_entry);

                        if fs::write(&plist_path, new_content).is_ok() {
                            println!("cargo:warning=Added Bluetooth permission to Info.plist");
                        }
                    }
                }
            }
        }
    }
}
