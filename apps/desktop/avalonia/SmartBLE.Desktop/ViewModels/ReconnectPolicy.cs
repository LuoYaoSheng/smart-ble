using System;
using System.Threading;
using System.Threading.Tasks;

namespace SmartBLE.Desktop.ViewModels;

internal static class ReconnectPolicy
{
    internal static async Task<bool> RunAsync(Func<bool> ownsDisconnectedSession, Func<Task> connect,
        Action<Exception> failed, CancellationToken token, Func<TimeSpan, CancellationToken, Task>? delay = null)
    {
        delay ??= Task.Delay;
        foreach (var seconds in new[] { 1, 3, 5 })
        {
            if (!ownsDisconnectedSession()) return false;
            await delay(TimeSpan.FromSeconds(seconds), token);
            // The user can disconnect/select a new session while the backoff is pending.
            if (!ownsDisconnectedSession()) return false;
            token.ThrowIfCancellationRequested();
            try { await connect(); return true; }
            catch (OperationCanceledException) when (token.IsCancellationRequested) { throw; }
            catch (Exception error) { failed(error); }
        }
        return false;
    }
}
