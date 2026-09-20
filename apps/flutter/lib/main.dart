import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:window_manager/window_manager.dart';
import 'core/ble/ble_manager.dart';
import 'themes/app_theme.dart';
import 'ui/design/app_tab_bar.dart';
import 'ui/pages/device_list_page.dart';
import 'ui/pages/connected_devices_page.dart';
import 'ui/pages/broadcast_page.dart';
import 'ui/pages/about_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // WIN-016 桌面生命周期对齐（10_platform §4：常驻，退出确认）：
  // 拦截关窗 → 应用内确认模态（E/T/V 同口径），确认后断开会话再退出
  if (Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
    await windowManager.ensureInitialized();
    await windowManager.setPreventClose(true);
  }
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

class _MainScreenState extends State<MainScreen> with WindowListener {
  int _currentIndex = 0;
  int _connectedBadge = 0;
  final PageController _pageController = PageController();
  StreamSubscription<Map<String, BluetoothConnectionState>>? _statesSub;
  Map<String, BluetoothConnectionState> _latestStates = const {};

  static const _tabKeys = ['scan', 'connected', 'cast', 'info'];

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    // 角标口径（正典 tab-bar）：通用连接会话数（+SHID 配网会话，当前实现无该通道）
    _statesSub = BleManager().connectionStatesStream.listen((states) {
      _latestStates = Map.of(states);
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
    windowManager.removeListener(this);
    super.dispose();
  }

  // WIN-016：桌面关窗拦截（10_platform §4；E/T/V 同口径，dwin-quit 正典文案）
  @override
  void onWindowClose() {
    _confirmExit();
  }

  Future<void> _confirmExit() async {
    final connected = _latestStates.values
        .where((s) => s == BluetoothConnectionState.connected)
        .length;
    final busy = connected > 0; // F-WIN 桌面广播降级关闭，会话=连接
    final quit = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('退出确认'),
        content: Text(busy
            ? '有 BLE 会话正在运行（连接/广播）。\n确认退出将断开会话并停止监听。'
            : '桌面端为常驻运行。确认退出？\n（10_platform §4 生命周期：常驻，退出确认）'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('继续使用'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('退出'),
          ),
        ],
      ),
    );
    if (quit != true) return;
    // dwin-quit 正典顺序：先停广播（F-WIN 桌面线已降级）再断开全部连接
    try {
      await BleManager().disconnectAll();
    } catch (_) {}
    await windowManager.destroy();
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
