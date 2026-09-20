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
            vm.ExportLogsRequestedAsync = ExportLogsToFileAsync;
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

    // P002 bigact：获取 ControlHub 配对码（V-WIN 无摄像头链路 → VM 层给降级横幅）
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
