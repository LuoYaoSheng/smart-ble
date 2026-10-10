using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace SmartBLE.Desktop.ViewModels;

internal static class OtaEngine
{
    internal const string Service = "4fafc201-1fb5-459e-8fcc-c5c9c331914d";
    internal const string Control = "beb5483e-36e1-4688-b7f5-ea07361b26c0";
    internal const string Data = "beb5483e-36e1-4688-b7f5-ea07361b26c1";
    internal const string Status = "beb5483e-36e1-4688-b7f5-ea07361b26c2";
    internal sealed record Package(string Target, string Hardware, string Version, int Size, string Sha256);
    internal sealed record Receipt(string? Kind, string Status, string Detail, int? MaxChunk);
    internal interface ITransport
    {
        event Action<byte[]> StatusReceived;
        event Action Disconnected;
        int ChunkSize { get; }
        Task<bool> SubscribeAsync(bool enable, CancellationToken token);
        Task<bool> WriteControlAsync(byte[] value, CancellationToken token);
        Task<bool> WriteDataAsync(byte[] value, CancellationToken token);
    }

    internal static Package Validate(byte[] firmware, string manifest)
    {
        using var doc = JsonDocument.Parse(manifest); var m = doc.RootElement;
        var keys = new HashSet<string> { "format_version", "target", "hardware", "firmware_version", "size", "sha256" };
        if (m.ValueKind != JsonValueKind.Object || m.EnumerateObject().Count() != 6 || !keys.SetEquals(m.EnumerateObject().Select(p => p.Name))) throw new ArgumentException("manifest 必须包含契约六字段，且不能含未知字段");
        if (m.GetProperty("format_version").GetInt32() != 1) throw new ArgumentException("manifest 格式版本必须为 1");
        var target = m.GetProperty("target").GetString() ?? "";
        var hardware = m.GetProperty("hardware").GetString() ?? "";
        var version = m.GetProperty("firmware_version").GetString() ?? "";
        if (target is not "lightble-peripheral" and not "lightble-observer") throw new ArgumentException("manifest target 非法");
        if (string.IsNullOrWhiteSpace(hardware)) throw new ArgumentException("manifest hardware 不能为空");
        if (!Regex.IsMatch(version, @"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")) throw new ArgumentException("manifest firmware_version 非 SemVer");
        if (firmware.Length == 0 || m.GetProperty("size").GetInt64() != firmware.Length) throw new ArgumentException("固件 size 与 manifest 不符");
        var hash = Convert.ToHexString(SHA256.HashData(firmware)).ToLowerInvariant();
        if (m.GetProperty("sha256").GetString() != hash) throw new ArgumentException("固件 SHA256 与 manifest 不符");
        return new Package(target, hardware, version, firmware.Length, hash);
    }

