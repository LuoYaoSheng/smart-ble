using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using SmartBLE.Desktop.ViewModels;
using Xunit;

namespace SmartBLE.Desktop.Tests;

public class OtaEngineTests
{
    private static JsonDocument Fixture() => JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "ota-fixtures.json")));
    private static byte[] Firmware => Encoding.UTF8.GetBytes("abc");
    private static string Manifest { get { using var f = Fixture(); return f.RootElement.GetProperty("manifest").GetRawText(); } }
    private static Task Delay(TimeSpan _, CancellationToken token) { token.ThrowIfCancellationRequested(); return Task.CompletedTask; }
    private sealed class Transport : OtaEngine.ITransport
    {
        public event Action<byte[]>? StatusReceived;
        public event Action? Disconnected;
        public int ChunkSize => 20;
        public List<string> Commands = new();
        public List<CancellationToken> ControlTokens = new(), DataTokens = new();
        public List<byte[]> Data = new();
        public List<bool> Subscriptions = new();
        public bool Ready = true, Success = true, SubscribeSuccess = true;
        public bool Reboot = true, Reconnected;
        public bool HangInfo;
        public Action? InfoEffect;
        public string CurrentVersion = "1.0.0", RebootVersion = "1.2.3", Hardware = "esp32c3";
        public Task<byte[]?> ReadInfoAsync(CancellationToken token)
        {
            InfoEffect?.Invoke();
            return HangInfo ? new TaskCompletionSource<byte[]?>().Task : Task.FromResult<byte[]?>(JsonSerializer.SerializeToUtf8Bytes(new {
                type = "system_info", target = "lightble-peripheral", hardware = Hardware,
                firmware_version = Reconnected ? RebootVersion : CurrentVersion }));
        }
        public Task<bool> ReconnectAsync(CancellationToken token) { token.ThrowIfCancellationRequested(); Reconnected = true; return Task.FromResult(true); }
        public Action? DataEffect, CommitEffect;
        public void Emit(string status, string detail = "") => StatusReceived?.Invoke(JsonSerializer.SerializeToUtf8Bytes(new { type = "ota", status, detail, max_chunk = 20 }));
        public void LoseConnection() => Disconnected?.Invoke();
        public Task<bool> SubscribeAsync(bool enable, CancellationToken token) { Subscriptions.Add(enable); if (enable) Emit("ready"); return Task.FromResult(SubscribeSuccess); }
        public Task<bool> WriteControlAsync(byte[] bytes, CancellationToken token)
        {
            ControlTokens.Add(token);
            var text = Encoding.UTF8.GetString(bytes); Commands.Add(text);
            using var doc = JsonDocument.Parse(text); var op = doc.RootElement.GetProperty("op").GetString();
            if (op == "start" && Ready) Emit("ready");
            if (op == "commit" && Success) { Emit("success"); if (Reboot) LoseConnection(); }
            if (op == "commit") CommitEffect?.Invoke();
            return Task.FromResult(true);
        }
        public Task<bool> WriteDataAsync(byte[] bytes, CancellationToken token) { DataTokens.Add(token); Data.Add(bytes); DataEffect?.Invoke(); return Task.FromResult(true); }
        public string[] Ops => Commands.Select(c => { using var d = JsonDocument.Parse(c); return d.RootElement.GetProperty("op").GetString()!; }).ToArray();
    }
    [Fact]
    public void NativeImplementationsConsumeSameFrozenStatusFixtures()
    {
        using var fixture = Fixture();
        foreach (var frame in fixture.RootElement.GetProperty("statuses").EnumerateArray())
        {
            var kind = frame.GetProperty("kind");
            Assert.Equal(kind.ValueKind == JsonValueKind.Null ? null : kind.GetString(), OtaEngine.ParseStatus(Encoding.UTF8.GetBytes(frame.GetProperty("text").GetString()!))?.Kind);
        }
        Assert.Equal("lightble-peripheral", OtaEngine.Validate(Firmware, Manifest).Target);
    }
