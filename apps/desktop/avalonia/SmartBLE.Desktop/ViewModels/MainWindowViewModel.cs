using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace SmartBLE.Desktop.ViewModels;

public partial class MainWindowViewModel : ObservableObject
{
    private readonly BleService _bleService = new();

    [ObservableProperty]
    private string _bluetoothStatusText = "初始化中...";

    [ObservableProperty]
    private string _bluetoothStatusColor = "#8E8E93";

    [ObservableProperty]
    private string _scanButtonText = "开始扫描";

    [ObservableProperty]
    private bool _isScanning;

    [ObservableProperty]
    private int _currentViewIndex;

    [ObservableProperty]
    private string _deviceCountText = "发现 0 台设备";

    [ObservableProperty]
    private bool _isDeviceListEmpty = true;

    [ObservableProperty]
    private string _currentDeviceName = string.Empty;

    [ObservableProperty]
    private string _currentDeviceId = string.Empty;

    [ObservableProperty]
    private string _connectionStatusText = "未连接";

    [ObservableProperty]
    private string _connectionStatusColor = "#FFE8E8";

    [ObservableProperty]
    private bool _hasLogs;

    [ObservableProperty]
    private string _logCountText = "0 条";

    public ObservableCollection<BleDeviceViewModel> Devices { get; } = new();
    public ObservableCollection<BleServiceViewModel> Services { get; } = new();
    public ObservableCollection<LogEntry> Logs { get; } = new();

    public MainWindowViewModel()
    {
        _bleService.StateChanged += OnBluetoothStateChanged;
        _bleService.DeviceDiscovered += OnDeviceDiscovered;
        _bleService.DeviceConnected += OnDeviceConnected;
        _bleService.DeviceDisconnected += OnDeviceDisconnected;
        _bleService.ServiceDiscovered += OnServiceDiscovered;

        InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        await _bleService.InitializeAsync();
    }

    private void OnBluetoothStateChanged(string state)
    {
        Dispatcher.UIThread.Post(() =>
        {
            BluetoothStatusText = state switch
            {
                "On" => "蓝牙已开启",
                "Off" => "蓝牙已关闭",
                "Unavailable" => "蓝牙不可用",
                _ => "状态未知"
            };

            BluetoothStatusColor = state switch
            {
                "On" => "#34C759",
                "Off" => "#8E8E93",
                "Unavailable" => "#FF3B30",
                _ => "#8E8E93"
            };
        });
    }

    private void OnDeviceDiscovered(BleDevice device)
    {
        Dispatcher.UIThread.Post(() =>
        {
            var existing = Devices.FirstOrDefault(d => d.Id == device.Id);
            if (existing == null)
            {
                Devices.Add(new BleDeviceViewModel(device));
            }
            else
            {
                existing.Update(device);
            }

            DeviceCountText = $"发现 {Devices.Count} 台设备";
            IsDeviceListEmpty = Devices.Count == 0;
        });
    }

    private void OnDeviceConnected(string deviceId)
    {
        Dispatcher.UIThread.Post(() =>
        {
            AddLog("设备已连接", LogType.Success);
            ConnectionStatusText = "已连接";
            ConnectionStatusColor = "#E8F8EE";
        });
    }

    private void OnDeviceDisconnected(string deviceId)
    {
        Dispatcher.UIThread.Post(() =>
        {
            AddLog("设备已断开", LogType.Info);
        });
    }

    private void OnServiceDiscovered(BleServiceInfo[] services)
    {
        Dispatcher.UIThread.Post(() =>
        {
            Services.Clear();
            foreach (var service in services)
            {
                Services.Add(new BleServiceViewModel(service));
            }

            AddLog($"发现 {services.Length} 个服务", LogType.Info);
        });
    }

    [RelayCommand]
    private async Task StartScanAsync()
    {
        if (IsScanning)
        {
            await _bleService.StopScanAsync();
            IsScanning = false;
            ScanButtonText = "开始扫描";
        }
        else
        {
            Devices.Clear();
            IsDeviceListEmpty = true;
            DeviceCountText = "发现 0 台设备";

            await _bleService.StartScanAsync();
            IsScanning = true;
            ScanButtonText = "停止扫描";
        }
    }

    [RelayCommand]
    private async Task ConnectToDeviceAsync(string deviceId)
    {
        var device = Devices.FirstOrDefault(d => d.Id == deviceId);
        if (device == null) return;

        CurrentDeviceName = device.Name;
        CurrentDeviceId = device.Id;

        AddLog("正在连接设备...", LogType.Info);
        ConnectionStatusText = "连接中";
        ConnectionStatusColor = "#FFF5E8";

        await _bleService.ConnectAsync(deviceId);

        CurrentViewIndex = 1;
    }

    [RelayCommand]
    private void GoBack()
    {
        CurrentViewIndex = 0;
        Services.Clear();
        Logs.Clear();
        HasLogs = false;
    }

    [RelayCommand]
    private async Task DisconnectAsync()
    {
        await _bleService.DisconnectAsync();
        GoBack();
    }

    [RelayCommand]
    private void ClearLogs()
    {
        Logs.Clear();
        HasLogs = false;
    }

    private void AddLog(string message, LogType type)
    {
        var icon = type switch
        {
            LogType.Info => "ℹ️",
            LogType.Success => "✅",
            LogType.Error => "❌",
            LogType.Receive => "📥",
            _ => "ℹ️"
        };

        Logs.Insert(0, new LogEntry
        {
            Icon = icon,
            Message = message,
            Timestamp = DateTime.Now.ToString("HH:mm:ss"),
            Type = type
        });

        HasLogs = true;
        LogCountText = $"{Logs.Count} 条";
    }
}

// Models
public record BleDevice(string Id, string Name, int Rssi);

public class BleDeviceViewModel
{
    public string Id { get; }
    public string Name { get; private set; }
    public string DeviceId => Id;
    public int Rssi { get; private set; }
    public string RssiText => $"{Rssi} dBm";

    public BleDeviceViewModel(BleDevice device)
    {
        Id = device.Id;
        Name = device.Name;
        Rssi = device.Rssi;
    }

    public void Update(BleDevice device)
    {
        Name = device.Name;
        Rssi = device.Rssi;
    }
}

public record BleServiceInfo(string Uuid, string Name, BleCharacteristicInfo[] Characteristics);

public class BleServiceViewModel
{
    public string Uuid { get; }
    public string Name { get; }
    public string CharacteristicCountText => $"{Characteristics.Length} 特征值";
    public BleCharacteristicInfo[] Characteristics { get; }

    public BleServiceViewModel(BleServiceInfo service)
    {
        Uuid = service.Uuid;
        Name = service.Name;
        Characteristics = service.Characteristics;
    }
}

public record BleCharacteristicInfo(string Uuid, string Name, string[] Properties);

public class LogEntry
{
    public string Icon { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public LogType Type { get; set; }
}

public enum LogType
{
    Info,
    Success,
    Error,
    Receive
}
