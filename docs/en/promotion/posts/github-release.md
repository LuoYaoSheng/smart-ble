> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# GitHub Release 鍐呭

## 鏍囬
```
馃帀 Smart BLE v2.0.0 - 璺ㄥ钩鍙拌摑鐗欒皟璇曞伐鍏凤紝8+ 绉嶅疄鐜板叏闈㈠紑婧愶紒
```

---

## 姝ｆ枃鍐呭

```markdown
## 馃帶 Smart BLE v2.0.0

涓撲笟鐨勮法骞冲彴钃濈墮(BLE)璋冭瘯宸ュ叿锛?*8+ 绉嶅疄鐜?+ 纭欢鍥轰欢 + 瀹屽叏寮€婧?*

---

## 鉁?涓轰粈涔堥€夋嫨 Smart BLE锛?

| 鐥涚偣 | Smart BLE 瑙ｅ喅鏂规 |
|------|-------------------|
| 馃敶 璋冭瘯宸ュ叿涓嶇粺涓€ | 馃煝 **8+ 绉嶅疄鐜?*锛岃鐩栨墍鏈変富娴佸钩鍙?|
| 馃敶 浠ｇ爜涓嶅畬鏁?闂簮 | 馃煝 **瀹屽叏寮€婧?*锛岀‖浠跺浐浠朵篃寮€鏀?|
| 馃敶 瀛︿範璧勬枡闆舵暎 | 馃煝 **瀹屾暣鏂囨。** + 鐪熷疄纭欢绀轰緥 |
| 馃敶 杞‖浠跺垎绂?| 馃煝 **绔埌绔柟妗?*锛孉pp + ESP32 鍥轰欢 |

---

## 馃殌 鏈増鏈寒鐐?

### 8+ 绉嶅钩鍙板疄鐜?
- 鉁?**uni-app** (Vue 3) - 灏忕▼搴?App/H5 涓€濂椾唬鐮?
- 鉁?**Flutter** - Android/iOS/macOS 瀹屾暣鏀寔
- 鉁?**Electron** - Win/Mac/Linux 鍏ㄨ鐩?
- 鉁?**Tauri** - Rust 鍚庣锛屼粎 ~10MB
- 鉁?**macOS 鍘熺敓** - AppKit 鍘熺敓浣撻獙
- 鉁?**Avalonia** - .NET 8 + C#

### 瀹屽叏寮€婧?
- 馃摫 鎵€鏈夊墠绔唬鐮?
- 馃捇 鎵€鏈夋闈㈢瀹炵幇
- 馃攲 ESP32 纭欢鍥轰欢
- 馃摎 瀹屾暣椤圭洰鏂囨。
- 馃啌 **MIT 鍗忚锛屽晢鐢ㄦ棤蹇?*

---

## 馃搳 鍔熻兘涓€瑙?

### 璁惧绔紙Central 妯″紡锛?
- 馃攳 鏅鸿兘璁惧鎵弿锛堜俊鍙峰己搴?鍚嶇О杩囨护锛?
- 馃攲 涓€閿繛鎺ョ鐞嗭紙鏈嶅姟鑷姩鍙戠幇锛?
- 馃摑 鐗瑰緛鍊艰鍐欙紙UTF-8 / HEX 鍙屾牸寮忥級
- 馃敂 閫氱煡璁㈤槄锛堝疄鏃舵暟鎹洃鎺э級
- 馃搵 瀹炴椂鎿嶄綔鏃ュ織

### 澶栬绔紙Peripheral 妯″紡锛?
- 馃摗 BLE 骞挎挱锛堣嚜瀹氫箟鍚嶇О銆乁UID锛?
- 馃摫 鎵嬫満鍙樿韩钃濈墮璁惧锛岀敤浜庢祴璇?

### 纭欢鏀寔
- 馃 **ESP32 瀹屾暣鍥轰欢**锛岀洿鎺ュ彲鐢?
- 馃挕 LED 鎺у埗锛堝父浜?蹇棯/鎱㈤棯锛?
- 馃搫 JSON 鏍煎紡鏁版嵁浜や簰

---

## 馃殌 蹇€熷紑濮?

### uni-app 鐗堟湰锛堟帹鑽愭柊鎵嬶級
```bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
```

### Flutter 鐗堟湰
```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

### 妗岄潰绔?Electron
```bash
cd smart-ble/apps/desktop/electron
npm install
npm start
```

### ESP32 纭欢
```bash
cd smart-ble/hardware/esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 馃摎 鏂囨。

- [鍔熻兘瑙勬牸](https://github.com/luoyaosheng/smart-ble/blob/main/docs/01-functional-specs.md)
- [鏁版嵁娴佸浘](https://github.com/luoyaosheng/smart-ble/blob/main/docs/02-data-flow.md)
- [BLE 鍗忚](https://github.com/luoyaosheng/smart-ble/blob/main/docs/03-ble-protocol.md)
- [UI 娴佺▼](https://github.com/luoyaosheng/smart-ble/blob/main/docs/04-ui-flows.md)
- [骞冲彴宸紓](https://github.com/luoyaosheng/smart-ble/blob/main/docs/05-platform-differences.md)

---

## 馃幆 閫傜敤鍦烘櫙

| 鐢ㄦ埛绫诲瀷 | 鎺ㄨ崘浣跨敤鏂瑰紡 |
|---------|-------------|
| 钃濈墮璁惧寮€鍙戣€?| 鐩存帴浣跨敤 App 浣滀负鏃ュ父璋冭瘯宸ュ叿 |
| 璺ㄥ钩鍙板紑鍙戣€?| 鍙傝€冧唬鐮侊紝绉绘鍒拌嚜宸辩殑椤圭洰 |
| 宓屽叆寮忓伐绋嬪笀 | 浣跨敤 ESP32 鍥轰欢浣滀负寮€鍙戞ā鏉?|
| 钃濈墮瀛︿範鑰?| 闃呰浠ｇ爜 + 鐑у綍纭欢锛屽疄璺靛涔?|
| 浼佷笟鐢ㄦ埛 | 鍩轰簬 MIT 鍗忚杩涜浜屾寮€鍙?|

---

## 馃 璐＄尞

娆㈣繋浠讳綍褰㈠紡鐨勮础鐚紒

- 馃悰 [鎶ュ憡闂](https://github.com/luoyaosheng/smart-ble/issues)
- 馃挕 [鍔熻兘寤鸿](https://github.com/luoyaosheng/smart-ble/issues)
- 馃敡 [鎻愪氦 PR](https://github.com/luoyaosheng/smart-ble/pulls)
- 馃摉 [瀹屽杽鏂囨。](https://github.com/luoyaosheng/smart-ble)

---

## 馃搫 璁稿彲璇?

[MIT License](https://github.com/luoyaosheng/smart-ble/blob/main/LICENSE)

---

## 馃敆 鐩稿叧閾炬帴

- **GitHub**: https://github.com/luoyaosheng/smart-ble
- **Gitee**: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/
- **鏂囨。**: https://github.com/luoyaosheng/smart-ble/tree/main/docs

---

**濡傛灉杩欎釜椤圭洰瀵逛綘鏈夊府鍔╋紝璇风粰涓€涓?Star 猸?*

**璁╄摑鐗欏紑鍙戯紝浠庢绠€鍗曪紒**
```

