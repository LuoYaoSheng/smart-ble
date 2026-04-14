> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# 鎺橀噾鍙戝竷鍐呭

## 鏍囬
```
涓€娆剧湡姝ｅ紑婧愮殑璺ㄥ钩鍙?BLE 璋冭瘯宸ュ叿锛?+ 绉嶅疄鐜?+ 纭欢鍥轰欢锛屽叏閮ㄥ紑鏀撅紒
```

---

## 姝ｆ枃鍐呭

```markdown
# 涓€娆剧湡姝ｅ紑婧愮殑璺ㄥ钩鍙?BLE 璋冭瘯宸ュ叿锛?+ 绉嶅疄鐜?+ 纭欢鍥轰欢锛屽叏閮ㄥ紑鏀撅紒

> 甯傞潰涓婄殑钃濈墮璋冭瘯宸ュ叿涓嶅皯锛屼絾**瀹屽叏寮€婧?*鐨勫瀵ユ棤鍑犮€?
> 鑳借法骞冲彴鐨勪篃鏈夛紝浣嗗ぇ澶氬彧鏄?*姒傚康楠岃瘉**锛屼唬鐮佷笉瀹屾暣銆?
> 鑳借皟璇曠殑寰堝锛屼絾**甯︾‖浠跺浐浠?*鐨勫嚑涔庢病鏈夈€?

浠婂ぉ缁欏ぇ瀹朵粙缁嶄竴涓笉涓€鏍风殑椤圭洰鈥斺€?*Smart BLE**銆?

![Smart BLE](https://github.com/luoyaosheng/smart-ble)

---

## 涓轰粈涔堣鍋氳繖涓」鐩紵

浣滀负涓€鍚嶈摑鐗欏紑鍙戣€咃紝鎴戞繁娣变綋浼氬埌锛?

1. **宸ュ叿鍓茶**锛氭瘡涓钩鍙伴兘瑕佺敤涓嶅悓鐨勫伐鍏凤紝浣撻獙涓嶄竴鑷?
2. **浠ｇ爜鍒嗘暎**锛氱綉涓婁唬鐮佺墖娈靛緢澶氾紝浣嗗畬鏁寸殑璺ㄥ钩鍙板疄鐜板緢灏?
3. **纭欢鑴辫妭**锛氳蒋浠跺伐鍏峰拰纭欢寮€鍙戝線寰€鍒嗙锛岀己涔忕鍒扮鏂规
4. **瀛︿範鎴愭湰**锛氭柊浜哄叆闂ㄨ摑鐗欏紑鍙戯紝闂ㄦ澶珮

鎵€浠ユ垜鍐冲畾鍋氫竴涓?*鐪熸寮€婧愩€佺湡姝ｅ畬鏁?*鐨勮摑鐗欒皟璇曞伐鍏枫€?

---

## 涓夊ぇ鏍稿績鍗栫偣

### 馃敁 瀹屽叏寮€婧?

寰堝鍙风О"寮€婧?鐨勮摑鐗欏伐鍏凤紝鏍稿績浠ｇ爜寰€寰€闂簮锛屾垨鑰呭彧鏄竴涓畝鍖栫増銆?

**Smart BLE 涓嶅悓**锛?

| 寮€婧愬唴瀹?| 璇存槑 |
|---------|------|
| 鉁?鍓嶇浠ｇ爜 | uni-app銆丗lutter銆丄ndroid銆乮OS 鍏ㄩ儴寮€鏀?|
| 鉁?妗岄潰绔唬鐮?| Electron銆乀auri銆乵acOS 鍘熺敓銆丄valonia |
| 鉁?纭欢鍥轰欢 | ESP32 瀹屾暣鍥轰欢锛屽彲鐩存帴鐑у綍浣跨敤 |
| 鉁?鍗忚璁捐 | BLE 鏈嶅姟銆佹暟鎹牸寮忋€佷氦浜掑崗璁叏閮ㄥ叕寮€ |
| 鉁?MIT 鍗忚 | 鍟嗙敤鏃犲咖锛屽彲鑷敱淇敼鍜屽垎鍙?|

**娌℃湁榛戠洅锛屾病鏈夐殣钘忥紝浠ｇ爜鍗虫枃妗ｃ€?*

---

### 馃攲 8+ 绉嶅疄鐜帮紝瑕嗙洊鎵€鏈変富娴佸钩鍙?

杩欎笉鏄竴涓?鑳借窇灏辫"鐨?Demo锛岃€屾槸**鐢熶骇绾у埆鐨勫畬鏁村疄鐜?*锛?

#### 骞冲彴涓€锛歶ni-app 鐗堟湰 鉁?

```
apps/uniapp/
鈹溾攢鈹€ pages/           # 椤甸潰
鈹溾攢鈹€ components/      # 缁勪欢
鈹溾攢鈹€ utils/           # BLE 灏佽
鈹斺攢鈹€ manifest.json    # 閰嶇疆
```

- **鎶€鏈爤**锛歏ue 3 + uni-ui
- **鏀寔骞冲彴**锛氬井淇″皬绋嬪簭銆丄ndroid App銆乮OS App銆丠5
- **寮€鍙戠姸鎬?*锛氣渽 宸插畬鎴愶紝鍙洿鎺ヤ娇鐢?

#### 骞冲彴浜岋細Flutter 鐗堟湰 鉁?

```
apps/flutter/
鈹溾攢鈹€ lib/
鈹?  鈹溾攢鈹€ core/           # BLE 鎶借薄灞?
鈹?  鈹溾攢鈹€ providers/      # Riverpod 鐘舵€佺鐞?
鈹?  鈹溾攢鈹€ screens/        # 椤甸潰
鈹?  鈹斺攢鈹€ models/         # 鏁版嵁妯″瀷
鈹斺攢鈹€ pubspec.yaml
```

- **鎶€鏈爤**锛欶lutter 3.0+ + flutter_blue_plus + Riverpod
- **鏀寔骞冲彴**锛欰ndroid銆乮OS銆乵acOS
- **鐗硅壊鍔熻兘**锛氭敮鎸?BLE 澶栬妯″紡锛堟墜鏈哄彉韬摑鐗欒澶囷級
- **寮€鍙戠姸鎬?*锛氣渽 宸插畬鎴愶紝鍙洿鎺ヤ娇鐢?

#### 妗岄潰绔叏瀹舵《 馃巵

| 鐗堟湰 | 鎶€鏈爤 | 骞冲彴 | 鐗硅壊 |
|------|--------|------|------|
| **Electron** | JS/Node.js + noble | Win/Mac/Linux | 鍔熻兘鏈€瀹屾暣 |
| **Tauri** | Rust + btleplug | Win/Mac/Linux | 瀹夎鍖呬粎 ~10MB |
| **macOS 鍘熺敓** | Swift + AppKit | macOS 13+ | 鍘熺敓浣撻獙 |
| **Avalonia** | .NET 8 + C# | Windows | .NET 鐢熸€?|

---

### 馃 纭欢鍥轰欢锛岀鍒扮娴嬭瘯

杞欢璋冭瘯宸ュ叿鏈夊緢澶氾紝浣?*甯︾‖浠跺浐浠?*鐨勫緢灏戙€?

Smart BLE 椤圭洰鍐呯疆 **ESP32 瀹屾暣鍥轰欢**锛?

```
hardware/esp32/
鈹溾攢鈹€ main/
鈹?  鈹溾攢鈹€ ble_server.cpp      # BLE 鏈嶅姟瀹炵幇
鈹?  鈹溾攢鈹€ led_control.cpp     # LED 鎺у埗
鈹?  鈹斺攢鈹€ command_handler.cpp # 鍛戒护澶勭悊
鈹溾攢鈹€ sdkconfig               # 閰嶇疆鏂囦欢
鈹斺攢鈹€ CMakeLists.txt
```

#### 鍥轰欢鍔熻兘

| 鍔熻兘 | 璇存槑 |
|------|------|
| 馃敜 鑷畾涔夎澶囧悕绉?| 鍙厤缃箍鎾悕绉?|
| 馃摗 LED 鎺у埗 | 甯镐寒 / 蹇棯 / 鎱㈤棯 |
| 馃搫 JSON 鏁版嵁浜や簰 | 鏍囧噯鍖栨暟鎹牸寮?|
| 馃敀 澶氭潈闄愮壒寰佸€?| Read / Write / Notify |

#### 瀹炴祴纭欢鏀寔

- 鉁?ESP32 绯诲垪鍏ㄥ吋瀹?
- 鉁?ESP32-C3锛堝凡娴嬭瘯锛?
- 鉁?ESP32-S2/S3锛堢悊璁轰笂鍏煎锛?

#### 绔埌绔祴璇曟祦绋?

```
鎵嬫満 App 鈹€鈹€BLE 鎵弿鈹€鈹€> 鍙戠幇 ESP32 璁惧
    鈹?
    鈹溾攢鈹€ 杩炴帴 鈹€鈹€> 鍙戠幇鏈嶅姟
    鈹?
    鈹溾攢鈹€ 鍐欏叆 鈹€鈹€> {"cmd":"led","mode":"fast"}
    鈹?
    鈹斺攢鈹€ 璁㈤槄 鈹€鈹€> 鎺ユ敹璁惧鐘舵€侀€氱煡
