use wasm_bindgen::prelude::*;
use crc::{Crc, CRC_8_MAXIM_DOW};

// 预置的 18 字节防呆协议所使用的 CRC8 算法 (Maxim Dow)
const CRC_ENGINE: Crc<u8> = Crc::<u8>::new(&CRC_8_MAXIM_DOW);

#[wasm_bindgen]
pub struct ProtocolParser;

#[wasm_bindgen]
impl ProtocolParser {
    
    /// WebAssembly 接口: 初始化并输出引擎版本
    #[wasm_bindgen]
    pub fn get_version() -> String {
        "SmartBLE-Protocol-WASM v1.0.0".to_string()
    }

    /// 给定 17 字节的 Payload，利用 Rust 高速计算出 CRC8，并返回组装好的 18 字节封包
    #[wasm_bindgen]
    pub fn build_18byte_frame(payload: &[u8]) -> Vec<u8> {
        let mut frame = payload.to_vec();
        
        // 容错截断
        if frame.len() > 17 {
            frame.truncate(17);
        } else while frame.len() < 17 {
            frame.push(0x00);
        }
        
        let checksum = CRC_ENGINE.checksum(&frame);
        frame.push(checksum);
        frame
    }

    /// 校验从硬件发来的完整的 18 字节 Payload，验证其传输完整性
    #[wasm_bindgen]
    pub fn verify_frame(frame: &[u8]) -> bool {
        if frame.len() != 18 {
            return false;
        }
        
        let payload = &frame[0..17];
        let provided_checksum = frame[17];
        
        let calculated = CRC_ENGINE.checksum(payload);
        calculated == provided_checksum
    }

    /// 从 18 字节中剥离出温湿度等通用数据（示例：大端序解算）
    /// 返回值：[温度, 湿度, 电量]
    #[wasm_bindgen]
    pub fn parse_environment_data(frame: &[u8]) -> Vec<f64> {
        if !Self::verify_frame(frame) {
            // 校验失败返回无效值
            return vec![-999.0, -999.0, -999.0]; 
        }

        // 假设 18-Byte 中的 [1..3] 是温度, [3..5] 是湿度, [5] 是电量
        let temp_raw = ((frame[1] as u16) << 8) | (frame[2] as u16);
        let hum_raw = ((frame[3] as u16) << 8) | (frame[4] as u16);
        let battery = frame[5] as f64;

        let temp = (temp_raw as f64 - 2000.0) / 100.0;
        let hum = hum_raw as f64 / 100.0;

        vec![temp, hum, battery]
    }
}