    internal static Receipt? ParseStatus(byte[] bytes)
    {
        try
        {
            using var doc = JsonDocument.Parse(bytes); var m = doc.RootElement;
            if (m.ValueKind != JsonValueKind.Object || !m.TryGetProperty("type", out var type) || type.GetString() != "ota" || !m.TryGetProperty("status", out var value) || value.ValueKind != JsonValueKind.String) return null;
            var status = value.GetString()!.ToLowerInvariant();
            var kind = status is "error" or "failed" or "aborted" ? "error" : status == "ready" ? "ready" : status == "success" ? "success" : null;
            var detail = m.TryGetProperty("detail", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString()! : status;
            int? max = m.TryGetProperty("max_chunk", out var c) && c.TryGetInt32(out var size) ? size : null;
            return new Receipt(kind, status, detail, max);
        }
        catch (JsonException) { return null; }
        catch (InvalidOperationException) { return null; }
    }

    internal static async Task<Package> RunAsync(ITransport transport, byte[] firmware, string manifest, Action<int> progress,
        CancellationToken token, TimeSpan? receiptTimeout = null, Func<TimeSpan, CancellationToken, Task>? delay = null)
    {
        var package = Validate(firmware, manifest);
        var queue = Channel.CreateUnbounded<Receipt>();
        var phase = "starting";
        void Receive(byte[] bytes)
        {
            var receipt = ParseStatus(bytes);
            var currentPhase = Volatile.Read(ref phase);
            if (receipt != null && (receipt.Kind == "error" || receipt.Kind == "ready" && currentPhase == "waiting_ready" || receipt.Kind == "success" && currentPhase == "committing")) queue.Writer.TryWrite(receipt);
        }
        void Disconnected() => queue.Writer.TryWrite(new Receipt("disconnect", "", "OTA 连接已断开；未确认升级完成，需重连核对状态", null));
        async Task<Receipt> Wait(string expected)
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(token);
            timeout.CancelAfter(receiptTimeout ?? TimeSpan.FromSeconds(30));
            while (true)
            {
                Receipt receipt;
                try { receipt = await queue.Reader.ReadAsync(timeout.Token); }
                catch (OperationCanceledException) when (!token.IsCancellationRequested) { throw new TimeoutException($"等待 OTA {expected} 回执超时，未确认升级完成"); }
                token.ThrowIfCancellationRequested();
                if (receipt.Kind is "error" or "disconnect") throw new InvalidOperationException(receipt.Detail);
                if (receipt.Kind == expected) return receipt;
            }
        }
        transport.StatusReceived += Receive; transport.Disconnected += Disconnected;
        var subscribed = false; var started = false; var success = false;
        delay ??= Task.Delay;
        try
        {
            token.ThrowIfCancellationRequested();
            if (!await transport.SubscribeAsync(true, token).WaitAsync(token)) throw new InvalidOperationException("OTA STATUS 订阅失败，未写入设备");
            subscribed = true;
            while (queue.Reader.TryRead(out _)) { }
            var chunk = Math.Clamp(transport.ChunkSize, 1, 180);
            var payload = JsonSerializer.SerializeToUtf8Bytes(new { op = "start", target = package.Target, target_version = package.Version, size = package.Size, chunk_size = chunk, sha256 = package.Sha256 });
            Volatile.Write(ref phase, "waiting_ready"); started = true;
            if (!await transport.WriteControlAsync(payload, token).WaitAsync(token)) throw new InvalidOperationException("OTA start 写入失败");
            var ready = await Wait("ready");
            if (ready.MaxChunk is <= 0) throw new InvalidOperationException("设备返回非法 max_chunk");
            chunk = Math.Min(chunk, ready.MaxChunk ?? chunk);
            Volatile.Write(ref phase, "transferring");
            var lastPercent = -1;
            for (var offset = 0; offset < firmware.Length; offset += chunk)
            {
                token.ThrowIfCancellationRequested();
                while (queue.Reader.TryRead(out var receipt))
                    if (receipt.Kind is "error" or "disconnect") throw new InvalidOperationException(receipt.Detail);
                var value = firmware.AsSpan(offset, Math.Min(chunk, firmware.Length - offset)).ToArray();
                if (!await transport.WriteDataAsync(value, token).WaitAsync(token)) throw new InvalidOperationException("OTA DATA 写入失败，未确认升级完成");
                var percent = Math.Min(99, (int)((long)(offset + value.Length) * 100 / firmware.Length));
                if (percent != lastPercent) { progress(percent); lastPercent = percent; }
                await delay(TimeSpan.FromMilliseconds(20), token);
            }
            while (queue.Reader.TryRead(out var pending))
                if (pending.Kind is "error" or "disconnect") throw new InvalidOperationException(pending.Detail);
            Volatile.Write(ref phase, "committing");
            if (!await transport.WriteControlAsync(Encoding.UTF8.GetBytes("{\"op\":\"commit\"}"), token).WaitAsync(token)) throw new InvalidOperationException("OTA commit 写入失败");
            await Wait("success");
            success = true; progress(100);
            return package;
        }
        finally
        {
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            if (started && !success) { try { await transport.WriteControlAsync(Encoding.UTF8.GetBytes("{\"op\":\"abort\"}"), cleanup.Token).WaitAsync(cleanup.Token); } catch { } }
            using var unsubscribe = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            if (subscribed) { try { await transport.SubscribeAsync(false, unsubscribe.Token).WaitAsync(unsubscribe.Token); } catch { } }
            transport.StatusReceived -= Receive; transport.Disconnected -= Disconnected;
        }
    }
}
