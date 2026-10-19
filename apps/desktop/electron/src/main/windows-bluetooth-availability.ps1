$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $adapterType = [Windows.Devices.Bluetooth.BluetoothAdapter,Windows.Devices.Bluetooth,ContentType=WindowsRuntime]
    $radioType = [Windows.Devices.Radios.Radio,Windows.Devices.Radios,ContentType=WindowsRuntime]
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and
        $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } | Select-Object -First 1
    function Await($operation, [Type]$type) {
        $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
        if (-not $task.Wait(3000)) { throw 'Bluetooth availability query timed out' }
        return $task.GetAwaiter().GetResult()
    }
    $adapter = Await ($adapterType::GetDefaultAsync()) $adapterType
    $state = 'unavailable'
    if ($null -eq $adapter) { $state = 'noAdapter' }
    elseif (-not $adapter.IsLowEnergySupported) { $state = 'unsupportedAdapter' }
    else {
        $radio = Await ($adapter.GetRadioAsync()) $radioType
        if ($null -ne $radio) {
            switch ($radio.State.ToString()) {
                'On' { $state = 'poweredOn' }
                'Off' { $state = 'poweredOff' }
                'Disabled' { $state = 'poweredOff' }
            }
        }
    }
    [Console]::Out.WriteLine((@{ state = $state } | ConvertTo-Json -Compress))
} catch {
    $state = 'unavailable'
    if ($_.Exception.GetBaseException().HResult -eq -2147024891) { $state = 'unauthorized' }
    [Console]::Out.WriteLine((@{ state = $state; error = 'BLUETOOTH_QUERY_FAILED' } | ConvertTo-Json -Compress))
}
