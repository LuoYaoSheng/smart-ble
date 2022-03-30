//
//  CharacteristicVViewController.h
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface CharacteristicVViewController : UIViewController
{
@public
    BabyBluetooth *baby;
}

@property (nonatomic,strong) CBUUID *serviceUUID;
@property (nonatomic,strong) CBCharacteristic *characteristic;
@property (nonatomic,strong) CBPeripheral *currPeripheral;
@end

NS_ASSUME_NONNULL_END