```

**杞欢 + 纭欢锛屼竴绔欏紡瑙ｅ喅鏂规銆?*

---

## 鏍稿績鍔熻兘涓€瑙?

### 馃摫 璁惧绔紙Central 妯″紡锛?

| 鍔熻兘 | 鎻忚堪 |
|------|------|
| 鎵弿璁惧 | 淇″彿寮哄害杩囨护銆佸悕绉拌繃婊ゃ€佽妭娴佸鐞?|
| 杩炴帴绠＄悊 | 涓€閿繛鎺ャ€佽嚜鍔ㄥ彂鐜版湇鍔?|
| 鏁版嵁璇诲啓 | UTF-8 / HEX 鍙屾牸寮忔敮鎸?|
| 閫氱煡璁㈤槄 | 瀹炴椂鎺ユ敹璁惧鏁版嵁 |
| 鎿嶄綔鏃ュ織 | 瀹屾暣璁板綍姣忎竴姝ユ搷浣?|

### 馃摗 澶栬绔紙Peripheral 妯″紡锛?

| 鍔熻兘 | 鎻忚堪 |
|------|------|
| BLE 骞挎挱 | 鑷畾涔夊悕绉般€佹湇鍔?UUID銆佸巶鍟嗘暟鎹?|
| 妯℃嫙璁惧 | 鎵嬫満鍙彉韬摑鐗欒澶囷紝鐢ㄤ簬娴嬭瘯 |
| 璺ㄥ钩鍙?| Android / iOS / macOS 鍏ㄦ敮鎸?|

---

## 浠ｇ爜璐ㄩ噺淇濊瘉

### 缁熶竴鎶借薄灞?

鎵€鏈夊钩鍙板叡浜浉鍚岀殑 BLE 鎶借薄鎺ュ彛锛?

```typescript
interface IBLEAdapter {
    // 鍒濆鍖?
    initialize(): Promise<void>

