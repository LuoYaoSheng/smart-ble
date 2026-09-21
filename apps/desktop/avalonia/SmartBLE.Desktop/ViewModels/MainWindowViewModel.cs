using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace SmartBLE.Desktop.ViewModels;

// MainWindowViewModel —— V-WIN 正典 UI 对齐层（20260920-VWIN-UIALIGN）
// 视图路由 / 状态词 / 文案逐条对齐 E-WIN(app.js)/T-WIN 镜像与
// docs/specs/prototype/platform/desktop/high-fi 正典。
public partial class MainWindowViewModel : ObservableObject
{
    private readonly BleService _bleService = new();
    private static readonly ReleaseMetadata.Model Meta = ReleaseMetadata.Load();

    // 产品常量（config/product.js 同源：名称 / 外链 / 功能特性）
    public const string ProductName = "BLE Toolkit+";
    public const string ProductWebsite = "https://lightble.i2kai.com/";
    public const string ProductFeedback = "https://gitee.com/luoyaosheng/smart-ble/issues";
    public static readonly string[] ProductFeatures =
        { "设备扫描", "智能过滤", "快速连接", "数据读写", "通知监听", "广播模式" };

    // 剪贴板由窗口注入（TopLevel.Clipboard 不在 VM 层可达）
    internal Func<string, Task>? ClipboardWriter;

    // 关闭请求（退出确认通过后由窗口执行 Close）
    public event Action? CloseRequested;

    private bool _exitConfirmed;

    public MainWindowViewModel()
    {
        _bleService.StateChanged += OnBluetoothStateChanged;
        _bleService.DeviceDiscovered += OnDeviceDiscovered;
        _bleService.DeviceConnected += OnDeviceConnected;
        _bleService.DeviceDisconnected += OnDeviceDisconnected;
        _bleService.ServiceDiscovered += OnServiceDiscovered;
        _bleService.CharacteristicValueChanged += OnCharacteristicValueChanged;
        _bleService.LogMessage += OnLogMessage;
        _bleService.ScanAutoStopped += OnScanAutoStopped;
        _bleService.AdvertisingStateChanged += OnAdvertisingStateChanged;

        InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        await _bleService.InitializeAsync();
    }

    // ═══════════════════════ 视图路由（.view.active 等价机制） ═══════════════════════

    [ObservableProperty]
    private string _activeView = "scan"; // scan|connected|broadcast|about|versions|gatt|hidprov

    [ObservableProperty]
    private string _activeTab = "scan";  // tabbar 高亮（versions 保持 about）

    public bool IsScanView => ActiveView == "scan";
    public bool IsConnectedView => ActiveView == "connected";
    public bool IsBroadcastView => ActiveView == "broadcast";
    public bool IsAboutView => ActiveView == "about";
    public bool IsVersionsView => ActiveView == "versions";
    public bool IsGattView => ActiveView == "gatt";
    public bool IsHidProvView => ActiveView == "hidprov";

    public bool IsScanTabActive => ActiveTab == "scan";
    public bool IsConnectedTabActive => ActiveTab == "connected";
    public bool IsBroadcastTabActive => ActiveTab == "broadcast";
    public bool IsAboutTabActive => ActiveTab == "about";

    partial void OnActiveViewChanged(string value)
    {
        OnPropertyChanged(nameof(IsScanView));
        OnPropertyChanged(nameof(IsConnectedView));
        OnPropertyChanged(nameof(IsBroadcastView));
        OnPropertyChanged(nameof(IsAboutView));
        OnPropertyChanged(nameof(IsVersionsView));
        OnPropertyChanged(nameof(IsGattView));
        OnPropertyChanged(nameof(IsHidProvView));
    }

    partial void OnActiveTabChanged(string value)
    {
        OnPropertyChanged(nameof(IsScanTabActive));
        OnPropertyChanged(nameof(IsConnectedTabActive));
        OnPropertyChanged(nameof(IsBroadcastTabActive));
        OnPropertyChanged(nameof(IsAboutTabActive));
    }

    [RelayCommand]
    private async Task SwitchTabAsync(string tab)
    {
        // 正典：切换 Tab 时停止扫描（E-WIN switchTab 对 broadcast 的口径推广到全部 Tab）
        if (IsScanning)
            await StopScanInternalAsync();

        // 正典：切出广播页停广播（E/T onHide 口径，WIN-016）
        if (tab != "broadcast" && _bleService.IsAdvertising)
            _bleService.StopAdvertising();

        ActiveTab = tab;
        ActiveView = tab;
        if (tab == "connected") RefreshConnectedPanel();
    }

    // ═══════════════════════ P001 bt-chip 五态（N3 正典词） ═══════════════════════

    [ObservableProperty]
    private string _btWord = "初始化中…";

    [ObservableProperty]
    private string _btDotFill = "#9AA8B6"; // 灰；on=success 绿（带辉光）；off=danger 红

    [ObservableProperty]
    private string _btDotShadow = "";

    private void OnBluetoothStateChanged(string state)
    {
        Dispatcher.UIThread.Post(() =>
        {
            var (word, dotClass) = CanonUi.CanonicalBtChip(state);
            BtWord = word;
            BtDotFill = dotClass switch
            {
                "on" => "#17C7A8",
                "off" => "#F2555F",
                _ => "#9AA8B6"
            };
            BtDotShadow = dotClass == "on" ? "0 0 8 #17C7A88C" : "";
        });
    }

    // ═══════════════════════ P001 扫描（正典 scantool 状态词 / 5s 会话） ═══════════════════════

    [ObservableProperty]
    private bool _isScanning;

    [ObservableProperty]
    private bool _hasScanned;

    [ObservableProperty]
    private bool _showFilterPanel;

    [ObservableProperty]
    private bool _isDeviceListEmpty = true;

    // 空态区分（正典 B6 两文案）：全库空 vs 筛选后空
    public bool IsAllDevicesEmpty => Devices.Count == 0;

    [ObservableProperty]
    private int _filterRssi = -100;   // 正典滑杆域：-100..-40 step5

    [ObservableProperty]
    private string _filterNamePrefix = string.Empty;

    [ObservableProperty]
    private bool _filterHideUnnamed;

    public string ScanStatusText => IsScanning
        ? "扫描中 · 5s 会话"
        : HasScanned ? $"扫描完成 · 发现 {FilteredDevices.Count} 台" : "待开始扫描";

    public string ScanButtonLabel => IsScanning ? "停止扫描" : "开始扫描";

    public string FilterRssiLabel => $"阈值 {FilterRssi} dBm";

    // 最弱信号预设（C3 filter：-40 强 / -60 较好 / -70 一般 / -85 弱）
    public bool IsRssiPreset40 => FilterRssi == -40;
    public bool IsRssiPreset60 => FilterRssi == -60;
    public bool IsRssiPreset70 => FilterRssi == -70;
    public bool IsRssiPreset85 => FilterRssi == -85;

    public string DeviceCountChipText => FilteredDevices.Count.ToString();

    public bool DeviceCountChipVisible => FilteredDevices.Count > 0;

