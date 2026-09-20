using System;
using System.Collections.Generic;
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
    private BluetoothLEDevice? _currentDevice;
    private GattSession? _gattSession;
    private readonly List<GattDeviceService> _gattServices = new();
    private readonly Dictionary<string, TypedEventHandler<GattCharacteristic, GattValueChangedEventArgs>>
        _notifyHandlers = new();
    private Dictionary<string, GattCharacteristic> _characteristics = new();
    // 每次“已上报断连”只报一次（被动回调或主动断开二选一先到）
    private bool _disconnectReported;

    // Auto-stop scan timer - aligned with UniApp (5 seconds)
    private DispatcherTimer? _autoStopTimer;

    public event Action<string>? StateChanged;
    public event Action<BleDevice>? DeviceDiscovered;
    public event Action<string>? DeviceConnected;
    public event Action<string>? DeviceDisconnected;
    public event Action<BleServiceInfo[]?>? ServiceDiscovered;
    public event Action<string, byte[]>? CharacteristicValueChanged;
    public event Action<string, string>? LogMessage;
    // 5s 自动停扫回调（UI 同步 IsScanning/扫描状态词；手动停扫不触发）
    public event Action? ScanAutoStopped;

    public async Task InitializeAsync()
    {
        // Check Bluetooth availability
        var radios = await Radio.GetRadiosAsync();
        var bluetoothRadio = radios.FirstOrDefault(r => r.Kind == RadioKind.Bluetooth);

        if (bluetoothRadio == null)
        {
            StateChanged?.Invoke("Unavailable");
            return;
        }

        StateChanged?.Invoke(bluetoothRadio.State == RadioState.On ? "On" : "Off");
    }

    public async Task StartScanAsync()
    {
        _watcher = new BluetoothLEAdvertisementWatcher
        {
            ScanningMode = BluetoothLEScanningMode.Active
        };

        _watcher.Received += OnAdvertisementReceived;
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
    }

    public async Task StopScanAsync()
    {
        // Stop auto-stop timer
        _autoStopTimer?.Stop();
        _autoStopTimer = null;

        _watcher?.Stop();
        _watcher = null;
        await Task.CompletedTask;
    }

    private void OnAdvertisementReceived(BluetoothLEAdvertisementWatcher sender,
        BluetoothLEAdvertisementReceivedEventArgs args)
    {
        // 正典 F005 显示名链：无名广播保持空名（由 UI 层「未命名 BLE 设备」兜底），
        // 不再在此伪造「未知设备」
        var name = args.Advertisement.LocalName ?? "";
        // adv 服务 UUID 列表供 Smart HID 档案强匹配（名称前缀仅弱匹配）
        string[]? serviceUuids = null;
        try
        {
            var advUuids = args.Advertisement.ServiceUuids;
            if (advUuids.Count > 0)
            {
                serviceUuids = new string[advUuids.Count];
                for (var i = 0; i < advUuids.Count; i++)
                    serviceUuids[i] = advUuids[i].ToString();
            }
        }
        catch
        {
            // 个别广播帧 ServiceUuids 访问异常时按无服务列表处理（弱匹配兜底）
        }
        var device = new BleDevice(args.BluetoothAddress.ToString("X"), name,
            (short)args.RawSignalStrengthInDBm, serviceUuids);
        DeviceDiscovered?.Invoke(device);
    }

    // V-WIN-DEF-003：连接状态回调（WinRT 线程池线程触发），被动掉链也上报
    // DeviceDisconnected（此前事件声明了但从未触发，UI 只能靠手动操作感知断连）
    private void OnConnectionStatusChanged(BluetoothLEDevice sender, object? args)
    {
        if (sender.ConnectionStatus == BluetoothConnectionStatus.Disconnected)
        {
            if (!_disconnectReported)
            {
                _disconnectReported = true;
                DeviceDisconnected?.Invoke(sender.BluetoothAddress.ToString("X"));
            }
        }
    }

    public async Task ConnectAsync(string deviceId)
    {
        try
        {
            // Parse Bluetooth address
            if (ulong.TryParse(deviceId, System.Globalization.NumberStyles.HexNumber, null, out var address))
            {
                // V-WIN-DEF-002：先完整释放旧会话（GattSession + 全部 GattDeviceService +
                // 设备）。GattDeviceService 不显式 Dispose 时 Windows 仍按旧 GATT 会话
                // 归属后续查询，重连后特征枚举返回空
                await DisconnectAsync();

                _currentDevice = await BluetoothLEDevice.FromBluetoothAddressAsync(address);

                if (_currentDevice != null)
                {
                    _disconnectReported = false;
                    _currentDevice.ConnectionStatusChanged += OnConnectionStatusChanged;

                    // GattSession.MaintainConnection 持有连接引用，避免空闲期系统侧拆链
                    try
                    {
                        _gattSession = await GattSession.FromDeviceIdAsync(
                            BluetoothDeviceId.FromId(_currentDevice.BluetoothDeviceId.Id));
                        if (_gattSession != null)
                        {
                            _gattSession.MaintainConnection = true;
                        }
                    }
                    catch (Exception ex)
                    {
                        LogMessage?.Invoke("连接", $"GattSession 建立失败（继续直连）: {DescribeException(ex)}");
                    }

                    // Wait for connection
                    await Task.Delay(1000);
                    DeviceConnected?.Invoke(deviceId);

                    // Discover services
                    await DiscoverServicesAsync();
                }
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("连接失败", $"连接失败: {DescribeException(ex)}");
            System.Diagnostics.Debug.WriteLine($"Connect error: {ex.Message}");
        }
    }

    public async Task DisconnectAsync()
    {
        _characteristics.Clear();
        _notifyHandlers.Clear();

        foreach (var service in _gattServices)
        {
            try { service.Dispose(); } catch { /* 释放期对象可能已随会话关闭 */ }
        }
        _gattServices.Clear();

        if (_gattSession != null)
        {
            try
            {
                _gattSession.MaintainConnection = false;
                _gattSession.Dispose();
            }
            catch { }
            _gattSession = null;
        }

        if (_currentDevice != null)
        {
            var deviceId = _currentDevice.BluetoothAddress.ToString("X");
            _currentDevice.ConnectionStatusChanged -= OnConnectionStatusChanged;
            _currentDevice.Dispose();
            _currentDevice = null;

            // 主动断开也上报（对齐 E-WIN/T-WIN 语义）；_disconnectReported 防止
            // 被动掉链（回调已报）+ 随后用户显式断开的重复上报
            if (!_disconnectReported)
            {
                _disconnectReported = true;
                DeviceDisconnected?.Invoke(deviceId);
            }
        }
        await Task.CompletedTask;
    }

    private async Task DiscoverServicesAsync()
    {
        if (_currentDevice == null) return;

        try
        {
            // V-WIN-DEF-002：Uncached 强制走 ATT 重新枚举，与 btleplug(T-WIN)/noble(E-WIN)
            // 的 WithCacheModeAsync(Uncached) 同口径；无参重载可能命中系统缓存
            var servicesResult = await _currentDevice.GetGattServicesAsync(BluetoothCacheMode.Uncached);

            if (servicesResult.Status == GattCommunicationStatus.Success)
            {
                var services = new List<BleServiceInfo>();

                foreach (var service in servicesResult.Services)
                {
                    _gattServices.Add(service);
                    var characteristicsResult = await service.GetCharacteristicsAsync(BluetoothCacheMode.Uncached);
                    var characteristics = new List<BleCharacteristicInfo>();

                    if (characteristicsResult.Status == GattCommunicationStatus.Success)
                    {
                        foreach (var characteristic in characteristicsResult.Characteristics)
                        {
                            // Store for later access
                            var key = CharKey(service.Uuid.ToString(), characteristic.Uuid.ToString());
                            _characteristics[key] = characteristic;

                            var props = new List<string>();
                            if (characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Read))
                                props.Add("read");
                            if (characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Write))
                                props.Add("write");
                            if (characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.WriteWithoutResponse))
                                props.Add("writeWithoutResponse");
                            if (characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Notify))
                                props.Add("notify");
                            if (characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Indicate))
                                props.Add("indicate");

                            characteristics.Add(new BleCharacteristicInfo(
                                characteristic.Uuid.ToString(),
                                GetCharacteristicName(characteristic.Uuid.ToString()),
                                props.ToArray()
                            ));
                        }
                    }
                    else
                    {
                        LogMessage?.Invoke("发现服务失败",
                            $"{service.Uuid} 特征枚举 status={(int)characteristicsResult.Status}({characteristicsResult.Status})");
                    }

                    services.Add(new BleServiceInfo(
                        service.Uuid.ToString(),
                        GetServiceName(service.Uuid.ToString()),
                        characteristics.ToArray()
                    ));
                }

                ServiceDiscovered?.Invoke(services.ToArray());
            }
            else
            {
                LogMessage?.Invoke("发现服务失败",
                    $"GetGattServices status={(int)servicesResult.Status}({servicesResult.Status})");
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("发现服务失败", $"发现服务失败: {DescribeException(ex)}");
            System.Diagnostics.Debug.WriteLine($"Discover services error: {ex.Message}");
        }
    }

    public async Task<byte[]?> ReadCharacteristicAsync(string serviceUuid, string characteristicUuid)
    {
        try
        {
            var key = CharKey(serviceUuid, characteristicUuid);
            if (!_characteristics.ContainsKey(key))
            {
                LogMessage?.Invoke("读取失败", "特征值未找到");
                return null;
            }

            var characteristic = _characteristics[key];
            var result = await characteristic.ReadValueAsync(BluetoothCacheMode.Uncached);

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

        return null;
    }

    public async Task<bool> WriteCharacteristicAsync(string serviceUuid, string characteristicUuid, byte[] data, bool withResponse = true)
    {
        try
        {
            var key = CharKey(serviceUuid, characteristicUuid);
            if (!_characteristics.ContainsKey(key))
            {
                LogMessage?.Invoke("写入失败", "特征值未找到");
                return false;
            }

            var characteristic = _characteristics[key];

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
            var result = await characteristic.WriteValueWithResultAsync(writer.DetachBuffer(), option);

            if (result.Status == GattCommunicationStatus.Success)
            {
                LogMessage?.Invoke("写入成功", $"写入成功: {BitConverter.ToString(data).Replace('-', ' ')}");
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

        return false;
    }

    public async Task<bool> SetNotificationAsync(string serviceUuid, string characteristicUuid, bool enable)
    {
        try
        {
            var key = CharKey(serviceUuid, characteristicUuid);
            if (!_characteristics.ContainsKey(key))
            {
                LogMessage?.Invoke("设置通知失败", "特征值未找到");
                return false;
            }

            var characteristic = _characteristics[key];

            if (enable)
            {
                // 订阅前先移除旧 handler，避免重复订阅（此前每次启用都挂新 lambda）
                if (_notifyHandlers.TryGetValue(key, out var oldHandler))
                {
                    characteristic.ValueChanged -= oldHandler;
                    _notifyHandlers.Remove(key);
                }

                TypedEventHandler<GattCharacteristic, GattValueChangedEventArgs> handler = (sender, args) =>
                {
                    var data = new byte[args.CharacteristicValue.Length];
                    DataReader.FromBuffer(args.CharacteristicValue).ReadBytes(data);
                    CharacteristicValueChanged?.Invoke(characteristicUuid, data);
                    LogMessage?.Invoke("收到通知", $"收到通知: {BitConverter.ToString(data).Replace('-', ' ')}");
                };
                _notifyHandlers[key] = handler;
                characteristic.ValueChanged += handler;

                var result = await characteristic.WriteClientCharacteristicConfigurationDescriptorAsync(
                    GattClientCharacteristicConfigurationDescriptorValue.Notify);

                if (result == GattCommunicationStatus.Success)
                {
                    LogMessage?.Invoke("通知已启用", "通知已启用");
                    return true;
                }
                else
                {
                    LogMessage?.Invoke("设置通知失败", $"CCCD 写入 status={(int)result}({result})");
                }
            }
            else
            {
                if (_notifyHandlers.TryGetValue(key, out var handler))
                {
                    characteristic.ValueChanged -= handler;
                    _notifyHandlers.Remove(key);
                }

                var result = await characteristic.WriteClientCharacteristicConfigurationDescriptorAsync(
                    GattClientCharacteristicConfigurationDescriptorValue.None);

                if (result == GattCommunicationStatus.Success)
                {
                    LogMessage?.Invoke("通知已禁用", "通知已禁用");
                    return true;
                }
                else
                {
                    LogMessage?.Invoke("设置通知失败", $"CCCD 写入 status={(int)result}({result})");
                }
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("设置通知失败", $"设置通知失败: {DescribeException(ex)}");
        }

        return false;
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
