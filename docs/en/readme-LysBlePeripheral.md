> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# LysBlePeripheral

涓€涓敮鎸?Android 鍜?iOS 鐨?BLE 骞挎挱鎻掍欢銆?

## 鍔熻兘鐗圭偣

- 鏀寔 Android 鍜?iOS 骞冲彴
- 鎻愪緵缁熶竴鐨勬帴鍙?
- 鏀寔鑷畾涔夊箍鎾暟鎹?
- 鏀寔璁剧疆骞挎挱鍙傛暟
- 鏀寔鐘舵€佺洃鎺?
- 鏃犻渶鏉冮檺妫€鏌ワ紝鐩存帴鎿嶄綔BLE骞挎挱
- 鏀寔澶氭鍚仠骞挎挱锛屼笉浼氬嚭鐜颁涪澶遍棶棰橈紙v1.0.4鏂板锛?

## 瀹夎璇存槑

1. 灏嗘彃浠舵坊鍔犲埌椤圭洰涓?
2. 鍦?`manifest.json` 涓厤缃彃浠讹細
```json
{
    "plugins": {
        "LysBlePeripheral": {
            "version": "1.0.4"
        }
    }
}
```

## 鏉冮檺閰嶇疆

铏界劧1.0.3+鐗堟湰宸茬Щ闄ゆ潈闄愭鏌ラ€昏緫锛屼絾鎮ㄤ粛闇€鍦ㄦ竻鍗曟枃浠朵腑澹版槑鏉冮檺锛屼互纭繚楂樼増鏈珹ndroid绯荤粺涓殑姝ｅ父杩愯銆?

### Android
鍦?`AndroidManifest.xml` 涓坊鍔犱互涓嬫潈闄愶細
```xml
<!-- Android 12 鍙婁互涓?-->
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Android 12 浠ヤ笅 -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### iOS
鍦?`Info.plist` 涓坊鍔犱互涓嬫弿杩帮細
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>闇€瑕佷娇鐢ㄨ摑鐗欐潵鍙戦€佸箍鎾暟鎹?/string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>闇€瑕佷娇鐢ㄨ摑鐗欐潵鍙戦€佸箍鎾暟鎹?/string>
```

## API 璇存槑

鎵€鏈夋柟娉曞潎涓哄紓姝ユ柟娉曪紝閫氳繃鍥炶皟杩斿洖缁撴灉銆?

### isSupported(callback)
妫€鏌ヨ澶囨槸鍚︽敮鎸?BLE 骞挎挱銆?

**鍥炶皟鍙傛暟锛?*
```javascript
{
    code: 0,            // 0: 鎴愬姛锛屽叾浠? 澶辫触
    supported: true,    // true: 鏀寔锛宖alse: 涓嶆敮鎸?
    message: "success"  // 缁撴灉鎻忚堪
}
```

### isAdvertising(callback)
妫€鏌ュ綋鍓嶆槸鍚︽鍦ㄥ箍鎾€?

**鍥炶皟鍙傛暟锛?*
```javascript
{
    code: 0,             // 0: 鎴愬姛锛屽叾浠? 澶辫触
    advertising: true,   // true: 姝ｅ湪骞挎挱锛宖alse: 鏈箍鎾?
    message: "success"   // 缁撴灉鎻忚堪
}
```

### startAdvertising(options, callback)
寮€濮嬪箍鎾€傚鏋滃凡鏈夊箍鎾湪杩愯锛屼細鍏堣嚜鍔ㄥ仠姝㈠綋鍓嶅箍鎾紝鐒跺悗鍐嶅惎鍔ㄦ柊鐨勫箍鎾€?

