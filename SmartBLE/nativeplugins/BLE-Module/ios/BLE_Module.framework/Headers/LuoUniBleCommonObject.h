//
//  LuoUniBleObject.h
//  layer_demo
//
//  Created by luoys on 2025/3/11.
//

#import <Foundation/Foundation.h>
#import "DCUniModule.h"
#import <CoreBluetooth/CoreBluetooth.h>

NS_ASSUME_NONNULL_BEGIN

@interface LuoUniBleCommonObject : DCUniModule <CBPeripheralManagerDelegate>

@property (nonatomic, strong) CBPeripheralManager *peripheralManager;

// 检查设备是否支持BLE广播
- (void)getAdvertisingSupport:(UniModuleKeepAliveCallback)callback;

// 开始广播
- (void)startAdvertising:(NSDictionary *)options callback:(UniModuleKeepAliveCallback)callback;

// 检查是否正在广播
- (void)isAdvertising:(UniModuleKeepAliveCallback)callback;

// 停止广播
- (void)stopAdvertising:(UniModuleKeepAliveCallback)callback;

@end

NS_ASSUME_NONNULL_END
