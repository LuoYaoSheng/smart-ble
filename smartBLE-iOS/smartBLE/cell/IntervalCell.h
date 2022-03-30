//
//  IntervalCell.h
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface IntervalCell : UITableViewCell
+ (instancetype)cellWithTableView:(UITableView *)tableView;

- (void)setObj:(NSDictionary *)pObj;

@property(weak, nonatomic) IBOutlet UILabel *titleLabel;
@property(weak, nonatomic) IBOutlet UIImageView *checkImageView;

@end

NS_ASSUME_NONNULL_END
