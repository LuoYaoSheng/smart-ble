using System;
using System.Threading.Tasks;
using SmartBLE.Desktop.ViewModels;
using Xunit;

namespace SmartBLE.Desktop.Tests;

public class BluetoothAvailabilityTests
{
    [Theory]
    [InlineData(true, false, false, "Unknown", "NoAdapter")]
    [InlineData(false, false, false, "Unknown", "Unsupported")]
    [InlineData(true, true, false, "On", "UnsupportedAdapter")]
    [InlineData(true, true, true, "Off", "Off")]
    [InlineData(true, true, true, "Disabled", "Disabled")]
    [InlineData(true, true, true, "On", "On")]
    public void HardwareAbsenceIsDistinctFromApiSupportAndPower(bool platform, bool adapter, bool ble, string radio, string expected)
        => Assert.Equal(expected, BluetoothAvailability.Resolve(platform, adapter, ble, radio));

    [Fact]
    public void DetectionErrorCannotBeInventedAsUnsupportedPlatform()
    {
        Assert.Equal("Error", BluetoothAvailability.ExceptionState(new TimeoutException()));
        Assert.Equal("Unauthorized", BluetoothAvailability.ExceptionState(new UnauthorizedAccessException()));
        Assert.Equal("Unsupported", BluetoothAvailability.ExceptionState(new PlatformNotSupportedException()));
    }

    [Theory]
    [InlineData("NoAdapter")]
    [InlineData("Off")]
    [InlineData("Disabled")]
    [InlineData("Unsupported")]
    [InlineData("Unauthorized")]
    [InlineData("Error")]
    public async Task UnavailableStateNeverStartsWatcherOrFakesScanning(string state)
    {
        var service = new BleService(() => Task.FromResult(state));
        var observed = "";
        service.StateChanged += value => observed = value;
        Assert.False(await service.StartScanAsync());
        Assert.False(service.IsScanning);
        Assert.Equal(state, service.CurrentState);
        Assert.Equal(state, observed);
    }

    [Fact]
    public void ScanCommandAndHintFollowStateWithoutDisablingAnActiveStop()
    {
        var vm = new MainWindowViewModel(new BleService(() => Task.FromResult("NoAdapter")));
        vm.ApplyBluetoothState("NoAdapter");
        Assert.Equal("未检测到蓝牙适配器", vm.BtWord);
        Assert.Contains("适配器", vm.BluetoothHint);
        Assert.False(vm.StartScanCommand.CanExecute(null));
        Assert.False(vm.CanToggleScan);
        Assert.DoesNotContain("扫描完成", vm.ScanStatusText);
        vm.ApplyBluetoothState("Off");
        Assert.Equal("蓝牙未开启", vm.BtWord);
        Assert.False(vm.StartScanCommand.CanExecute(null));
        vm.ApplyBluetoothState("On");
        Assert.True(vm.StartScanCommand.CanExecute(null));
        vm.IsScanning = true;
        vm.ApplyBluetoothState("Off");
        Assert.True(vm.StartScanCommand.CanExecute(null)); // stopping remains possible
        Assert.Equal("停止扫描", vm.ScanButtonLabel);
        vm.IsScanning = false;
        Assert.False(vm.StartScanCommand.CanExecute(null));
    }

    [Fact]
    public async Task AdapterRecheckCanRecoverStateWithoutPretendingToScanHardware()
    {
        var next = "NoAdapter";
        var service = new BleService(() => Task.FromResult(next));
        await service.InitializeAsync();
        Assert.Equal("NoAdapter", service.CurrentState);
        next = "On";
        await service.InitializeAsync();
        Assert.Equal("On", service.CurrentState);
        Assert.False(service.IsScanning);
    }
}
