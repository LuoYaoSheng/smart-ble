using System;
using System.Linq;
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

    // —— 服务/特征名称映射：对齐 E-WIN BleUtils.js 正典注册表
    //    （20260920-VWIN-UIALIGN：短 4 位 + 8 位自定义前缀双匹配 + 中文正典词） ——

    [Theory]
    [InlineData("00001800-0000-1000-8000-00805f9b34fb", "通用访问")]
    [InlineData("00001801-0000-1000-8000-00805f9b34fb", "通用属性")]
    [InlineData("0000180a-0000-1000-8000-00805f9b34fb", "设备信息")]
    [InlineData("0000180f-0000-1000-8000-00805f9b34fb", "电池服务")]
    [InlineData("00001812-0000-1000-8000-00805f9b34fb", "人机界面 (HID)")]
    [InlineData("4fafc201-1fb5-459e-8fcc-c5c9c331914d", "OTA 升级服务")] // 8 位自定义前缀
    [InlineData("9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04", "未知服务")]     // SHID 未入册 → 正典回退
    [InlineData("1800", "通用访问")] // 短形式直接命中
    public void GetServiceName_MapsKnownShortUuids(string uuid, string expected)
    {
        Assert.Equal(expected, BleService.GetServiceName(uuid));
    }

    [Theory]
    [InlineData("00002a00-0000-1000-8000-00805f9b34fb", "设备名称")]
    [InlineData("00002a26-0000-1000-8000-00805f9b34fb", "固件版本")]
    [InlineData("00002a19-0000-1000-8000-00805f9b34fb", "电池电量")]
    [InlineData("beb5483e-36e1-4688-b7f5-ea07361b26a8", "OTA 控制")]     // 8 位自定义前缀
    [InlineData("9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04", "未知特征值")]
    public void GetCharacteristicName_MapsKnownAndFallsBack(string uuid, string expected)
    {
        Assert.Equal(expected, BleService.GetCharacteristicName(uuid));
    }

    // —— F004 广播快照跨帧合并（20260924 真机 SHID-00000001 34 帧实证输入形状） ——

    private static Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementDataSection MakeSection(
        byte type, byte[] data)
    {
        var writer = new Windows.Storage.Streams.DataWriter();
        writer.WriteBytes(data);
        return new Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementDataSection(type, writer.DetachBuffer());
    }

    [Fact]
    public void BuildAdvSnapshot_MergesNameAndUuidAcrossAlternatingFrames()
    {
        // 真机形状：ConnectableUndirected 帧 = 0x01 Flags + 0x07 UUID 列表、无名；
        // Extended 帧 = 0x09 名称、无 UUID——不合并则弹窗内容随末帧漂移
        var svc = new BleService();
        var address = 0x10B41DCD238EUL;

        var adv1 = new Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisement();
        adv1.ServiceUuids.Add(Guid.Parse("9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04"));
        adv1.DataSections.Add(MakeSection(0x01, Convert.FromHexString("06")));
        adv1.DataSections.Add(MakeSection(0x07, Convert.FromHexString("041c8a5e0b6f2a9d8f4c3be701101d9f")));
        var snap1 = svc.BuildAdvSnapshot(adv1, address);
        Assert.NotNull(snap1);
        Assert.Equal(2, snap1!.DataSections.Count);
        Assert.Single(snap1.ServiceUuids);

        var adv2 = new Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisement();
        adv2.LocalName = "SHID-00000001";
        adv2.DataSections.Add(MakeSection(0x09, System.Text.Encoding.ASCII.GetBytes("SHID-00000001")));
        var snap2 = svc.BuildAdvSnapshot(adv2, address);
        Assert.NotNull(snap2);
        // 合并后三段齐全（按类型升序），UUID 跨帧保留
        Assert.Equal(new byte[] { 0x01, 0x07, 0x09 }, snap2!.DataSections.Select(s => s.DataType).ToArray());
        Assert.Single(snap2.ServiceUuids);
        Assert.Equal("9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04", snap2.ServiceUuids[0]);
        Assert.Equal("534849442D3030303030303031", snap2.DataSections.First(s => s.DataType == 0x09).Hex);
    }

    [Fact]
    public void BuildAdvSnapshot_ManufacturerDataSurvivesEmptyFrames()
    {
        // 厂商数据只沿最新非空帧：后续空广播帧不得冲掉已合并的 0xFF 段与厂商 ID
        var svc = new BleService();
        var address = 0xAABBCCDDEEFFUL;

        var adv1 = new Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisement();
        var writer = new Windows.Storage.Streams.DataWriter();
        writer.WriteBytes(Convert.FromHexString("0102"));
        adv1.ManufacturerData.Add(new Windows.Devices.Bluetooth.Advertisement.BluetoothLEManufacturerData(0x4C42, writer.DetachBuffer()));
        adv1.DataSections.Add(MakeSection(0xFF, Convert.FromHexString("424C0102")));
        var snap1 = svc.BuildAdvSnapshot(adv1, address);
        Assert.NotNull(snap1);
        Assert.Equal((ushort)0x4C42, snap1!.ManufacturerCompanyId);

        var snap2 = svc.BuildAdvSnapshot(new Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisement(), address);
        Assert.NotNull(snap2);
        Assert.Equal((ushort)0x4C42, snap2!.ManufacturerCompanyId);
        Assert.Equal("424C0102", snap2.DataSections.First(s => s.DataType == 0xFF).Hex);
    }
}
