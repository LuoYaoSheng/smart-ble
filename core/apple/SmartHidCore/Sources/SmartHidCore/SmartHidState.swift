import Foundation

public extension HidProtocol {
    static let states = [
        "boot", "load_config", "unprovisioned", "provisioning", "connecting_wifi",
        "pairing", "mqtt_connecting", "ready", "recovery", "error",
    ]

    static let steps = [
        "received", "connecting_wifi", "wifi_connected", "pairing",
        "pairing_success", "mqtt_connecting", "ready",
    ]

    static let errorCodes = [
        "invalid_payload", "wifi_failed", "controlhub_unreachable", "pairing_invalid",
        "pairing_expired", "pairing_used", "mqtt_invalid", "storage_failed",
    ]

    static let errorHints = [
        "invalid_payload": "配置内容非法，请检查输入",
        "wifi_failed": "Wi-Fi 连接失败，请检查 SSID / 密码",
        "controlhub_unreachable": "连不上 ControlHub，请确认它在运行、地址可达",
        "pairing_invalid": "配对码无效，请重新扫码",
        "pairing_expired": "配对码已过期，请重新扫码",
        "pairing_used": "配对码已被使用，请重新扫码",
        "mqtt_invalid": "MQTT 连接失败，请进入诊断",
        "storage_failed": "设备存储失败，请重试或联系支持",
    ]

    static func recoveryAction(forErrorCode code: String) -> String {
        switch code {
        case "invalid_payload", "wifi_failed":
            return "form"
        case "controlhub_unreachable", "pairing_invalid", "pairing_expired", "pairing_used":
            return "pairing"
        case "mqtt_invalid":
            return "diagnostics"
        case "storage_failed":
            return "retry"
        default:
            return "form"
        }
    }

    static func mapRows(state: String, step: String, error: String?) -> [String: String] {
        var rows = ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]
        switch step {
        case "received", "connecting_wifi":
            rows["wifi"] = "active"
        case "wifi_connected", "pairing":
            rows["wifi"] = "done"
            rows["hub"] = "active"
        case "pairing_success", "mqtt_connecting":
            rows["wifi"] = "done"
            rows["hub"] = "done"
            rows["conn"] = "active"
        case "ready":
            rows = ["wifi": "done", "hub": "done", "conn": "done", "usb": "done"]
        default:
            break
        }

        switch state {
        case "connecting_wifi" where rows["wifi"] == "pending":
            rows["wifi"] = "active"
        case "pairing" where rows["hub"] == "pending":
            rows["hub"] = "active"
        case "mqtt_connecting" where rows["conn"] == "pending":
            rows["conn"] = "active"
        case "ready":
            rows = ["wifi": "done", "hub": "done", "conn": "done", "usb": "done"]
        default:
            break
        }

        if let error {
            let row: String
            switch error {
            case "wifi_failed", "invalid_payload":
                row = "wifi"
            case "controlhub_unreachable", "pairing_invalid", "pairing_expired", "pairing_used":
                row = "hub"
            case "mqtt_invalid":
                row = "conn"
            default:
                row = "usb"
            }
            rows[row] = "fail"
        }
        return rows
    }
}