    partial void OnIsScanningChanged(bool value)
    {
        OnPropertyChanged(nameof(ScanStatusText));
        OnPropertyChanged(nameof(ScanButtonLabel));
    }

    partial void OnHasScannedChanged(bool value) => OnPropertyChanged(nameof(ScanStatusText));
    partial void OnFilterRssiChanged(int value)
    {
        OnPropertyChanged(nameof(FilterRssiLabel));
        OnPropertyChanged(nameof(IsRssiPreset40));
        OnPropertyChanged(nameof(IsRssiPreset60));
        OnPropertyChanged(nameof(IsRssiPreset70));
        OnPropertyChanged(nameof(IsRssiPreset85));
        ApplyFilters();
    }

    partial void OnFilterNamePrefixChanged(string value) => ApplyFilters();
    partial void OnFilterHideUnnamedChanged(bool value) => ApplyFilters();

    [RelayCommand]
    private void SetRssiPreset(string preset) => FilterRssi = int.Parse(preset);

    [RelayCommand]
    private void ResetFilters()
    {
        FilterRssi = -100;
        FilterNamePrefix = string.Empty;
        FilterHideUnnamed = false;
    }

    [RelayCommand]
    private void ToggleFilterPanel() => ShowFilterPanel = !ShowFilterPanel;

    [RelayCommand]
    private async Task StartScanAsync()
    {
        if (IsScanning)
        {
            await StopScanInternalAsync();
            return;
        }

        Devices.Clear();
        FilteredDevices.Clear();
        IsDeviceListEmpty = true;
        await _bleService.StartScanAsync();
        IsScanning = true;
    }

    private async Task StopScanInternalAsync()
    {
        await _bleService.StopScanAsync();
        IsScanning = false;
        HasScanned = true;
    }

    private void OnScanAutoStopped()
    {
        Dispatcher.UIThread.Post(() =>
        {
            IsScanning = false;
            HasScanned = true;
        });
    }

    // ═══════════════════════ 设备列表（C1 设备卡 + 档案匹配） ═══════════════════════

    public ObservableCollection<BleDeviceViewModel> Devices { get; } = new();
    public ObservableCollection<BleDeviceViewModel> FilteredDevices { get; } = new();

    private void OnDeviceDiscovered(BleDevice device)
    {
        Dispatcher.UIThread.Post(() =>
        {
            var existing = Devices.FirstOrDefault(d => d.Id == device.Id);
            if (existing == null)
            {
                // 仅新设备触发列表过滤/重排（E-WIN 同口径：新设备重渲染列表）
                Devices.Add(new BleDeviceViewModel(device, IsGattConnected));
                ApplyFilters();
                OnPropertyChanged(nameof(ScanStatusText));
            }
            else
            {
                // 已存在设备只做卡片内 RSSI/匹配态 INPC 更新——不重建列表。
                // 此前每帧广播都 ApplyFilters 全量重建，真机扫描更新风暴可把
                // UI 线程与 UIA 对等层重建搅入死锁（20260920 走查 run7 实证）
                existing.Update(device);
            }
        });
    }

    private void ApplyFilters()
    {
        var filtered = Devices.Where(IsDeviceVisibleByFilter)
            .OrderByDescending(d => d.Rssi)
            .ToList();

        FilteredDevices.Clear();
        foreach (var d in filtered)
            FilteredDevices.Add(d);

        IsDeviceListEmpty = FilteredDevices.Count == 0;
        OnPropertyChanged(nameof(IsAllDevicesEmpty));
        OnPropertyChanged(nameof(DeviceCountChipVisible));
        OnPropertyChanged(nameof(DeviceCountChipText));
        OnPropertyChanged(nameof(ScanStatusText));
    }

    private bool IsDeviceVisibleByFilter(BleDeviceViewModel d)
    {
        if (FilterRssi > -100 && d.Rssi < FilterRssi) return false;
        // 前缀过滤对无名设备一并隐藏（无名设备不满足任何前缀）
        if (!string.IsNullOrEmpty(FilterNamePrefix) &&
            (string.IsNullOrEmpty(d.Name) ||
             !d.Name.StartsWith(FilterNamePrefix, StringComparison.OrdinalIgnoreCase)))
            return false;
        if (FilterHideUnnamed && string.IsNullOrEmpty(d.Name)) return false;
        return true;
    }

    // ═══════════════════════ 会话状态（P006 devhead / P007 已连接页共用） ═══════════════════════

    [ObservableProperty]
    private string _currentDeviceName = string.Empty;

    [ObservableProperty]
    private string _currentDeviceId = string.Empty;

    [ObservableProperty]
    private bool _isGattConnected;

    [ObservableProperty]
    private bool _isGattConnecting;

    public string GattStateWord => IsGattConnected ? "已连接" : IsGattConnecting ? "连接中…" : "未连接";

    public string GattStFill => IsGattConnected ? "#17C7A8" : IsGattConnecting ? "#FF9F43" : "#9AA8B6";

    partial void OnIsGattConnectedChanged(bool value)
    {
        OnPropertyChanged(nameof(GattStateWord));
        OnPropertyChanged(nameof(GattStFill));
        OnPropertyChanged(nameof(ExitConfirmBusyText));
        OnPropertyChanged(nameof(ExitConfirmDetail));
        // 扫描卡「已连接」态同步（连接注册表在本 VM，不在设备对象上）
        foreach (var d in Devices)
            d.SetConnectedHint(value && d.Id == CurrentDeviceId);
    }

    partial void OnIsGattConnectingChanged(bool value)
    {
        OnPropertyChanged(nameof(GattStateWord));
        OnPropertyChanged(nameof(GattStFill));
    }

    // P007 已连接页（单会话 = one 模式；正典两台及以上才出汇总卡）
    public ObservableCollection<BleDeviceViewModel> ConnectedDevices { get; } = new();

    public int ConnectedCount => ConnectedDevices.Count;

    public string ConnectedBadgeText => ConnectedCount.ToString();

    public bool ConnectedBadgeVisible => ConnectedCount > 0;

    private void RefreshConnectedPanel()
    {
        ConnectedDevices.Clear();
        if (IsGattConnected)
        {
            var d = Devices.FirstOrDefault(x => x.Id == CurrentDeviceId)
                    ?? new BleDeviceViewModel(new BleDevice(CurrentDeviceId,
                        CurrentDeviceName, 0, null), true);
            d.SetConnectedHint(true);
            ConnectedDevices.Add(d);
        }

        OnPropertyChanged(nameof(ConnectedCount));
        OnPropertyChanged(nameof(ConnectedBadgeVisible));
        OnPropertyChanged(nameof(ConnectedBadgeText));
    }

    // ═══════════════════════ GATT 服务/特征树（C4 service-panel） ═══════════════════════

    public ObservableCollection<BleServiceViewModel> Services { get; } = new();

    public string ServiceSummaryChip
        => $"{Services.Count} 服务 / {Services.Sum(s => s.Characteristics.Count)} 特征";

    private readonly Dictionary<string, BleCharacteristicViewModel> _charVmByKey = new();

