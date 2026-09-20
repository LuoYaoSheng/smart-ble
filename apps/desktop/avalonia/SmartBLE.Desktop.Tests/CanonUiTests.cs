using System;
using SmartBLE.Desktop.ViewModels;
using Xunit;

namespace SmartBLE.Desktop.Tests;

// 20260920-VWIN-UIALIGN：正典 UI 纯函数锚点（广播 31B 预算 / 信号档位 /
// bt-chip 五态词 / SHID 档案匹配），口径逐条对齐 E-WIN app.js 同名实现。
public class CanonUiTests
{
    // —— P008 预算（app.js calcAdvertiseBytes：2+len / 2+字节 / 4+数据长） ——

    [Fact]
    public void CalcAdvertiseBytes_DefaultForm_MatchesElectronDefaults()
    {
        // E-WIN 默认表单：SmartBLE(8 字符) + FFE0 + 0001 + BLE
        // name=2+8=10 / uuid=2+2=4 / mfg=4+3=7 → 21
        var b = CanonUi.CalcAdvertiseBytes("SmartBLE", "FFE0", "0001", "BLE");
        Assert.Equal(10, b.Name);
        Assert.Equal(4, b.Uuid);
        Assert.Equal(7, b.Mfg);
        Assert.Equal(21, b.Total);
    }

    [Theory]
    [InlineData("", "", "", "", 0)]                    // 空表单全不计
    [InlineData("AB", "", "", "", 4)]                  // 仅名称 2+2
    [InlineData("", "XYZW", "", "", 0)]                // 非法 UUID（非 HEX）不计字节
    [InlineData("", "12345678", "", "", 6)]            // 8 位合法 → 2+4
    [InlineData("", "12345678-1234-1234-1234-123456789abc", "", "", 0)] // 17 位非法不计
    [InlineData("", "12345678-1234-1234-1234-123456789abcd", "", "", 0)] // 36 位带杠非纯 HEX 不计（JS 同口径）
    [InlineData("", "123456781234123412341234567890ABCDEF", "", "", 20)] // 36 位纯 HEX → 2+18
    [InlineData("", "", "0001", "", 4)]                // 仅厂商 ID（mfgId 真值即计 4+0，JS 同口径）
    public void CalcAdvertiseBytes_EdgeCases(string name, string uuid,
        string mfgId, string mfgData, int expectedTotal)
    {
        Assert.Equal(expectedTotal,
            CanonUi.CalcAdvertiseBytes(name, uuid, mfgId, mfgData).Total);
    }

    [Fact]
    public void CalcAdvertiseBytes_Over31_Flagged()
    {
        var over = CanonUi.CalcAdvertiseBytes(new string('N', 30), "", "", "");
        Assert.True(over.Total > 31);
        var under = CanonUi.CalcAdvertiseBytes("SmartBLE", "FFE0", "0001", "BLE");
        Assert.True(under.Total <= 31);
    }

    [Theory]
    [InlineData("FFE0", true)]
    [InlineData("12345678", true)]
    [InlineData("123456781234123412341234567890ABCDEF", true)] // 36 位纯 HEX（带杠不算，JS 同口径）
    [InlineData("123", false)]
    [InlineData("12345", false)]
    [InlineData("XYZW", false)]      // 非 HEX
    [InlineData("", false)]
    public void IsValidBroadcastUuid_Accepts4_8_36HexOnly(string uuid, bool expected)
    {
        Assert.Equal(expected, CanonUi.IsValidBroadcastUuid(uuid));
    }

    // —— C1 信号档位（DeviceCard.js：≥-60 q4 / ≥-70 q3 / ≥-80 q2 / 其余 q1） ——

    [Theory]
    [InlineData(-50, 4)]
    [InlineData(-60, 4)]
    [InlineData(-61, 3)]
    [InlineData(-70, 3)]
    [InlineData(-71, 2)]
    [InlineData(-80, 2)]
    [InlineData(-81, 1)]
    [InlineData(-100, 1)]
    public void SigQuality_BandsMatchCanon(int rssi, int expected)
    {
        Assert.Equal(expected, CanonUi.SigQuality(rssi));
    }

    // —— bt-chip 五态（N3 正典词：未开启=红 / 不支持=灰 / 未知=初始化中…） ——

    [Theory]
    [InlineData("On", "蓝牙就绪", "on")]
    [InlineData("Off", "蓝牙未开启", "off")]
    [InlineData("Unauthorized", "蓝牙未开启", "off")]
    [InlineData("Unavailable", "平台不支持", "")]
    [InlineData("Whatever", "初始化中…", "")]
    [InlineData("", "初始化中…", "")]
    public void CanonicalBtChip_FiveStatesUseCanonWords(string state, string word, string dot)
    {
        Assert.Equal((word, dot), CanonUi.CanonicalBtChip(state));
    }

    // —— SHID 档案匹配（强=adv 服务 UUID / 弱=名称前缀 / 0=不匹配） ——

    [Fact]
    public void MatchScannedDevice_StrongWhenAdvCarriesHidService()
    {
        Assert.Equal(2, CanonUi.MatchScannedDevice("随便什么名字",
            new[] { "9F1D1001-E73B-4C8F-9D2A-6F0B5E8A1C04" })); // 大写带杠也命中
        Assert.Equal(2, CanonUi.MatchScannedDevice("",
            new[] { "00001800-0000-1000-8000-00805f9b34fb", "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04" }));
    }

    [Fact]
    public void MatchScannedDevice_WeakWhenNamePrefixOnly()
    {
        Assert.Equal(1, CanonUi.MatchScannedDevice("SHID-00000001", null));
        Assert.Equal(1, CanonUi.MatchScannedDevice("shid-lower", Array.Empty<string>()));
    }

    [Fact]
    public void MatchScannedDevice_ZeroWhenNeitherSignal()
    {
        Assert.Equal(0, CanonUi.MatchScannedDevice("普通设备", new[] { "1800" }));
        Assert.Equal(0, CanonUi.MatchScannedDevice("", null));
    }
}
