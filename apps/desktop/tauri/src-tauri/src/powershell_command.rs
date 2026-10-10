use base64::{engine::general_purpose::STANDARD, Engine};

/// PowerShell -EncodedCommand consumes UTF-16LE, leaving stdin for the JSON protocol.
pub(crate) fn encode_script(script: &str) -> String {
    let script = script.strip_prefix('\u{feff}').unwrap_or(script);
    let bytes: Vec<u8> = script.encode_utf16().flat_map(u16::to_le_bytes).collect();
    STANDARD.encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_unicode_and_line_protocol_without_a_script_file() {
        let script = "# 蓝牙 🛠\r\n$line = [Console]::In.ReadLine()\r\n";
        let bytes = STANDARD.decode(encode_script(script)).unwrap();
        let words: Vec<u16> = bytes
            .chunks_exact(2)
            .map(|b| u16::from_le_bytes([b[0], b[1]]))
            .collect();
        assert_eq!(String::from_utf16(&words).unwrap(), script);
    }

    #[test]
    fn embedded_bridge_fits_the_windows_command_line() {
        let script = include_str!("../win-broadcast-bridge.ps1");
        assert!(encode_script(script).len() + 256 < 32767);
        assert!(script.contains("[Console]::In.ReadLine()"));
    }

    #[test]
    fn file_encoding_bom_is_not_part_of_the_encoded_command() {
        assert_eq!(
            encode_script("\u{feff}Write-Output 'ok'"),
            encode_script("Write-Output 'ok'")
        );
    }
}
