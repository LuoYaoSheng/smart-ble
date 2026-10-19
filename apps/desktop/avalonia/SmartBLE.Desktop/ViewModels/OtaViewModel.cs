using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartBLE.Desktop.ViewModels;

public partial class MainWindowViewModel
{
    internal sealed record OtaSelection(string Name, byte[] Firmware, string Manifest);
    internal Func<Task<OtaSelection?>>? OtaPackagePicker;
    [ObservableProperty] private bool _showOtaPanel;
    [ObservableProperty] private bool _otaBusy;
    [ObservableProperty] private bool _otaPackageReady;
    [ObservableProperty] private int _otaProgress;
    [ObservableProperty] private string _otaMessage = "选择 .bin 固件及其 manifest，校验通过后才写入设备";
    private OtaSelection? _otaSelection;
    private CancellationTokenSource? _otaTask;
    private int _otaGeneration;
    public bool IsOtaAvailable => IsGattConnected && OtaCapable(_bleService.GetServices(CurrentDeviceId));
    public bool CanStartOta => OtaPackageReady && !OtaBusy && IsOtaAvailable;
    partial void OnOtaBusyChanged(bool value) => OnPropertyChanged(nameof(CanStartOta));
    partial void OnOtaPackageReadyChanged(bool value) => OnPropertyChanged(nameof(CanStartOta));
    internal static bool OtaCapable(BleServiceInfo[] services)
    {
        var service = services.FirstOrDefault(s => string.Equals(s.Uuid, OtaEngine.Service, StringComparison.OrdinalIgnoreCase));
        if (service == null) return false;
        bool Has(string uuid, params string[] props) => service.Characteristics.Any(c => string.Equals(c.Uuid, uuid, StringComparison.OrdinalIgnoreCase) && c.Properties.Any(props.Contains));
        return Has(OtaEngine.Control, "write") && Has(OtaEngine.Data, "write", "writeWithoutResponse") && Has(OtaEngine.Status, "notify", "indicate");
    }

    private void CancelOtaForNavigation()
    {
        _otaGeneration++;
        _otaTask?.Cancel();
        ShowOtaPanel = false;
        OtaPackageReady = false;
        _otaSelection = null;
        // Keep OtaBusy until the old transaction completes abort/unsubscribe.
    }
    [RelayCommand]
    private void OpenOta()
    {
        if (!IsOtaAvailable || OtaBusy) return;
        ShowOtaPanel = true; OtaProgress = 0; OtaPackageReady = false; _otaSelection = null;
        OtaMessage = "选择 .bin 固件及其 manifest，校验通过后才写入设备";
    }
    [RelayCommand]
    private async Task SelectOtaPackageAsync()
    {
        if (OtaBusy || OtaPackagePicker == null) return;
        var id = CurrentDeviceId; var generation = _otaGeneration;
        OtaPackageReady = false; _otaSelection = null;
        try
        {
            var selection = await OtaPackagePicker();
            if (selection == null || id != CurrentDeviceId || generation != _otaGeneration) return;
            var package = OtaEngine.Validate(selection.Firmware, selection.Manifest);
            _otaSelection = selection; OtaPackageReady = true; OtaProgress = 0;
            OtaMessage = $"包校验通过：{selection.Name} · {package.Size} 字节 · {package.Target} · {package.Version}";
        }
        catch (Exception) { if (id == CurrentDeviceId && generation == _otaGeneration) OtaMessage = "选包或校验失败：请检查文件访问权限、manifest 六字段、size、SHA256 和目标版本"; }
    }
    private sealed class OtaTransport : OtaEngine.ITransport, IDisposable
    {
        private readonly BleService _ble; private readonly string _id;
        public event Action<byte[]>? StatusReceived;
        public event Action? Disconnected;
        public int ChunkSize => _ble.GetWriteCapacity(_id);
        public OtaTransport(BleService ble, string id) { _ble = ble; _id = id; ble.CharacteristicValueChanged += ValueChanged; ble.DeviceDisconnected += DeviceDisconnected; }
        private void ValueChanged(string id, string uuid, byte[] bytes) { if (id == _id && string.Equals(uuid, OtaEngine.Status, StringComparison.OrdinalIgnoreCase)) StatusReceived?.Invoke(bytes); }
        private void DeviceDisconnected(string id) { if (id == _id) Disconnected?.Invoke(); }
        public Task<bool> SubscribeAsync(bool enable, CancellationToken token) => _ble.SetNotificationAsync(_id, OtaEngine.Service, OtaEngine.Status, enable, token);
        public Task<bool> WriteControlAsync(byte[] value, CancellationToken token) => _ble.WriteCharacteristicAsync(_id, OtaEngine.Service, OtaEngine.Control, value, withResponse: true, sensitive: true, cancellationToken: token);
        public Task<bool> WriteDataAsync(byte[] value, CancellationToken token) => _ble.WriteCharacteristicAsync(_id, OtaEngine.Service, OtaEngine.Data, value, withResponse: true, sensitive: true, cancellationToken: token);
        public void Dispose() { _ble.CharacteristicValueChanged -= ValueChanged; _ble.DeviceDisconnected -= DeviceDisconnected; }
    }
    [RelayCommand]
    private async Task StartOtaAsync()
    {
        if (!CanStartOta || _otaSelection == null) return;
        var selection = _otaSelection; var id = CurrentDeviceId; var generation = _otaGeneration;
        _otaTask = new CancellationTokenSource(); OtaBusy = true; OtaMessage = "正在启动 OTA，等待设备 ready 回执";
        try
        {
            using var transport = new OtaTransport(_bleService, id);
            var package = await OtaEngine.RunAsync(transport, selection.Firmware, selection.Manifest, percent => Dispatcher.UIThread.Post(() =>
            {
                if (generation == _otaGeneration && id == CurrentDeviceId)
                {
                    OtaProgress = percent;
                    if (OtaBusy && percent < 100) OtaMessage = $"传输中 {percent}%；完成后等待设备提交回执";
                }
            }), _otaTask.Token);
            if (generation == _otaGeneration && id == CurrentDeviceId)
                OtaMessage = $"设备已确认升级成功，正在重启；重连后核对版本 {package.Version}";
        }
        catch (OperationCanceledException) { if (generation == _otaGeneration) OtaMessage = "客户端跟踪已停止；已尝试发送取消请求，但设备结果未确认，请重连检查"; }
        catch (Exception ex) { if (generation == _otaGeneration) OtaMessage = (ex is TimeoutException or InvalidOperationException ? ex.Message : "蓝牙操作失败，未确认升级完成") + "；取消请求的设备结果未确认，请重连检查"; }
        finally { OtaBusy = false; _otaTask?.Dispose(); _otaTask = null; }
    }
    [RelayCommand]
    private void CancelOta()
    {
        if (OtaBusy) { _otaTask?.Cancel(); OtaMessage = "正在尝试中止设备事务，请等待清理完成"; }
        else { ShowOtaPanel = false; OtaPackageReady = false; _otaSelection = null; }
    }
}
