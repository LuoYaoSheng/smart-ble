using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using SmartBLE.Desktop.ViewModels;
using Xunit;

namespace SmartBLE.Desktop.Tests;

public class HidProvisioningTests
{
    private sealed class Transport : HidProvisioning.ITransport
    {
        public event Action<byte[]>? StatusReceived;
        public string Info = "{\"product\":\"smart-hid\",\"protocol\":\"1.0\",\"device_id\":\"HID-00000001\"}";
        public List<byte[]> Frames = new();
        public List<bool> Subscriptions = new();
        public Action? LastFrame;
        public bool SubscribeSuccess = true;
        public Task<byte[]?> ReadInfoAsync() => Task.FromResult<byte[]?>(Encoding.UTF8.GetBytes(Info));
        public Task<bool> SubscribeAsync(bool enable) { Subscriptions.Add(enable); if (enable) Emit("ready", "ready"); return Task.FromResult(SubscribeSuccess); }
        public Task<bool> WriteFrameAsync(byte[] frame) { Frames.Add(frame); if (frame[0] + 1 == frame[1]) LastFrame?.Invoke(); return Task.FromResult(true); }
        public void Emit(string state, string step, string? error = null) => StatusReceived?.Invoke(Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(new { state, step, error })));
    }
    private static string Candidate => HidProtocol.Candidate("Home", "private", "hub.lan", 17892, "0123456789abcdef0123456789abcdef");

    [Fact]
    public async Task IdentityMismatchStopsBeforeAnySubscriptionOrWrite()
    {
        var transport = new Transport { Info = "{\"product\":\"other\",\"protocol\":\"1.0\",\"device_id\":\"other\"}" };
        await Assert.ThrowsAsync<InvalidOperationException>(() => HidProvisioning.RunAsync(transport, Candidate, _ => { }, CancellationToken.None));
        Assert.Empty(transport.Frames); Assert.Empty(transport.Subscriptions);
    }
    [Fact]
    public async Task SubscriptionFailureNeverSendsCredentials()
    {
        var transport = new Transport { SubscribeSuccess = false };
        await Assert.ThrowsAsync<InvalidOperationException>(() => HidProvisioning.RunAsync(transport, Candidate, _ => { }, CancellationToken.None));
        Assert.Empty(transport.Frames);
    }
    [Fact]
    public async Task InitialReadyCannotApproveNewProvisioningAndTimeoutUnsubscribes()
    {
        var transport = new Transport();
        await Assert.ThrowsAsync<TimeoutException>(() => HidProvisioning.RunAsync(transport, Candidate, _ => { }, CancellationToken.None, TimeSpan.FromMilliseconds(20)));
        Assert.Equal(new[] { true, false }, transport.Subscriptions);
        Assert.NotEmpty(transport.Frames);
    }
    [Fact]
    public async Task CurrentAttemptReceiptsFinishAndUnsubscribe()
    {
        var transport = new Transport();
        transport.LastFrame = () => { transport.Emit("provisioning", "received"); transport.Emit("ready", "ready"); };
        var result = await HidProvisioning.RunAsync(transport, Candidate, _ => { }, CancellationToken.None);
        Assert.True(result.Ok); Assert.Equal("HID-00000001", result.Info.DeviceId);
        Assert.Equal(new[] { true, false }, transport.Subscriptions);
    }
    [Fact]
    public async Task DeviceErrorStopsWithoutRetryingCredentialWrites()
    {
        var transport = new Transport();
        transport.LastFrame = () => transport.Emit("error", "connecting_wifi", "wifi_failed");
        var result = await HidProvisioning.RunAsync(transport, Candidate, _ => { }, CancellationToken.None);
        Assert.False(result.Ok); Assert.Equal("wifi_failed", result.Status.Error);
        Assert.Equal(new[] { true, false }, transport.Subscriptions);
    }
    [Fact]
    public async Task CancellationUnsubscribesWithoutClaimingRollback()
    {
        var transport = new Transport(); using var cts = new CancellationTokenSource();
        transport.LastFrame = () => cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => HidProvisioning.RunAsync(transport, Candidate, _ => { }, cts.Token));
        Assert.Equal(new[] { true, false }, transport.Subscriptions);
    }
}
