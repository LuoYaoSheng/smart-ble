> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# CSDN 鍙戝竷鍐呭

## 鏍囬
```
涓€娆剧湡姝ｅ紑婧愮殑璺ㄥ钩鍙?BLE 璋冭瘯宸ュ叿锛?+ 绉嶅疄鐜?+ 纭欢鍥轰欢锛屽叏閮ㄥ紑鏀撅紒
```

---

## 姝ｆ枃鍐呭

```markdown
# 涓€娆剧湡姝ｅ紑婧愮殑璺ㄥ钩鍙?BLE 璋冭瘯宸ュ叿锛?+ 绉嶅疄鐜?+ 纭欢鍥轰欢锛屽叏閮ㄥ紑鏀撅紒

## 鎽樿

Smart BLE 鏄竴娆句笓涓氱殑浣庡姛鑰楄摑鐗欒皟璇曞伐鍏凤紝鎻愪緵 8+ 绉嶈法骞冲彴瀹炵幇锛坲ni-app銆丗lutter銆丒lectron銆乀auri銆乵acOS銆丄valonia 绛夛級锛屽唴缃?ESP32 瀹屾暣鍥轰欢锛屽畬鍏ㄥ紑婧愶紝閫傚悎钃濈墮寮€鍙戣皟璇曞拰璺ㄥ钩鍙板涔犮€?

---

## 涓€銆侀」鐩儗鏅?

浣滀负钃濈墮寮€鍙戣€咃紝浣犳槸鍚﹂亣鍒拌繃杩欎簺鍥版壈锛?

- 姣忎釜骞冲彴瑕佺敤涓嶅悓鐨勮皟璇曞伐鍏?
- 缃戜笂鐨勫紑婧愪唬鐮佽涔堜笉瀹屾暣锛岃涔堝彧鏀寔鍗曚竴骞冲彴
- 杞欢宸ュ叿鍜岀‖浠跺浐浠跺線寰€鍒嗙

涓轰簡瑙ｅ喅杩欎簺闂锛屾垜寮€鍙戜簡 **Smart BLE** 鈥斺€?涓€涓湡姝ｅ畬鏁淬€佺湡姝ｅ紑婧愮殑璺ㄥ钩鍙拌摑鐗欒皟璇曞伐鍏枫€?

---

## 浜屻€侀」鐩壒鐐?

### 2.1 瀹屽叏寮€婧?

| 寮€婧愬唴瀹?| 璇存槑 |
|---------|------|
| 鉁?鍓嶇浠ｇ爜 | uni-app銆丗lutter銆丄ndroid銆乮OS 鍏ㄩ儴寮€鏀?|
| 鉁?妗岄潰绔唬鐮?| Electron銆乀auri銆乵acOS 鍘熺敓銆丄valonia |
| 鉁?纭欢鍥轰欢 | ESP32 瀹屾暣鍥轰欢锛屽彲鐩存帴鐑у綍浣跨敤 |
| 鉁?鍗忚璁捐 | BLE 鏈嶅姟銆佹暟鎹牸寮忋€佷氦浜掑崗璁叏閮ㄥ叕寮€ |
| 鉁?MIT 鍗忚 | 鍟嗙敤鏃犲咖锛屽彲鑷敱淇敼鍜屽垎鍙?|

### 2.2 8+ 绉嶅钩鍙板疄鐜?

| 骞冲彴 | 鎶€鏈爤 | 鐘舵€?|
|------|--------|------|
| uni-app | Vue 3 | 鉁?宸插畬鎴?|
| Flutter | flutter_blue_plus | 鉁?宸插畬鎴?|
| Electron | noble | 鉁?宸插畬鎴?|
| Tauri | Rust + btleplug | 鉁?宸插畬鎴?|
| macOS 鍘熺敓 | AppKit | 鉁?宸插畬鎴?|
| Avalonia | .NET 8 | 鉁?宸插畬鎴?|

### 2.3 纭欢鍥轰欢鏀寔

鍐呯疆 ESP32 瀹屾暣鍥轰欢锛屽寘鍚細
- 鑷畾涔夎澶囧悕绉?
- LED 鎺у埗锛堝父浜?蹇棯/鎱㈤棯锛?
- JSON 鏍煎紡鏁版嵁浜や簰
- 澶氭潈闄愮壒寰佸€兼紨绀?

---

## 涓夈€佹牳蹇冨姛鑳?

### 3.1 璁惧绔紙Central 妯″紡锛?

```typescript
// 缁熶竴鐨?BLE 鎶借薄鎺ュ彛
interface IBLEAdapter {
    initialize(): Promise<void>
    startScan(options?: ScanOptions): Promise<void>
    connect(deviceId: string): Promise<void>
    readCharacteristic(...): Promise<DataBuffer>
    writeCharacteristic(...): Promise<void>
    setNotification(...): Promise<void>
}
```

**鍔熻兘娓呭崟**锛?
- 璁惧鎵弿锛堜俊鍙峰己搴﹁繃婊ゃ€佸悕绉拌繃婊わ級
- 杩炴帴绠＄悊锛堟湇鍔″彂鐜般€佺壒寰佸€艰鍐欙級
- 閫氱煡璁㈤槄锛堝疄鏃舵暟鎹洃鎺э級
- 鎿嶄綔鏃ュ織

### 3.2 澶栬绔紙Peripheral 妯″紡锛?

- BLE 骞挎挱锛堣嚜瀹氫箟鍚嶇О銆乁UID锛?
- 鎵嬫満鍙樿韩钃濈墮璁惧锛岀敤浜庢祴璇?

---

## 鍥涖€佸揩閫熷紑濮?

### 4.1 uni-app 鐗堟湰

```bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
```

### 4.2 Flutter 鐗堟湰

```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

