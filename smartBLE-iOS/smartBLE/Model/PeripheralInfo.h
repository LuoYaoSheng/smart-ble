//
//  PeripheralInfo.h
//  smartBLE
//
//  Created by lys on 2022/3/28.
//

#import <Foundation/Foundation.h>
#import <CoreBluetooth/CoreBluetooth.h>

NS_ASSUME_NONNULL_BEGIN

@interface PeripheralInfo : NSObject
@property (nonatomic,strong) CBUUID *serviceUUID;
@property (nonatomic,strong) NSMutableArray *characteristics;
@end

NS_ASSUME_NONNULL_END
