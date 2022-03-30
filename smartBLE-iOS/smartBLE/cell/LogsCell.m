//
//  LogsCell.m
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import "LogsCell.h"

@implementation LogsCell

- (void)awakeFromNib {
    [super awakeFromNib];
    // Initialization code
}

- (void)setSelected:(BOOL)selected animated:(BOOL)animated {
    [super setSelected:selected animated:animated];

    // Configure the view for the selected state
}

+ (instancetype)cellWithTableView:(UITableView *)tableView {
    static NSString *identifier = @"LogsCell";
    LogsCell *cell = [tableView dequeueReusableCellWithIdentifier:identifier];
    if (cell == nil) {
        cell = [[[NSBundle mainBundle] loadNibNamed:identifier owner:nil options:nil] firstObject];
    }
    return cell;
}

- (void)setObj:(Log *)pObj {
    NSString *text;
    UIColor *textColor = [UIColor colorWithRed:51 / 255.0 green:51 / 255.0 blue:48 / 255.0 alpha:1.0];
    switch (pObj.type) {
        case LogTypeConnet: {
            text = [NSString stringWithFormat:@"[%@]%@", pObj.uuid, pObj.content];
        }
            break;
        case LogTypeRead: {
            text = [NSString stringWithFormat:@"读取[%@]:%@", pObj.uuid, pObj.content];
            textColor = [UIColor colorWithRed:0 / 255.0 green:181 / 255.0 blue:120 / 255.0 alpha:1.0];
        }
            break;
        case LogTypeReceive: {
            text = [NSString stringWithFormat:@"接收[%@]:%@", pObj.uuid, pObj.content];
            textColor = [UIColor colorWithRed:0 / 255.0 green:191 / 255.0 blue:208 / 255.0 alpha:1.0];
        }
            break;
        case LogTypeWrite: {
            text = [NSString stringWithFormat:@"[%@]写入:%@", pObj.uuid, pObj.content];
            textColor = [UIColor colorWithRed:255 / 255.0 green:143 / 255.0 blue:31 / 255.0 alpha:1.0];
        }
            break;
        case LogTypeNotify: {
            text = [NSString stringWithFormat:@"通知[%@]:%@", pObj.uuid, pObj.content];
            textColor = [UIColor colorWithRed:72 / 255.0 green:118 / 255.0 blue:255 / 255.0 alpha:1.0];
        }
            break;
        case LogTypeError: {
            text = [NSString stringWithFormat:@"异常[%@]:%@", pObj.uuid, pObj.content];
            textColor = [UIColor systemRedColor];
        }
            break;
        default:
            text = [NSString stringWithFormat:@"未知[%@]:%@", pObj.uuid, pObj.content];
            break;
    }

    _contentLabel.textColor = textColor;
    _contentLabel.text = text;

    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
//    formatter.dateFormat = @"yyyy-MM-dd HH:mm:ss EE";
    formatter.dateFormat = @"HH:mm:ss >";
    NSString *dateStr = [formatter stringFromDate:pObj.date];
    _dateLabel.text = dateStr;
}

- (void)setObj:(Log *)pObj format:(BOOL)isHex simplify:(BOOL)isSimplify {
    NSString *text;
    UIColor *textColor = [UIColor colorWithRed:51 / 255.0 green:51 / 255.0 blue:48 / 255.0 alpha:1.0];
    switch (pObj.type) {
        case LogTypeConnet: {
            text = [NSString stringWithFormat:@"[%@]%@", isSimplify ? @"-" : pObj.uuid, isHex ? pObj.content : [Tool stringFromHexString:pObj.content]];
        }
            break;
        case LogTypeRead: {
            text = [NSString stringWithFormat:@"读取[%@]:%@", isSimplify ? @"-" : pObj.uuid, isHex ? pObj.content : [Tool stringFromHexString:pObj.content]];
            textColor = [UIColor colorWithRed:0 / 255.0 green:181 / 255.0 blue:120 / 255.0 alpha:1.0];
        }
            break;
        case LogTypeReceive: {
            text = [NSString stringWithFormat:@"接收[%@]:%@", isSimplify ? @"-" : pObj.uuid, isHex ? pObj.content : [Tool stringFromHexString:pObj.content]];
            textColor = [UIColor colorWithRed:0 / 255.0 green:191 / 255.0 blue:208 / 255.0 alpha:1.0];
        }
            break;
        case LogTypeWrite: {
            text = [NSString stringWithFormat:@"[%@]写入:%@", isSimplify ? @"-" : pObj.uuid, isHex ? pObj.content : [Tool stringFromHexString:pObj.content]];
            textColor = [UIColor colorWithRed:255 / 255.0 green:143 / 255.0 blue:31 / 255.0 alpha:1.0];
        }
            break;
        case LogTypeNotify: {
            text = [NSString stringWithFormat:@"通知[%@]:%@", isSimplify ? @"-" : pObj.uuid, isHex ? pObj.content : [Tool stringFromHexString:pObj.content]];
            textColor = [UIColor colorWithRed:72 / 255.0 green:118 / 255.0 blue:255 / 255.0 alpha:1.0];
        }
            break;
        case LogTypeError: {
            text = [NSString stringWithFormat:@"异常[%@]:%@", isSimplify ? @"-" : pObj.uuid, isHex ? pObj.content : [Tool stringFromHexString:pObj.content]];
            textColor = [UIColor systemRedColor];
        }
            break;
        default:
            text = [NSString stringWithFormat:@"未知[%@]:%@", isSimplify ? @"-" : pObj.uuid, isHex ? pObj.content : [Tool stringFromHexString:pObj.content]];
            break;
    }

    _contentLabel.textColor = textColor;
    _contentLabel.text = text;

    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
//    formatter.dateFormat = @"yyyy-MM-dd HH:mm:ss EE";
    formatter.dateFormat = @"HH:mm:ss >";
    NSString *dateStr = [formatter stringFromDate:pObj.date];
    _dateLabel.text = dateStr;
}

@end
