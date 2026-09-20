using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Markup.Xaml;
using SmartBLE.Desktop.ViewModels;

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

    // V-WIN-DEF-005：设备卡片 → ConnectToDeviceCommand（此前命令存在但无任何 XAML 绑定）
    private void OnDeviceCardTapped(object? sender, TappedEventArgs e)
    {
        if (sender is Border { DataContext: BleDeviceViewModel vm }
            && DataContext is MainWindowViewModel mvm)
        {
            mvm.ConnectToDeviceCommand.Execute(vm.DeviceId);
        }
    }
}
