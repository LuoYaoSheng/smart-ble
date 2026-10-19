using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using SmartBLE.Desktop.ViewModels;
using Xunit;

namespace SmartBLE.Desktop.Tests;

public class HidProtocolTests
{
    [Fact]
    public void SharedProtocolVectorsMatchAvalonia()
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "smart-hid-v1-vectors.json")));
        var constants = doc.RootElement.GetProperty("constants");
        Assert.Equal(HidProtocol.Service, constants.GetProperty("serviceUuid").GetString());
        Assert.Equal(HidProtocol.Version, constants.GetProperty("protocolVersion").GetString());
        var suites = doc.RootElement.GetProperty("suites");
        foreach (var c in suites.GetProperty("qr").GetProperty("cases").EnumerateArray())
        {
            var actual = HidProtocol.ParseQr(c.GetProperty("input").GetString()!); var expect = c.GetProperty("expect");
            Assert.Equal(expect.GetProperty("ok").GetBoolean(), actual != null);
            if (actual != null) { Assert.Equal(expect.GetProperty("token").GetString(), actual.Token); Assert.Equal(expect.GetProperty("host").GetString(), actual.Host); Assert.Equal(expect.GetProperty("port").GetInt32(), actual.Port); }
        }
        foreach (var c in suites.GetProperty("candidate").GetProperty("cases").EnumerateArray())
        {
            var input = c.GetProperty("input"); var expect = c.GetProperty("expect");
            string Build() => HidProtocol.Candidate(input.GetProperty("wifi_ssid").GetString()!, input.GetProperty("wifi_password").GetString()!, input.GetProperty("hub_host").GetString()!, input.TryGetProperty("hub_port", out var p) ? p.GetInt32() : 17892, input.GetProperty("token").GetString()!);
            if (expect.GetProperty("ok").GetBoolean()) Assert.Equal(expect.GetProperty("json").GetString(), Build());
            else Assert.Throws<ArgumentException>(() => Build());
        }
        foreach (var c in suites.GetProperty("framingMtu").GetProperty("cases").EnumerateArray()) Assert.Equal(c.GetProperty("expect").GetInt32(), HidProtocol.ChunkSize(c.GetProperty("mtu").GetInt32()));
        foreach (var c in suites.GetProperty("frames").GetProperty("cases").EnumerateArray())
        {
            var payload = c.TryGetProperty("payloadHex", out var hex) ? Convert.FromHexString(hex.GetString()!) : Enumerable.Repeat(Convert.ToByte(c.GetProperty("fill").GetProperty("byte").GetString()!, 16), c.GetProperty("fill").GetProperty("length").GetInt32()).ToArray();
            var expect = c.GetProperty("expect"); byte[][] Build() => HidProtocol.Frames(payload, c.GetProperty("chunkSize").GetInt32());
            if (expect.GetProperty("ok").GetBoolean()) Assert.Equal(expect.GetProperty("frames").EnumerateArray().Select(v => v.GetString()), Build().Select(f => Convert.ToHexString(f).ToLowerInvariant()));
            else Assert.Throws<ArgumentException>(() => Build());
        }
        foreach (var c in suites.GetProperty("deviceInfo").GetProperty("cases").EnumerateArray())
        {
            var actual = HidProtocol.ParseInfo(c.GetProperty("input").GetString()!); var expect = c.GetProperty("expect");
            Assert.Equal(expect.GetProperty("ok").GetBoolean(), actual != null);
            if (actual != null)
            {
                Assert.Equal(expect.GetProperty("product").GetString(), actual.Product); Assert.Equal(expect.GetProperty("protocol").GetString(), actual.Protocol);
                Assert.Equal(expect.GetProperty("device_id").GetString(), actual.DeviceId); Assert.Equal(expect.GetProperty("firmware").GetString(), actual.Firmware);
                Assert.Equal(expect.GetProperty("state").GetString(), actual.State); Assert.Equal(expect.GetProperty("provisioned").GetBoolean(), actual.Provisioned);
            }
        }
        foreach (var c in suites.GetProperty("status").GetProperty("cases").EnumerateArray())
        {
            var actual = HidProtocol.ParseStatus(c.GetProperty("input").GetString()!); var expect = c.GetProperty("expect");
            Assert.Equal(expect.GetProperty("ok").GetBoolean(), actual != null);
            if (actual != null) { Assert.Equal(expect.GetProperty("state").GetString(), actual.State); Assert.Equal(expect.GetProperty("step").GetString(), actual.Step); Assert.Equal(expect.GetProperty("error").ValueKind == JsonValueKind.Null ? null : expect.GetProperty("error").GetString(), actual.Error); }
        }
        foreach (var c in suites.GetProperty("errorRecovery").GetProperty("cases").EnumerateArray()) Assert.Equal(c.GetProperty("expect").GetString(), HidProtocol.RecoveryAction(c.GetProperty("code").GetString()!));
    }
}