    private void OnServiceDiscovered(BleServiceInfo[]? services)
    {
        Dispatcher.UIThread.Post(() =>
        {
            Services.Clear();
            _charVmByKey.Clear();
            if (services != null)
            {
                foreach (var (service, idx) in services.Select((s, i) => (s, i)))
                {
                    var svm = new BleServiceViewModel(service, idx == 0);
                    foreach (var c in svm.Characteristics)
                        _charVmByKey[c.CommandKey] = c;
                    Services.Add(svm);
                }
            }

            OnPropertyChanged(nameof(ServiceSummaryChip));
            AddLog("sys", $"发现 {Services.Count} 个服务 / " +
                         $"{Services.Sum(s => s.Characteristics.Count)} 特征");
        });
    }

    private void OnDeviceConnected(string deviceId)
    {
        Dispatcher.UIThread.Post(() =>
        {
            IsGattConnected = true;
            IsGattConnecting = false;
            AddLog("ok", "设备已连接");
            RefreshConnectedPanel();
        });
    }

    private void OnDeviceDisconnected(string deviceId)
    {
        Dispatcher.UIThread.Post(() =>
        {
            IsGattConnected = false;
            IsGattConnecting = false;
            foreach (var s in Services)
                foreach (var c in s.Characteristics)
                    c.IsNotifying = false;
            AddLog("sys", "设备已断开");
            RefreshConnectedPanel();

            // P002 会话中断 → 正典 connection_lost 横幅态
            if (ActiveView == "hidprov" && HidIsConnected)
            {
                HidIsConnected = false;
                HidLostBannerVisible = true;
            }
        });
    }

    private void OnCharacteristicValueChanged(string characteristicUuid, byte[] data)
    {
        Dispatcher.UIThread.Post(() =>
            AddLog("recv", $"收到通知 {ShortUuid(characteristicUuid)}: {Hex(data)}"));
    }

    private void OnLogMessage(string title, string message)
    {
        Dispatcher.UIThread.Post(() =>
        {
            var typeKey = title switch
            {
                "读取成功" => "read",
                "写入成功" => "write",
                "收到通知" => "recv",
                "通知已启用" or "通知已禁用" => "ok",
                _ => title.Contains("失败") ? "err" : "sys"
            };
            AddLog(typeKey, message);
        });
    }

    // 连接（卡片「连接」/P006「连接设备」/P002 阶段一共用底层；导航由入口决定）
    [RelayCommand]
    private async Task ConnectToDeviceAsync(string? deviceId)
    {
        var id = deviceId ?? CurrentDeviceId;
        if (string.IsNullOrEmpty(id)) return;

        var device = Devices.FirstOrDefault(d => d.Id == id);
        CurrentDeviceName = device?.DisplayName ?? id;
        CurrentDeviceId = id;

        AddLog("sys", "正在连接设备…");
        IsGattConnecting = true;
        ActiveView = "gatt";
        await _bleService.ConnectAsync(id);
        RefreshConnectedPanel();
    }

    [RelayCommand]
    private void SelectDevice(string deviceId)
    {
        var device = Devices.FirstOrDefault(d => d.Id == deviceId);
        if (device == null) return;
        CurrentDeviceName = device.DisplayName;
        CurrentDeviceId = deviceId;
        ActiveView = "gatt";
    }

    // P006 返回：仅清展示（会话保留，正典 goBack 不断开；P007 已连接页仍可见）
    [RelayCommand]
    private void GoBack()
    {
        ActiveTab = "scan";
        ActiveView = "scan";
        Services.Clear();
        _charVmByKey.Clear();
        Logs.Clear();
        HasLogs = false;
        OnPropertyChanged(nameof(ServiceSummaryChip));
    }

    // 断开=纯会话操作，不导航（E-WIN 口径：断开后停留当前页，P007 列表刷新空态 /
    // P006 devhead 翻「未连接」；返回导航由各页返回键独立承担）
    [RelayCommand]
    private async Task DisconnectAsync()
    {
        await _bleService.DisconnectAsync();
    }

    [RelayCommand]
    private async Task DisconnectAllAsync() => await DisconnectAsync();

    // ═══════════════════════ 读 / 写 / 监听（P006 特征行操作） ═══════════════════════

    [RelayCommand]
    private void ExpandAllServices()
    {
        foreach (var s in Services) s.IsExpanded = true;
    }

    [RelayCommand]
    private void CollapseAllServices()
    {
        foreach (var s in Services) s.IsExpanded = false;
    }

    [RelayCommand]
    private async Task ReadCharacteristicAsync(string parameter)
    {
        var (serviceUuid, charUuid) = SplitCommandKey(parameter);
        if (charUuid == null) return;

        AddLog("sys", $"读取特征值 {ShortUuid(charUuid)}…");
        var data = await _bleService.ReadCharacteristicAsync(serviceUuid!, charUuid);
        if (data != null)
        {
            var text = TryDecodeText(data);
            if (_charVmByKey.TryGetValue(ParameterOf(serviceUuid!, charUuid), out var vm))
                vm.LastValue = text;
        }
    }

    private static (string?, string?) SplitCommandKey(string? parameter)
    {
        var parts = parameter?.Split('|');
        return parts is { Length: 2 } ? (parts[0], parts[1]) : (null, null);
    }

    private static string ParameterOf(string serviceUuid, string charUuid) => $"{serviceUuid}|{charUuid}";

    internal static string ShortUuid(string uuid)
        => uuid.Length > 8 ? uuid.Substring(4, 4).ToUpperInvariant() : uuid.ToUpperInvariant();

    private static string Hex(byte[] data) => BitConverter.ToString(data).Replace('-', ' ');

    // INFO 类 JSON 载荷按可打印文本呈现（正典 ServicePanel char-value 同口径）
    private static string TryDecodeText(byte[] data)
    {
        var text = Encoding.UTF8.GetString(data);
        return data.All(b => b is >= 0x20 and <= 0x7E or 0x0A or 0x0D) ? text : Hex(data);
    }

    // ── 写入弹窗（C9：HEX/UTF-8 + 单次/批量/循环） ──
    [ObservableProperty]
    private bool _showWriteDialog;

    [ObservableProperty]
    private string _writeCharUuid = string.Empty;

    [ObservableProperty]
    private string _writeInputText = string.Empty;

    [ObservableProperty]
    private bool _isHexFormat = true;

    [ObservableProperty]
    private string _writeMode = "single"; // single|batch|loop

    [ObservableProperty]
    private string _loopCountText = "3";

    [ObservableProperty]
    private string _loopIntervalText = "1000";

    private string _currentWriteServiceUuid = string.Empty;
    private string _currentWriteCharUuid = string.Empty;
    private CancellationTokenSource? _loopCts;

    public bool IsUtf8Format => !IsHexFormat;
    public bool IsSingleMode => WriteMode == "single";
    public bool IsBatchMode => WriteMode == "batch";
    public bool IsLoopMode => WriteMode == "loop";
    public string WriteHintText => IsHexFormat ? "FF 01 02（批量模式每行一条）" : "输入 UTF-8 文本（批量模式每行一条）";

