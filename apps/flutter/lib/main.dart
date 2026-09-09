import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'core/ble/ble_manager.dart';
import 'themes/app_theme.dart';
import 'ui/design/app_tab_bar.dart';
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
  int _connectedBadge = 0;
  final PageController _pageController = PageController();
  StreamSubscription<Map<String, BluetoothConnectionState>>? _statesSub;

  static const _tabKeys = ['scan', 'connected', 'cast', 'info'];

  @override
  void initState() {
    super.initState();
    // 角标口径（正典 tab-bar）：通用连接会话数（+SHID 配网会话，当前实现无该通道）
    _statesSub = BleManager().connectionStatesStream.listen((states) {
      final count = states.values
          .where((s) => s == BluetoothConnectionState.connected)
          .length;
      if (mounted && count != _connectedBadge) {
        setState(() => _connectedBadge = count);
      }
    });
  }

  @override
  void dispose() {
    _statesSub?.cancel();
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
        children: [
          const DeviceListPage(),
          ConnectedDevicesPage(onGoScan: () => _onTabTapped(0)),
          const BroadcastPage(),
          const AboutPage(),
        ],
      ),
      // UI-G2：正典 AppTabBar（A3 · AppIcon 字形 + 已连接角标）
      bottomNavigationBar: AppTabBar(
        activeKey: _tabKeys[_currentIndex],
        onSwitch: (key) => _onTabTapped(_tabKeys.indexOf(key)),
        connectedBadge: _connectedBadge,
      ),
    );
  }
}
