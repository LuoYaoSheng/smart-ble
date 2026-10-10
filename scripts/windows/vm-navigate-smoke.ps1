param([Parameter(Mandatory=$true)][int]$ProcessId,[Parameter(Mandatory=$true)][string]$Executable,[Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$ExpectedTitle='BLE Toolkit+')
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes
$p=Get-Process -Id $ProcessId
if([IO.Path]::GetFullPath($p.Path) -ine [IO.Path]::GetFullPath($Executable)) {throw 'Process executable differs from the requested application'}
$window=[System.Windows.Automation.AutomationElement]::FromHandle($p.MainWindowHandle)
if($window.Current.Name -ne $ExpectedTitle) {throw 'Unexpected application window title'}
$results=@()
foreach($name in @('已连接','广播','关于','扫描')) {
 $type=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Button)
 $label=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty,$name)
 $condition=New-Object System.Windows.Automation.AndCondition($type,$label)
 $button=$window.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$condition)
 if(-not $button){$results+=@{Page=$name;Status='CONTROL_NOT_EXPOSED'};continue}
 if($button.Current.IsOffscreen -or -not $button.Current.IsEnabled){$results+=@{Page=$name;Status='CONTROL_NOT_INTERACTIVE'};continue}
 $invoke=$null
 if(-not $button.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$invoke)){$results+=@{Page=$name;Status='INVOKE_NOT_EXPOSED'};continue}
 $invoke.Invoke()
 $anchor = switch($name) {'已连接' {'通用调试会话'} '广播' {'设备名称'} '关于' {'应用信息'} '扫描' {'附近设备'}}
 $deadline=[DateTime]::UtcNow.AddSeconds(8)
 do {
  Start-Sleep -Milliseconds 150
  $items=$window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
  $texts=@();foreach($item in $items){try{if($item.Current.Name -and -not $item.Current.IsOffscreen -and -not $item.Current.IsPassword){$texts+=$item.Current.Name}}catch{}}
 } while(-not ($texts -contains $anchor) -and [DateTime]::UtcNow -lt $deadline)
 $p.Refresh();if($p.HasExited){throw "App exited while navigating $name"}
 $results+=@{Page=$name;Status=$(if($texts -contains $anchor){'PAGE_ANCHOR_VERIFIED'}else{'PAGE_ANCHOR_NOT_FOUND'});Expected=$anchor;VisibleText=$texts}
}
New-Item -ItemType Directory -Force -Path $OutputDirectory|Out-Null
$results|ConvertTo-Json -Depth 5|Set-Content -Encoding UTF8 (Join-Path $OutputDirectory 'navigation.json')
if(@($results | Where-Object {$_.Status -ne 'PAGE_ANCHOR_VERIFIED'}).Count -gt 0) {
 Write-Output ('NAVIGATION_FAILED: '+$p.ProcessName); exit 1
}
Write-Output ('NAVIGATION_PASS: '+$p.ProcessName+'; pages='+$results.Count)