    partial void OnIsHexFormatChanged(bool value) => OnPropertyChanged(nameof(WriteHintText));
    partial void OnWriteModeChanged(string value)
    {
        OnPropertyChanged(nameof(IsSingleMode));
        OnPropertyChanged(nameof(IsBatchMode));
        OnPropertyChanged(nameof(IsLoopMode));
    }

    [RelayCommand]
    private void SetWriteFormat(string format) => IsHexFormat = format == "hex";

    [RelayCommand]
    private void SetWriteMode(string mode) => WriteMode = mode;

    [RelayCommand]
    private void OpenWriteDialog(string parameter)
    {
        var (serviceUuid, charUuid) = SplitCommandKey(parameter);
        if (charUuid == null) return;

        _currentWriteServiceUuid = serviceUuid!;
        _currentWriteCharUuid = charUuid;
        WriteCharUuid = charUuid;
        WriteInputText = string.Empty;
        IsHexFormat = true;
        WriteMode = "single";
        ShowWriteDialog = true;
    }

    [RelayCommand]
    private void CloseWriteDialog()
    {
        // 正典：循环模式靠关闭弹窗中止（close 事件即取消）
        _loopCts?.Cancel();
        ShowWriteDialog = false;
        WriteInputText = string.Empty;
    }

    [RelayCommand]
    private async Task ConfirmWriteAsync()
    {
        var text = WriteInputText.Trim();
        if (text.Length == 0) return;

        List<string> lines;
        if (WriteMode == "batch")
        {
            lines = text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim()).Where(l => l.Length > 0).ToList();
            if (lines.Count == 0) return;
        }
        else
        {
            lines = new List<string> { text };
        }

        var payloads = new List<byte[]>();
        foreach (var line in lines)
        {
            byte[]? payload;
            if (IsHexFormat)
            {
                var clean = line.Replace(" ", "").Replace("-", "");
                if (clean.Length % 2 != 0)
                {
                    AddLog("err", "HEX 数据长度必须是偶数");
                    return;
                }
                if (!Regex.IsMatch(clean, @"^[0-9A-Fa-f]+$"))
                {
                    AddLog("err", "HEX 数据只能包含 0-9 和 A-F");
                    return;
                }
                payload = HexToBytes(clean);
            }
            else
            {
                payload = Encoding.UTF8.GetBytes(line);
            }
            payloads.Add(payload);
        }

        if (WriteMode == "loop")
        {
            var loopCount = Math.Max(0, int.TryParse(LoopCountText, out var n) ? n : 0);
            var intervalMs = Math.Max(0, int.TryParse(LoopIntervalText, out var m) ? m : 1000);
            _loopCts?.Cancel();
            _loopCts = new CancellationTokenSource();
            var token = _loopCts.Token;
            AddLog("sys",
                $"循环写入开始（{ShortUuid(_currentWriteCharUuid)} · " +
                $"{(loopCount == 0 ? "无限" : $"{loopCount} 次")} · 间隔 {intervalMs}ms，关闭弹窗即停止）");
            _ = RunLoopWriteAsync(payloads[0], loopCount, intervalMs, token);
            return; // 循环模式保持弹窗打开
        }

        foreach (var payload in payloads)
        {
            AddLog("sys", $"写入 {ShortUuid(_currentWriteCharUuid)}: {WritePreview(payload)}");
            var ok = await _bleService.WriteCharacteristicAsync(
                _currentWriteServiceUuid, _currentWriteCharUuid, payload);
            if (!ok) return;
        }

