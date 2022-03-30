//
//  ScannerCell.m
//  smartBLE
//
//  Created by lys on 2022/3/20.
//

#import "ScannerCell.h"

@implementation ScannerCell

+ (instancetype)cellWithTableView:(UITableView *)tableView {
    static NSString *identifier = @"ScannerCell";
    ScannerCell *cell = [tableView dequeueReusableCellWithIdentifier:identifier];
    if (cell == nil) {
        cell = [[[NSBundle mainBundle] loadNibNamed:identifier owner:nil options:nil] firstObject];
    }
    return cell;
}

- (void)setObj:(NSDictionary *)pObj {
    CBPeripheral *peripheral = (CBPeripheral *) pObj[@"peripheral"];
    NSString *name = pObj[@"advertisementData"][@"kCBAdvDataLocalName"];
    NSArray *kCBAdvDataServiceUUIDs = pObj[@"advertisementData"][@"kCBAdvDataServiceUUIDs"];
    NSInteger count = [kCBAdvDataServiceUUIDs isKindOfClass:[NSArray class]] ? kCBAdvDataServiceUUIDs.count : 0;

    _signalImg.image = [UIImage imageNamed:[self rssi2quality:pObj[@"RSSI"]]];//[UIImage imageNamed:@"signal_4"];
    _nameLabel.text = name ? name : @"N/A";//[NSString stringWithFormat:@"%@", peripheral.name ? peripheral.name:  @"N/A"];
    _signalLabel.text = [NSString stringWithFormat:@"%@", pObj[@"RSSI"]];
    _serverLabel.text = count > 0 ? [NSString stringWithFormat:@"%ld service", (long) count] : @"No services";
    _uuidLabel.text = [NSString stringWithFormat:@"UUID:%@", peripheral.identifier.UUIDString];
}

- (NSString *)rssi2quality:(NSNumber *)rssi {
    double quality = MIN(MAX(2 * ([rssi doubleValue] + 100.0), 0.0), 100.0);
    int signal = (int) round(quality / 20.0);
    return [NSString stringWithFormat:@"signal_%d", signal == 5 ? 4 : signal];
}

@end
