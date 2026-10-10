using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SmartBLE.Desktop.ViewModels;

// Smart HID V1 wire operations are pure and checked against the shared vector file.
internal static class HidProtocol
{
    public const string Service = "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04";
    public const string Info = "9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04";
    public const string Input = "9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04";
    public const string Status = "9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04";
    public const string Version = "1.0";
    private static readonly JsonSerializerOptions JsonOptions = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    internal sealed record Pairing(string Token, string Host, int Port);
    internal sealed record DeviceInfo(string Product, string Protocol, string DeviceId, string Firmware, string State, bool Provisioned);
    internal sealed record DeviceStatus(string State, string Step, string? Error);

    public static Pairing? ParseQr(string text)
    {
        text = text.Trim();
        const string scheme = "shid://pair";
        if (!text.StartsWith(scheme, StringComparison.OrdinalIgnoreCase)) return null;
        var query = text[scheme.Length..];
        if (query.Length > 0 && query[0] is not '?' and not '&') return null;
        try
        {
            var pairs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var part in query.TrimStart('?', '&').Split('&'))
            {
                var split = part.IndexOf('=');
                if (split <= 0) continue;
                if (Regex.IsMatch(part, @"%(?![0-9a-fA-F]{2})")) return null;
                var key = Uri.UnescapeDataString(part[..split]);
                if (!pairs.TryAdd(key, Uri.UnescapeDataString(part[(split + 1)..]))) return null;
            }
            var token = pairs.GetValueOrDefault("token", "").ToLowerInvariant();
            var host = pairs.GetValueOrDefault("host", "").Trim();
            var portText = pairs.GetValueOrDefault("port", "17892");
            if (!Regex.IsMatch(token, "^[0-9a-f]{32}$") || host.Length == 0 || Regex.IsMatch(host, @"[\s/]") ||
                !int.TryParse(portText.Length == 0 ? "17892" : portText, out var port) || port is < 1 or > 65535) return null;
            return new Pairing(token, host, port);
        }
        catch (UriFormatException) { return null; }
    }

    public static string Candidate(string ssid, string password, string host, int port, string token)
    {
        ssid = ssid.Trim(); host = host.Trim(); token = token.Trim();
        if (ssid.Length is < 1 or > 32) throw new ArgumentException("SSID 必须为 1–32 字符");
        if (password.Length > 64) throw new ArgumentException("Wi-Fi 密码超长");
        if (host.Length == 0 || port is < 1 or > 65535) throw new ArgumentException("ControlHub 地址或端口非法");
        if (!Regex.IsMatch(token, "^[0-9a-f]{32}$")) throw new ArgumentException("配对码须为 32 位十六进制");
        return JsonSerializer.Serialize(new { v = 1, wifi_ssid = ssid, wifi_password = password, hub_host = host, hub_port = port, token }, JsonOptions);
    }

    public static int ChunkSize(int mtu) => Math.Max(1, Math.Min(128, (mtu < 23 ? 23 : mtu) - 6));
    public static byte[][] Frames(byte[] payload, int chunk)
    {
        chunk = Math.Clamp(chunk, 1, 128);
        var total = (payload.Length + chunk - 1) / chunk;
        if (payload.Length is < 1 or > 1024 || total > 64) throw new ArgumentException("配置大小超出协议范围");
        return Enumerable.Range(0, total).Select(seq =>
        {
            var count = Math.Min(chunk, payload.Length - seq * chunk);
            var frame = new byte[count + 3];
            frame[0] = (byte)seq; frame[1] = (byte)total; frame[2] = (byte)count;
            Array.Copy(payload, seq * chunk, frame, 3, count);
            return frame;
        }).ToArray();
    }

    private static string Text(JsonElement data, string key) => data.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
    public static DeviceInfo? ParseInfo(string text)
    {
        try
        {
            using var doc = JsonDocument.Parse(text); var data = doc.RootElement;
            if (data.ValueKind != JsonValueKind.Object || Text(data, "device_id").Length == 0) return null;
            return new DeviceInfo(Text(data, "product"), Text(data, "protocol"), Text(data, "device_id"), Text(data, "firmware"), Text(data, "state"),
                data.TryGetProperty("provisioned", out var p) && p.ValueKind == JsonValueKind.True);
        }
        catch (JsonException) { return null; }
    }
    public static bool Compatible(DeviceInfo? info) => info != null && info.Product == "smart-hid" && info.Protocol == Version && Regex.IsMatch(info.DeviceId, "^HID-[A-Z0-9]{8}$");

    public static DeviceStatus? ParseStatus(string text)
    {
        try
        {
            using var doc = JsonDocument.Parse(text); var data = doc.RootElement;
            if (data.ValueKind != JsonValueKind.Object) return null;
            var error = Text(data, "error");
            return new DeviceStatus(Text(data, "state"), Text(data, "step"), error.Length > 0 ? error : null);
        }
        catch (JsonException) { return null; }
    }
    public static string RecoveryAction(string error) => error switch
    {
        "wifi_failed" or "invalid_payload" => "form",
        "pairing_invalid" or "pairing_expired" or "pairing_used" or "controlhub_unreachable" => "pairing",
        "mqtt_invalid" => "diagnostics",
        _ => "retry"
    };
    public static string ErrorHint(string error) => error switch
    {
        "invalid_payload" => "配置内容非法，请检查输入",
        "wifi_failed" => "Wi-Fi 连接失败，请检查 SSID / 密码",
        "controlhub_unreachable" => "连不上 ControlHub，请确认它在运行、地址可达",
        "pairing_invalid" => "配对码无效，请重新扫码",
        "pairing_expired" => "配对码已过期，请重新扫码",
        "pairing_used" => "配对码已被使用，请重新扫码",
        "mqtt_invalid" => "MQTT 连接失败，请进入诊断",
        "storage_failed" => "设备存储失败，请重试或联系支持",
        _ => "设备报告未知错误，请进入诊断"
    };
    public static string StatusText(DeviceStatus status) => status.Error != null ? ErrorHint(status.Error) : (status.Step.Length > 0 ? status.Step : status.State) switch
    {
        "received" => "配置已接收", "connecting_wifi" => "连接 Wi-Fi", "wifi_connected" => "Wi-Fi 已连接",
        "pairing" => "连接 ControlHub", "pairing_success" => "配对成功", "mqtt_connecting" => "连接 MQTT", "ready" => "设备已就绪",
        _ => "正在等待设备状态"
    };
}
