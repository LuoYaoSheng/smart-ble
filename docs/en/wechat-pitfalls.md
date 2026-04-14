> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# 寰俊灏忕▼搴?BLE 寮€鍙戦伩鍧戜笌鏈€浣冲疄璺垫寚鍗?

> 鐗堟湰锛歷1.0
> 鏇存柊鏃ユ湡锛?026-04
> 椤圭洰锛歋mart BLE - 璺ㄥ钩鍙拌摑鐗欒皟璇曞伐鍏?

寰俊灏忕▼搴忎綔涓鸿交閲忕骇搴旂敤鐨勯噸瑕佸叆鍙ｏ紝鎷ユ湁鏋侀珮鐨勬櫘鍙婄巼銆備絾鍦ㄨ繘琛屼綆鍔熻€楄摑鐗欙紙BLE锛夊紑鍙戞椂锛屽洜涓哄簳灞傛灦鏋勩€佹潈闄愭帶鍒舵満鍒跺強瀹夸富锛圵eChat锛夌敓鍛藉懆鏈熺殑褰卞搷锛岀粡甯镐細閬囧埌鍚勭被鐤戦毦涓庘€滃潙鐐光€濄€?

鏈枃妗ｆ眹鎬讳簡 `Smart BLE` 鍦ㄥ皢绯荤粺鎵撻€氳嚦寰俊灏忕▼搴忕鏃舵墍閬囧埌鐨勬牳蹇冪棝鐐癸紝骞舵彁渚涗簡瀵瑰簲鐨勮В鍐虫柟妗堝拰鏈€浣冲疄璺点€?

---

## 1. 鏉冮檺澧欙細鎵弿璁惧蹇呴』缁戝畾鈥滃畾浣嶆潈闄愨€?

**鍧戠偣琛ㄧ幇锛?*
鍙敵璇?`scope.bluetooth` 鏉冮檺骞跺湪绯荤粺璁剧疆涓績寮€鍚摑鐗欏悗锛岃皟鐢?`wx.startBluetoothDevicesDiscovery` 渚濈劧鎼滀笉鍒颁换浣曡澶囷紝鍥炶皟涓€鐩撮潤榛樸€?

**閬垮潙鍘熺悊涓庢柟妗堬細**
鍦?Android 绯荤粺涓紙浠ュ強寰俊灏忕▼搴忕殑灏佽鐗规€т腑锛夛紝钃濈墮鎵弿琚涓哄彲浠ユ帹绠楀嚭鐢ㄦ埛鍦扮悊浣嶇疆鐨勯珮鍗辨搷浣溿€傚洜姝わ紝**蹇呴』鍚屾椂鐢宠钃濈墮鏉冮檺鍜屽畾浣嶆潈闄?*锛岀己涓€涓嶅彲銆?

*瀹炶返浠ｇ爜* (`Smart BLE` 瀹為檯搴旂敤閫昏緫)锛?
```javascript
// 鏉冮檺鎷︽埅灞傞獙璇?
wx.getSetting({
  success: (res) => {
    // 1. 楠岃瘉骞惰姹傝摑鐗?
    if (!res.authSetting['scope.bluetooth']) {
      wx.authorize({ scope: 'scope.bluetooth' })
    }
    // 2. 鏃犲畾浣嶄簬闈欓粯鎵弿鏃犳灉锛屽繀椤昏姹傚湴鐞嗕綅缃畾浣嶏紒
    if (!res.authSetting['scope.userLocation']) {
      wx.authorize({ scope: 'scope.userLocation' })
    }
  }
})
```

---

## 2. UI 閫傞厤澧欙細鑷畾涔夋爣棰樻爮涓庘€滆兌鍥婃寜閽€濈殑閲嶅彔纰版挒

