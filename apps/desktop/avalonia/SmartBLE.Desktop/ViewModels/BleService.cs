using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Threading;
using System.Linq;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Devices.Radios;
using Windows.Foundation;
using Windows.Storage.Streams;
using Avalonia.Threading;

namespace SmartBLE.Desktop.ViewModels;

// Note: WinRT BLE APIs come from the net8.0-windows10.0.19041.0 TFM projection (PARITY-006)
// For cross-platform, consider using btleplug with .NET

public class BleService
{
    private BluetoothLEAdvertisementWatcher? _watcher;

    // F004 跨帧合并态：同一设备多帧交替（20260924 真机 SHID-00000001 34 帧实证——
    // ConnectableUndirected 帧 0x01+0x07 无名、Extended 帧 0x09 无 UUID），
    // AD 段按类型并集、UUID 并集、厂商数据沿最新非空；每次开扫描重置
    private readonly Dictionary<ulong, Dictionary<byte, string>> _advSections = new();
    private readonly Dictionary<ulong, HashSet<string>> _advUuids = new();
    private readonly Dictionary<ulong, (ushort Id, string Hex)> _advMfg = new();
    // Every WinRT handle, subscription and recovery belongs to one device session.
    private sealed class DeviceSession
    {
        public readonly string Id;
        public readonly CancellationTokenSource Lifetime = new();
        public readonly SemaphoreSlim Gate = new(1, 1);
        public BluetoothLEDevice? Device;
        public GattSession? Gatt;
        public readonly List<GattDeviceService> Services = new();
        public readonly Dictionary<string, GattCharacteristic> Characteristics = new();
        public readonly Dictionary<string, TypedEventHandler<GattCharacteristic, GattValueChangedEventArgs>> Handlers = new();
        public BleServiceInfo[] Tree = Array.Empty<BleServiceInfo>();
        public volatile bool Connected;
        public DeviceSession(string id) => Id = id;
    }
    private readonly ConcurrentDictionary<string, DeviceSession> _sessions = new(StringComparer.OrdinalIgnoreCase);
    public string[] ConnectedDeviceIds => _sessions.Values.Where(s => s.Connected).Select(s => s.Id).ToArray();
    public int GetWriteCapacity(string id) => _sessions.TryGetValue(id, out var session) && session.Gatt != null ? Math.Clamp(session.Gatt.MaxPduSize - 3, 20, 180) : 20;
    public bool IsConnected(string id) => _sessions.TryGetValue(id, out var s) && s.Connected;
    public BleServiceInfo[] GetServices(string id) => _sessions.TryGetValue(id, out var s) ? s.Tree : Array.Empty<BleServiceInfo>();
    private bool Owns(DeviceSession session) => !session.Lifetime.IsCancellationRequested &&
        _sessions.TryGetValue(session.Id, out var current) && ReferenceEquals(current, session);

    // Auto-stop scan timer - aligned with UniApp (5 seconds)
    private DispatcherTimer? _autoStopTimer;

    public event Action<string>? StateChanged;
    public event Action<BleDevice>? DeviceDiscovered;
    public event Action<string>? DeviceConnected;
    public event Action<string>? DeviceDisconnected;
    public event Action<string, BleServiceInfo[]?>? ServiceDiscovered;
    public event Action<string, string, byte[]>? CharacteristicValueChanged;
    public event Action<string, string>? LogMessage;
    // 5s 自动停扫回调（UI 同步 IsScanning/扫描状态词；手动停扫不触发）
    public event Action? ScanAutoStopped;

    private readonly Func<Task<string>> _availabilityReader;
    private Radio? _radio;
    public string CurrentState { get; private set; } = "Initializing";
    public bool IsScanning => _watcher != null;
    public event Action? ScanInterrupted;

    public BleService(Func<Task<string>>? availabilityReader = null)
        => _availabilityReader = availabilityReader ?? ReadAvailabilityAsync;

