.PHONY: verify verify-flutter verify-android verify-apple verify-tauri verify-hardware

verify: verify-flutter verify-android verify-apple verify-tauri

verify-flutter:
	cd apps/flutter && flutter pub get && flutter analyze && flutter test

verify-android:
	cd apps/android && ./gradlew assembleDebug testDebugUnitTest

verify-apple:
	cd apps/ios && swift build

verify-tauri:
	cd apps/desktop/tauri/src-tauri && cargo check

verify-hardware:
	cd hardware/esp32/LightBLE && pio run
