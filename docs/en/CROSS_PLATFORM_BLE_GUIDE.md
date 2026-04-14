> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# SmartBLE 璺ㄥ钩鍙版灦鏋勪笌鑷姩缁存姢鏈哄埗鎸囧崡

SmartBLE 椤圭洰娑电洊浜嗕粠绔儴璁惧鍒版闈㈢鐨勫叏闈㈣摑鐗欓€氳閾俱€傛湰鏂囨。鑱氱劍浜庝笉鍚屾搷浣滅郴缁熶笂鐨勮摑鐗欐爤灏佽宸紓鍙婇珮鍙敤閲嶈繛鏈哄埗鐨勮璁°€?

## 澶氱搴曞眰鏋舵瀯瀵圭収琛?

涓哄疄鐜?涓€濂楅€昏緫浠ｇ爜璺?7 绔?鐨勭洰鏍囷紝椤圭洰閽堝鍚勫钩鍙拌繘琛屼簡搴曞眰钃濈墮搴撻€夊瀷鎶借薄锛?

| 骞冲彴灞?| 鎵€閫夊簳灞傝摑鐗欒兘鍔涙彁渚涙柟 | 澶栬/骞挎挱鏀寔搴?| 杩炴帴绋冲畾鎬х洃鎺?|
|---|---|---|---|
| **Android** | `RxAndroidBle` / 鍘熺敓鏍稿績灞?| 馃煝 瀹岀編鏀寔 (BLE 5.0) | 馃煝 鑷畾涔夐殣寮忔柇寮€鐩戝惉鍥炶皟 |
| **iOS / macOS** | `CoreBluetooth`妗嗘灦 | 馃煝 鍘熺敓鏀寔锛堜絾 SwiftUI/Tauri 鍖呰灞傚瓨鍦ㄥ眬闄愶紝寤鸿璧板師鐢熻皟鐢級 | 馃煝 缁熶竴濮旀墭鏈哄埗 `didDisconnectPeripheral` |
| **Flutter** | `flutter_blue_plus` | 馃煛 鍊熷姪闄勫姞鎻掍欢鍙ā鎷熷箍鎾?| 馃煝 EventStream 骞挎挱閫氶亾 |
| **UniApp** | 寰俊/鍩虹搴?`wx.createBLEConnection` | 鉂?涓嶆敮鎸佸璁惧箍鎾ā寮?| 馃煝 鍊熷姪 `onBLEConnectionStateChange` |
| **Tauri (妗岄潰)** | `btleplug` (Rust) | 鉂?浠呴儴鍒?Linux BlueZ 鍏煎 | 馃煝 Tokio Background Thread 浜嬩欢妗ユ帴 |
| **Electron** | `@abandonware/noble` (Node) | 馃煛 渚濊禆 `bleno` 鏀寔 | 馃煝 EventEmitter `.on('disconnect')` |


## 鏍稿績鐗规€э細澶氱缁熶竴鐨勪笁娆℃寚鏁伴€€閬垮洖杩?(Exponential Backoff Auto-Reconnect)

