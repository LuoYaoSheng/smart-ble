using System;
using System.Text;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace SmartBLE.Desktop.ViewModels;

internal static class HidProvisioning
{
    internal interface ITransport
    {
        event Action<byte[]> StatusReceived;
        Task<byte[]?> ReadInfoAsync();
        Task<bool> SubscribeAsync(bool enable);
        Task<bool> WriteFrameAsync(byte[] frame);
    }
    internal sealed record Result(bool Ok, HidProtocol.DeviceInfo Info, HidProtocol.DeviceStatus Status);

    internal static async Task<Result> RunAsync(ITransport transport, string candidate,
        Action<HidProtocol.DeviceStatus> onStatus, CancellationToken token, TimeSpan? timeout = null)
    {
        var frames = HidProtocol.Frames(Encoding.UTF8.GetBytes(candidate), HidProtocol.ChunkSize(23));
        var bytes = await transport.ReadInfoAsync().WaitAsync(token);
        var info = bytes == null ? null : HidProtocol.ParseInfo(Encoding.UTF8.GetString(bytes));
        if (!HidProtocol.Compatible(info))
            throw new InvalidOperationException("设备身份或协议不匹配，未下发配置");
        var channel = Channel.CreateUnbounded<HidProtocol.DeviceStatus>();
        void Receive(byte[] data)
        {
            var status = HidProtocol.ParseStatus(Encoding.UTF8.GetString(data));
            if (status != null) channel.Writer.TryWrite(status);
        }
        transport.StatusReceived += Receive;
        var subscribed = false;
        try
        {
            if (!await transport.SubscribeAsync(true).WaitAsync(token)) throw new InvalidOperationException("STATUS 订阅失败，未下发配置");
            subscribed = true;
            // Ignore an initial ready snapshot from an earlier provisioning attempt.
            while (channel.Reader.TryRead(out _)) { }
            foreach (var frame in frames)
            {
                token.ThrowIfCancellationRequested();
                if (!await transport.WriteFrameAsync(frame).WaitAsync(token)) throw new InvalidOperationException("配置帧写入失败");
                if (frame[0] + 1 < frame[1]) await Task.Delay(30, token);
            }
            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(token);
            deadline.CancelAfter(timeout ?? TimeSpan.FromSeconds(60));
            var observedAttempt = false;
            while (true)
            {
                HidProtocol.DeviceStatus status;
                try { status = await channel.Reader.ReadAsync(deadline.Token); }
                catch (OperationCanceledException) when (!token.IsCancellationRequested) { throw new TimeoutException("等待设备配网状态超时；可重连读取状态，不能据此判断设备配置已撤销"); }
                token.ThrowIfCancellationRequested();
                onStatus(status);
                observedAttempt |= status.Step == "received" || status.State is "provisioning" or "connecting_wifi" or "pairing" or "mqtt_connecting";
                if (status.Error != null || status.State is "error" or "recovery") return new Result(false, info!, status);
                if (status.State == "ready" && observedAttempt)
                {
                    var final = await transport.ReadInfoAsync().WaitAsync(token);
                    var confirmed = final == null ? null : HidProtocol.ParseInfo(Encoding.UTF8.GetString(final));
                    return new Result(true, confirmed ?? info!, status);
                }
            }
        }
        finally
        {
            transport.StatusReceived -= Receive;
            if (subscribed) { try { await transport.SubscribeAsync(false); } catch { } }
        }
    }
}
