// Win32 广播边车（WIN-BRIDGE 同构移植，2026-09-24 广播模板复制轮）。
// 与 E/G/Q 壳复用同一份 ../win-broadcast-bridge.ps1（行协议见该文件头注）：
// stdin/stdout 单行 JSON（start/stop/exit ↔ started/stopped/error）。
// 平台事实：WinRT 桌面进程仅厂商块 0xFF 可发（LocalName/ServiceUuids 一律
// Start() 拒绝）；本机无线电不自环（空口收包需外部接收端，20260924 判别实证）。

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::os::windows::process::CommandExt;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

const PS1: &str = include_str!("../win-broadcast-bridge.ps1");
// 首次调用含边车冷启动（PS 起 + csc 首编译 ~3s），超时余量放宽
const START_TIMEOUT: Duration = Duration::from_secs(12);
const STOP_TIMEOUT: Duration = Duration::from_secs(5);
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

type BridgeResult = Result<serde_json::Value, String>;
type Waiter = Sender<BridgeResult>;
type WaiterMap = Arc<Mutex<HashMap<String, Vec<Waiter>>>>;

struct Bridge {
    child: Child,
    stdin: ChildStdin,
    waiters: WaiterMap,
}

fn bridge_slot() -> &'static Mutex<Option<Bridge>> {
    static SLOT: OnceLock<Mutex<Option<Bridge>>> = OnceLock::new();
    SLOT.get_or_init(|| Mutex::new(None))
}

fn ensure_bridge() -> Result<WaiterMap, String> {
    let mut guard = bridge_slot().lock().unwrap();
    if let Some(bridge) = guard.as_ref() {
        return Ok(Arc::clone(&bridge.waiters));
    }
    let ps1_path = std::env::temp_dir().join("twin-win-broadcast-bridge.ps1");
    std::fs::write(&ps1_path, PS1).map_err(|e| format!("write sidecar: {e}"))?;
    let mut child = Command::new("powershell.exe")
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-File")
        .arg(&ps1_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("spawn sidecar: {e}"))?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "sidecar stdin missing".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "sidecar stdout missing".to_string())?;

    let waiters: WaiterMap = Arc::new(Mutex::new(HashMap::new()));
    let reader_waiters = Arc::clone(&waiters);
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let Ok(line) = line else { break };
            let line = line.trim().to_string();
            if line.is_empty() {
                continue;
            }
            let Ok(msg) = serde_json::from_str::<serde_json::Value>(&line) else {
                continue;
            };
            let Some(event) = msg.get("event").and_then(|v| v.as_str()) else {
                continue;
            };
            let mut map = reader_waiters.lock().unwrap();
            if event == "error" {
                // 边车把失败统一报 error：同时惊醒 started/stopped 等待者（E/G/Q 同口径）
                let err = msg
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                for name in ["started", "stopped"] {
                    for tx in map.remove(name).unwrap_or_default() {
                        let _ = tx.send(Err(err.clone()));
                    }
                }
            } else {
                for tx in map.remove(event).unwrap_or_default() {
                    let _ = tx.send(Ok(msg.clone()));
                }
            }
        }
        // stdout 关闭 = 边车死亡：惊醒全部等待者
        let mut map = reader_waiters.lock().unwrap();
        for (_, txs) in map.drain() {
            for tx in txs {
                let _ = tx.send(Err("broadcast sidecar exited".to_string()));
            }
        }
    });

    let map = Arc::clone(&waiters);
    *guard = Some(Bridge { child, stdin, waiters });
    Ok(map)
}

// 先挂等待者再发命令，防事件先到丢失（注册与发送间无锁序竞争：读线程只取不查存）
fn register(event: &str) -> Result<Receiver<BridgeResult>, String> {
    let map = ensure_bridge()?;
    let (tx, rx) = channel();
    map.lock()
        .unwrap()
        .entry(event.to_string())
        .or_default()
        .push(tx);
    Ok(rx)
}

fn send(payload: serde_json::Value) -> Result<(), String> {
    let mut guard = bridge_slot().lock().unwrap();
    let bridge = guard
        .as_mut()
        .ok_or_else(|| "broadcast sidecar not running".to_string())?;
    let mut line = payload.to_string();
    line.push('\n');
    bridge
        .stdin
        .write_all(line.as_bytes())
        .map_err(|e| format!("sidecar write: {e}"))
}

pub fn start(company_id: u16, data: &[u8]) -> BridgeResult {
    let rx = register("started")?;
    send(serde_json::json!({
        "cmd": "start",
        "companyId": company_id,
        "data": data,
    }))?;
    rx.recv_timeout(START_TIMEOUT)
        .map_err(|_| format!("bridge started timeout ({}ms)", START_TIMEOUT.as_millis()))
        .and_then(|inner| inner)
}

pub fn stop() -> BridgeResult {
    {
        let guard = bridge_slot().lock().unwrap();
        if guard.is_none() {
            return Err("bridge not running".to_string());
        }
    }
    let rx = register("stopped")?;
    send(serde_json::json!({ "cmd": "stop" }))?;
    rx.recv_timeout(STOP_TIMEOUT)
        .map_err(|_| format!("bridge stopped timeout ({}ms)", STOP_TIMEOUT.as_millis()))
        .and_then(|inner| inner)
}

pub fn shutdown() {
    let mut guard = bridge_slot().lock().unwrap();
    let Some(mut bridge) = guard.take() else { return };
    let _ = bridge.stdin.write_all(b"{\"cmd\":\"exit\"}\n");
    let _ = bridge.stdin.flush();
    drop(bridge.stdin); // 关管道送 EOF
    // 优雅等待 ≤1s，超时兜底 kill（防边车孤儿进程；E-WIN killWinBridge 同口径）
    for _ in 0..20 {
        if matches!(bridge.child.try_wait(), Ok(Some(_))) {
            return;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let _ = bridge.child.kill();
}

#[cfg(test)]
mod tests {
    use super::*;

    // WIN-BRIDGE 真机链路验证：拉起边车 → 发厂商块（0x4C42/"BLE"）→ Started →
    // 停播 → Stopped → 退出。空口收包需外部接收端（本机不自环，20260924 判别
    // 实证：广播中 bleak 可见 SHID 116 帧、自身厂商块 0 帧），此处验证发射链状态机。
    #[test]
    fn bridge_start_stop_roundtrip() {
        let started = start(0x4C42, b"BLE");
        assert!(started.is_ok(), "start failed: {started:?}");
        let stopped = stop();
        assert!(stopped.is_ok(), "stop failed: {stopped:?}");
        shutdown();
        // 退出后未在播：stop 报 bridge not running（命令层按幂等成功处理）
        assert!(stop().unwrap_err().contains("not running"));
    }
}
