using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Markup.Xaml;
using Avalonia.Platform.Storage;
using SmartBLE.Desktop.ViewModels;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SmartBLE.Desktop;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        AvaloniaXamlLoader.Load(this);
    }

    // DataContext 由 App 启动器（对象初始化器）在构造后装配——能力注入须等它就位
    protected override void OnDataContextChanged(EventArgs e)
    {
        base.OnDataContextChanged(e);
        if (DataContext is MainWindowViewModel vm)
        {
            vm.CloseRequested += () => Close();
            vm.ClipboardWriter = async text =>
            {
                if (Clipboard != null) await Clipboard.SetTextAsync(text);
            };
            vm.ClipboardReader = async () => Clipboard == null ? null : await Clipboard.GetTextAsync();
            vm.ExportLogsRequestedAsync = ExportLogsToFileAsync;
            vm.OtaPackagePicker = PickOtaPackageAsync;
        }
    }

    // 设备卡整卡点击（C1 devCard show-detail）：进入 P006 GATT 调试；
    // 卡内按钮（连接/配置 Smart HID/断开）点击不冒泡触发本入口
    private void OnDeviceCardTapped(object? sender, TappedEventArgs e)
    {
        if (sender is not Border { DataContext: BleDeviceViewModel vm }
            || DataContext is not MainWindowViewModel mvm)
            return;

        if (IsInsideButton(e))
            return; // 按钮已各自处理（连接/配网/断开），不重复触发整卡导航

        mvm.SelectDeviceCommand.Execute(vm.Id);
    }

    // 扫描卡整卡点击（C1 devCard p001-advdlg · F004/R04）：弹广播数据弹窗；
    // 卡内按钮（连接/配置 Smart HID）点击不冒泡触发本入口
    private void OnScanCardTapped(object? sender, TappedEventArgs e)
    {
        if (sender is not Border { DataContext: BleDeviceViewModel vm }
            || DataContext is not MainWindowViewModel mvm)
            return;

        if (IsInsideButton(e))
            return; // 按钮已各自处理（连接/配网），不重复触发整卡弹层

        mvm.OpenAdvertisementCommand.Execute(vm.Id);
    }

    private static bool IsInsideButton(TappedEventArgs e)
    {
        var current = e.Source as Control;
        while (current != null)
        {
            if (current is Button) return true;
            current = current.Parent as Control;
        }
        return false;
    }

    // P002 bigact：导入并验证 ControlHub 配对链接
    private void OnHidQrEntryTapped(object? sender, TappedEventArgs e)
    {
        if (DataContext is MainWindowViewModel mvm)
            mvm.HidQrEntryCommand.Execute(null);
    }

    // 退出确认（10_platform §4）：拦截 Close → VM 模态；确认后放行
    protected override void OnClosing(WindowClosingEventArgs e)
    {
        base.OnClosing(e);
        if (DataContext is MainWindowViewModel vm && !vm.RequestExit())
            e.Cancel = true;
    }

    private async Task<MainWindowViewModel.OtaSelection?> PickOtaPackageAsync()
    {
        var binaries = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "选择 .bin 固件", AllowMultiple = false,
            FileTypeFilter = new[] { new FilePickerFileType("固件") { Patterns = new[] { "*.bin" } } }
        });
        if (binaries.Count != 1) return null;
        var manifests = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "选择对应 manifest", AllowMultiple = false,
            FileTypeFilter = new[] { new FilePickerFileType("manifest") { Patterns = new[] { "*.json" } } }
        });
        if (manifests.Count != 1) return null;
        await using var binStream = await binaries[0].OpenReadAsync();
        using var data = new System.IO.MemoryStream();
        await binStream.CopyToAsync(data);
        await using var manifestStream = await manifests[0].OpenReadAsync();
        using var reader = new System.IO.StreamReader(manifestStream);
        return new MainWindowViewModel.OtaSelection(binaries[0].Name, data.ToArray(), await reader.ReadToEndAsync());
    }

    // 日志导出落盘（正典 LogPanel.exportLogs 同口径文本；存储选择器由窗口层持有）
    private async Task ExportLogsToFileAsync(string content)
    {
        try
        {
            var storage = StorageProvider;
            var file = await storage.SaveFilePickerAsync(new FilePickerSaveOptions
            {
                SuggestedFileName =
                    $"smartble-log-{DateTime.Now:yyyy-MM-dd-HH-mm-ss}.txt",
                FileTypeChoices = new[]
                {
                    new FilePickerFileType("文本文件") { Patterns = new[] { "*.txt" } }
                }
            });
            if (file == null) return;
            await using var stream = await file.OpenWriteAsync();
            await using var writer = new System.IO.StreamWriter(stream);
            await writer.WriteAsync(content);
        }
        catch
        {
            // 选择器取消/写入失败静默（日志面板已有「日志已导出」之外的错误路径）
        }
    }
}
