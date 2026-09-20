using System;
using System.Text.RegularExpressions;

namespace SmartBLE.Desktop.ViewModels;

// 正典 UI 纯函数层（单测锚点）：数值口径逐条对齐 Electron/Tauri 壳
// apps/desktop/electron/public/app.js 同名实现，圈外值禁止。
internal static class CanonUi
{
    // ── P008 广播 31B 预算（app.js calcAdvertiseBytes 同口径） ──
    // nameB = 2+len；uuidB = 2+字节数（4/8/36 位 HEX 合法才计）；
    // mfgB = 4+厂商数据字节数（厂商 ID 或数据任一非空才计）
    public sealed record AdvBytes(int Name, int Uuid, int Mfg, int Total);

    public static AdvBytes CalcAdvertiseBytes(string name, string uuid, string mfgId, string mfgData)
    {
        var nameB = name.Length > 0 ? 2 + name.Length : 0;
        var uuidB = uuid.Length > 0 && IsValidBroadcastUuid(uuid) ? 2 + uuid.Length / 2 : 0;
        var mfgB = (mfgId.Length > 0 || mfgData.Length > 0) ? 4 + mfgData.Length : 0;
        return new AdvBytes(nameB, uuidB, mfgB, nameB + uuidB + mfgB);
    }

    // UUID 合法性：4 / 8 / 36 位十六进制（app.js isValidBroadcastUuid）
    public static bool IsValidBroadcastUuid(string uuid)
        => Regex.IsMatch(uuid, @"^([0-9a-fA-F]{4}|[0-9a-fA-F]{8}|[0-9a-fA-F]{36})$");

    // ── C1 设备卡信号档位（DeviceCard.js sigQuality 同口径） ──
    public static int SigQuality(int rssi)
        => rssi >= -60 ? 4 : rssi >= -70 ? 3 : rssi >= -80 ? 2 : 1;

    // ── P001 bt-chip 五态词（app.js stateMap / N3 正典口径） ──
    // On→蓝牙就绪(绿)；Off/Unauthorized→蓝牙未开启(红)；
    // Unsupported→平台不支持(灰)；未知→初始化中…(灰)
    public static (string Word, string DotClass) CanonicalBtChip(string state) => state switch
    {
        "On" => ("蓝牙就绪", "on"),
        "Off" => ("蓝牙未开启", "off"),
        "Unauthorized" => ("蓝牙未开启", "off"),
        "Unavailable" => ("平台不支持", ""),
        _ => ("初始化中…", ""),
    };

    // ── Smart HID 档案匹配（smart-hid 档案双入口：强=adv 服务 UUID / 弱=名称前缀） ──
    // 返回 0=不匹配 / 1=WEAK / 2=STRONG（app.js matchScannedDevice 口径）
    public const string HidServiceGuid = "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04";
    public const string HidNamePrefix = "SHID";

    public static int MatchScannedDevice(string? name, string[]? advertisedServiceUuids)
    {
        if (advertisedServiceUuids != null)
        {
            var hidGuid = NormalizeUuid(HidServiceGuid);
            foreach (var uuid in advertisedServiceUuids)
            {
                if (NormalizeUuid(uuid) == hidGuid) return 2;
            }
        }

        if (!string.IsNullOrEmpty(name) &&
            name.StartsWith(HidNamePrefix, StringComparison.OrdinalIgnoreCase))
            return 1;

        return 0;
    }

    private static string NormalizeUuid(string uuid)
        => (uuid ?? "").ToLowerInvariant().Replace("-", "");
}
