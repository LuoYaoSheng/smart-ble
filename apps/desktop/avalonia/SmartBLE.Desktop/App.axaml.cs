using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;

namespace SmartBLE.Desktop;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // V-WIN-DEF-004：XAML 只有 Design.DataContext（设计期专用，运行期忽略），
            // 此处此前只 new 不装配——运行期全部 Binding 求值于 null：命令全死、
            // 状态/计数/扫描文字空白、过滤面板因 IsVisible 绑定失败回退默认 true 恒显，
            // UI 实为静态壳（20260920-VWIN-UIFULL 行为级红证）
            desktop.MainWindow = new MainWindow
            {
                DataContext = new ViewModels.MainWindowViewModel()
            };
        }

        base.OnFrameworkInitializationCompleted();
    }
}