**鍙傛暟璇存槑锛?*
```javascript
// Android 鍙傛暟
{
    settings: {
        advertiseMode: 2,      // 骞挎挱妯″紡锛?-浣庡姛鑰楋紝1-骞宠　锛?-浣庡欢杩?
        txPowerLevel: 3,       // 鍙戝皠鍔熺巼锛?-瓒呬綆锛?-浣庯紝2-涓紝3-楂?
        connectable: true      // 鏄惁鍙繛鎺?
    },
    advertiseData: {
        includeDeviceName: false,          // 鏄惁鍖呭惈璁惧鍚嶇О锛堝缓璁涓篺alse锛岃澶囧悕绉颁細鍗犵敤澶ч噺绌洪棿锛?
        manufacturerId: 0x0001,            // 鍘傚晢ID
        manufacturerData: "Hello World",   // 骞挎挱鏁版嵁锛堜笉瓒呰繃20瀛楄妭锛?
        serviceUuid: "1234"                // 鏈嶅姟UUID锛堝彲閫夛級
    }
}

// iOS 鍙傛暟
{
    localName: "MyDevice",              // 鏈湴鍚嶇О
    services: ["180D"],                 // 鏈嶅姟UUID鍒楄〃
    manufacturerData: {
        id: 0x0001,                     // 鍘傚晢ID
        data: "Hello World"             // 骞挎挱鏁版嵁
    }
}
```

> **鈿狅笍 閲嶈鎻愮ず锛?* 
> 1. BLE骞挎挱鏁版嵁鏈変弗鏍肩殑澶у皬闄愬埗锛屾暣涓箍鎾寘涓嶈兘瓒呰繃31瀛楄妭
> 2. 鍖呭惈璁惧鍚嶇О浼氬崰鐢ㄥぇ閲忕┖闂达紝寤鸿璁剧疆 `includeDeviceName: false`
> 3. 鍘傚晢鏁版嵁璇锋帶鍒跺湪20瀛楄妭浠ュ唴
> 4. 鏈嶅姟UUID涔熶細鍗犵敤绌洪棿锛岃璋ㄦ厧浣跨敤

**鍥炶皟鍙傛暟锛?*
```javascript
{
    code: 0,            // 0: 鎴愬姛锛屽叾浠? 澶辫触
    message: "success"  // 缁撴灉鎻忚堪
}
```

### stopAdvertising(callback)
鍋滄骞挎挱銆傚嵆浣垮綋鍓嶆病鏈夊箍鎾湪杩愯锛岃皟鐢ㄦ鏂规硶涔熸槸瀹夊叏鐨勩€?

**鍥炶皟鍙傛暟锛?*
```javascript
{
    code: 0,            // 0: 鎴愬姛锛屽叾浠? 澶辫触
    message: "success"  // 缁撴灉鎻忚堪
}
```

## 閿欒鐮佽鏄?

- 0: 鎴愬姛
- -1: 璁惧涓嶆敮鎸?
- -4: 绯荤粺閿欒
- -5: 钃濈墮鏈紑鍚?

### 骞挎挱閿欒璇︾粏瑙ｉ噴
褰?`startAdvertising` 澶辫触鏃讹紝鍙兘浼氳繑鍥炰互涓嬭缁嗛敊璇俊鎭細

- 骞挎挱鏁版嵁杩囧ぇ锛堥敊璇爜1锛夛細骞挎挱鏁版嵁鍖呰秴鍑轰簡31瀛楄妭鐨勯檺鍒?
- 骞挎挱鍣ㄦ暟閲忚繃澶氾紙閿欒鐮?锛夛細鍚屾椂浣跨敤浜嗗お澶氬箍鎾疄渚?
- 骞挎挱宸茬粡鍚姩锛堥敊璇爜3锛夛細褰撳墠宸叉湁涓€涓箍鎾鍦ㄨ繍琛?
- 鍐呴儴閿欒锛堥敊璇爜4锛夛細钃濈墮鏍堝唴閮ㄩ敊璇?
- 璁惧涓嶆敮鎸佹鍔熻兘锛堥敊璇爜5锛夛細璁惧涓嶅畬鍏ㄦ敮鎸丅LE骞挎挱鍔熻兘

## 浣跨敤绀轰緥

