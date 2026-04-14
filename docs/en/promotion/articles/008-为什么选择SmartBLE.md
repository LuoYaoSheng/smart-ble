> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# 涓轰粈涔堥€夋嫨 Smart BLE锛熺粰钃濈墮寮€鍙戣€呯殑 5 涓悊鐢?

## 鏍囬
```
涓轰粈涔堥€夋嫨 Smart BLE锛熺粰钃濈墮寮€鍙戣€呯殑 5 涓悊鐢?
```

---

## 姝ｆ枃鍐呭

```markdown
# 涓轰粈涔堥€夋嫨 Smart BLE锛熺粰钃濈墮寮€鍙戣€呯殑 5 涓悊鐢?

甯傞潰涓婅摑鐗欒皟璇曞伐鍏烽偅涔堝锛屼负浠€涔堣繕瑕佸仛 Smart BLE锛?

鍥犱负甯傞潰涓婄殑宸ュ叿锛岃涔堜笉寮€婧愶紝瑕佷箞涓嶅畬鏁达紝瑕佷箞鍙敮鎸佸崟涓€骞冲彴銆?

Smart BLE 涓嶄竴鏍枫€?

---

## 鐞嗙敱涓€锛?+ 绉嶅钩鍙板疄鐜帮紝瑕嗙洊鎵€鏈変富娴佹妧鏈爤

浣犳槸 Vue 寮€鍙戣€咃紵鏈?uni-app 鐗堟湰銆?

浣犳槸 Flutter 寮€鍙戣€咃紵鏈?Flutter 鐗堟湰銆?

浣犳槸 Rust 鐖卞ソ鑰咃紵鏈?Tauri 鐗堟湰銆?

浣犳槸 .NET 宸ョ▼甯堬紵鏈?Avalonia 鐗堟湰銆?

鐢氳嚦浣犳槸鍋?iOS/macOS 鍘熺敓鐨勶紵涔熸湁 Swift 鐗堟湰銆?

| 骞冲彴 | 鎶€鏈爤 | 涓€琛屼唬鐮佸厠闅?|
|------|--------|-------------|
| uni-app | Vue 3 | `git clone && npm install` |
| Flutter | Dart | `git clone && flutter run` |
| Electron | Node.js | `git clone && npm start` |
| Tauri | Rust | `git clone && cargo run` |
| macOS | Swift | `git clone && swift run` |

**涓€涓棶棰橈紝鍏瑙ｆ硶**銆傛€绘湁涓€娆鹃€傚悎浣犮€?

---

## 鐞嗙敱浜岋細瀹屽叏寮€婧愶紝浠庝唬鐮佸埌鍥轰欢

寰堝"寮€婧?鐨勮摑鐗欏伐鍏凤紝鏍稿績浠ｇ爜闂簮锛屽浐浠舵洿鏄笉鍙兘缁欎綘銆?

Smart BLE 涓嶅悓锛?

```
鉁?鍓嶇浠ｇ爜 鈥?鍏ㄩ儴寮€鏀?
鉁?妗岄潰绔唬鐮?鈥?鍏ㄩ儴寮€鏀?
鉁?ESP32 鍥轰欢 鈥?鍏ㄩ儴寮€鏀?
鉁?鍗忚璁捐 鈥?鍏ㄩ儴鍏紑
鉁?MIT 鍗忚 鈥?鍟嗙敤鏃犲咖
```

娌℃湁榛戠洅锛屾病鏈夐殣钘忥紝娌℃湁"浠樿垂瑙ｉ攣"銆?

**浠ｇ爜鍗虫枃妗?*銆?

---

## 鐞嗙敱涓夛細纭欢鍥轰欢锛岀鍒扮鏂规

杞欢宸ュ叿寰堝锛屼絾甯︾‖浠跺浐浠剁殑寰堝皯銆?

Smart BLE 鍐呯疆 ESP32 瀹屾暣鍥轰欢锛?

```
hardware/esp32/
鈹溾攢鈹€ main/
鈹?  鈹溾攢鈹€ ble_server.cpp      # BLE 鏈嶅姟
鈹?  鈹溾攢鈹€ led_control.cpp     # LED 鎺у埗
鈹?  鈹斺攢鈹€ command_handler.cpp # 鍛戒护澶勭悊
```

鍔熻兘鍖呮嫭锛?

- 馃敜 鑷畾涔夎澶囧悕绉?
- 馃挕 LED 鎺у埗锛堝父浜?蹇棯/鎱㈤棯锛?
- 馃搫 JSON 鏍煎紡鏁版嵁浜や簰
- 馃敀 澶氭潈闄愮壒寰佸€兼紨绀?

**杞欢 + 纭欢锛屼竴绔欏紡瑙ｅ喅**銆?

---

## 鐞嗙敱鍥涳細鏁欏鍙嬪ソ锛屼粠闆跺埌涓€

Smart BLE 涓嶆槸缁欏ぇ鍘傜敤鐨勶紝鏄粰寮€鍙戣€呯殑锛?

| 瀛︿範鍐呭 | Smart BLE 鎻愪緵 |
|---------|---------------|
| BLE 鍩虹姒傚康 | 鉁?瀹屾暣鏂囨。 |
| 璺ㄥ钩鍙版灦鏋勮璁?| 鉁?鎶借薄灞傚疄鐜?|
| uni-app 寮€鍙?| 鉁?2000+ 琛屼唬鐮?|
| Flutter 寮€鍙?| 鉁?瀹屾暣椤圭洰 |
| ESP32 鍥轰欢寮€鍙?| 鉁?鍙紪璇戣繍琛?|
| 鍚勫钩鍙板樊寮?| 鉁?璇︾粏瀵规瘮 |

**浠庣悊璁哄埌瀹炶返锛屼竴绔欏紡瀛︿範**銆?

---

## 鐞嗙敱浜旓細鎸佺画缁存姢锛岀ぞ鍖洪┍鍔?

Smart BLE 涓嶆槸涓€涓汉鐨勯」鐩細

- 馃搵 瀹屾暣鐨勬枃妗ｄ綋绯?
- 馃敡 鎸佺画鐨?Bug 淇
- 鉁?瀹氭湡鐨勫姛鑳芥洿鏂?
- 馃懃 娲昏穬鐨勭ぞ鍖鸿璁?

### 宸插畬鎴愬姛鑳?

| 鍔熻兘 | 鐘舵€?|
|------|------|
| 璁惧鎵弿 | 鉁?|
| 杩炴帴绠＄悊 | 鉁?|
| 璇诲啓鎿嶄綔 | 鉁?|
| 閫氱煡璁㈤槄 | 鉁?|
| BLE 骞挎挱 | 鉁?|
| 鎿嶄綔鏃ュ織 | 鉁?|

### 杩涜涓?

| 鍔熻兘 | 鐘舵€?|
|------|------|
| OTA 鍗囩骇 | 馃毀 |
| 澶氳澶囪繛鎺?| 馃毀 |
| 鏁版嵁鍥炴斁 | 馃毀 |
| 鑴氭湰鑷姩鍖?| 馃毀 |

---

## 鐪熷疄鐢ㄦ埛鍙嶉

> "浣滀负涓€涓?IoT 寮€鍙戣€咃紝鎴戞壘浜嗗緢涔呮墠鎵惧埌杩欎箞瀹屾暣鐨勫紑婧愭柟妗堛€? 鈥?鏌愬祵鍏ュ紡宸ョ▼甯?

> "Flutter 鐗堟湰鐨勪唬鐮佽川閲忓緢楂橈紝鐩存帴鍙傝€冧簡鎶借薄灞傜殑璁捐銆? 鈥?鏌愮Щ鍔ㄧ寮€鍙戣€?

> "ESP32 鍥轰欢鎷挎潵灏辫兘鐢紝鑺傜渷浜嗘垜澶ч噺鏃堕棿銆? 鈥?鏌愮‖浠跺伐绋嬪笀

---

## 蹇€熷紑濮?

```bash
# 鍏嬮殕椤圭洰
git clone https://github.com/luoyaosheng/smart-ble.git
# 鎴?
git clone https://gitee.com/luoyaosheng/lys-smart-ble.git

