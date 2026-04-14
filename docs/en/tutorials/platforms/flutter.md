> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# 馃殌 Flutter 绉诲姩绔法骞冲彴瀹炴垬鎸囧崡

浣滀负 Smart BLE Toolkit+ 鐨勪富鍔涜浇浣擄紝Flutter 浠ュ叾鈥滀竴濂椾唬鐮佽窇閫?Android / iOS 娴佺晠鍘熺敓甯х巼鈥濈殑闇告皵鍌茶缇ら泟銆?

濡傛灉鎮ㄦ鍦ㄥ弬涓?`apps/flutter/` 鐩綍鐨勪簩娆″紑鍙戯紝鏈墜鍐屾槸鎮ㄧ殑鎶よ埅瀹濆吀銆?

## 涓€銆?鐜渚濊禆涓庣紪璇戞瀯寤?
1. **渚濊禆鎷夊彇**锛氬湪缁堢杩涘叆 `apps/flutter/` 鐩綍锛屾墽琛?`flutter pub get`銆?
2. **杩炴帴璁惧**锛氭彃鍏ユ偍鐨勫畨鍗撴垨鑻规灉娴嬭瘯鏈猴紙鍒囪涓嶅彲浣跨敤鐢佃剳鐨勭綉椤电妯℃嫙鍣紝鍥犱负娴忚鍣ㄥ紩鎿庝笉鍚摑鐗欏簳灞傝姱鐗囬┍鍔級銆?
3. **璺戣捣鏉?*锛氱偣鍑?VS Code 鍙充笅瑙掔殑 Device 閫夋嫨鍣紝鎴栬€呯洿鎺ユ墽琛?`flutter run`銆?

## 浜屻€?[娣辨笂宸ㄥ潙] 鍔ㄦ€佹潈闄愮储鍙栦綋绯?
濡傛灉鎮ㄦ槸涓€涓函鍓嶇 / Web 寮€鍙戣浆杩囨潵鐨勫叏鏍堬紝鍦ㄥ紑鍙戝師鐢熶骇鐗╂椂锛屾渶澶х殑鍣╂ⅵ鑾繃浜庤摑鐗欑殑鈥滆繛鐜巿鏉冣€濄€?

鍦ㄦ湰椤圭洰涓紝鎴戜滑宸茬粡鍏ㄩ儴鍋氬ソ浜嗛槻鍧戝～鍩嬶紙浠ｇ爜浣嶄簬 `apps/flutter/lib/core/ble/ota_manager.dart` 绛夊叆鍙ｆ枃浠讹級銆傛偍鍦ㄤ簩寮€鏃跺繀椤荤煡閬撳叾杩愪綔鏈哄埗锛?

### 瀵逛簬 Android 12 浠ヤ笂 (API 31+)锛?
Google 浠庡簳灞傚墺绂讳簡浼犵粺鐨勫畾浣嶆潈闄愶紝鎮ㄥ繀椤诲湪 `AndroidManifest.xml` 涓繚鐣欙細
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
鑰屼笖鍦?Flutter 鐢ㄦ埛鐐瑰嚮鈥滆繛鎺モ€濆墠锛屽姟蹇呰皟鐢?`permission_handler` 瑕佹眰鐢ㄦ埛鏄庣‘鐐瑰嚮鎺堟潈锛屽惁鍒?`flutter_blue_plus` 鐩存帴闈欓粯杩斿洖 0 涓澶囷紒

### 瀵逛簬 iOS 绔細
鑻规灉鐨勮姹傛洿鍔犻湼閬擄細缁濆涓嶅厑璁稿簲鐢ㄥ湪娌℃湁浠讳綍鏂囨瑙ｉ噴鐨勬儏鍐典笅寮瑰嚭鈥滃簲鐢ㄦ鍦ㄨ姹備娇鐢ㄨ摑鐗欌€濈殑鐧芥锛?
鎴戜滑宸茬粡鍦?`ios/Runner/Info.plist` 閲屽啓濂戒簡 `NSBluetoothAlwaysUsageDescription`锛屽鏋滄偍瑕佸晢鐢ㄤ笂鏋?AppStore锛岃寰楀幓鎶婃彁绀鸿鏀瑰緱鏇村姞绗﹀悎鎮ㄤ骇鍝佺殑鍟嗕笟鍖呰锛屽惁鍒欎細琚鑻规灉鏈哄櫒瀹℃牳绉掓嫆銆?

## 涓夈€?瀵规姉涓庝慨鏀?SSOT 浜х墿
Flutter 涓嶄娇鐢?CSS锛佹墍浠ョ粷瀵逛笉瑕佸幓 `apps/flutter/lib/ui/...` 涓嬮潰纭紪鐮佸崄鍏繘鍒堕鑹诧紒
濡傛灉鎮ㄦ兂瀵规寜閽繘琛?UI 澶ф敼閫狅細
1. 璇烽€€鍥炲埌椤圭洰鏈€鏍圭洰褰曚笅鐨?`core/assets-generator/meta/colors.json`銆?
2. 鏇存敼棰滆壊銆?
3. 杩愯鏍归儴 `generate_assets.py`銆?
鑴氭湰浼氳嚜鍔ㄩ噸閾?Flutter 绔墍闇€鐨?`.dart` 绫伙紝杩欐墠鏄绔ぇ涓€缁熺殑楂樻墜鐜╂硶銆?