### 4.3 妗岄潰绔?Electron

```bash
cd smart-ble/apps/desktop/electron
npm install
npm start
```

### 4.4 ESP32 鍥轰欢

```bash
cd smart-ble/hardware/esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 浜斻€侀」鐩粨鏋?

```
smart-ble/
鈹溾攢鈹€ apps/
鈹?  鈹溾攢鈹€ uniapp/           # Vue 3 鐗堟湰
鈹?  鈹溾攢鈹€ flutter/          # Flutter 鐗堟湰
鈹?  鈹溾攢鈹€ desktop/          # 妗岄潰绔?
鈹?  鈹?  鈹溾攢鈹€ electron/     # Electron 鐗堟湰
鈹?  鈹?  鈹溾攢鈹€ tauri/        # Tauri 鐗堟湰
鈹?  鈹?  鈹溾攢鈹€ macos/        # macOS 鍘熺敓
鈹?  鈹?  鈹斺攢鈹€ avalonia/     # .NET 鐗堟湰
鈹?  鈹溾攢鈹€ android/          # Android 鍘熺敓
鈹?  鈹斺攢鈹€ ios/              # iOS 鍘熺敓
鈹溾攢鈹€ hardware/
鈹?  鈹斺攢鈹€ esp32/            # ESP32 鍥轰欢
鈹溾攢鈹€ docs/                 # 椤圭洰鏂囨。
鈹斺攢鈹€ core/                 # BLE 鎶借薄灞?
```

---

## 鍏€侀€傜敤鍦烘櫙

| 鐢ㄦ埛绫诲瀷 | 鎺ㄨ崘浣跨敤鏂瑰紡 |
|---------|-------------|
| 钃濈墮璁惧寮€鍙戣€?| 鐩存帴浣跨敤 App 浣滀负鏃ュ父璋冭瘯宸ュ叿 |
| 璺ㄥ钩鍙板紑鍙戣€?| 鍙傝€冧唬鐮侊紝绉绘鍒拌嚜宸辩殑椤圭洰 |
| 宓屽叆寮忓伐绋嬪笀 | 浣跨敤 ESP32 鍥轰欢浣滀负寮€鍙戞ā鏉?|
| 钃濈墮瀛︿範鑰?| 闃呰浠ｇ爜 + 鐑у綍纭欢锛屽疄璺靛涔?|

---

## 涓冦€佹€荤粨

Smart BLE 鏄竴涓姛鑳藉畬鏁淬€佹灦鏋勬竻鏅扮殑钃濈墮璋冭瘯宸ュ叿椤圭洰锛屼笉浠呮彁渚涗簡瀹炵敤鐨勮皟璇曞姛鑳斤紝杩樺睍绀轰簡濡備綍鍦ㄤ笉鍚屽钩鍙颁笂瀹炵幇缁熶竴鐨?BLE 鍔熻兘銆?

**椤圭洰鍦板潃**锛?
- GitHub: https://github.com/luoyaosheng/smart-ble
- Gitee: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/

**寮€婧愬崗璁?*锛歁IT License

濡傛灉瑙夊緱鏈夊府鍔╋紝娆㈣繋缁欎釜 Star 猸?

---

*鍏抽敭璇嶏細BLE銆佽摑鐗欍€佽皟璇曞伐鍏枫€佸紑婧愩€丒SP32銆丗lutter銆乽ni-app銆乀auri銆佽法骞冲彴銆佺墿鑱旂綉*
```

---

## 鍙戝竷寤鸿

- **鍒嗙被**锛氱墿鑱旂綉 / 宓屽叆寮?/ 绉诲姩寮€鍙?/ 寮€婧愰」鐩?
- **鏍囩**锛歚#BLE` `#钃濈墮` `#璋冭瘯宸ュ叿` `#寮€婧愰」鐩甡 `#ESP32` `#Flutter` `#uni-app`
- **鍙戝竷鏃堕棿**锛氬伐浣滄棩 9:00-11:00
- **鍘熷垱澹版槑**锛氬嬀閫夊師鍒?
- **灏侀潰鍥?*锛氬噯澶囬」鐩灦鏋勫浘