        CloseWriteDialog();
    }

    private async Task RunLoopWriteAsync(byte[] payload, int count, int intervalMs,
        CancellationToken token)
    {
        var sent = 0;
        try
        {
            while (!token.IsCancellationRequested && (count == 0 || sent < count))
            {
                var ok = await _bleService.WriteCharacteristicAsync(
                    _currentWriteServiceUuid, _currentWriteCharUuid, payload);
                if (!token.IsCancellationRequested && !ok) break;
                sent++;
                if (token.IsCancellationRequested) break;
                await Task.Delay(intervalMs, token);
            }
        }
        catch (OperationCanceledException)
        {
            // 关闭弹窗/取消：正常中止路径
        }
        Dispatcher.UIThread.Post(() => AddLog("sys", $"循环发送已停止（已发 {sent} 次）"));
    }

    private string WritePreview(byte[] payload)
        => IsHexFormat ? Hex(payload) : Encoding.UTF8.GetString(payload);

    private static byte[] HexToBytes(string hex)
    {
        var bytes = new byte[hex.Length / 2];
        for (var i = 0; i < bytes.Length; i++)
            bytes[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
        return bytes;
    }

    [RelayCommand]
    private async Task ToggleNotificationAsync(string parameter)
    {
        var (serviceUuid, charUuid) = SplitCommandKey(parameter);
        if (charUuid == null) return;

        var isOn = _charVmByKey.TryGetValue(parameter!, out var vm) && vm.IsNotifying;
        AddLog("sys", $"{(isOn ? "停止" : "启用")}通知 {ShortUuid(charUuid)}…");
        var success = await _bleService.SetNotificationAsync(serviceUuid!, charUuid, !isOn);
        if (success && vm != null)
            vm.IsNotifying = !isOn;
    }

    // ═══════════════════════ 通信日志（C5 dock 深色 + 六色） ═══════════════════════

    public ObservableCollection<LogEntry> Logs { get; } = new();

    [ObservableProperty]
    private bool _hasLogs;

    public string LogCountText => $"{Logs.Count} 条";

    private void AddLog(string typeKey, string message)
    {
        Logs.Insert(0, new LogEntry
        {
            Time = DateTime.Now.ToString("HH:mm:ss"),
            TypeKey = typeKey,
            Message = message
        });
        while (Logs.Count > 200)
            Logs.RemoveAt(Logs.Count - 1);

        HasLogs = true;
        OnPropertyChanged(nameof(LogCountText));
    }

    [RelayCommand]
    private void ClearLogs()
    {
        Logs.Clear();
        HasLogs = false;
        OnPropertyChanged(nameof(LogCountText));
    }

    // 正典 LogPanel.exportLogs 同口径导出文本（窗口层落盘）
    public string BuildLogExportText()
    {
        var lines = new List<string>
        {
            "SmartBLE Operation Log",
            $"Exported: {DateTime.Now:O}",
            $"Total entries: {Logs.Count}",
            "-------------------",
            ""
        };
        var typeIcon = new Dictionary<string, string>
            { { "ok", "✓" }, { "err", "✗" }, { "sys", "ℹ" }, { "read", "⇤" }, { "write", "⇥" }, { "recv", "⇠" } };
        foreach (var log in Logs.Reverse())
            lines.Add($"[{log.Time}] {typeIcon.GetValueOrDefault(log.TypeKey, "•")} " +
                      $"[{log.TypeKey.ToUpperInvariant()}] {log.Message}");
        return string.Join("\n", lines);
    }

    [RelayCommand]
    private async Task ExportLogsAsync()
    {
        if (Logs.Count == 0)
        {
            AddLog("err", "暂无日志可导出");
            return;
        }
        var exportTask = ExportLogsRequestedAsync?.Invoke(BuildLogExportText())
                         ?? Task.CompletedTask;
        await exportTask;
        AddLog("ok", "日志已导出");
    }

    // 落盘由窗口层执行（存储选择器不在 VM 层可达）
    internal Func<string, Task>? ExportLogsRequestedAsync;

    // ═══════════════════════ P008 广播（31B 预算真值 + WinRT 真发射，20260921 跨端联调实装） ═══════════════════════

    [ObservableProperty]
    private string _bcName = "SmartBLE";

    [ObservableProperty]
    private string _bcUuid = "FFE0";

    [ObservableProperty]
    private string _bcMfgId = "0001";

    [ObservableProperty]
    private string _bcMfgData = "BLE";

    public ObservableCollection<LogEntry> BroadcastLogs { get; } = new();

    [ObservableProperty]
    private bool _isBroadcasting;

    partial void OnIsBroadcastingChanged(bool value)
    {
        OnPropertyChanged(nameof(BcStatusWord));
        OnPropertyChanged(nameof(BcStatusDotFill));
    }

    // P008 头部状态徽章（正典 P005 updateBroadcastStatus 口径：广播中/未发射）
    public string BcStatusWord => IsBroadcasting ? "广播中" : "未发射";

    public string BcStatusDotFill => IsBroadcasting ? "#22C55E" : "#8A97A8";

    private void AddBroadcastLog(string typeKey, string message)
    {
        BroadcastLogs.Insert(0, new LogEntry
        {
            Time = DateTime.Now.ToString("HH:mm:ss"),
            TypeKey = typeKey,
            Message = message
        });
        while (BroadcastLogs.Count > 200)
            BroadcastLogs.RemoveAt(BroadcastLogs.Count - 1);
    }

    public int BcNameBytes => CurrentAdvBytes.Name;
    public int BcUuidBytes => CurrentAdvBytes.Uuid;
    public int BcMfgBytes => CurrentAdvBytes.Mfg;
    public int BcTotalBytes => CurrentAdvBytes.Total;
    public bool BcIsOver => BcTotalBytes > 31;
    public bool BcUuidValid => CanonUi.IsValidBroadcastUuid(BcUuid);
    public string BcMfgRowLabel => $"厂商块 (0xFF = 2+2+{BcMfgData.Length})";

    // bytebar 数字色（超限 #FF8B94）与合计行色
    public string BcTotalNumFill => BcIsOver ? "#FF8B94" : "#FFFFFF";

    public string BcTotalFill => BcIsOver ? "#F2555F" : "#18222E";

    public string BcTotalRowLabel => BcIsOver ? "合计 · 超限，启动将被拦截（不静默截断）" : "合计";

    private CanonUi.AdvBytes CurrentAdvBytes =>
        CanonUi.CalcAdvertiseBytes(BcName, BcUuid, BcMfgId, BcMfgData);

    partial void OnBcNameChanged(string value) => RefreshBudget();
    partial void OnBcUuidChanged(string value) => RefreshBudget();
    partial void OnBcMfgIdChanged(string value) => RefreshBudget();
    partial void OnBcMfgDataChanged(string value) => RefreshBudget();

    private void RefreshBudget()
    {
        OnPropertyChanged(nameof(BcNameBytes));
        OnPropertyChanged(nameof(BcUuidBytes));
        OnPropertyChanged(nameof(BcMfgBytes));
        OnPropertyChanged(nameof(BcTotalBytes));
        OnPropertyChanged(nameof(BcIsOver));
        OnPropertyChanged(nameof(BcUuidValid));
        OnPropertyChanged(nameof(BcMfgRowLabel));
        OnPropertyChanged(nameof(BcTotalNumFill));
        OnPropertyChanged(nameof(BcTotalFill));
        OnPropertyChanged(nameof(BcTotalRowLabel));
    }

    [RelayCommand]
    private void StartBroadcast()
    {
        // 正典守卫（E-WIN startBroadcast 同口径）：UUID 非法 / 超 31B 拦截，不静默截断
        if (BcUuid.Length > 0 && !BcUuidValid)
        {
            AddBroadcastLog("err", "UUID 非法：需为 4 / 8 / 36 位十六进制");
            return;
        }
        if (BcIsOver)
        {
            AddBroadcastLog("err", $"广播数据超限：当前 {BcTotalBytes} 字节，BLE 最多支持 31 字节（不静默截断）");
            return;
        }
        AddBroadcastLog("sys",
            $"启动广播 · 名称 {BcName} · UUID {(BcUuid.Length > 0 ? BcUuid : "—")} · 厂商 0x{BcMfgId} · 数据「{BcMfgData}」");
        _bleService.StartAdvertising(BcName, BcUuid, BcMfgId, BcMfgData, includeName: true);
        // 成败回执走 AdvertisingStateChanged（Started→「广播已启动」）
    }

    [RelayCommand]
    private void StopBroadcast() => _bleService.StopAdvertising();

    // BleService 发射态回执（线程池线程 → UI 编组）；启停日志单一来源在此
    private void OnAdvertisingStateChanged(bool active)
    {
        Dispatcher.UIThread.Post(() =>
        {
            IsBroadcasting = active;
            AddBroadcastLog(active ? "ok" : "sys",
                active ? "广播已启动（publisher Started）" : "广播已停止");
        });
    }

    [RelayCommand]
    private void CheckBroadcastSupport()
        => AddBroadcastLog("sys", "平台支持检查：Windows 支持低功耗广播发射（WinRT BluetoothLEAdvertisementPublisher）");

    [RelayCommand]
    private void ClearBroadcastLogs() => BroadcastLogs.Clear();

    // ═══════════════════════ P009 关于（Release Metadata 纯投影） ═══════════════════════

    public string AboutVersionChip => "v" + Meta.DisplayVersion;

    public string AboutVersionLine
        => $"v{Meta.DisplayVersion} · {Meta.Channel} · 零后端 · 零本地持久化";

    public string AboutEnvValue => "Desktop · Windows";

    public string AboutModelValue
        => $"PC · {System.Runtime.InteropServices.RuntimeInformation.OSArchitecture}";

    public string AboutBuildValue => Meta.Sha7.Length > 0
        ? $"v+{Meta.Sha7}（Release Metadata 投影）" : "—";

    public IReadOnlyList<string> FeatureChips => ProductFeatures;

    public IReadOnlyList<PlatformRowViewModel> PlatformRows => Meta.PlatformStatuses
        .Select(s =>
        {
            var cap = s.Role == "REFERENCE" ? "REFERENCE" : s.CapabilityStatus;
            var rel = s.Role == "REFERENCE" ? "" : s.ReleaseStatus;
            return new PlatformRowViewModel(s.Name,
                cap.Length > 0 ? cap : "NOT_RELEASED",
                rel.Length > 0 && rel != cap ? rel : "");
        })
        .ToList();

    [RelayCommand]
    private void OpenWebsite() => OpenUrl(ProductWebsite);

    [RelayCommand]
    private void OpenFeedback() => OpenUrl(ProductFeedback);

    private static void OpenUrl(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
        }
        catch
        {
            // 外链拉起失败静默（浏览器关联缺失等场景）
        }
    }

    [RelayCommand]
    private void GoVersions()
    {
        ActiveView = "versions"; // 二级视图：Tab 保持「关于」
    }

    [RelayCommand]
    private void VersionsBack() => ActiveView = "about";

    [RelayCommand]
    private async Task ShareAppAsync()
    {
        // F029 桌面口径：分享 = 复制文本
        var text = $"{ProductName} {AboutVersionChip}\n{ProductWebsite}";
        if (ClipboardWriter != null)
            await ClipboardWriter(text);
        AddLog("sys", "分享文本已复制到剪贴板");
    }

    // ═══════════════════════ P010 版本记录 ═══════════════════════

    public string VersionDisplay => Meta.DisplayVersion;

    public string VersionChannelChip => Meta.ChannelLabel;

    public string VersionBuildSha => Meta.Sha7.Length > 0 ? $"v+{Meta.Sha7}" : "—";

    public string VersionReleaseTag =>
        !string.IsNullOrWhiteSpace(Meta.ReleaseTag) ? "已登记（preview）" : "未登记";

    public IReadOnlyList<ChipViewModel> VersionPlatformChips =>
        Meta.VersionPagePlatforms
            .Select(p => new ChipViewModel(
                p.Name + " " + (p.Role == "REFERENCE" ? "REFERENCE" :
                    string.IsNullOrEmpty(p.CapabilityStatus) ? p.ReleaseStatus : p.CapabilityStatus),
                DisplayStatusTone(p)))
            .ToList();

    private static string DisplayStatusTone(ReleaseMetadata.Surface s)
    {
        var st = s.Role == "REFERENCE" ? "REFERENCE"
            : string.IsNullOrEmpty(s.CapabilityStatus) ? s.ReleaseStatus : s.CapabilityStatus;
        return st switch
        {
            "VERIFIED" => "successc",
            "PREVIEW" => "primaryc",
            "BLOCKED" => "warningc",
            _ => "neutral"
        };
    }

    public IReadOnlyList<string> VersionLimitations => Meta.KnownLimitations;

    public bool HasVersionReleases => VersionReleases.Count > 0;

    public IReadOnlyList<ReleaseRowViewModel> VersionReleases =>
        Meta.HistoryReleases.Select(r => new ReleaseRowViewModel(r.version, r.builtAt, r.sha))
            .ToList();

    public IReadOnlyList<PreviewRowViewModel> VersionPreviews =>
        Meta.HistoryPreviews
            .Select(p => new PreviewRowViewModel(p.version, $"{p.channel} 渠道 · {p.status}", Meta.Sha7))
            .ToList();

    [RelayCommand]
    private async Task CopyVersionInfoAsync()
    {
        var text = $"{ProductName} v{VersionDisplay} · {Meta.Channel} · 构建 {VersionBuildSha}";
        if (ClipboardWriter != null)
            await ClipboardWriter(text);
        AddLog("sys", "版本信息已复制到剪贴板");
    }

    // ═══════════════════════ P002 Smart HID 配网（阶段一真实 GATT；下发=明确降级） ═══════════════════════

    [ObservableProperty]
    private int _hidStepIndex; // 0 连接设备 / 1 填写配置 / 2 下发状态

    [ObservableProperty]
    private bool _hidConnecting;

    [ObservableProperty]
    private bool _hidConnErrorVisible;

    [ObservableProperty]
    private string _hidConnErrorCode = "identity_failed";

    [ObservableProperty]
    private string _hidConnErrorText = string.Empty;

    [ObservableProperty]
    private bool _hidIsConnected;

    [ObservableProperty]
    private bool _hidLostBannerVisible;

    [ObservableProperty]
    private string _hidDevSummary = "—";

    [ObservableProperty]
    private string _hidWifiSsid = string.Empty;

    [ObservableProperty]
    private string _hidWifiPwd = string.Empty;

    [ObservableProperty]
    private bool _hidShowPwd;

    [ObservableProperty]
    private string _hidHubAddr = string.Empty;

    [ObservableProperty]
    private bool _hidErrVisible;

    [ObservableProperty]
    private string _hidErrCode = string.Empty;

    [ObservableProperty]
    private string _hidErrText = string.Empty;

    public static readonly string[] HidStepLabels = { "连接设备", "填写配置", "下发状态" };

    public string HidDevName { get; private set; } = "Smart HID 设备";

    public string HidDevId { get; private set; } = "—";

    // 正典 p002 目标设备卡：ava 首字母 + 「Device Info 已验证」尾注（E-WIN hidProvDevId 口径）
    public string HidDevInitial => string.IsNullOrEmpty(HidDevName) ? "S"
        : char.ToUpperInvariant(HidDevName.Trim()[0]).ToString();

    public string HidDevIdLine => HidDevId == "—" ? "—" : $"{HidDevId} · Device Info 已验证";

    public bool HidStepDone0 => HidStepIndex > 0;
    public bool HidStepCur0 => HidStepIndex == 0;
    public bool HidStepDone1 => HidStepIndex > 1;
    public bool HidStepCur1 => HidStepIndex == 1;
    public bool HidStepCur2 => HidStepIndex == 2;

    public bool HidConnectPhaseVisible => HidStepIndex == 0;
    public bool HidConfigurePhaseVisible => HidStepIndex == 1;
    public bool HidStatusPhaseVisible => HidStepIndex == 2;

    public bool HidSubmitEnabled =>
        HidWifiSsid.Trim().Length > 0 && HidHubAddr.Trim().Length > 0;

    partial void OnHidStepIndexChanged(int value)
    {
        OnPropertyChanged(nameof(HidStepDone0));
        OnPropertyChanged(nameof(HidStepCur0));
        OnPropertyChanged(nameof(HidStepDone1));
        OnPropertyChanged(nameof(HidStepCur1));
        OnPropertyChanged(nameof(HidStepCur2));
        OnPropertyChanged(nameof(HidConnectPhaseVisible));
        OnPropertyChanged(nameof(HidConfigurePhaseVisible));
        OnPropertyChanged(nameof(HidStatusPhaseVisible));
    }

    partial void OnHidWifiSsidChanged(string value) => OnPropertyChanged(nameof(HidSubmitEnabled));
    partial void OnHidHubAddrChanged(string value) => OnPropertyChanged(nameof(HidSubmitEnabled));

    [RelayCommand]
    private async Task OpenHidProvisionAsync(string? deviceId)
    {
        var id = deviceId ?? "";
        var device = Devices.FirstOrDefault(d => d.Id == id);
        HidDevName = device?.DisplayName ?? "Smart HID 设备";
        HidDevId = string.IsNullOrEmpty(id) ? "—" : id;
        OnPropertyChanged(nameof(HidDevName));
        OnPropertyChanged(nameof(HidDevId));
        OnPropertyChanged(nameof(HidDevInitial));
        OnPropertyChanged(nameof(HidDevIdLine));

        ActiveView = "hidprov";
        HidStepIndex = 0;
        HidConnecting = true;
        HidConnErrorVisible = false;
        HidLostBannerVisible = false;
        HidIsConnected = false;
        HidDevSummary = "—";
        CurrentDeviceName = HidDevName;
        CurrentDeviceId = id;

        AddLog("sys", $"Smart HID 配网：连接并确认设备（{HidDevName}）…");
        IsGattConnecting = true;
        await _bleService.ConnectAsync(id);
        HidConnecting = false;
        IsGattConnecting = false;

        if (!IsGattConnected)
        {
            HidConnErrorVisible = true;
            HidConnErrorText = "无法建立 GATT 连接或读取 Device Info。请确认设备在附近且处于配网模式后重试。";
            return;
        }

        HidStepIndex = 1;
        HidIsConnected = true;
        await ReadHidIdentityAsync();
        RefreshConnectedPanel();
    }

    // 阶段一身份确认：读 INFO（…1002）解析 device_id / firmware（只读，无 INPUT 写）
    private async Task ReadHidIdentityAsync()
    {
        const string hidSvc = "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04";
        const string infoChar = "9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04";
        var data = await _bleService.ReadCharacteristicAsync(hidSvc, infoChar);
        if (data == null)
        {
            HidDevSummary = $"{HidDevId}";
            return;
        }

        var json = Encoding.UTF8.GetString(data);
        var deviceId = Regex.Match(json, "\"device_id\"\\s*:\\s*\"([^\"]+)\"").Groups[1].Value;
        var firmware = Regex.Match(json, "\"firmware\"\\s*:\\s*\"([^\"]+)\"").Groups[1].Value;
        var bits = new List<string>();
        if (deviceId.Length > 0) bits.Add(deviceId);
        if (firmware.Length > 0) bits.Add($"fw {firmware}");
        HidDevSummary = bits.Count > 0 ? string.Join(" · ", bits) : HidDevId;
        AddLog("read", $"设备身份：{HidDevSummary}");
    }

    [RelayCommand]
    private async Task HidReconnectAsync() => await OpenHidProvisionAsync(CurrentDeviceId);

    // 向导返回即断开（DESKTOP-LEAVE-001 语义，与 E/T 双壳一致）
    [RelayCommand]
    private async Task HidBackToListAsync()
    {
        if (IsGattConnected)
            await _bleService.DisconnectAsync();
        ActiveTab = "scan";
        ActiveView = "scan";
    }

    [RelayCommand]
    private void HidTogglePwd() => HidShowPwd = !HidShowPwd;

    [RelayCommand]
    private void HidQrEntry()
    {
        // V-WIN 明确降级：无摄像头扫码链路（E/T 主路径 getUserMedia+jsQR）
        HidErrVisible = true;
        HidErrCode = "vwin_camera_unsupported";
        HidErrText = "V-WIN 实验级无摄像头扫码链路。请通过 ControlHub 界面手动记录地址与令牌后填写，或使用 Electron/Tauri 壳扫码获取配对码。";
    }

    [RelayCommand]
    private void HidSubmit()
    {
        // V-WIN 明确降级：配网协议客户端（candidate 分帧 + STATUS 七步）未移植 Avalonia
        HidErrVisible = true;
        HidErrCode = "vwin_provisioning_not_ported";
        HidErrText = "Smart HID 配网下发模块未移植至 Avalonia 实验级（hid-service 为 Electron/Tauri 共用 JS 实现）。请使用 Electron 或 Tauri 壳完成配网下发。";
        AddLog("err", "配网下发不可用：V-WIN 实验级未移植协议客户端");
    }

    // ═══════════════════════ 退出确认（10_platform §4 常驻 + 确认退出） ═══════════════════════

    [ObservableProperty]
    private bool _showExitConfirm;

    public bool ExitConfirmBusy => IsGattConnected || IsBroadcasting;

    public string ExitConfirmBusyText => ExitConfirmBusy
        ? "有 BLE 会话正在运行（连接/广播）。确认退出将断开会话并停止监听。"
        : "桌面端为常驻运行。确认退出？";

    public string ExitConfirmDetail => IsGattConnected
        ? $"当前连接设备：{ConnectedCount} 台"
        : IsBroadcasting
            ? "广播发射中，确认退出将停止广播"
            : "（10_platform §4 生命周期：常驻，退出确认）";

    [RelayCommand]
    private void ConfirmExit()
    {
        _exitConfirmed = true;
        if (_bleService.IsAdvertising)
            _bleService.StopAdvertising();
        ShowExitConfirm = false;
        CloseRequested?.Invoke();
    }

    [RelayCommand]
    private void CancelExit() => ShowExitConfirm = false;

    // 窗口 Closing 钩子：未确认 → 弹模态并拦截；已确认 → 放行
    public bool RequestExit()
    {
        if (_exitConfirmed) return true;
        AddLog("sys", "[App] 退出确认已弹出（常驻运行 · 确认后才退出）");
        OnPropertyChanged(nameof(ExitConfirmBusyText));
        OnPropertyChanged(nameof(ExitConfirmDetail));
        ShowExitConfirm = true;
        return false;
    }
}