### 鍩烘湰浣跨敤
```vue
<template>
  <view>
    <button @click="checkSupport">妫€鏌ユ敮鎸?/button>
    <button @click="startAd">寮€濮嬪箍鎾?/button>
    <button @click="checkStatus">妫€鏌ョ姸鎬?/button>
    <button @click="stopAd">鍋滄骞挎挱</button>
  </view>
</template>

<script>
const bleModule = uni.requireNativePlugin('LysBlePeripheral')

export default {
  methods: {
    // 妫€鏌ユ敮鎸?
    checkSupport() {
      bleModule.isSupported((result) => {
        console.log('鏀寔鐘舵€侊細', result)
      })
    },
    
    // 寮€濮嬪箍鎾?
    startAd() {
      const options = {
        settings: {
          advertiseMode: 2,
          txPowerLevel: 3,
          connectable: true
        },
        advertiseData: {
          includeDeviceName: false, // 涓嶅寘鍚澶囧悕绉帮紝鑺傜渷绌洪棿
          manufacturerId: 0x0001,
          manufacturerData: "Hello" // 淇濇寔鏁版嵁绠€鐭?
        }
      }
      
      bleModule.startAdvertising(options, (result) => {
        console.log('鍚姩缁撴灉锛?, result)
      })
    },
    
    // 妫€鏌ョ姸鎬?
    checkStatus() {
      bleModule.isAdvertising((result) => {
        console.log('骞挎挱鐘舵€侊細', result)
      })
    },
    
    // 鍋滄骞挎挱
    stopAd() {
      bleModule.stopAdvertising((result) => {
        console.log('鍋滄缁撴灉锛?, result)
      })
    }
  }
}
</script>
```

## 鏈€浣冲疄璺?

1. **骞挎挱鏁版嵁浼樺寲锛?*
   - 涓嶈鍖呭惈璁惧鍚嶇О锛坄includeDeviceName: false`锛?
   - 淇濇寔鍘傚晢鏁版嵁绠€鐭紝涓嶈秴杩?0瀛楄妭
   - 閬垮厤鍚屾椂浣跨敤澶氫釜鏁版嵁绫诲瀷锛堝鏈嶅姟UUID鍜屽巶鍟嗘暟鎹級

2. **绯荤粺鍏煎鎬э細**
   - 浣庣璁惧鍙兘涓嶆敮鎸丅LE骞挎挱锛屼娇鐢ㄥ墠鍏堣皟鐢╜isSupported`妫€鏌?
   - 鍦ㄤ笉鍚?Android 鐗堟湰涓婇兘鑳芥甯稿伐浣滐紝鏃犻渶杩涜鏉冮檺妫€鏌?

