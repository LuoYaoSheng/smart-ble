//
//  IntervalCell.m
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import "IntervalCell.h"

@implementation IntervalCell

- (void)awakeFromNib {
    [super awakeFromNib];
    // Initialization code

    self.selectionStyle = UITableViewCellSelectionStyleNone;
}

- (void)setSelected:(BOOL)selected animated:(BOOL)animated {
    [super setSelected:selected animated:animated];

    // Configure the view for the selected state
}

+ (instancetype)cellWithTableView:(UITableView *)tableView {
    static NSString *identifier = @"IntervalCell";
    IntervalCell *cell = [tableView dequeueReusableCellWithIdentifier:identifier];
    if (cell == nil) {
        cell = [[[NSBundle mainBundle] loadNibNamed:identifier owner:nil options:nil] firstObject];
    }
    return cell;
}

- (void)setObj:(NSDictionary *)pObj {
    _titleLabel.text = [NSString stringWithFormat:@"%@", pObj[@"title"]];
    _checkImageView.hidden = ![pObj[@"checked"] boolValue];
}

@end