// ═══════════════════════ 视图模型 ═══════════════════════

public record BleDevice(string Id, string Name, int Rssi, string[]? ServiceUuids = null);

// C1 设备卡视图模型（P001 扫描 / P007 已连接两变体共用）
public partial class BleDeviceViewModel : ObservableObject
{
    public string Id { get; }
    [ObservableProperty] private string _name = string.Empty;
    [ObservableProperty] private int _rssi;
    [ObservableProperty] private bool _connectedHint;

    private int _profileMatch;

    public BleDeviceViewModel(BleDevice device, bool connectedHint = false)
    {
        Id = device.Id;
        _name = device.Name;
        _rssi = device.Rssi;
        _connectedHint = connectedHint;
        _profileMatch = CanonUi.MatchScannedDevice(device.Name, device.ServiceUuids);
    }

    public void Update(BleDevice device)
    {
        // 名字只在非空时覆盖：ADV_IND（无名）与 SCAN_RSP（带名）交替到达同一 MAC，
        // 无条件覆盖会把 SCAN_RSP 带来的名字冲回空 → 卡片恒「未命名」
        // （20260921 跨端联调实证：华为 Mate 30 5G 名在 SCAN_RSP，ADV 帧冲掉）
        if (!string.IsNullOrEmpty(device.Name))
            Name = device.Name;
        Rssi = device.Rssi;
        if (_profileMatch == 0)
            _profileMatch = CanonUi.MatchScannedDevice(device.Name, device.ServiceUuids);
        OnPropertyChanged(nameof(DisplayName));
        OnPropertyChanged(nameof(IsUnnamed));
        OnPropertyChanged(nameof(Initial));
        OnPropertyChanged(nameof(RssiText));
        OnPropertyChanged(nameof(SigBars));
        OnPropertyChanged(nameof(ProfileMatch));
        OnPropertyChanged(nameof(MatchChipText));
        OnPropertyChanged(nameof(MatchChipBg));
        OnPropertyChanged(nameof(MatchChipFg));
    }

