> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# SmartBLE 璺ㄥ钩鍙?UI 缁勪欢搴撴寚鍗?

SmartBLE 椤圭洰鍦ㄦ秹鍙?Web/Electron/Tauri/绉诲姩绔?鐨勭晫闈㈠紑鍙戞椂锛岄€氳繃 Web Components 鏈哄埗缁熶竴浜嗗悇绔殑浜や簰鏍囧噯銆傛鏂囨。浠嬬粛浜嗗悇涓嫭绔嬬粍浠剁殑鑱岃矗銆佸紩鐢ㄦ柟寮忓拰骞冲彴宸紓璇存槑銆?

## 璁捐鐩爣
涓虹‘淇濇墍鏈夊钩鍙扮敤鎴蜂韩鏈?*瀹屽叏鐩稿悓鐨勬搷浣滄祦绋?*鍜?*闆跺涔犳垚鏈?*鐨勬帓闅滀綋楠岋紝鎴戜滑鏋勫缓浜嗕竴濂楀绔榻愮殑缁勪欢鏍囧噯銆?

## 鏍稿績缁勪欢鎷嗗垎

### 1. 璁惧鍗＄墖缁勪欢 (`<device-card>`)
璐熻矗娓叉煋鍗曚竴 BLE 璁惧鐨勫井瑙傝鍥俱€?
- **鍔熻兘鐗规€?*锛氭樉绀鸿澶囧悕绉般€乁UID/MAC 鍦板潃銆佸疄鏃跺姩鎬佹洿鏂扮殑 RSSI 淇″彿寮哄害鏉★紝浠ュ強鍔ㄦ€佺殑杩炴帴鐘舵€佹寜閽€?
- **骞冲彴鏄犲皠**锛?
  - **Flutter/UniApp**: `DeviceCard.dart` / `device-card.vue`
  - **Tauri/Electron**: 浣嶄簬 `components/DeviceCard.js`
  - **iOS鍘熺敓**: `DeviceCard.swift`

### 2. 鏉′欢杩囨护缁勪欢 (`<filter-panel>`)
鐢ㄤ簬鍦ㄩ珮棰戝箍鎾幆澧冧腑绛涢€夌洰鏍囪澶囥€?
- **鍔熻兘鐗规€?*锛氭彁渚涘熀浜?RSSI锛堜俊鍙烽槇鍊硷級杩囨护銆佸悕绉板墠缂€锛圥refix锛夎繃婊ょ瓑閰嶇疆椤广€傝繃婊ゅ弬鏁版敼鍙樻椂锛屽彂鍑哄疄鏃朵簨浠堕噸鏂扮粯鍒跺垪琛ㄣ€?
- **搴曞眰鏀寔**锛氭敮鎸佹寔涔呭寲瀛樺偍鏈€杩戜竴娆¤繃婊よ褰曪紝闃叉閲嶆柊鍚姩鍚庨绻佽緭鍏ャ€?

### 3. 鏈嶅姟鐗瑰緛鍊奸潰鏉?(`<service-panel>`)
璐熻矗瑙ｆ瀽杩炴帴鍚庣殑 GATT 鍗忚鏍戙€?
- **鍔熻兘鐗规€?*锛氳嚜鍔ㄧ綏鍒?Primary Service 鍙婂叾鎷ユ湁鐨?Characteristics锛涙牴鎹?Characteristic 鐨?Properties (Read/Write/Notify/Indicate) 娓叉煋涓嶅悓褰㈠紡鐨勪氦浜掓寜閽€?
- **璺ㄥ钩鍙颁竴鑷存€?*锛氱壒寰佸€兼暟鎹繑鍥炴椂锛屽皢閫氳繃 Hex 鏍煎紡鎴?UTF-8锛堝綋鍒ゅ畾涓哄瓧绗︿覆鏃讹級灞曠ず鍦ㄥ搴旂殑鍗＄墖琛屼腑锛屾暟鎹祦鍝嶅簲寮忔洿鏂般€?

### 4. 鏃ュ織鎹曡幏闈㈡澘 (`<log-panel>`)
绯荤粺绾х殑浜や簰涓庨敊璇拷韪簳搴с€?
- **鍔熻兘鐗规€?*锛氭彁渚涗笉鍚岀骇鍒殑褰╄壊楂樹寒 (Info/Receive/Send/Error)锛涙敮鎸佷竴閿竻绌哄強鑷姩婊氬姩鍒板簳閮紱鏃ュ織鏁版嵁缁撴瀯涓ユ牸閬靛惊 `[鏃堕棿鎴砞 [璁惧ID] [鍐呭]` 瑙勮寖銆?
- **鍛堢幇褰㈠紡**锛氬湪鎵€鏈夊钩鍙帮紙iOS闄ゅ涓?SwiftUI inline pane锛夛紝鍧囦綔涓哄簳閮ㄥ彲闅忚澶囪鎯呮敹璧风殑鎶藉眽鎴栧唴鑱旈潰鏉垮嚭鐜帮紝纭繚浠讳綍鎿嶄綔閿欒鍧囧彲绗竴鏃堕棿婧簮銆?

### 5. 璺ㄧ寮圭獥瀵归綈 (`<write-dialog>`, `<ota-dialog>`)
- **鍐欏叆鍛戒护 (`<write-dialog>`)**锛氱敤浜庝笅鍙戝崄鍏繘鍒?瀛楃涓叉寚浠ゅ寘銆?
- **OTA 鍗囩骇 (`<ota-dialog>`)**锛氬皝瑁呬簡鍥轰欢鍗囩骇鐨勮繘搴︽潯杞闈㈡澘銆?

---
## 濡備綍鍦ㄥ墠绔鍣ㄤ腑寮曞叆

浠?Electron 鍜?Tauri 鎵€鍦ㄧ殑鍘熺敓 JS DOM 瀹瑰櫒涓轰緥锛?

```html
<!-- 鍦?HTML 涓０鏄庤浇浣?-->
<div id="deviceDetailView">
    <service-panel id="mainServicePanel"></service-panel>
    <ota-dialog id="otaDialog"></ota-dialog>
</div>
```

骞跺湪 `app.js` 灞傛崟鑾蜂簨浠惰浆鍙戝埌鍘熺敓灞傦紙閫氳繃 IPC Invoke 鎴?Tauri Invoke锛夛細
```javascript
document.querySelector('#mainServicePanel').addEventListener('request-read', async (e) => {
    const { deviceId, serviceUuid, characteristicUuid } = e.detail;
    await window.bleAPI.readCharacteristic(deviceId, serviceUuid, characteristicUuid);
});
```

*娉ㄦ剰锛氭缁勪欢灞傚叏瑙ｈ€︿簬搴曞眰妗嗘灦锛屼换浣曞簳灞傛鏋跺彧闇€瑕佹纭毚闇蹭簨浠堕€氶亾鍗冲彲锛岄珮搴︽柟渚夸簩娆″紑婧愪紶鎾紒*