    // 鎵弿
    startScan(options?: ScanOptions): Promise<void>
    stopScan(): Promise<void>

    // 杩炴帴
    connect(deviceId: string): Promise<void>
    disconnect(deviceId: string): Promise<void>

    // 鏈嶅姟鍙戠幇
    discoverServices(deviceId: string): Promise<Service[]>

    // 璇诲啓鎿嶄綔
    readCharacteristic(serviceId: string, charId: string): Promise<DataBuffer>
    writeCharacteristic(serviceId: string, charId: string, data: DataBuffer): Promise<void>

    // 閫氱煡
    setNotification(serviceId: string, charId: string, enable: boolean): Promise<void>

    // 澶栬妯″紡
    startAdvertising(options: AdvertisingOptions): Promise<void>
    stopAdvertising(): Promise<void>
}
```

**瀛︿範涓€涓钩鍙帮紝鍏朵粬骞冲彴瑙︾被鏃侀€氥€?*

---

## 蹇€熷紑濮?

### 鏂瑰紡涓€锛歶ni-app 鐗堟湰

```bash
# 鍏嬮殕椤圭洰
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp

# 瀹夎渚濊禆
npm install

# 寰俊灏忕▼搴?
npm run dev:mp-weixin

# H5 鐗堟湰
npm run dev:h5
```

### 鏂瑰紡浜岋細Flutter 鐗堟湰

```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

