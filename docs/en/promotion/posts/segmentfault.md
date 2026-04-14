> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# SegmentFault 鍙戝竷鍐呭

## 鏍囬
```
Smart BLE锛氫竴娆剧湡姝ｅ紑婧愮殑璺ㄥ钩鍙拌摑鐗欒皟璇曞伐鍏凤紝8+ 绉嶅疄鐜板叏閮ㄥ紑鏀?
```

---

## 姝ｆ枃鍐呭

```markdown
# Smart BLE锛氫竴娆剧湡姝ｅ紑婧愮殑璺ㄥ钩鍙拌摑鐗欒皟璇曞伐鍏凤紝8+ 绉嶅疄鐜板叏閮ㄥ紑鏀?

## 椤圭洰浠嬬粛

**Smart BLE** 鏄竴娆句笓涓氱殑浣庡姛鑰楄摑鐗欙紙BLE锛夎皟璇曞伐鍏凤紝鎻愪緵 8+ 绉嶈法骞冲彴瀹炵幇锛屽唴缃?ESP32 瀹屾暣鍥轰欢锛孧IT 鍗忚瀹屽叏寮€婧愩€?

## 鏍稿績浜偣

### 馃敁 瀹屽叏寮€婧?

- 鍓嶇浠ｇ爜锛歶ni-app銆丗lutter銆丄ndroid銆乮OS
- 妗岄潰绔細Electron銆乀auri銆乵acOS銆丄valonia
- 纭欢鍥轰欢锛欵SP32 瀹屾暣鍥轰欢
- 鍗忚璁捐锛欱LE 鏈嶅姟銆佹暟鎹牸寮忓叏閮ㄥ叕寮€

### 馃攲 8+ 绉嶅钩鍙板疄鐜?

| 骞冲彴 | 鎶€鏈爤 | 鐘舵€?|
|------|--------|------|
| uni-app | Vue 3 | 鉁?|
| Flutter | flutter_blue_plus | 鉁?|
| Electron | noble | 鉁?|
| Tauri | Rust + btleplug | 鉁?|
| macOS 鍘熺敓 | AppKit | 鉁?|
| Avalonia | .NET 8 | 鉁?|

### 馃 纭欢鍥轰欢鏀寔

- ESP32 瀹屾暣鍥轰欢
- LED 鎺у埗
- JSON 鏁版嵁浜や簰
- 绔埌绔祴璇?

## 鏍稿績鍔熻兘

**璁惧绔紙Central 妯″紡锛?*
- 璁惧鎵弿锛堜俊鍙峰己搴?鍚嶇О杩囨护锛?
- 杩炴帴绠＄悊锛堟湇鍔″彂鐜般€佺壒寰佸€艰鍐欙級
- 閫氱煡璁㈤槄锛堝疄鏃舵暟鎹洃鎺э級
- 鎿嶄綔鏃ュ織

**澶栬绔紙Peripheral 妯″紡锛?*
- BLE 骞挎挱锛堣嚜瀹氫箟鍚嶇О銆乁UID锛?
- 鎵嬫満鍙樿韩钃濈墮璁惧

## 蹇€熷紑濮?

```bash
# 鍏嬮殕椤圭洰
git clone https://github.com/luoyaosheng/smart-ble.git

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

## 閫傜敤鍦烘櫙

- 钃濈墮璁惧寮€鍙戣皟璇?
- 璺ㄥ钩鍙?BLE 寮€鍙戝涔?
- ESP32 纭欢寮€鍙?
- 鐗╄仈缃戦」鐩弬鑰?

## 椤圭洰鍦板潃

GitHub: https://github.com/luoyaosheng/smart-ble
Gitee: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/

濡傛灉瑙夊緱鏈夊府鍔╋紝娆㈣繋缁欎釜 Star 猸?

---

*鏍囩锛氳摑鐗欍€丅LE銆佸紑婧愩€丒SP32銆丗lutter銆乽ni-app*
```

---

## 鍙戝竷寤鸿

- **鍒嗙被**锛氳蒋浠跺紑鍙?/ 宓屽叆寮忓紑鍙?/ 寮€婧愰」鐩?
- **鏍囩**锛歚钃濈墮` `BLE` `寮€婧恅 `ESP32` `Flutter`
- **鍙戝竷鏃堕棿**锛氬伐浣滄棩 10:00-12:00

