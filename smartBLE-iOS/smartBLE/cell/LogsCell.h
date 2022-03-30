//
//  LogsCell.h
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface LogsCell : UITableViewCell
+ (instancetype)cellWithTableView:(UITableView *)tableView;

- (void)setObj:(Log *)pObj;

- (void)setObj:(Log *)pObj format:(BOOL)isHex simplify:(BOOL)isSimplify;

@property(weak, nonatomic) IBOutlet UILabel *dateLabel;
@property(weak, nonatomic) IBOutlet UILabel *contentLabel;

@end

NS_ASSUME_NONNULL_END