**鍧戠偣琛ㄧ幇锛?*
褰撴垜浠湪 `pages.json` 灏?`navigationStyle` 鏀逛负 `custom` 鍚庯紝鐢变簬鍚勮矾鍒樻捣灞忋€佺伒鍔ㄥ矝鐨勪粙鍏ワ紝鍗曠函渚濋潬 `uni.getSystemInfoSync().statusBarHeight` 骞朵笉鑳借绠楀嚭瀹屾暣鐨勬爣棰樻爮涓嬫部锛屽鑷磋嚜鍐欑殑杩斿洖鎸夐挳鍜屾爣棰樹細鍜屽井淇″皬绋嬪簭鑷甫鐨勨€滆兌鍥婃寜閽紙鏇村/鍏抽棴锛夆€濆彂鐢熸儴鐑堥噸鍙犳垨楂樺害閿欎綅銆?

**閬垮潙鍘熺悊涓庢柟妗堬細**
蹇呴』浣跨敤浠呭湪寰俊鐜鐗规湁鐨?API `wx.getMenuButtonBoundingClientRect()`锛岀簿鍑嗚绠楀嚭鑳跺泭鐨勫潗鏍囩郴锛屽啀缁撳悎绯荤粺鐘舵€佹爮鍙嶆帹鎵€闇€鐨勫姩鎬侀珮搴︺€?

*瀹炶返浠ｇ爜* (`Smart BLE` 閲囩敤鏂规)锛?
```javascript
// #ifdef MP-WEIXIN
const sysInfo = uni.getSystemInfoSync();
const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
// 鍔ㄦ€佺畻鍑哄鑸爮鏈€缁堝畨鍏ㄨ鐩栭珮搴? (鑳跺泭top - 鐘舵€佹爮楂樺害)*2 + 鑳跺泭鑷韩楂樺害
this.navBarHeight = (menuButtonInfo.top - sysInfo.statusBarHeight) * 2 + menuButtonInfo.height;
// #endif
```

---

## 3. BLE 骞挎挱澧欙細鑻涘埢鐨?31 瀛楄妭涓?UUID 瑙勮寖

**鍧戠偣琛ㄧ幇锛?*
鍒╃敤灏忕▼搴忕殑 `wx.createBLEPeripheralServer` 杩涜澶栬妯℃嫙锛堝箍鎾ā寮忥級鏃讹紝甯稿父鏀跺埌鍙傛暟鏃犳晥閿欒锛屾垨骞挎挱鍚姩鎴愬姛浣?Android/iOS 鍏朵粬璁惧灏辨槸鎵弿涓嶅埌銆?

**閬垮潙鍘熺悊涓庢柟妗堬細**
- **闀垮害鎷︽埅锛?* 浼犵粺 BLE 骞挎挱鏁版嵁鍖呮渶澶у彧鑳芥壙杞?31 Bytes锛屽寘鍚澶囧悕銆丗lag 鍙婃湇鍔?UUID銆傝嫢鍚嶅瓧杩囬暱锛屼細鎸ゅ帇 UUID 瀵艰嚧骞挎挱鍖呯暩褰㈢洿鎺ヨ瀹夸富骞叉帀銆?
- **UUID 绾︽潫锛?* 寰俊鍦?Android 瀹夸富鎵ц骞挎挱鏃讹紝蹇呴』浣跨敤鍚堣鐨?128 浣嶅畬鏁?UUID 鎴栬钃濈墮 SIG 瑙勮寖璁ゅ彲鐨勭煭 UUID (濡?`FFE0`)銆備贡鍐欓潪鏍?UUID 浼氱洿鎺ヨ繑鍥炲け璐ャ€?

*瀹炶返浠ｇ爜*锛?
鍦?`Smart BLE` 骞挎挱椤靛彂閫佸墠杩涜涓ユ牸鍒囧壊鍜屾牎楠屾嫤鎴細
```javascript
// 鍚嶅瓧纭埅鏂繚鎶?
const safeName = deviceName.length > 8 ? deviceName.substring(0, 8) : deviceName;

// UUID 鍓嶇疆鏍￠獙
const isValid128 = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(serviceUUID);
const isValid16 = /^[0-9a-fA-F]{4}$/.test(serviceUUID); // 濡?FFE0
if (!isValid128 && !isValid16) {
    uni.showToast({ title: '骞挎挱澶辫触锛屽繀椤婚伒寰鑼?UUID', icon: 'none'});
}
```

---

## 4. 鐗瑰緛鍊煎啓鍏ュ锛氶殣寮忚姹傛槑纭笖寮烘牎楠?`writeType`

