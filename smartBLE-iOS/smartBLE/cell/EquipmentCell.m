//
//  EquipmentCell.m
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import "EquipmentCell.h"

@implementation EquipmentCell

- (void)awakeFromNib {
    [super awakeFromNib];
    // Initialization code
}

- (void)setSelected:(BOOL)selected animated:(BOOL)animated {
    [super setSelected:selected animated:animated];

    // Configure the view for the selected state
}

+ (instancetype)cellWithTableView:(UITableView *)tableView {
    static NSString *identifier = @"EquipmentCell";
    EquipmentCell *cell = [tableView dequeueReusableCellWithIdentifier:identifier];
    if (cell == nil) {
        cell = [[[NSBundle mainBundle] loadNibNamed:identifier owner:nil options:nil] firstObject];
    }
    return cell;
}

- (void)setObj:(CBCharacteristic *)characteristic {
    _titleLabel.text = [NSString stringWithFormat:@"%@", characteristic.UUID];
    _subTitleLabel.text = [Tool CBCharacteristicPropertyToString:characteristic.properties];
}


@end