3. **骞挎挱璧勬簮绠＄悊锛?*
   - 鍋滄骞挎挱鍚庡啀娆″惎鍔ㄦ椂锛屾棤闇€鎷呭績璧勬簮閲婃斁闂锛屾彃浠朵細鑷姩澶勭悊
   - 鍗充娇鏃犳硶妫€娴嬪埌鏄惁鏈夊箍鎾鍦ㄨ繍琛岋紝涔熷彲浠ユ斁蹇冭皟鐢╜stopAdvertising`鍜宍startAdvertising`
   - 椤甸潰鍏抽棴鏃惰寰楄皟鐢╜stopAdvertising`鍋滄骞挎挱
   - 鍦╜onLoad`鏃舵鏌ヨ澶囨敮鎸佹儏鍐碉紝鍦╜onUnload`鏃堕噴鏀捐祫婧?

4. **绋冲畾鎬у缓璁細**
   - 濡傛灉闇€瑕佹洿鏀瑰箍鎾唴瀹癸紝寤鸿鍏堝仠姝㈠綋鍓嶅箍鎾紝鐒跺悗鍐嶅惎鍔ㄦ柊鐨勫箍鎾?
   - 骞挎挱鍙傛暟鍙樻洿棰戠箒鏃讹紝鍦ㄥ惎鍔ㄥ墠澧炲姞鐭殏寤舵椂锛?00-200ms锛夊彲鑳芥湁鍔╀簬鎻愰珮绋冲畾鎬?
   - 濡傛灉鍑虹幇骞挎挱妫€娴嬩笉鍒扮殑鎯呭喌锛屽彲浠ュ皾璇曞仠姝㈠箍鎾悗绛夊緟200ms鍐嶉噸鏂板惎鍔?

## 娉ㄦ剰浜嬮」

1. Android 闇€瑕佸湪娓呭崟涓０鏄庤摑鐗欐潈闄愶紝浣嗘彃浠跺唴閮ㄤ笉鍐嶆鏌ユ潈闄?
2. iOS 闇€瑕佸湪鐪熸満涓婃祴璇?
3. 閮ㄥ垎 Android 璁惧鍙兘涓嶆敮鎸?BLE 骞挎挱鍔熻兘
4. 寤鸿鍦ㄤ娇鐢ㄥ墠鍏堣皟鐢?`isSupported()` 妫€鏌ヨ澶囨敮鎸佹儏鍐?
5. 浣跨敤鍓嶇‘淇濊摑鐗欏凡寮€鍚?
6. 椤甸潰鍏抽棴鏃惰寰楄皟鐢?`stopAdvertising()` 鍋滄骞挎挱
7. 骞挎挱鏁版嵁鏈変弗鏍肩殑澶у皬闄愬埗锛岃閬垮厤浣跨敤杩囧ぇ鐨勬暟鎹寘
8. 澶氭鍚仠骞挎挱鏃朵笉鍐嶉渶瑕侀澶栧鐞嗚祫婧愰噴鏀撅紝鎻掍欢浼氳嚜鍔ㄧ鐞嗭紙v1.0.4+锛?

## 鏇存柊鏃ュ織

### 1.0.4
- 淇閲嶅鍚仠骞挎挱鍚庡箍鎾俊鍙蜂涪澶辩殑闂
- 瀹屽杽璧勬簮閲婃斁鏈哄埗锛岀‘淇濆娆″箍鎾彲琚ǔ瀹氭悳绱㈠埌
- 澧炲己骞挎挱鍚姩鍓嶇殑娓呯悊宸ヤ綔锛岄槻姝㈣祫婧愭硠婕?
- 鏀硅繘鍋滄骞挎挱鐨勫彲闈犳€э紝鏃犺褰撳墠鐘舵€佸浣曢兘鑳芥纭仠姝?
- 娣诲姞鏇磋缁嗙殑鏃ュ織锛屼究浜庤皟璇曞拰闂鎺掓煡

### 1.0.3
- 褰诲簳绉婚櫎鏉冮檺妫€鏌ラ€昏緫锛岃В鍐矨ndroid涓婂洜鏉冮檺妫€鏌ュ鑷寸殑骞挎挱澶辫触闂
- 淇onActivityDestroy鏂规硶涓殑鏉′欢鍒ゆ柇閿欒
- 浼樺寲閿欒澶勭悊
- 绠€鍖栦唬鐮佺粨鏋?
- 鏀硅繘绀轰緥浠ｇ爜锛屾洿绗﹀悎瀹為檯浣跨敤鍦烘櫙

### 1.0.2
- 娣诲姞璺宠繃鏉冮檺妫€鏌ラ€夐」
- 鏀硅繘瀵?Android 鏉冮檺闂鐨勫鐞?
- 浼樺寲閿欒淇℃伅灞曠ず

### 1.0.1
- 浼樺寲骞挎挱鏁版嵁澶勭悊锛岃В鍐虫暟鎹繃澶ч棶棰?
- 娣诲姞鏇磋缁嗙殑閿欒淇℃伅
- 鏀硅繘Android 12+鏉冮檺澶勭悊
- 缁熶竴Android鍜宨OS鎺ュ彛涓哄紓姝ヨ皟鐢?
- 浼樺寲閿欒澶勭悊
- 瀹屽杽鏂囨。璇存槑

### 1.0.0
- 鍒濆鐗堟湰
- 鏀寔Android鍜宨OS
- 瀹炵幇鍩烘湰鐨勫箍鎾姛鑳?