**鍧戠偣琛ㄧ幇锛?*
浣跨敤 `uni.writeBLECharacteristicValue` 鍚戝璁惧啓鍏ユ暟鎹椂锛屽湪閮ㄥ垎瀹夊崜鏈烘垨 iOS 寰俊閲屾姏鍑?`10007 (property not support)` 鎴栫洿鎺ユ棤鍝嶅簲锛屼絾姝よ澶囧湪鍘熺敓 App 閲屾槑鏄庡啓鍏ラ€氱晠銆?

**閬垮潙鍘熺悊涓庢柟妗堬細**
寰俊灏忕▼搴忓浜庤摑鐗欏崗璁簱鐨勬ˉ鎺ュ崄鍒嗕弗鏍硷紝鍦ㄥ仛搴曞眰杞彂鏃朵笉浼氬幓鑱槑鍦扳€滅寽鈥濅綘鏄兂 write 杩樻槸 writeWithoutResponse銆傚洜姝ゅ嵆渚胯澶囩殑 descriptor 鏀寔鍐欏叆锛屼綘涔熷繀椤绘寜鐓у紑鍙戣€呮枃妗ｅ湪瀵硅薄閲?*寮鸿鎸囨槑**鍏蜂綋鍔ㄤ綔銆?

*瀹炶返浠ｇ爜*锛?
```javascript
uni.writeBLECharacteristicValue({
    deviceId: this.deviceInfo.deviceId,
    serviceId: serviceId,
    characteristicId: characteristicId,
    value: buffer,
    // 鍧戠偣瑙ｉ櫎锛氭瀬鍏跺叧閿殑涓€琛岋紒寮哄埗鍚戝井淇″０鏄庡綋鍓嶇被鍨?
    writeType: 'write' // 鎴?'writeNoResponse'
});
```

---

## 5. 鍚炲悙澧欙細骞跺彂鎵弿鑺傛祦涓?OTA 鍥轰欢浼犺緭鐨?MTU 鍗忓晢鍖呭ぇ灏忛殣鎮?

**鍧戠偣琛ㄧ幇锛?*
- 寮€鍚杩规壂鎻忔椂锛屽皬绋嬪簭杩涚▼鍗￠】銆乁I鏃犲搷搴斻€傦紙鍥犱负 `onBluetoothDeviceFound` 姣忕鎶涘嚭涓婄櫨娆″箍鎾級銆?
- 鍚戣澶囧啓鍏ュぇ閲忔暟鎹紙濡?OTA 鍥轰欢鏇存柊锛夋椂锛屽湪瓒呰繃 20 瀛楄妭鐨勫湴鏂圭洿鎺ユ埅鏂姤閿欍€?

**閬垮潙鏂规锛?*
1. **缂撳瓨涓庤妭娴侊細** 鐢ㄦ暟缁勭紦瀛樹笂鎶ヨ澶囷紝骞堕€氳繃 `throttle` 闄嶄綆瀵?Vue/React 瑙嗗浘灞傜殑鏁版嵁鎺ㄥ叆閫熺巼銆?
2. **寮哄埗鍒嗗寘涓庡崗鍟嗭細** 灏忕▼搴忛粯璁?MTU 鏋佸皬锛?0 Bytes锛夛紝蹇呴』涓诲姩鍙戣捣 `wx.setBLEMTU({ mtu: 512 })` 鍗忓晢銆傚鏋滆€佹棫璁惧涓嶆敮鎸佸崗鍟嗭紝鍒欏繀椤讳娇鐢?`ArrayBuffer` 鐨?`slice()` 灏嗗寘浣撴媶鍒嗕负 `20 Byte` 渚濇寰幆鎺掗槦寤舵椂鍙戦€併€?

> 鍦?`Smart BLE` 涓紝鎴戜滑涓烘牳蹇冪殑 BLE 瑙ｆ瀽涓?OTA 涓嬪彂寤虹珛浜嗕竴鏁村闃熷垪鎺у埗涓庨槻涓叉壈绛栫暐锛岃瑙佷唬鐮侀€昏緫瀹炵幇銆?

