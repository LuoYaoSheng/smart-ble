#import <Foundation/Foundation.h>
#import "DCUniModule.h"
#import <CoreBluetooth/CoreBluetooth.h>

@interface LysBlePeripheralModule : DCUniModule <CBPeripheralManagerDelegate>

@property (nonatomic, strong) CBPeripheralManager *peripheralManager;
@property (nonatomic, assign) BOOL isAdvertising;

// 获取单例实例
+ (instancetype)sharedInstance;

// 检查设备是否支持BLE广播
- (void)isSupported:(UniModuleKeepAliveCallback)callback;
// 开始广播
- (void)startAdvertising:(NSDictionary *)options callback:(UniModuleKeepAliveCallback)callback;
// 检查是否正在广播
- (void)isAdvertising:(UniModuleKeepAliveCallback)callback;
// 停止广播
- (void)stopAdvertising:(UniModuleKeepAliveCallback)callback;

@end
