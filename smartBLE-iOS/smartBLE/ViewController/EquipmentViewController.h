//
//  EquipmentViewController.h
//  smartBLE
//
//  Created by lys on 2022/3/20.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface EquipmentViewController : UITableViewController
{
    @public
    BabyBluetooth *baby;
}

@property(strong,nonatomic) CBPeripheral *currPeripheral;
@end

NS_ASSUME_NONNULL_END