鍦ㄧ墿鑱旂綉瀹炴垬涓紝淇″彿闃绘柇锛堝鍏抽棬銆佷汉璧拌繃灞忚斀淇″彿锛夊緢甯歌銆傛墍鏈夊钩鍙板潎瀹炴柦浜嗗伐涓氭爣鍑嗙殑 `3娆℃寚鏁伴噸璇曟満鍒禶锛?

### 瀹炵幇妯″瀷
1. **閲嶈瘯鏃堕棿闂撮殧**锛氫緷娆′负 `2000ms`, `4000ms`, `6000ms`锛堥槻姝㈠苟鍙戠珵浜夌綉鍗¤祫婧愶級銆?
2. **浜哄伐鏂紑鍏嶇柅浣撶郴**锛氬湪搴旂敤灞傜淮鎶や竴涓?`userDisconnectedSet` 鏁版嵁缁撴瀯銆傚嚒鏄敤鎴蜂富鍔ㄧ偣鍑?鏂紑杩炴帴"瑙﹀彂鐨勫姩浣滐紝ID 灏嗚褰曡繘鍏ラ粦鍚嶅崟銆傚綋搴曞眰搴撴姏鍑?`disconnect` 浜嬩欢鏃讹紝闇€绗竴鏃堕棿鏍稿鍏舵槸鍚﹀浜庝富鍔ㄦ柇寮€闆嗗悎鍐咃紱濡傛灉鍛戒腑鍒欑粓姝㈤噸杩炴祦绋嬶紝娓呯┖闆嗗悎璁板綍锛涘鏋滄湭鍛戒腑浠ｈ〃鍙戠敓**闈為鏈熷紓甯告柇绾?*锛岀珛鍗抽┍鍔?`Retry State Machine`銆?

### 骞冲彴搴旂敤宸紓
- **鍗曠嚎绋嬫ā鍨?(UniApp/Electron/Flutter)**锛氬埄鐢?`setTimeout` / `Future.delayed` 杩涜閫掑綊鍥炶皟灏濊瘯銆?
- **澶氱嚎绋嬫ā鍨?(Tauri/Android/iOS)**锛?
  - **Tauri**锛氬湪 Rust 渚у崟鐙紑鍚竴涓?`tokio::spawn` 鐨勬棤浼戠湢鍚庡彴浜嬩欢鐩戝惉闃熷垪锛屽綋鎺ユ敹鍒?`CentralEvent::DeviceDisconnected` 鏃跺悜鍓嶇鍙戦€佸墠绔簨浠舵ˉ鏉ヨЕ鍙戦噸璇曟搷浣滐紝纭繚涓?UI 涓嶄細鍥犳杩涘叆闃诲 (Block) 鐘舵€併€?
  - **iOS/Android**锛氶€氳繃鍚庡彴 `Background Tasks` 纭繚鏃犺搴旂敤澶勪簬鍓嶅彴杩樻槸杩涘叆閿佸睆鎸傝捣鐘舵€侊紝閮借兘鍞ら啋搴旂敤鎵ц閲嶈繛銆?

## Notify 瀹炵幇鏋舵瀯

### 澶氬钩鍙扮壒寰佸€肩洃鍚疄鐜颁笌韪╁潙 (Notify / Indicate)

涓嶅悓鐨勬搷浣滅郴缁熶笌搴撳钃濈墮浜嬩欢娴佺殑鎶借薄澶х浉寰勫涵锛岃繖鏇炬槸瀵艰嚧璺ㄧ鐘舵€佷笉鍚屾鐨勬渶澶у厓鍑躲€傜洰鍓嶇殑鏋舵瀯缁堜簬灏嗗畠浠己琛屾媺骞筹紝璇峰垏鑷虫偍鐨勪笓灞為樀钀ワ細

::: code-group

```rust [馃 Tauri (Rust btleplug)]
// btleplug 0.11 姝ｇ‘鐨勯€氱煡娴佷娇鐢ㄦ柟寮?
peripheral.subscribe(&char).await?;
let mut notif_stream = peripheral.notifications().await?;

tokio::spawn(async move {
    use futures::stream::StreamExt;
    use btleplug::api::ValueNotification;

    // 涓嶆柇鎹曡幏娴侊紝鍙湁纭欢鐪熷疄 Push 鎵嶄細瑙﹀彂
    while let Some(ValueNotification { uuid, value }) = notif_stream.next().await {
        if uuid.to_string() == char_uuid_filter {
            window.emit("notification-received", payload);
        }
    }
});
```

```dart [馃惁 Flutter (flutter_blue_plus)]
// 鍚敤 Notify
await characteristic.setNotifyValue(true);

// 鐩戝惉鐙珛鐗瑰緛鍊肩殑 Broadcast Stream
final subscription = characteristic.onValueReceived.listen((value) {
    // value 鍗虫槸 List<int>
    ref.read(bleDataProvider.notifier).state = value;
});

