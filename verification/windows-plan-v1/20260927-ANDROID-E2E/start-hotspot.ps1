param([string]$Action = "start")

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$profile = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]::GetInternetConnectionProfile()
if (-not $profile) { Write-Output "NO_INTERNET_PROFILE"; exit 1 }

$tm = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]::CreateFromConnectionProfile($profile)

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($WinRtTask, $ResultType) {
    $netTask = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

if ($Action -eq "state") {
    Write-Output ("STATE=" + $tm.TetheringOperationalState)
    exit 0
}

if ($Action -eq "start") {
    $res = Await ($tm.StartTetheringAsync()) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult])
    Write-Output ("START_RESULT=" + $res.Status + " ERR=" + $res.AdditionalErrorMessage)
    Write-Output ("STATE=" + $tm.TetheringOperationalState)
}
elseif ($Action -eq "stop") {
    $res = Await ($tm.StopTetheringAsync()) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult])
    Write-Output ("STOP_RESULT=" + $res.Status)
}
