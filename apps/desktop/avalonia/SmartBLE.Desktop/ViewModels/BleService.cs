using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Storage.Streams;
using Windows.UI.Xaml;

namespace SmartBLE.Desktop.ViewModels;

// Note: This uses WindowsBluetooth NuGet package which works on Windows 10/11
// For cross-platform, consider using btleplug with .NET

public class BleService
{
    private BluetoothLEAdvertisementWatcher? _watcher;
    private BluetoothLEDevice? _currentDevice;
    private Dictionary<string, GattCharacteristic> _characteristics = new();

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
    }

    private void OnAdvertisementReceived(BluetoothLEAdvertisementWatcher sender,
        BluetoothLEAdvertisementReceivedEventArgs args)
    {
        var name = args.Advertisement.LocalName ?? "未知设备";
        var device = new BleDevice(args.BluetoothAddress.ToString("X"), name, (short)args.RawSignalStrengthInDBm);
        DeviceDiscovered?.Invoke(device);
    }

    public async Task ConnectAsync(string deviceId)
    {
        try
        {
            // Parse Bluetooth address
            if (ulong.TryParse(deviceId, System.Globalization.NumberStyles.HexNumber, null, out var address))
            {
                _currentDevice = await BluetoothLEDevice.FromBluetoothAddressAsync(address);

                if (_currentDevice != null)
                {
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
            LogMessage?.Invoke("连接失败", $"连接失败: {ex.Message}");
            System.Diagnostics.Debug.WriteLine($"Connect error: {ex.Message}");
        }
    }

    public async Task DisconnectAsync()
    {
        _characteristics.Clear();
        _currentDevice?.Dispose();
        _currentDevice = null;
    }

    private async Task DiscoverServicesAsync()
    {
        if (_currentDevice == null) return;

        try
        {
            var servicesResult = await _currentDevice.GetGattServicesAsync();

            if (servicesResult.Status == GattCommunicationStatus.Success)
            {
                var services = new List<BleServiceInfo>();

                foreach (var service in servicesResult.Services)
                {
                    var characteristicsResult = await service.GetCharacteristicsAsync();
                    var characteristics = new List<BleCharacteristicInfo>();

                    if (characteristicsResult.Status == GattCommunicationStatus.Success)
                    {
                        foreach (var char in characteristicsResult.Characteristics)
                        {
                            // Store for later access
                            var key = $"{service.Uuid}-{char.Uuid}";
                            _characteristics[key] = char;

                            var props = new List<string>();
                            if (char.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Read))
                                props.Add("read");
                            if (char.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Write))
                                props.Add("write");
                            if (char.CharacteristicProperties.HasFlag(GattCharacteristicProperties.WriteWithoutResponse))
                                props.Add("writeWithoutResponse");
                            if (char.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Notify))
                                props.Add("notify");
                            if (char.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Indicate))
                                props.Add("indicate");

                            characteristics.Add(new BleCharacteristicInfo(
                                char.Uuid.ToString(),
                                GetCharacteristicName(char.Uuid.ToString()),
                                props.ToArray()
                            ));
                        }
                    }

                    services.Add(new BleServiceInfo(
                        service.Uuid.ToString(),
                        GetServiceName(service.Uuid.ToString()),
                        characteristics.ToArray()
                    ));
                }

                ServiceDiscovered?.Invoke(services.ToArray());
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("发现服务失败", $"发现服务失败: {ex.Message}");
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
            var result = await characteristic.ReadValueAsync();

            if (result.Status == GattCommunicationStatus.Success)
            {
                var data = new byte[result.Value.Length];
                DataReader.FromBuffer(result.Value).ReadBytes(data);
                LogMessage?.Invoke("读取成功", $"读取成功: {BitConverter.ToString(data).Replace('-', ' ')}");
                return data;
            }
            else
            {
                LogMessage?.Invoke("读取失败", $"读取失败: {result.Status}");
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("读取失败", $"读取失败: {ex.Message}");
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
            var writer = new DataWriter();
            writer.WriteBytes(data);

            GattCommunicationStatus result;
            if (withResponse)
            {
                result = await characteristic.WriteValueAsync(writer.DetachBuffer());
            }
            else
            {
                result = await characteristic.WriteValueAsync(writer.DetachBuffer(), GattWriteOption.WriteWithoutResponse);
            }

            if (result == GattCommunicationStatus.Success)
            {
                LogMessage?.Invoke("写入成功", $"写入成功: {BitConverter.ToString(data).Replace('-', ' ')}");
                return true;
            }
            else
            {
                LogMessage?.Invoke("写入失败", $"写入失败: {result}");
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("写入失败", $"写入失败: {ex.Message}");
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
                // Subscribe to value changes
                characteristic.ValueChanged += (sender, args) =>
                {
                    var data = new byte[args.CharacteristicValue.Length];
                    DataReader.FromBuffer(args.CharacteristicValue).ReadBytes(data);
                    CharacteristicValueChanged?.Invoke(characteristicUuid, data);
                    LogMessage?.Invoke("收到通知", $"收到通知: {BitConverter.ToString(data).Replace('-', ' ')}");
                };

                var result = await characteristic.WriteClientCharacteristicConfigurationDescriptorAsync(
                    GattClientCharacteristicConfigurationDescriptorValue.Notify);

                if (result == GattCommunicationStatus.Success)
                {
                    LogMessage?.Invoke("通知已启用", "通知已启用");
                    return true;
                }
            }
            else
            {
                characteristic.ValueChanged -= (sender, args) => { };

                var result = await characteristic.WriteClientCharacteristicConfigurationDescriptorAsync(
                    GattClientCharacteristicConfigurationDescriptorValue.None);

                if (result == GattCommunicationStatus.Success)
                {
                    LogMessage?.Invoke("通知已禁用", "通知已禁用");
                    return true;
                }
            }
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke("设置通知失败", $"设置通知失败: {ex.Message}");
        }

        return false;
    }

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
