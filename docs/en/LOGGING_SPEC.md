# Logging Specifications & Ecosystem Metrics

When deploying Bluetooth logic to physical commercial sectors, identifying the root cause of connectivity crashes within polluted BLE radio wave zones is incredibly difficult. Relying exclusively on console terminal outputs is inadequate. 

Smart BLE enforces a rigorous, structured UI Memory Logging protocol across every frontend library (Flutter, UniApp, Tauri Native) to guarantee hardware developers can easily retro-trace their transmission failures.

---

## 1. 6-Level Typed Pool Mechanics

A total ban stands against generically printing unclassified strings into the console pipeline. Every log dumped into the local ring buffer must be aggressively typed into one of 6 identifiers containing absolute precision UTC timestamps.

| Status Level | Hex Identifier & UI Binding | Scenario Requirements |
| :--- | :--- | :--- |
| `INFO` | ⚪ White / Neutral Grey | Basic flow nodes: i.e. "System is booting up", "Discovered GATT 180A". |
| `SUCCESS` | 🟢 Green | Critical E2E milestones: i.e. "Final OTA byte sequence complete", "Connected successfully". |
| `WARNING` | 🟡 Orange | Non-fatal breaks: i.e. "CRC8 calculation failed - discarding erroneous frame", "Retry limit triggered". |
| `ERROR` | 🔴 Crimson Red | Catastrophic failures: i.e. "WatchDog timeout disconnected", "Hardware rejected chunk". |
| `SEND` | 🔵 Blue (Upload Icon) | **TX Uplink**: Emitted ONLY when passing bits down `Write` or `WriteNoResponse`. MUST contain Hex. |
| `RECEIVE`| 🟣 Violet (Downlink) | **RX Downlink**: Fired when intercepting chunks from `Notify`, `Indicate`, or `Read`. MUST contain Hex. |

## 2. In-Memory Ring-Buffer Sandboxing

Since Edge mobile platforms (particularly WeChat Miniprogram environments) suffer under highly strained runtime footprints, blindly pushing millions of IoT sensor reads into standard application Lists will guarantee an Out-Of-Memory (OOM) app crash within hours.

**The Strict Ruling:** All Logging logic MUST natively bind to a continuous `1,000 to 5,000 entry max` Ring Buffer array. If hardware overspills past the threshold, the tail end slices discard oldest memory footprints silently.

## 3. Persistent Extraction Protocol

Raw terminal debug outputs are utterly useless when physical clients complain in the wild. The application logic must support exporting sandbox traces dynamically for engineering diagnostic sessions.

### (1). JSON Formatted Slices
While the front-end draws colorful widgets, the underlying export stream formatting should comply strictly with JSON-Lines (NDJSON), retaining machine readability for tools like LogStash.

```json
{ "timestamp": "2026-04-14T03:32:01.002Z", "type": "SEND", "device": "F1:A2:33", "hex": "BE B5 01 02", "msg": "Send command chunk" }
```

### (2). System Matrix Bindings
Under NO circumstances should extracting heavy telemetry data rely exclusively on raw "Clipboard Copying" capabilities, which easily truncate under size caps.

* **Mobile (Flutter / UniApp)**
  - Logic must inherently pipe text string blobs into OS-level `.txt` temp-files, and then force Native Mobile "Share Sheet" dialog boxes. This allows field-test operators to instantly forward debug files through WeChat, WhatsApp, or Outlook to hardware teams.
* **Desktop (Electron / Tauri)**
  - Logic must utilize operating system `File Save Dialog (Save-As)` GUIs, forcing heavy binary or NDJSON writes directly back to C-Drive permanent storage buffers for limitless analytical deep-tracing during heavy validation runs.
