using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Devices.Bluetooth.GenericAttributeProfile;

namespace SmartBLE.Desktop.ViewModels;

// Note: This uses WindowsBluetooth NuGet package which works on Windows 10/11
// For cross-platform, consider using btleplug with .NET

public class BleService
{
    private BluetoothLEAdvertisementWatcher? _watcher;
    private BluetoothLEDevice? _currentDevice;

    public event Action<string>? StateChanged;
    public event Action<BleDevice>? DeviceDiscovered;
    public event Action<string>? DeviceConnected;
    public event Action<string>? DeviceDisconnected;
    public event Action<BleServiceInfo[]?>? ServiceDiscovered;

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
    }

    public async Task StopScanAsync()
    {
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
            System.Diagnostics.Debug.WriteLine($"Connect error: {ex.Message}");
        }
    }

    public async Task DisconnectAsync()
    {
        _currentDevice?.Dispose();
        _currentDevice = null;
    }

    private async Task DiscoverServicesAsync()
    {
        if (_currentDevice == null) return;

        try
        {
            var servicesResult = await _currentDevice.GetGattServicesForUuidAsync(
                BluetoothUuidHelper.FromShortId(0x1800));

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
            System.Diagnostics.Debug.WriteLine($"Discover services error: {ex.Message}");
        }
    }

    private static string GetServiceName(string uuid)
    {
        var shortUuid = uuid.Length > 8 ? uuid[4..8] : uuid;
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
        var shortUuid = uuid.Length > 8 ? uuid[4..8] : uuid;
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
