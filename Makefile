.PHONY: verify verify-uniapp verify-uniapp-pages verify-flutter verify-android verify-apple verify-apple-core verify-apple-ios verify-apple-macos verify-tauri verify-hardware

verify: verify-uniapp verify-flutter verify-android verify-apple verify-tauri

verify-uniapp:
	./scripts/verify-uniapp.sh

verify-uniapp-pages:
	./scripts/verify-uniapp-pages.sh

verify-flutter:
	cd apps/flutter && flutter pub get && flutter analyze && flutter test

# MAC-002：Android 固定 JDK 17/21（默认 JDK 25 时脚本给出明确错误并退出）。
verify-android:
	bash scripts/android/verify-android.sh

# MAC-002：Apple 根级验证 = 共享 Core swift test + iOS Xcode build/test + 原生 macOS build。
# 深度 macOS 验证（真实 BLE/打包/沙盒）仍走 scripts/macos/verify-native-macos.sh（MAC-007）。
verify-apple: verify-apple-core verify-apple-ios verify-apple-macos

verify-apple-core:
	cd core/apple/SmartHidCore && swift test

verify-apple-ios:
	cd apps/ios && xcodebuild -project SmartBLE.xcodeproj -scheme SmartBLEiOS \
		-destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' test

verify-apple-macos:
	cd apps/desktop/macos/SmartBLE-mac && swift build

verify-tauri:
	cd apps/desktop/tauri/src-tauri && cargo check

verify-hardware:
	cd hardware/esp32/LightBLE && pio run