    public void SetConnectedHint(bool v) => ConnectedHint = v;

    // F005 显示名批准链（简化口径：name → 未命名 BLE 设备）
    public string DisplayName => string.IsNullOrWhiteSpace(Name) ? "未命名 BLE 设备" : Name;

    public bool IsUnnamed => string.IsNullOrWhiteSpace(Name);

    public string Initial => string.IsNullOrEmpty(DisplayName) ? "?"
        : char.ToUpperInvariant(DisplayName.Trim()[0]).ToString();

    public string IdLine => IsUnnamed ? $"{Id}（未命名）" : Id;

    // 正典 C1 acts：连接/已连接 同一颗按钮按连接态换词（E-WIN DeviceCard connectBtn 口径）
    public string ConnectEntryLabel => ConnectedHint ? "已连接" : "连接";

    partial void OnConnectedHintChanged(bool value) => OnPropertyChanged(nameof(ConnectEntryLabel));

    public string RssiText => $"{Rssi} dBm";

    public int ProfileMatch => _profileMatch;

    public bool IsShid => _profileMatch >= 1;

    public string MatchChipText => _profileMatch >= 2 ? "Smart HID · 强匹配"
        : _profileMatch == 1 ? "疑似 Smart HID · 弱匹配" : "";

    public string MatchChipBg => _profileMatch >= 2 ? "#E8F1FF" : "#FFF3E4";

