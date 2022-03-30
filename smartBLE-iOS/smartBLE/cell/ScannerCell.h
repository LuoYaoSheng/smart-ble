//
//  ScannerCell.h
//  smartBLE
//
//  Created by lys on 2022/3/20.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface ScannerCell : UITableViewCell
+ (instancetype)cellWithTableView:(UITableView *)tableView;

- (void)setObj:(NSDictionary *)pObj;

@property(weak, nonatomic) IBOutlet UIImageView *signalImg;
@property(weak, nonatomic) IBOutlet UILabel *nameLabel;
@property(weak, nonatomic) IBOutlet UILabel *signalLabel;
@property(weak, nonatomic) IBOutlet UILabel *serverLabel;
@property(weak, nonatomic) IBOutlet UILabel *uuidLabel;

@end

NS_ASSUME_NONNULL_END
