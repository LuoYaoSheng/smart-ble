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
        var name = args.Advertisement.LocalName ?? "未知设备";
        var device = new BleDevice(args.BluetoothAddress.ToString("X"), name, (short)args.RawSignalStrengthInDBm);
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
                            var key = $"{service.Uuid}-{characteristic.Uuid}";
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
            var key = $"{serviceUuid}-{characteristicUuid}";
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
            var key = $"{serviceUuid}-{characteristicUuid}";
            if (!_characteristics.ContainsKey(key))
            {
                LogMessage?.Invoke("写入失败", "特征值未找到");
                return false;
            }

            var characteristic = _characteristics[key];

            // V-WIN-DEF-001：写选项受特征能力约束——请求带响应写但特征只支持无响应写时
            // 自动降级（反向同理），避免对不支持的属性发起写导致失败
            bool supportsWrite = characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Write);
            bool supportsWriteNr = characteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.WriteWithoutResponse);
            var option = GattWriteOption.WriteWithResponse;
            if (!supportsWrite && supportsWriteNr)
            {
                option = GattWriteOption.WriteWithoutResponse;
                if (withResponse)
                {
                    LogMessage?.Invoke("写入", "特征不支持带响应写，已改用无响应写");
                }
            }
            else if (!withResponse && !supportsWriteNr)
            {
                option = GattWriteOption.WriteWithResponse;
                LogMessage?.Invoke("写入", "特征不支持无响应写，已改用带响应写");
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
            var key = $"{serviceUuid}-{characteristicUuid}";
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

    private static string GetServiceName(string uuid)
    {
        var shortUuid = uuid.Length > 8 ? uuid.Substring(4, 4) : uuid;
        return shortUuid switch
        {
            "1800" => "Generic Access",
            "1801" => "Generic Attribute",
            "180A" => "Device Information",
            "180F" => "Battery Service",
            "1812" => "HID",
            _ => "Unknown Service"
        };
    }

    private static string GetCharacteristicName(string uuid)
    {
        var shortUuid = uuid.Length > 8 ? uuid.Substring(4, 4) : uuid;
        return shortUuid switch
        {
            "2A00" => "Device Name",
            "2A01" => "Appearance",
            "2A29" => "Manufacturer Name",
            "2A24" => "Model Number",
            "2A25" => "Serial Number",
            "2A27" => "Hardware Revision",
            "2A26" => "Firmware Revision",
            "2A28" => "Software Revision",
            "2A19" => "Battery Level",
            _ => "Unknown Characteristic"
        };
    }
}
