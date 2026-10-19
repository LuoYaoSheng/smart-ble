using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartBLE.Desktop.ViewModels;
using Xunit;

namespace SmartBLE.Desktop.Tests;

public class ReconnectPolicyTests
{
    [Fact]
    public async Task ThreeFailuresUseOneThreeFiveSecondsAndStop()
    {
        var delays = new List<double>(); var attempts = 0;
        var recovered = await ReconnectPolicy.RunAsync(() => true, () => { attempts++; throw new InvalidOperationException(); }, _ => { }, CancellationToken.None,
            (delay, _) => { delays.Add(delay.TotalSeconds); return Task.CompletedTask; });
        Assert.False(recovered); Assert.Equal(3, attempts); Assert.Equal(new double[] { 1, 3, 5 }, delays);
    }
    [Fact]
    public async Task ManualDisconnectDuringBackoffNeverAccessesDevice()
    {
        var owned = true;
        var recovered = await ReconnectPolicy.RunAsync(() => owned, () => throw new Exception("must not access device"), _ => { }, CancellationToken.None,
            (_, _) => { owned = false; return Task.CompletedTask; });
        Assert.False(recovered);
    }
    [Fact]
    public async Task SuccessStopsRemainingAttempts()
    {
        var attempts = 0;
        Assert.True(await ReconnectPolicy.RunAsync(() => true, () => { attempts++; return Task.CompletedTask; }, _ => { }, CancellationToken.None,
            (_, _) => Task.CompletedTask));
        Assert.Equal(1, attempts);
    }
}
