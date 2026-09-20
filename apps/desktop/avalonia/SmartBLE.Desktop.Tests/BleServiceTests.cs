using System;
using SmartBLE.Desktop.ViewModels;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Xunit;

namespace SmartBLE.Desktop.Tests;

// WIN-005 步骤 1：对可单测的纯逻辑写失败测试（真机 WinRT 会话不可入单测，
// 锚点=特征键契约、写选项裁决、服务/特征名称映射）。
public class BleServiceTests
{
    // —— 特征键契约：读写/通知路由共用同一键格式，格式漂移=路由全断 ——

    [Fact]
    public void CharKey_JoinsServiceAndCharacteristicWithDash()
    {
        var svc = "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04";
        var chr = "9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04";
        Assert.Equal($"{svc}-{chr}", BleService.CharKey(svc, chr));
    }

    [Fact]
    public void CharKey_IsCaseSensitiveExactMatch()
    {
        // 契约：精确匹配（不做小写归一）——WinRT Uuid.ToString() 两侧同源即一致；
        // 大小写混入应视为不同键，防止静默路由到错误特征
        var a = BleService.CharKey("AAAA", "bbbb");
        var b = BleService.CharKey("aaaa", "bbbb");
        Assert.NotEqual(a, b);
    }

    // —— 写选项裁决真值表：请求模式被支持则原样，否则降级并标记 ——

    [Theory]
    [InlineData(true, true, true, GattWriteOption.WriteWithResponse, false)]    // 请求带响应、双支持 → 原样
    [InlineData(true, true, false, GattWriteOption.WriteWithResponse, false)]   // 请求带响应、仅带响应 → 原样
    [InlineData(false, true, true, GattWriteOption.WriteWithoutResponse, false)] // 请求无响应、支持 → 原样（修前 bug：双支持时被错按带响应）
    [InlineData(false, false, true, GattWriteOption.WriteWithoutResponse, false)] // 请求无响应、仅无响应 → 原样
    [InlineData(true, false, true, GattWriteOption.WriteWithoutResponse, true)] // 请求带响应、仅无响应 → 降级
    [InlineData(false, true, false, GattWriteOption.WriteWithResponse, true)]   // 请求无响应、仅带响应 → 降级
    public void ResolveWriteOption_AppliesRequestedModeOrDowngrades(
        bool withResponse, bool supportsWrite, bool supportsWriteNr,
        GattWriteOption expected, bool expectedDowngraded)
    {
        var (option, downgraded) = BleService.ResolveWriteOption(withResponse, supportsWrite, supportsWriteNr);
        Assert.Equal(expected, option);
        Assert.Equal(expectedDowngraded, downgraded);
    }

    // —— 服务/特征名称映射：短 UUID 抽取与未知回退 ——

    [Theory]
    [InlineData("00001800-0000-1000-8000-00805f9b34fb", "Generic Access")]
    [InlineData("00001801-0000-1000-8000-00805f9b34fb", "Generic Attribute")]
    [InlineData("0000180a-0000-1000-8000-00805f9b34fb", "Device Information")]
    [InlineData("0000180f-0000-1000-8000-00805f9b34fb", "Battery Service")]
    [InlineData("00001812-0000-1000-8000-00805f9b34fb", "HID")]
    [InlineData("9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04", "Unknown Service")]
    [InlineData("1800", "Generic Access")] // 短形式直接命中
    public void GetServiceName_MapsKnownShortUuids(string uuid, string expected)
    {
        Assert.Equal(expected, BleService.GetServiceName(uuid));
    }

    [Theory]
    [InlineData("00002a00-0000-1000-8000-00805f9b34fb", "Device Name")]
    [InlineData("00002a26-0000-1000-8000-00805f9b34fb", "Firmware Revision")]
    [InlineData("00002a19-0000-1000-8000-00805f9b34fb", "Battery Level")]
    [InlineData("9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04", "Unknown Characteristic")]
    public void GetCharacteristicName_MapsKnownAndFallsBack(string uuid, string expected)
    {
        Assert.Equal(expected, BleService.GetCharacteristicName(uuid));
    }
}