#if !PORTABLE_OTA_TESTS
    [Fact]
    public void OtaEntryRequiresControlDataAndNotificationCapabilities()
    {
        BleServiceInfo[] Tree(string control, string data, string status) => new[] {
            new BleServiceInfo(OtaEngine.Service, "OTA", new[] {
                new BleCharacteristicInfo(OtaEngine.Control, "CTRL", new[] { control }),
                new BleCharacteristicInfo(OtaEngine.Data, "DATA", new[] { data }),
                new BleCharacteristicInfo(OtaEngine.Status, "STATUS", new[] { status }) }) };
        Assert.True(MainWindowViewModel.OtaCapable(Tree("write", "writeWithoutResponse", "notify")));
        Assert.False(MainWindowViewModel.OtaCapable(Tree("read", "writeWithoutResponse", "notify")));
        Assert.False(MainWindowViewModel.OtaCapable(Tree("write", "read", "notify")));
        Assert.False(MainWindowViewModel.OtaCapable(Tree("write", "writeWithoutResponse", "read")));
    }
#endif
    [Theory]
    [InlineData("target", "wrong")]
    [InlineData("hardware", "")]
    [InlineData("firmware_version", "v1.2")]
    [InlineData("sha256", "bad")]
    public void ManifestInvalidFieldsAreRejected(string key, string value)
    {
        using var doc = JsonDocument.Parse(Manifest);
        var map = doc.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => (object)p.Value.Clone()); map[key] = value;
        Assert.ThrowsAny<Exception>(() => OtaEngine.Validate(Firmware, JsonSerializer.Serialize(map)));
    }
    [Fact]
    public async Task InvalidPackageDoesNotTouchDevice()
    {
        var transport = new Transport();
        await Assert.ThrowsAnyAsync<Exception>(() => OtaEngine.RunAsync(transport, Encoding.UTF8.GetBytes("bad"), Manifest, _ => { }, CancellationToken.None));
        Assert.Empty(transport.Commands); Assert.Empty(transport.Subscriptions);
    }
    [Fact]
    public async Task RealReadyAndCommitSuccessProduceExactControlContract()
    {
        var transport = new Transport(); var progress = new List<int>();
        var result = await OtaEngine.RunAsync(transport, Firmware, Manifest, progress.Add, CancellationToken.None, delay: Delay);
        Assert.Equal(new[] { "start", "commit" }, transport.Ops);
        using var start = JsonDocument.Parse(transport.Commands[0]);
        Assert.Equal(7, start.RootElement.EnumerateObject().Count());
        Assert.Equal(result.Hardware, start.RootElement.GetProperty("hardware").GetString());
        Assert.Equal(result.Version, start.RootElement.GetProperty("target_version").GetString());
        Assert.Equal(Firmware, transport.Data.SelectMany(b => b).ToArray());
        Assert.Equal(100, progress.Last()); Assert.Equal(new[] { true, false }, transport.Subscriptions);
    }
    [Fact]
    public async Task SubscriptionFailureNeverStartsOta()
    {
        var transport = new Transport { SubscribeSuccess = false };
        await Assert.ThrowsAnyAsync<Exception>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, _ => { }, CancellationToken.None));
        Assert.Empty(transport.Commands);
    }
    [Fact]
    public async Task ReadyTimeoutAttemptsAbortAndUnsubscribes()
    {
        var transport = new Transport { Ready = false };
        await Assert.ThrowsAsync<TimeoutException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, _ => { }, CancellationToken.None, TimeSpan.FromMilliseconds(10), Delay));
        Assert.Equal(new[] { "start", "abort" }, transport.Ops); Assert.Equal(new[] { true, false }, transport.Subscriptions);
    }
    [Fact]
    public async Task PrematureSuccessCannotCompleteTheCommit()
    {
        var transport = new Transport { Success = false }; var progress = new List<int>();
        transport.DataEffect = () => transport.Emit("success");
        await Assert.ThrowsAsync<TimeoutException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, progress.Add, CancellationToken.None, TimeSpan.FromMilliseconds(10), Delay));
        Assert.DoesNotContain(100, progress); Assert.Equal("abort", transport.Ops.Last());
    }
    [Fact]
    public async Task DeviceErrorPreventsCommit()
    {
        var transport = new Transport(); transport.DataEffect = () => transport.Emit("error", "hash_mismatch");
        await Assert.ThrowsAsync<InvalidOperationException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, _ => { }, CancellationToken.None, delay: Delay));
        Assert.DoesNotContain("commit", transport.Ops); Assert.Equal("abort", transport.Ops.Last());
    }
    [Fact]
    public async Task CancellationCleansSubscriptionsAndAttemptsAbort()
    {
        var transport = new Transport(); using var cts = new CancellationTokenSource(); transport.DataEffect = cts.Cancel;
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, _ => { }, cts.Token, delay: Delay));
        Assert.Equal("abort", transport.Ops.Last()); Assert.Equal(new[] { true, false }, transport.Subscriptions);
        Assert.True(transport.DataTokens[0].CanBeCanceled);
        Assert.NotEqual(cts.Token, transport.ControlTokens.Last());
        Assert.True(transport.ControlTokens.Last().CanBeCanceled);
    }
    [Fact]
    public async Task SuccessReceiptBeforeRebootDisconnectIsNotLost()
    {
        var transport = new Transport(); transport.CommitEffect = transport.LoseConnection;
        var progress = new List<int>();
        var result = await OtaEngine.RunAsync(transport, Firmware, Manifest, progress.Add, CancellationToken.None, delay: Delay);
        Assert.Equal("1.2.3", result.Version); Assert.Equal(100, progress.Last());
        Assert.DoesNotContain("abort", transport.Ops);
    }
    [Fact]
    public async Task LostLinkBeforeSuccessCannotClaimRebootCompletion()
    {
        var transport = new Transport(); transport.DataEffect = transport.LoseConnection;
        await Assert.ThrowsAsync<InvalidOperationException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, _ => { }, CancellationToken.None, delay: Delay));
        Assert.DoesNotContain("commit", transport.Ops);
    }
    [Fact]
    public async Task CommitWithoutObservedRebootCannotClaimSuccess()
    {
        var transport = new Transport { Reboot = false }; var progress = new List<int>();
        await Assert.ThrowsAsync<TimeoutException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, progress.Add, CancellationToken.None, TimeSpan.FromMilliseconds(10), Delay));
        Assert.DoesNotContain(100, progress); Assert.False(transport.Reconnected);
    }
    [Fact]
    public async Task RebootMustReturnActualNewVersion()
    {
        var transport = new Transport { RebootVersion = "1.0.0" }; var progress = new List<int>();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, progress.Add, CancellationToken.None, delay: Delay));
        Assert.Contains("OTA_VERSION_MISMATCH", error.Message); Assert.DoesNotContain(100, progress);
    }
    [Theory]
    [InlineData("1.2.3", "esp32c3")]
    [InlineData("1.0.0", "other-board")]
    public async Task SameVersionAndWrongHardwareNeverStart(string version, string hardware)
    {
        var transport = new Transport { CurrentVersion = version, Hardware = hardware };
        await Assert.ThrowsAsync<InvalidOperationException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, _ => { }, CancellationToken.None));
        Assert.Empty(transport.Commands);
    }
    [Fact]
    public async Task StuckInfoOperationHasDeadlineWithoutExternalCancellation()
    {
        var transport = new Transport { HangInfo = true };
        await Assert.ThrowsAsync<TimeoutException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, _ => { }, CancellationToken.None, operationTimeout: TimeSpan.FromMilliseconds(10)));
        Assert.Empty(transport.Commands);
    }
    [Fact]
    public async Task CancellationDuringFinalInfoCannotTurnGreen()
    {
        var transport = new Transport(); using var cts = new CancellationTokenSource(); var progress = new List<int>();
        transport.InfoEffect = () => { if (transport.Reconnected) cts.Cancel(); };
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => OtaEngine.RunAsync(transport, Firmware, Manifest, progress.Add, cts.Token, delay: Delay));
        Assert.DoesNotContain(100, progress);
    }
}
