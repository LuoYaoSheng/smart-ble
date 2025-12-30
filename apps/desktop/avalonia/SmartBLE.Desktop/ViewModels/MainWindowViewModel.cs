using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
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
    private bool _showFilterPanel;

    // Filter properties
    [ObservableProperty]
    private int _filterRssi = -100;

    [ObservableProperty]
    private string _filterNamePrefix = string.Empty;

    [ObservableProperty]
    private bool _filterHideUnnamed;

    [ObservableProperty]
    private int _filteredDeviceCount;

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

    // Write dialog properties
    [ObservableProperty]
    private bool _showWriteDialog;

    [ObservableProperty]
    private string _writeDialogTitle = string.Empty;

    [ObservableProperty]
    private string _writeInputText = string.Empty;

    [ObservableProperty]
    private bool _isHexWriteMode = true;

    [ObservableProperty]
    private string _writeHintText = "输入十六进制数据 (例: FF 01 AA)";

    private string _currentWriteServiceUuid = string.Empty;
    private string _currentWriteCharacteristicUuid = string.Empty;

    public ObservableCollection<BleDeviceViewModel> Devices { get; } = new();
    public ObservableCollection<BleDeviceViewModel> FilteredDevices { get; } = new();
    public ObservableCollection<BleServiceViewModel> Services { get; } = new();
    public ObservableCollection<LogEntry> Logs { get; } = new();

    private readonly Dictionary<string, bool> _notifyingCharacteristics = new();

    public MainWindowViewModel()
    {
        _bleService.StateChanged += OnBluetoothStateChanged;
        _bleService.DeviceDiscovered += OnDeviceDiscovered;
        _bleService.DeviceConnected += OnDeviceConnected;
        _bleService.DeviceDisconnected += OnDeviceDisconnected;
        _bleService.ServiceDiscovered += OnServiceDiscovered;
        _bleService.CharacteristicValueChanged += OnCharacteristicValueChanged;
        _bleService.LogMessage += OnLogMessage;

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

            ApplyFilters();
        });
    }

    private void ApplyFilters()
    {
        FilteredDevices.Clear();

        foreach (var device in Devices)
        {
            // RSSI filter
            if (FilterRssi > -100 && device.Rssi < FilterRssi)
                continue;

            // Name prefix filter
            if (!string.IsNullOrEmpty(FilterNamePrefix) &&
                !string.IsNullOrEmpty(device.Name) &&
                !device.Name.StartsWith(FilterNamePrefix, StringComparison.OrdinalIgnoreCase))
                continue;

            // Hide unnamed filter
            if (FilterHideUnnamed && string.IsNullOrEmpty(device.Name))
                continue;

            FilteredDevices.Add(device);
        }

        // Sort by RSSI (strongest first)
        var sorted = FilteredDevices.OrderByDescending(d => d.Rssi).ToList();
        FilteredDevices.Clear();
        foreach (var device in sorted)
        {
            FilteredDevices.Add(device);
        }

        DeviceCountText = FilteredDevices.Count == Devices.Count
            ? $"发现 {Devices.Count} 台设备"
            : $"显示 {FilteredDevices.Count} / {Devices.Count} 台";
        IsDeviceListEmpty = FilteredDevices.Count == 0;
    }

    partial void OnFilterRssiChanged(int value)
    {
        ApplyFilters();
    }

    partial void OnFilterNamePrefixChanged(string value)
    {
        ApplyFilters();
    }

    partial void OnFilterHideUnnamedChanged(bool value)
    {
        ApplyFilters();
    }

    [RelayCommand]
    private void ResetFilters()
    {
        FilterRssi = -100;
        FilterNamePrefix = string.Empty;
        FilterHideUnnamed = false;
    }

    [RelayCommand]
    private void ToggleFilterPanel()
    {
        ShowFilterPanel = !ShowFilterPanel;
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
            _notifyingCharacteristics.Clear();
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

    private void OnCharacteristicValueChanged(string characteristicUuid, byte[] data)
    {
        Dispatcher.UIThread.Post(() =>
        {
            var hex = BitConverter.ToString(data).Replace('-', ' ');
            AddLog($"收到数据: {hex}", LogType.Receive);
        });
    }

    private void OnLogMessage(string title, string message)
    {
        Dispatcher.UIThread.Post(() =>
        {
            AddLog(message, message.Contains("成功") ? LogType.Success : LogType.Error);
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
            FilteredDevices.Clear();
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
        _notifyingCharacteristics.Clear();
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
        LogCountText = "0 条";
    }

    [RelayCommand]
    private async Task ReadCharacteristicAsync(string parameter)
    {
        var parts = parameter?.Split('|');
        if (parts?.Length != 2) return;

        var serviceUuid = parts[0];
        var characteristicUuid = parts[1];

        AddLog($"读取特征值 {GetShortUuid(characteristicUuid)}...", LogType.Info);
        var data = await _bleService.ReadCharacteristicAsync(serviceUuid, characteristicUuid);
        if (data != null)
        {
            var hex = BitConverter.ToString(data).Replace('-', ' ');
            AddLog($"读取成功: {hex}", LogType.Success);
        }
    }

    partial void OnIsHexWriteModeChanged(bool value)
    {
        WriteHintText = value ? "输入十六进制数据 (例: FF 01 AA)" : "输入文本数据 (UTF-8)";
    }

    [RelayCommand]
    private void ShowWriteDialog(string parameter)
    {
        var parts = parameter?.Split('|');
        if (parts?.Length != 2) return;

        _currentWriteServiceUuid = parts[0];
        _currentWriteCharacteristicUuid = parts[1];

        WriteDialogTitle = $"写入特征值 {GetShortUuid(parts[1])}";
        WriteInputText = string.Empty;
        IsHexWriteMode = true;
        WriteHintText = "输入十六进制数据 (例: FF 01 AA)";
        ShowWriteDialog = true;
    }

    [RelayCommand]
    private void CloseWriteDialog()
    {
        ShowWriteDialog = false;
        WriteInputText = string.Empty;
    }

    [RelayCommand]
    private async Task ExecuteWriteAsync()
    {
        var text = WriteInputText.Trim();
        if (string.IsNullOrEmpty(text)) return;

        byte[] data;

        if (IsHexWriteMode)
        {
            // HEX mode
            var cleanHex = text.Replace(" ", "").Replace("-", "");
            if (cleanHex.Length % 2 != 0)
            {
                AddLog("HEX 数据长度必须是偶数", LogType.Error);
                return;
            }

            if (!System.Text.RegularExpressions.Regex.IsMatch(cleanHex, @"^[0-9A-Fa-f]+$"))
            {
                AddLog("HEX 数据只能包含 0-9 和 A-F", LogType.Error);
                return;
            }

            data = HexStringToBytes(cleanHex);
        }
        else
        {
            // UTF-8 mode
            data = Encoding.UTF8.GetBytes(text);
        }

        AddLog($"写入 {GetShortUuid(_currentWriteCharacteristicUuid)}: {WriteInputText}", LogType.Info);

        var success = await _bleService.WriteCharacteristicAsync(
            _currentWriteServiceUuid,
            _currentWriteCharacteristicUuid,
            data
        );

        if (success)
        {
            CloseWriteDialog();
        }
    }

    private byte[] HexStringToBytes(string hex)
    {
        var bytes = new byte[hex.Length / 2];
        for (var i = 0; i < bytes.Length; i++)
        {
            bytes[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
        }
        return bytes;
    }

    [RelayCommand]
    private async Task ToggleNotificationAsync(string parameter)
    {
        var parts = parameter?.Split('|');
        if (parts?.Length != 2) return;

        var serviceUuid = parts[0];
        var characteristicUuid = parts[1];

        var key = $"{serviceUuid}-{characteristicUuid}";
        var currentState = _notifyingCharacteristics.ContainsKey(key) && _notifyingCharacteristics[key];

        if (currentState)
        {
            AddLog($"停止通知 {GetShortUuid(characteristicUuid)}...", LogType.Info);
            var success = await _bleService.SetNotificationAsync(serviceUuid, characteristicUuid, false);
            if (success)
            {
                _notifyingCharacteristics[key] = false;
            }
        }
        else
        {
            AddLog($"启用通知 {GetShortUuid(characteristicUuid)}...", LogType.Info);
            var success = await _bleService.SetNotificationAsync(serviceUuid, characteristicUuid, true);
            if (success)
            {
                _notifyingCharacteristics[key] = true;
            }
        }
    }

    public bool IsNotifying(string serviceUuid, string characteristicUuid)
    {
        var key = $"{serviceUuid}-{characteristicUuid}";
        return _notifyingCharacteristics.ContainsKey(key) && _notifyingCharacteristics[key];
    }

    private string GetShortUuid(string uuid)
    {
        return uuid.Length > 8 ? uuid.Substring(4, 4) : uuid;
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