# uni-app 鐗堟湰
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin

# Flutter 鐗堟湰
cd smart-ble/apps/flutter
flutter pub get
flutter run

# ESP32 鍥轰欢
cd smart-ble/hardware/esp32
idf.py build && idf.py flash monitor
```

**5 鍒嗛挓涓婃墜锛屼竴灏忔椂鎺屾彙銆?*

---

## 閫傜敤浜虹兢

| 浣犳槸 | Smart BLE 瀵逛綘鏉ヨ |
|------|-------------------|
| 钃濈墮璁惧寮€鍙戣€?| **鏃ュ父璋冭瘯宸ュ叿** |
| 璺ㄥ钩鍙板簲鐢ㄥ紑鍙戣€?| **鍙傝€冨疄鐜版ā鏉?* |
| 宓屽叆寮忓伐绋嬪笀 | **鍥轰欢寮€鍙戣寖渚?* |
| 钃濈墮鎶€鏈涔犺€?| **瀛︿範瀹炶返椤圭洰** |
| 浼佷笟鐢ㄦ埛 | **浜屾寮€鍙戝熀纭€** |

---

## 涓轰粈涔堟槸 Smart BLE锛?

鍥犱负寮€鍙戣€呭€煎緱鏇村ソ鐨勫伐鍏枫€?

鍥犱负寮€婧愬簲璇ョ湡姝ｅ紑婧愩€?

鍥犱负鐭ヨ瘑搴旇鑷敱鍒嗕韩銆?

---

## 椤圭洰鍦板潃

- **GitHub**: https://github.com/luoyaosheng/smart-ble
- **Gitee**: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/

**濡傛灉瑙夊緱鏈夊府鍔╋紝璇风粰涓€涓?Star 猸?*

---

*璁╄摑鐗欏紑鍙戯紝浠庢绠€鍗曪紒*

*鏍囩锛?BLE #钃濈墮 #寮€婧?#SmartBLE #椤圭洰浠嬬粛*
```

