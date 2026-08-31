.PHONY: verify verify-uniapp verify-uniapp-pages verify-flutter verify-android verify-apple verify-tauri verify-hardware

verify: verify-uniapp verify-flutter verify-android verify-apple verify-tauri

verify-uniapp:
	./scripts/verify-uniapp.sh

verify-uniapp-pages:
	./scripts/verify-uniapp-pages.sh

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
