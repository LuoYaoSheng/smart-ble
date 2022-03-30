//
//  EquipmentCell.h
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

// 可以不用写，直接使用系统的也可以。
// 此处只是为了方便后期扩展

@interface EquipmentCell : UITableViewCell
+ (instancetype)cellWithTableView:(UITableView *)tableView;

- (void)setObj:(CBCharacteristic *)pObj;

@property(weak, nonatomic) IBOutlet UILabel *titleLabel;
@property(weak, nonatomic) IBOutlet UILabel *subTitleLabel;
@property(weak, nonatomic) IBOutlet UIImageView *arrowImageView;


@end

NS_ASSUME_NONNULL_END