### 鏂瑰紡涓夛細妗岄潰绔?Electron

```bash
cd smart-ble/apps/desktop/electron
npm install
npm start
```

### 鏂瑰紡鍥涳細ESP32 鍥轰欢

```bash
cd smart-ble/hardware/esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 璋侀€傚悎浣跨敤锛?

| 鐢ㄦ埛绫诲瀷 | 鎺ㄨ崘浣跨敤鏂瑰紡 |
|---------|-------------|
| 钃濈墮璁惧寮€鍙戣€?| 鐩存帴浣跨敤 App 浣滀负鏃ュ父璋冭瘯宸ュ叿 |
| 璺ㄥ钩鍙板紑鍙戣€?| 鍙傝€冧唬鐮侊紝绉绘鍒拌嚜宸辩殑椤圭洰 |
| 宓屽叆寮忓伐绋嬪笀 | 浣跨敤 ESP32 鍥轰欢浣滀负寮€鍙戞ā鏉?|
| 钃濈墮瀛︿範鑰?| 闃呰浠ｇ爜 + 鐑у綍纭欢锛屽疄璺靛涔?|
| 浼佷笟鐢ㄦ埛 | 鍩轰簬 MIT 鍗忚杩涜浜屾寮€鍙?|

---

## 寮€婧愬崗璁?

**MIT License**

- 鉁?鍟嗕笟浣跨敤
- 鉁?淇敼鍜屽垎鍙?
- 鉁?涓撳埄浣跨敤
- 鉁?绉佷汉浣跨敤

**娌℃湁浠讳綍闄愬埗锛屽畬鍏ㄨ嚜鐢便€?*

---

## 椤圭洰鍦板潃

**GitHub**: https://github.com/luoyaosheng/smart-ble
**Gitee**: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/

---

**濡傛灉瑙夊緱杩欎釜椤圭洰鏈夊府鍔╋紝璇风粰涓€涓?Star 猸?*

**璁╄摑鐗欏紑鍙戯紝浠庢绠€鍗曪紒**

---

*鏍囩锛?BLE #钃濈墮 #璋冭瘯宸ュ叿 #寮€婧?#ESP32 #Flutter #uni-app #Tauri #璺ㄥ钩鍙?#鐗╄仈缃?
```

---

## 鍙戝竷寤鸿

- **鍒嗙被**锛氬悗绔?/ 鍓嶇 / 寮€婧愰」鐩?
- **鏍囩**锛歚#BLE` `#钃濈墮` `#寮€婧愰」鐩甡 `#Flutter` `#uni-app` `#ESP32` `#鐗╄仈缃慲
- **鍙戝竷鏃堕棿**锛氬伐浣滄棩 10:00 鎴?20:00
- **灏侀潰鍥?*锛氬噯澶囦竴寮犻」鐩灦鏋勫浘鎴?Logo