    public string MatchChipFg => _profileMatch >= 2 ? "#1B6DFF" : "#C77E14";

    // 信号四柱（3px 宽 · 高 4/7/10/12 · q4 全绿 / q3 前三绿 / q2 前二黄 / q1 首柱红）
    public IReadOnlyList<SigBarViewModel> SigBars
    {
        get
        {
            var q = CanonUi.SigQuality(Rssi);
            var heights = new[] { 4, 7, 10, 12 };
            var bars = new SigBarViewModel[4];
            for (var i = 0; i < 4; i++)
            {
                var active = i switch { 0 => true, 1 => q >= 2, 2 => q >= 3, _ => q >= 4 };
                bars[i] = new SigBarViewModel(heights[i], active
                    ? q >= 3 ? "#17C7A8" : q == 2 ? "#FF9F43" : "#F2555F"
                    : "#E3EAF3");
            }
            return bars;
        }
    }
}

public record SigBarViewModel(int Height, string Fill);

// C4 服务树视图模型
public partial class BleServiceViewModel : ObservableObject
{
    public string Uuid { get; }
    public string Name { get; }
    public string ShortUuidText => Uuid.Length > 8 ? Uuid.ToLowerInvariant()[..8] + "…" : Uuid;

    [ObservableProperty]
    private bool _isExpanded;

    public List<BleCharacteristicViewModel> Characteristics { get; }

    public string CharacteristicCountText => $"{Characteristics.Count} 特征";

    public BleServiceViewModel(BleServiceInfo service, bool expanded)
    {
        Uuid = service.Uuid;
        Name = service.Name;
        _isExpanded = expanded;
        Characteristics = service.Characteristics
            .Select(c => new BleCharacteristicViewModel(service.Uuid, c))
            .ToList();
    }

    [RelayCommand]
    private void ToggleExpanded() => IsExpanded = !IsExpanded;
}

public partial class BleCharacteristicViewModel : ObservableObject
{
    public string Uuid { get; }
    public string Name { get; }
    public string ServiceUuid { get; }
    public string CommandKey => $"{ServiceUuid}|{Uuid}";
    public bool HasRead { get; }
    public bool HasWrite { get; }
    public bool HasNotify { get; }

    [ObservableProperty]
    private bool _isNotifying;

    [ObservableProperty]
    private string _lastValue = string.Empty;

    public string NotifyButtonWord => IsNotifying ? "停止监听" : "开始监听";

    public bool HasLastValue => LastValue.Length > 0;

    partial void OnLastValueChanged(string value) => OnPropertyChanged(nameof(HasLastValue));

    public BleCharacteristicViewModel(string serviceUuid, BleCharacteristicInfo info)
    {
        ServiceUuid = serviceUuid;
        Uuid = info.Uuid;
        Name = info.Name;
        HasRead = info.Properties.Contains("read");
        HasWrite = info.Properties.Contains("write") || info.Properties.Contains("writeWithoutResponse");
        HasNotify = info.Properties.Contains("notify") || info.Properties.Contains("indicate");
    }

    partial void OnIsNotifyingChanged(bool value) => OnPropertyChanged(nameof(NotifyButtonWord));
}

// C5 日志行（六色 TypeKey：sys/err/read/write/recv/ok；配色经样式类 lc* 呈现）
public class LogEntry
{
    public string Time { get; set; } = string.Empty;
    public string TypeKey { get; set; } = "sys";
    public string Message { get; set; } = string.Empty;
    public string Word => TypeKey switch
    {
        "sys" => "系统",
        "err" => "错误",
        "read" => "读取",
        "write" => "写入",
        "recv" => "接收",
        "ok" => "成功",
        _ => "系统"
    };

    // 条件类绑定需要逐类布尔（Avalonia 类绑定不支持字符串插值）
    public bool IsSys => TypeKey == "sys";
    public bool IsErr => TypeKey == "err";
    public bool IsRead => TypeKey == "read";
    public bool IsWrite => TypeKey == "write";
    public bool IsRecv => TypeKey == "recv";
    public bool IsOk => TypeKey == "ok";
}

// P009 平台状态行（F027 双状态词；chip 直接色值绑定）
public record PlatformRowViewModel(string Name, string Word1, string Word2)
{
    public bool Word2Visible => Word2.Length > 0;

    public string Bg1 => Bg(Word1);
    public string Fg1 => Fg(Word1);
    public string Bg2 => Bg(Word2);
    public string Fg2 => Fg(Word2);

    private static string Bg(string word) => word switch
    {
        "VERIFIED" => "#E2F8F4",
        "PREVIEW" => "#E8F1FF",
        "BLOCKED" => "#FFF3E4",
        "NOT_RELEASED" => "#FDEBEC",
        _ => "#F1F5FB"
    };

    private static string Fg(string word) => word switch
    {
        "VERIFIED" => "#0E9A80",
        "PREVIEW" => "#1B6DFF",
        "BLOCKED" => "#C77E14",
        "NOT_RELEASED" => "#F2555F",
        _ => "#60758D"
    };
}

// P010 平台状态 chip / 发布与预览行
public record ChipViewModel(string Text, string Tone)
{
    public string Bg => Tone switch
    {
        "successc" => "#E2F8F4",
        "primaryc" => "#E8F1FF",
        "warningc" => "#FFF3E4",
        "dangerc" => "#FDEBEC",
        _ => "#F1F5FB"
    };

    public string Fg => Tone switch
    {
        "successc" => "#0E9A80",
        "primaryc" => "#1B6DFF",
        "warningc" => "#C77E14",
        "dangerc" => "#F2555F",
        _ => "#42536A"
    };
}

public record ReleaseRowViewModel(string Version, string BuiltAt, string Sha);
public record PreviewRowViewModel(string Version, string Desc, string Sha);

public record BleServiceInfo(string Uuid, string Name, BleCharacteristicInfo[] Characteristics);

public record BleCharacteristicInfo(string Uuid, string Name, string[] Properties);
