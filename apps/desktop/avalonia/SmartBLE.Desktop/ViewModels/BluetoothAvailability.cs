using System;

namespace SmartBLE.Desktop.ViewModels;

internal static class BluetoothAvailability
{
    // Missing hardware, disabled radio and unsupported APIs are different facts.
    internal static string Resolve(bool platformSupported, bool adapterPresent, bool lowEnergySupported, string radioState)
        => !platformSupported ? "Unsupported" : !adapterPresent ? "NoAdapter" : !lowEnergySupported ? "UnsupportedAdapter" : radioState switch
        {
            "On" => "On", "Off" => "Off", "Disabled" => "Disabled", _ => "Unknown"
        };

    internal static string ExceptionState(Exception error) => error is PlatformNotSupportedException ? "Unsupported"
        : error is UnauthorizedAccessException || error.HResult == unchecked((int)0x80070005) ? "Unauthorized" : "Error";

    internal static bool CanScan(string state) => state == "On";
    internal static bool CanToggleScan(string state, bool scanning) => scanning || CanScan(state);
    internal static string Hint(string state) => state switch
    {
        "NoAdapter" => "未检测到蓝牙适配器。连接支持 BLE 的适配器后，请重新检测。",
        "Off" => "蓝牙未开启。请在 Windows 设置中开启蓝牙后重新检测。",
        "Disabled" => "蓝牙被系统禁用。请检查设备或系统设置后重新检测。",
        "Unauthorized" => "蓝牙权限未授予。请检查 Windows 蓝牙访问权限后重新检测。",
        "UnsupportedAdapter" => "当前适配器不支持 BLE，请使用支持低功耗蓝牙的适配器。",
        "Unsupported" => "当前平台不支持本客户端使用的 Windows BLE 接口。",
        "Error" or "Unavailable" => "蓝牙检测失败，请重新检测；不能据此判断平台不支持。",
        "Unknown" => "蓝牙状态未知，请重新检测。",
        "On" => "蓝牙就绪，可以扫描附近的 BLE 设备。",
        _ => "正在检测蓝牙适配器。"
    };
}