    private void PublishState(string state)
    {
        CurrentState = state;
        StateChanged?.Invoke(state);
        var watcher = _watcher;
        if (!BluetoothAvailability.CanScan(state) && watcher != null)
            Dispatcher.UIThread.Post(async () =>
            {
                if (!ReferenceEquals(watcher, _watcher)) return;
                await StopScanAsync();
                ScanInterrupted?.Invoke();
            });
    }

    private async Task<string> ReadAvailabilityAsync()
    {
        if (_radio != null) { _radio.StateChanged -= OnRadioStateChanged; _radio = null; }
        if (!OperatingSystem.IsWindows()) return "Unsupported";
        var adapter = await BluetoothAdapter.GetDefaultAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(3));
        if (adapter == null) return "NoAdapter";
        if (!adapter.IsLowEnergySupported) return "UnsupportedAdapter";
        _radio = await adapter.GetRadioAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(3));
        if (_radio == null) return "Unknown";
        _radio.StateChanged += OnRadioStateChanged;
        return BluetoothAvailability.Resolve(true, true, true, _radio.State.ToString());
    }

    private void OnRadioStateChanged(Radio sender, object args)
    {
        if (!ReferenceEquals(sender, _radio)) return;
        var state = BluetoothAvailability.Resolve(true, true, true, sender.State.ToString());
        PublishState(state);
    }

    public async Task InitializeAsync()
    {
        try { PublishState(await _availabilityReader()); }
        catch (Exception error)
        {
            PublishState(BluetoothAvailability.ExceptionState(error));
            LogMessage?.Invoke("蓝牙检测失败", "未能读取蓝牙状态，请重新检测；未确认平台不支持");
        }
    }

    public async Task<bool> StartScanAsync()
    {
        await StopScanAsync();
        await InitializeAsync();
        if (!BluetoothAvailability.CanScan(CurrentState))
        {
            LogMessage?.Invoke("无法扫描", BluetoothAvailability.Hint(CurrentState));
            return false;
        }
        try
        {
            _watcher = new BluetoothLEAdvertisementWatcher
            {
                ScanningMode = BluetoothLEScanningMode.Active
            };

            // 新扫描会话重置跨帧合并态（上一会话的旧段不带入）
            _advSections.Clear();
            _advUuids.Clear();
            _advMfg.Clear();

            _watcher.Received += OnAdvertisementReceived;
            _watcher.Stopped += OnWatcherStopped;
            _watcher.Start();

            // Auto-stop after 5 seconds - aligned with UniApp
            _autoStopTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(5)
            };
            _autoStopTimer.Tick += async (s, e) =>
            {
                await StopScanAsync();
                LogMessage?.Invoke("自动停止", "扫描已自动停止（5秒）");
                ScanAutoStopped?.Invoke();
            };
            _autoStopTimer.Start();
            return true;
        }
        catch (Exception error)
        {
            await StopScanAsync();
            PublishState(BluetoothAvailability.ExceptionState(error));
            LogMessage?.Invoke("扫描失败", "扫描启动失败，请重新检测蓝牙状态");
            return false;
        }
    }

    private void OnWatcherStopped(BluetoothLEAdvertisementWatcher sender, BluetoothLEAdvertisementWatcherStoppedEventArgs args)
    {
        Dispatcher.UIThread.Post(async () =>
        {
            if (!ReferenceEquals(sender, _watcher)) return;
            await StopScanAsync();
            await InitializeAsync();
            LogMessage?.Invoke("扫描停止", $"扫描已中断：{args.Error}");
            ScanInterrupted?.Invoke();
        });
    }

    public async Task StopScanAsync()
    {
        // Stop auto-stop timer
        _autoStopTimer?.Stop();
        _autoStopTimer = null;

        var watcher = _watcher;
        _watcher = null;
        if (watcher != null)
        {
            watcher.Received -= OnAdvertisementReceived;
            watcher.Stopped -= OnWatcherStopped;
            watcher.Stop();
        }
        await Task.CompletedTask;
    }

    private void OnAdvertisementReceived(BluetoothLEAdvertisementWatcher sender,
        BluetoothLEAdvertisementReceivedEventArgs args)
    {
        if (!ReferenceEquals(sender, _watcher)) return;
        // 正典 F005 显示名链：无名广播保持空名（由 UI 层「未命名 BLE 设备」兜底），
        // 不再在此伪造「未知设备」
        var name = args.Advertisement.LocalName ?? "";
        // 快照跨帧合并后同时供 Smart HID 匹配（UUID 并集，强匹配）与 F004 弹窗使用
        var adv = BuildAdvSnapshot(args.Advertisement, args.BluetoothAddress);
        string[]? serviceUuids = adv is { ServiceUuids.Count: > 0 } ? adv.ServiceUuids.ToArray() : null;
        var device = new BleDevice(args.BluetoothAddress.ToString("X"), name,
            (short)args.RawSignalStrengthInDBm, serviceUuids, adv);
        DeviceDiscovered?.Invoke(device);
    }

    // F004 广播快照：WinRT DataSections 原始 AD 段（真实逐段字节，非重建）+ 解析字段；
    // 跨帧合并（段/UUID 按类型并集、厂商数据沿最新非空帧）——设备名与 UUID 常分居
    // 不同帧（见类头 20260924 实证），不合并则弹窗内容随末帧漂移；
    // 任一访问异常都降级为部分快照（不阻断设备发现）
    internal BleAdvSnapshot? BuildAdvSnapshot(BluetoothLEAdvertisement adv, ulong address)
    {
        try
        {
            if (!_advUuids.TryGetValue(address, out var uuidSet))
            {
                uuidSet = new HashSet<string>();
                _advUuids[address] = uuidSet;
            }
            var advUuids = adv.ServiceUuids;
            for (var i = 0; i < advUuids.Count; i++)
                uuidSet.Add(advUuids[i].ToString());

            if (adv.ManufacturerData.Count > 0)
            {
                var md = adv.ManufacturerData[0];
                _advMfg[address] = ((ushort)md.CompanyId, Convert.ToHexString(ToBytes(md.Data)));
            }
            ushort? mfgId = null;
            var mfgHex = string.Empty;
            if (_advMfg.TryGetValue(address, out var m))
            {
                mfgId = m.Id;
                mfgHex = m.Hex;
            }

            if (!_advSections.TryGetValue(address, out var sections))
            {
                sections = new Dictionary<byte, string>();
                _advSections[address] = sections;
            }
            foreach (var ds in adv.DataSections)
                sections[(byte)ds.DataType] = Convert.ToHexString(ToBytes(ds.Data));
            var merged = sections.OrderBy(kv => kv.Key)
                .Select(kv => new BleAdvSection(kv.Key, kv.Value))
                .ToList();

            return new BleAdvSnapshot(uuidSet.ToArray(), mfgId, mfgHex, merged);
        }
        catch
        {
            return null;
        }
    }

    private static byte[] ToBytes(IBuffer buffer)
    {
        if (buffer is not { Length: > 0 }) return Array.Empty<byte>();
        var reader = DataReader.FromBuffer(buffer);
        var bytes = new byte[buffer.Length];
        reader.ReadBytes(bytes);
        return bytes;
    }

    // ═══════════════ P008 广播发射（WinRT BluetoothLEAdvertisementPublisher，20260921 跨端联调实装） ═══════════════
    // 此前 V-WIN 明确降级（外围发射「移植待排期」）；现以 WinRT publisher 补齐 Windows
    // 原生发射，由安卓版 App 空口查见做跨端验证。厂商块编码对齐 E-WIN bleno 口径：
    // companyId = mfgId（4 位 hex），payload = mfgData 的 UTF-8 字节。
    private BluetoothLEAdvertisementPublisher? _advPublisher;

    public bool IsAdvertising => _advPublisher != null;

    // 发射态变化（Started→true；Stopped*/Aborted→false）；线程池线程触发，订阅方需自行编组
    public event Action<bool>? AdvertisingStateChanged;

    public void StartAdvertising(string name, string serviceUuid, string manufacturerId,
        string manufacturerData, bool includeName)
    {
        StopAdvertising();

        // WinRT 桌面（非打包）进程的 publisher 仅允许厂商数据块进空口：
        // LocalName / ServiceUuids 一律 Start() 抛 ArgumentException（20260921 adv-probe 实证，
        // empty 负载抛 COMException「发布者只能从非空负载启动」）。预算仍按正典 31B 全量计算，
        // 实际发射仅 mfg 块，缺省部分以平台限制日志显式告知。
        var adv = new BluetoothLEAdvertisement();
        var omitted = new List<string>();
        if (includeName && name.Length > 0) omitted.Add("名称");
        if (serviceUuid.Trim().Length > 0) omitted.Add("服务 UUID");
        if (omitted.Count > 0)
            LogMessage?.Invoke("广播",
                $"平台限制：Windows 桌面发射仅厂商数据块进空口（{string.Join("、", omitted)}不发射）");

        if (manufacturerData.Length == 0)
        {
            LogMessage?.Invoke("广播", "发射启动失败：厂商数据为空，Windows 桌面发射需至少一个厂商块");
            return;
        }

        var idText = manufacturerId.Trim().Replace("0x", "");
        if (idText.Length == 4
            && byte.TryParse(idText[..2], System.Globalization.NumberStyles.HexNumber, null, out var cidHi)
            && byte.TryParse(idText[2..], System.Globalization.NumberStyles.HexNumber, null, out var cidLo))
        {
            var writer = new DataWriter();
            writer.WriteBytes(System.Text.Encoding.UTF8.GetBytes(manufacturerData));
            adv.ManufacturerData.Add(new BluetoothLEManufacturerData(
                (ushort)(cidHi << 8 | cidLo), writer.DetachBuffer()));
        }
        else
        {
            LogMessage?.Invoke("广播", $"发射启动失败：厂商 ID 非法（0x{manufacturerId}）");
            return;
        }

        var publisher = new BluetoothLEAdvertisementPublisher(adv);
        publisher.StatusChanged += OnAdvStatusChanged;
        _advPublisher = publisher;
        try
        {
            publisher.Start();
        }
        catch (Exception ex)
        {
            _advPublisher = null;
            publisher.StatusChanged -= OnAdvStatusChanged;
            LogMessage?.Invoke("广播", $"发射启动失败：{ex.Message}");
        }
    }

    private void OnAdvStatusChanged(BluetoothLEAdvertisementPublisher sender,
        BluetoothLEAdvertisementPublisherStatusChangedEventArgs args)
    {
        switch (args.Status)
        {
            // 本机投影枚举成员：Created/Waiting/Started/Stopping/Stopped/Aborted
            // （与 WinRT 文档名 StoppedBySystem/StoppedByAdvertisementManager 不同名）
            case BluetoothLEAdvertisementPublisherStatus.Started:
                AdvertisingStateChanged?.Invoke(true);
                LogMessage?.Invoke("广播", "publisher 状态：Started（无线电已接受发射）");
                break;
            case BluetoothLEAdvertisementPublisherStatus.Waiting:
                LogMessage?.Invoke("广播", "publisher 状态：Waiting（等待无线电资源）");
                break;
            case BluetoothLEAdvertisementPublisherStatus.Stopping:
            case BluetoothLEAdvertisementPublisherStatus.Stopped:
            case BluetoothLEAdvertisementPublisherStatus.Aborted:
                AdvertisingStateChanged?.Invoke(false);
                LogMessage?.Invoke("广播", $"publisher 状态：{args.Status} · error={args.Error}");
                break;
        }
    }

    public void StopAdvertising()
    {
        if (_advPublisher == null) return;
        var publisher = _advPublisher;
        _advPublisher = null;
        publisher.StatusChanged -= OnAdvStatusChanged;
        try
        {
            publisher.Stop();
        }
        catch
        {
            // 已停止/已释放的 publisher 二次 Stop 可能抛 COM 异常，忽略
        }
        AdvertisingStateChanged?.Invoke(false);
    }

    private void OnConnectionStatusChanged(BluetoothLEDevice sender, object? args)
    {
        var id = sender.BluetoothAddress.ToString("X");
        if (sender.ConnectionStatus != BluetoothConnectionStatus.Disconnected ||
            !_sessions.TryGetValue(id, out var session) || !ReferenceEquals(session.Device, sender) || !session.Connected)
            return;
        session.Connected = false;
        DeviceDisconnected?.Invoke(id);
        _ = RecoverAsync(session);
    }

    public async Task<bool> ConnectAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        if (!ulong.TryParse(deviceId, System.Globalization.NumberStyles.HexNumber, null, out _))
        {
            LogMessage?.Invoke("连接失败", "设备地址非法");
            return false;
        }
        await StopScanAsync();
        var session = _sessions.GetOrAdd(deviceId, id => new DeviceSession(id));
        await session.Gate.WaitAsync(cancellationToken);
        try
        {
            if (!Owns(session)) return false;
            if (!session.Connected) await EstablishAsync(session, cancellationToken);
            return Owns(session) && session.Connected;
        }
        catch (Exception ex)
        {
            ReleaseHandles(session);
            LogMessage?.Invoke("连接失败", $"{deviceId}: {DescribeException(ex)}");
            return false;
        }
        finally { session.Gate.Release(); }
    }

    private async Task EstablishAsync(DeviceSession session, CancellationToken cancellationToken = default)
    {
        ReleaseHandles(session);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(session.Lifetime.Token, cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        var token = timeout.Token;
        var address = ulong.Parse(session.Id, System.Globalization.NumberStyles.HexNumber);
        session.Device = await BluetoothLEDevice.FromBluetoothAddressAsync(address).AsTask(token);
        if (session.Device == null) throw new InvalidOperationException("设备不可用");
        session.Gatt = await GattSession.FromDeviceIdAsync(session.Device.BluetoothDeviceId).AsTask(token);
        if (session.Gatt != null) session.Gatt.MaintainConnection = true;
        var result = await session.Device.GetGattServicesAsync(BluetoothCacheMode.Uncached).AsTask(token);
        if (result.Status != GattCommunicationStatus.Success)
            throw new InvalidOperationException($"GATT 服务发现失败: {result.Status}");
        var tree = new List<BleServiceInfo>();
        foreach (var service in result.Services)
        {
            session.Services.Add(service);
            var chars = await service.GetCharacteristicsAsync(BluetoothCacheMode.Uncached).AsTask(token);
            if (chars.Status != GattCommunicationStatus.Success)
                throw new InvalidOperationException($"{service.Uuid} 特征发现失败: {chars.Status}");
            var nodes = new List<BleCharacteristicInfo>();
            foreach (var characteristic in chars.Characteristics)
            {
                session.Characteristics[CharKey(service.Uuid.ToString(), characteristic.Uuid.ToString())] = characteristic;
                var props = new List<string>();
                foreach (var pair in new[] {
                    (GattCharacteristicProperties.Read, "read"), (GattCharacteristicProperties.Write, "write"),
                    (GattCharacteristicProperties.WriteWithoutResponse, "writeWithoutResponse"),
                    (GattCharacteristicProperties.Notify, "notify"), (GattCharacteristicProperties.Indicate, "indicate") })
                    if (characteristic.CharacteristicProperties.HasFlag(pair.Item1)) props.Add(pair.Item2);
                nodes.Add(new BleCharacteristicInfo(characteristic.Uuid.ToString(), GetCharacteristicName(characteristic.Uuid.ToString()), props.ToArray()));
            }
            tree.Add(new BleServiceInfo(service.Uuid.ToString(), GetServiceName(service.Uuid.ToString()), nodes.ToArray()));
        }
        token.ThrowIfCancellationRequested();
        if (!Owns(session)) throw new OperationCanceledException();
        session.Tree = tree.ToArray();
        session.Connected = true;
        session.Device.ConnectionStatusChanged += OnConnectionStatusChanged;
        DeviceConnected?.Invoke(session.Id);
        ServiceDiscovered?.Invoke(session.Id, session.Tree);
    }

    private async Task RecoverAsync(DeviceSession session)
    {
        await session.Gate.WaitAsync();
        try
        {
            await ReconnectPolicy.RunAsync(() => Owns(session) && !session.Connected,
                () => EstablishAsync(session), ex =>
                {
                    ReleaseHandles(session);
                    LogMessage?.Invoke("重连失败", $"{session.Id}: {DescribeException(ex)}");
                }, session.Lifetime.Token);
        }
        catch (OperationCanceledException) { }
        finally { session.Gate.Release(); }
    }

    private void ReleaseHandles(DeviceSession session)
    {
        session.Connected = false;
        foreach (var pair in session.Handlers)
            if (session.Characteristics.TryGetValue(pair.Key, out var ch)) ch.ValueChanged -= pair.Value;
        session.Handlers.Clear();
        session.Characteristics.Clear();
        session.Tree = Array.Empty<BleServiceInfo>();
        if (session.Device != null) session.Device.ConnectionStatusChanged -= OnConnectionStatusChanged;
        foreach (var service in session.Services) { try { service.Dispose(); } catch { } }
        session.Services.Clear();
        if (session.Gatt != null)
        {
            try { session.Gatt.MaintainConnection = false; session.Gatt.Dispose(); } catch { }
            session.Gatt = null;
        }
        try { session.Device?.Dispose(); } catch { }
        session.Device = null;
    }

    public async Task DisconnectAsync(string deviceId)
    {
        if (!_sessions.TryRemove(deviceId, out var session)) return;
        session.Lifetime.Cancel(); // invalidates pending connect/recovery before waiting for its gate
        var wasConnected = session.Connected;
        await session.Gate.WaitAsync();
        try { ReleaseHandles(session); }
        finally { session.Gate.Release(); }
        if (wasConnected) DeviceDisconnected?.Invoke(deviceId);
    }

    public async Task DisconnectAllAsync()
    {
        foreach (var id in _sessions.Keys.ToArray()) await DisconnectAsync(id);
    }

    public async Task ShutdownAsync()
    {
        if (_radio != null) { _radio.StateChanged -= OnRadioStateChanged; _radio = null; }
        await StopScanAsync();
        StopAdvertising();
        await DisconnectAllAsync();
    }

    public async Task<byte[]?> ReadCharacteristicAsync(string deviceId, string serviceUuid, string characteristicUuid, CancellationToken cancellationToken = default)
    {
        if (!_sessions.TryGetValue(deviceId, out var session)) return null;
        await session.Gate.WaitAsync(cancellationToken);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(session.Lifetime.Token, cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        try
        {
            var key = CharKey(serviceUuid, characteristicUuid);
            if (!Owns(session) || !session.Connected || !session.Characteristics.TryGetValue(key, out var characteristic))
            {
                LogMessage?.Invoke("读取失败", "特征值未找到");
                return null;
            }

            var result = await characteristic.ReadValueAsync(BluetoothCacheMode.Uncached).AsTask(timeout.Token);
            if (!Owns(session)) return null;

            if (result.Status == GattCommunicationStatus.Success)
            {
                var data = new byte[result.Value.Length];
                DataReader.FromBuffer(result.Value).ReadBytes(data);
                LogMessage?.Invoke("读取成功", $"读取成功: {BitConverter.ToString(data).Replace('-', ' ')}");
                return data;
            }
            else
            {
                LogMessage?.Invoke("读取失败",
                    $"读取失败: status={(int)result.Status}({result.Status}) protocolError={result.ProtocolError}");
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("读取失败", $"读取失败: {DescribeException(ex)}");
        }

        finally { session.Gate.Release(); }
        return null;
    }

    public async Task<bool> WriteCharacteristicAsync(string deviceId, string serviceUuid, string characteristicUuid, byte[] data, bool withResponse = true, bool sensitive = false, CancellationToken cancellationToken = default)
    {
        if (!_sessions.TryGetValue(deviceId, out var session)) return false;
        await session.Gate.WaitAsync(cancellationToken);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(session.Lifetime.Token, cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        try
        {
            if (string.Equals(characteristicUuid, HidProtocol.Input, StringComparison.OrdinalIgnoreCase) && !sensitive)
                throw new InvalidOperationException("Smart HID INPUT 仅允许通过配网流程写入");
            var key = CharKey(serviceUuid, characteristicUuid);
            if (!Owns(session) || !session.Connected || !session.Characteristics.TryGetValue(key, out var characteristic))
            {
                LogMessage?.Invoke("写入失败", "特征值未找到");
                return false;
            }


            // V-WIN-DEF-001：写选项受特征能力约束——请求的模式不被支持时自动降级，
            // 降级由 ResolveWriteOption 统一裁决（可单测的纯函数）
            var (option, downgraded) = ResolveWriteOption(
                withResponse,
                characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Write),
                characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.WriteWithoutResponse));
            if (downgraded)
            {
                LogMessage?.Invoke("写入", option == GattWriteOption.WriteWithoutResponse
                    ? "特征不支持带响应写，已改用无响应写"
                    : "特征不支持无响应写，已改用带响应写");
            }

            var writer = new DataWriter();
            writer.WriteBytes(data);
            var result = await characteristic.WriteValueWithResultAsync(writer.DetachBuffer(), option).AsTask(timeout.Token);
            if (!Owns(session)) return false;

            if (result.Status == GattCommunicationStatus.Success)
            {
                LogMessage?.Invoke("写入成功", sensitive ? "受保护数据已写入（内容已隐藏）" : $"写入成功: {BitConverter.ToString(data).Replace('-', ' ')}");
                return true;
            }
            else
            {
                LogMessage?.Invoke("写入失败",
                    $"写入失败: status={(int)result.Status}({result.Status}) protocolError={result.ProtocolError}");
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("写入失败", $"写入失败: {DescribeException(ex)}");
        }

        finally { session.Gate.Release(); }
        return false;
    }

    public async Task<bool> SetNotificationAsync(string deviceId, string serviceUuid, string characteristicUuid, bool enable, CancellationToken cancellationToken = default)
    {
        if (!_sessions.TryGetValue(deviceId, out var session)) return false;
        await session.Gate.WaitAsync(cancellationToken);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(session.Lifetime.Token, cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        var key = CharKey(serviceUuid, characteristicUuid);
        TypedEventHandler<GattCharacteristic, GattValueChangedEventArgs>? addedHandler = null;
        GattCharacteristic? characteristic = null;
        try
        {
            if (!Owns(session) || !session.Connected || !session.Characteristics.TryGetValue(key, out characteristic)) return false;
            var mode = enable ? ResolveNotificationMode(characteristic.CharacteristicProperties) : GattClientCharacteristicConfigurationDescriptorValue.None;
            if (enable && session.Handlers.ContainsKey(key)) return true;
            if (enable)
            {
                addedHandler = (sender, args) =>
                {
                    if (Owns(session) && session.Connected)
                        CharacteristicValueChanged?.Invoke(session.Id, characteristicUuid, ToBytes(args.CharacteristicValue));
                };
                characteristic.ValueChanged += addedHandler;
            }
            var result = await characteristic.WriteClientCharacteristicConfigurationDescriptorAsync(mode).AsTask(timeout.Token);
            if (result != GattCommunicationStatus.Success || !Owns(session))
            {
                LogMessage?.Invoke("设置通知失败", $"CCCD 写入 status={(int)result}({result})");
                return false;
            }
            if (enable)
            {
                session.Handlers[key] = addedHandler!;
                addedHandler = null; // now owned by the device session
            }
            else if (session.Handlers.Remove(key, out var existing)) characteristic.ValueChanged -= existing;
            LogMessage?.Invoke(enable ? "通知已启用" : "通知已禁用", enable ? "通知已启用" : "通知已禁用");
            return true;
        }
        catch (Exception ex) { LogMessage?.Invoke("设置通知失败", $"设置通知失败: {DescribeException(ex)}"); return false; }
        finally
        {
            if (addedHandler != null && characteristic != null) characteristic.ValueChanged -= addedHandler;
            session.Gate.Release();
        }
    }

    internal static GattClientCharacteristicConfigurationDescriptorValue ResolveNotificationMode(GattCharacteristicProperties properties)
    {
        if (properties.HasFlag(GattCharacteristicProperties.Notify)) return GattClientCharacteristicConfigurationDescriptorValue.Notify;
        if (properties.HasFlag(GattCharacteristicProperties.Indicate)) return GattClientCharacteristicConfigurationDescriptorValue.Indicate;
        throw new InvalidOperationException("特征不支持通知或指示");
    }

    // WinRT 投影异常的 Message 可能为空串（仅 HRESULT），统一带上类型与错误码
    private static string DescribeException(Exception ex)
        => $"{ex.GetType().Name} 0x{ex.HResult:X8} {ex.Message}".TrimEnd();

    // 特征字典键：service-uuid 与 char-uuid 的精确匹配契约（单测锚点）
    internal static string CharKey(string serviceUuid, string characteristicUuid)
        => $"{serviceUuid}-{characteristicUuid}";

    // 写选项裁决（纯函数，单测锚点）：请求模式被特征支持则原样；否则自动降级到
    // 可用模式，Downgraded=true 提示调用方记录「已改用…」日志
    internal static (GattWriteOption Option, bool Downgraded) ResolveWriteOption(
        bool withResponse, bool supportsWrite, bool supportsWriteNr)
    {
        if (!supportsWrite && !supportsWriteNr) throw new InvalidOperationException("特征不支持写入");
        if (!withResponse && supportsWriteNr)
            return (GattWriteOption.WriteWithoutResponse, false);
        if (withResponse && supportsWrite)
            return (GattWriteOption.WriteWithResponse, false);
        if (!withResponse && !supportsWriteNr)
            return (GattWriteOption.WriteWithResponse, true);
        return (GattWriteOption.WriteWithoutResponse, true);
    }

    // 服务/特征显示名注册表：对齐 E-WIN BleUtils.js BLE_SERVICE_NAMES/BLE_CHAR_NAMES
    // （短 4 位 + 8 位自定义前缀双匹配；回退词 未知服务/未知特征值）
    internal static string GetServiceName(string uuid)
    {
        var u = (uuid ?? "").Replace("-", "").ToUpperInvariant();
        if (u.Length == 0) return "未知服务";
        var short4 = u.Length >= 8 ? u.Substring(4, 4) : u;
        var hit = short4 switch
        {
            "1800" => "通用访问",
            "1801" => "通用属性",
            "180A" => "设备信息",
            "180D" => "心率服务",
            "180F" => "电池服务",
            "1809" => "健康温度计",
            "1812" => "人机界面 (HID)",
            "181C" => "用户数据",
            _ => ""
        };
        if (hit.Length > 0) return hit;
        var prefix8 = u.Substring(0, Math.Min(8, u.Length));
        if (prefix8 == "4FAFC201") return "OTA 升级服务";
        return "未知服务";
    }

    internal static string GetCharacteristicName(string uuid)
    {
        var u = (uuid ?? "").Replace("-", "").ToUpperInvariant();
        if (u.Length == 0) return "未知特征值";
        var short4 = u.Length >= 8 ? u.Substring(4, 4) : u;
        var hit = short4 switch
        {
            "2A00" => "设备名称",
            "2A01" => "外观",
            "2A02" => "隐私标志",
            "2A03" => "重连地址",
            "2A04" => "连接参数",
            "2A05" => "服务变更",
            "2A19" => "电池电量",
            "2A23" => "系统标识符",
            "2A24" => "型号",
            "2A25" => "序列号",
            "2A26" => "固件版本",
            "2A27" => "硬件版本",
            "2A28" => "软件版本",
            "2A29" => "制造商",
            "2A37" => "心率测量",
            "2A38" => "身体传感器位置",
            _ => ""
        };
        if (hit.Length > 0) return hit;
        var prefix8 = u.Substring(0, Math.Min(8, u.Length));
        if (prefix8 == "BEB5483E") return "OTA 控制";
        return "未知特征值";
    }
}
