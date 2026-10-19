# Windows BLE scan via WinRT BluetoothLEAdvertisementWatcher (PowerShell 5.1)
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File ble-scan.ps1 [-DurationSec 15]
param([int]$DurationSec = 15)
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher,Windows.Devices.Bluetooth.Advertisement,ContentType=WindowsRuntime]

$watcher = New-Object Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher
$watcher.ScanningMode = [Windows.Devices.Bluetooth.Advertisement.BluetoothLEScanningMode]::Active

$script:events = 0
$script:named = @{}
$watcher.add_Received({
    param($sender, $args)
    $script:events++
    $name = $args.Advertisement.LocalName
    if ($name) { $script:named[('{0:X12}' -f $args.BluetoothAddress)] = $name + ' rssi=' + $args.RawSignalStrengthInDBm }
})

$watcher.Start()
Write-Output ("STATUS-AFTER-START: " + $watcher.Status)
Start-Sleep -Seconds $DurationSec
$watcher.Stop()
Start-Sleep -Milliseconds 800
Write-Output ("STATUS-AFTER-STOP: " + $watcher.Status)
Write-Output ("EVENTS: " + $script:events)
Write-Output ("NAMED-DEVICES: " + $script:named.Count)
$script:named.GetEnumerator() | Sort-Object Value | ForEach-Object { Write-Output ("DEVICE " + $_.Key + " " + $_.Value) }