// 鏍稿績瑕佺偣锛氬簲鐢ㄦ寕璧锋椂娉ㄦ剰 cancel 閲婃斁
ref.onDispose(() => subscription.cancel());
```

```kotlin [馃 Android (鍘熺敓 Kotlin)]
// 鍩轰簬鍘熺敓 Android BluetoothGatt 鐨勭‖鏍稿Э鍔?
val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))
descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
gatt.writeDescriptor(descriptor)

gatt.setCharacteristicNotification(characteristic, true)

// 闅忓悗鍦ㄦ澶勭殑 Callback 鎷︽埅
override fun onCharacteristicChanged(gatt: BluetoothGatt, char: BluetoothGattCharacteristic) {
    val payload = char.value
    // 鍙戦€佸埌涓荤嚎绋嬪鐞?
}
```

```javascript [馃寪 Electron (Node Noble)]
// 鐩戝惉鍘熺敓纭欢瑙﹀彂鐨勪簨浠剁洃鍚櫒
characteristic.on('data', (data, isNotification) => {
    if (isNotification) {
         // data 涓?NodeJS Buffer
         const payload = Array.from(data);
         mainWindow.webContents.send('notification-received', payload);
    }
});
```

:::

## Electron 璺ㄥ钩鍙颁慨澶嶈褰?

| 闂 | 鏃у疄鐜?| 淇鍚?|
|---|---|---|
| 璋冭瘯鏃ュ織璺緞 | `/tmp/electron-main-debug.log` (Linux 涓撶敤) | `app.getPath('logs')` 璺ㄥ钩鍙拌矾寰?|
| `disconnect` 鏃跺簭 | 璋冪敤 `disconnect()` 鍓嶅凡浠?Map 鍒犻櫎 peripheral锛屽洖璋冧腑 `peripheral.id` 鍙兘宸查噴鏀?| 鍏堜繚瀛?`peripheralId` 鏈湴鍙橀噺锛孧ap 鍒犻櫎绉诲埌鍥炶皟鍐?|

## 鏈潵瑙勬暣璁″垝 (Ongoing Plan)

铏界劧宸插畬鎴愮粷澶у鏁拌法绔鐢ㄧ粺涓€锛屾湭鏉ョ殑璐＄尞鑰呰繕鍙湞濡備笅鏂瑰悜鏀舵暃锛?
1. **鑷姩鍖栨墦妗╂祴璇?(Automated Dummy Mocking)**锛氳В鑰﹁摑鐗欎緷璧栵紝灏嗚摑鐗欏眰鏀瑰啓涓烘敮鎸佽櫄鎷?Mock 鐨?`Interface`锛屼究浜庡湪 CI (GitHub Actions) 涓嚜鍔ㄥ洖褰掓祴璇曞箍鎾笌閲嶈繛娴佺▼銆?
2. **搴曞眰鍗忚瑙ｆ瀽鐨?WASM 鍖?*锛氱洰鍓嶇壒寰佸€肩殑缂栬В鐮佸瓨鍦ㄥ悇骞冲彴鐢ㄥ師鐢熻瑷€浜屾瀹炵幇鐨勯棶棰橈紝鍚庣画鎷熺敤 Rust 鎵撳寘鍑?`.wasm`锛岃鎵€鏈夊墠绔紙鍖呭惈 Tauri锛孶niApp 绛夛級鍏辩敤涓€濂楄В鏋愪骇鐗┿€?
3. **Tauri Notify 楠岃瘉**锛氬湪鎼浇 btleplug 鐨勮澶囦笂楠岃瘉 `CentralEvent::ValueNotification` 浜嬩欢瀛楁鐨勫疄闄呯粨鏋勶紙鍚勫钩鍙板疄鐜板彲鑳藉瓨鍦ㄥ樊寮傦級锛岀‘璁ょ壒寰佸€?UUID 鏄惁鑳戒粠浜嬩欢鐩存帴璇诲彇锛堢洰鍓嶅墠绔晶閰嶅悎杩囨护锛夈€?

