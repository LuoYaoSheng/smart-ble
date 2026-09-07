import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/design/app_icons.dart';
import 'themes/app_theme.dart';
import 'ui/pages/device_list_page.dart';
import 'ui/pages/connected_devices_page.dart';
import 'ui/pages/broadcast_page.dart';
import 'ui/pages/about_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: SmartBLEApp()));
}

/// Smart BLE 应用入口
class SmartBLEApp extends StatelessWidget {
  const SmartBLEApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart BLE',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      // 多语言支持（gen-l10n 自动生成）
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'),
        Locale('zh'),
      ],
      home: const MainScreen(),
    );
  }
}

/// 主屏幕（带底部导航）
class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
    _pageController.jumpToPage(index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // 主 Tab 仅点击切换（PAGE_SPEC §0.1 switchTab 语义）；
      // NeverScrollableScrollPhysics 禁用规范外的左右横滑导航（PARITY-G1 / FLUTTER-G1-002）。
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        onPageChanged: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        children: const [
          DeviceListPage(),
          ConnectedDevicesPage(),
          BroadcastPage(),
          AboutPage(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppTheme.primaryColor,
        unselectedItemColor: AppTheme.textSecondary,
        selectedFontSize: 12,
        unselectedFontSize: 12,
        items: const [
          BottomNavigationBarItem(
            // 正典字形 scan/link/cast/info（PARITY-ICON）；AppIcon 不走 IconTheme，
            // 选中/未选中色需显式烘焙（与 selectedItemColor/unselectedItemColor 一致）。
            icon: AppIcon('scan',
                size: 22, color: AppTheme.textSecondary),
            activeIcon: AppIcon('scan',
                size: 22, color: AppTheme.primaryColor),
            label: '扫描',
          ),
          BottomNavigationBarItem(
            icon: AppIcon('link',
                size: 22, color: AppTheme.textSecondary),
            activeIcon: AppIcon('link',
                size: 22, color: AppTheme.primaryColor),
            label: '已连接',
          ),
          BottomNavigationBarItem(
            icon: AppIcon('cast',
                size: 22, color: AppTheme.textSecondary),
            activeIcon: AppIcon('cast',
                size: 22, color: AppTheme.primaryColor),
            label: '广播',
          ),
          BottomNavigationBarItem(
            icon: AppIcon('info',
                size: 22, color: AppTheme.textSecondary),
            activeIcon: AppIcon('info',
                size: 22, color: AppTheme.primaryColor),
            label: '关于',
          ),
        ],
      ),
    );
  }
}
