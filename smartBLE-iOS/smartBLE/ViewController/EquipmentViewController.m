//
//  EquipmentViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/20.
//

#import "EquipmentViewController.h"
#import "EquipmentCell.h"
#import "CharacteristicVViewController.h"
#import "PeripheralInfo.h"

#define channelOnPeropheralView @"peripheralView"

@interface EquipmentViewController ()
@property(nonatomic, assign) NSInteger connectState;
@property __block NSMutableArray *services;
@end

@implementation EquipmentViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [self DATA_init];
    [self UI_init];
    [self BLE_init];
}

- (void)viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];
    // 断开连接
//    [baby cancelAllPeripheralsConnection];
}

#pragma mark - ui

- (void)UI_init {
    self.view.backgroundColor = [UIColor systemGray6Color];
    self.title = self.currPeripheral.name;

    [self UI_update_right:0];
}

- (void)UI_update_right:(int)connetState {
    _connectState = connetState;
    UIImage *image; // 可以直接使用 UIColor 转 UIImage 方式来实现
    switch (connetState) {
        case 0://连接中
            image = [UIImage imageNamed:@"connecting"];
            break;
        case 1://已连接
            image = [UIImage imageNamed:@"connected"];
            break;
//        case 2://连接失败
        default://连接已断开
            image = [UIImage imageNamed:@"disconnected"];
            break;
    };

    UIBarButtonItem *rightBtn = [[UIBarButtonItem alloc] initWithImage:[image imageWithRenderingMode:UIImageRenderingModeAlwaysOriginal] style:UIBarButtonItemStylePlain target:self action:@selector(rightAction)];
    self.navigationItem.rightBarButtonItem = rightBtn;
}

#pragma mark - ble

- (void)BLE_init {
    [self babyDelegate];
    baby.having(self.currPeripheral).and.channel(channelOnPeropheralView).then.connectToPeripherals().discoverServices().discoverCharacteristics().readValueForCharacteristic().discoverDescriptorsForCharacteristic().readValueForDescriptors().begin();
}

#pragma mark - data

- (void)DATA_init {
    self.services = [[NSMutableArray alloc] init];
    _connectState = 0;
}

- (void)insertSectionToTableView:(CBService *)service {
    PeripheralInfo *info = [[PeripheralInfo alloc] init];
    [info setServiceUUID:service.UUID];
    [self.services addObject:info];
    NSIndexSet *indexSet = [[NSIndexSet alloc] initWithIndex:self.services.count - 1];
    [self.tableView insertSections:indexSet withRowAnimation:UITableViewRowAnimationAutomatic];
}

- (void)insertRowToTableView:(CBService *)service {
    NSMutableArray *indexPaths = [[NSMutableArray alloc] init];
    int sect = -1;
    for (int i = 0; i < self.services.count; i++) {
        PeripheralInfo *info = [self.services objectAtIndex:i];
        if (info.serviceUUID == service.UUID) {
            sect = i;
        }
    }
    if (sect != -1) {
        PeripheralInfo *info = [self.services objectAtIndex:sect];
        for (int row = 0; row < service.characteristics.count; row++) {
            CBCharacteristic *c = service.characteristics[row];
            [info.characteristics addObject:c];
            NSIndexPath *indexPath = [NSIndexPath indexPathForRow:row inSection:sect];
            [indexPaths addObject:indexPath];
            NSLog(@"add indexpath in row:%d, sect:%d", row, sect);
        }
        PeripheralInfo *curInfo = [self.services objectAtIndex:sect];
        NSLog(@"%@", curInfo.characteristics);
        [self.tableView insertRowsAtIndexPaths:indexPaths withRowAnimation:UITableViewRowAnimationAutomatic];
    }
}

#pragma mark - 分组

- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView {
    return self.services.count;
}

- (CGFloat)tableView:(UITableView *)tableView heightForHeaderInSection:(NSInteger)section {
    return 61;
}

- (UIView *)tableView:(UITableView *)tableView viewForHeaderInSection:(NSInteger)section {

    PeripheralInfo *info = [self.services objectAtIndex:section];

    UIView *view = [[UIView alloc] initWithFrame:CGRectMake(0, 0, CGRectGetWidth(tableView.frame), 69)];
    view.backgroundColor = [UIColor systemGray6Color];

    UILabel *titleLabel = [[UILabel alloc] initWithFrame:CGRectMake(12, 4, CGRectGetWidth(view.frame) - 24, 24)];
    [view addSubview:titleLabel];
    titleLabel.textColor = [UIColor colorWithRed:51 / 255.0 green:51 / 255.0 blue:51 / 255.0 alpha:1.0];
    titleLabel.font = [UIFont systemFontOfSize:17];
    titleLabel.lineBreakMode = NSLineBreakByTruncatingTail;
    titleLabel.text = [NSString stringWithFormat:@"%@", info.serviceUUID];

    UILabel *subTitleLabel = [[UILabel alloc] initWithFrame:CGRectMake(12, CGRectGetMaxY(titleLabel.frame), CGRectGetWidth(view.frame) - 24, 21)];
    [view addSubview:subTitleLabel];
    subTitleLabel.textColor = [UIColor colorWithRed:153 / 255.0 green:153 / 255.0 blue:153 / 255.0 alpha:1.0];
    subTitleLabel.font = [UIFont systemFontOfSize:15];
    subTitleLabel.lineBreakMode = NSLineBreakByTruncatingMiddle;
    subTitleLabel.text = [NSString stringWithFormat:@"UUID: %@", info.serviceUUID.UUIDString];

    return view;
}

#pragma mark - UITableViewDataSource, UITableViewDelegate

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {

    EquipmentCell *cell = [EquipmentCell cellWithTableView:tableView];
    CBCharacteristic *characteristic = [[[self.services objectAtIndex:indexPath.section] characteristics] objectAtIndex:indexPath.row];
    [cell setObj:characteristic];

    return cell;
}

- (CGFloat)tableView:(UITableView *)tableView heightForRowAtIndexPath:(NSIndexPath *)indexPath {
    return 69;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    PeripheralInfo *info = [self.services objectAtIndex:section];
    return [info.characteristics count];
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    [tableView deselectRowAtIndexPath:indexPath animated:NO];

    PeripheralInfo *info = [self.services objectAtIndex:indexPath.section];

    CharacteristicVViewController *vc = [[CharacteristicVViewController alloc] init];
    vc.currPeripheral = self.currPeripheral;
    vc.characteristic = [[info characteristics] objectAtIndex:indexPath.row];
    vc.serviceUUID = info.serviceUUID;
    vc->baby = baby;
    vc.title = self.title;
    [self.navigationController pushViewController:vc animated:YES];
}

#pragma mark - action

- (void)rightAction {
    if (_connectState == 1) {
        [self.view makeToast:@"已连接"];
    } else {
        baby.having(self.currPeripheral).and.channel(channelOnPeropheralView).then.connectToPeripherals().discoverServices().discoverCharacteristics().readValueForCharacteristic().discoverDescriptorsForCharacteristic().readValueForDescriptors().begin();
    }
}

#pragma mark - 蓝牙配置和操作

- (void)babyDelegate {

    __weak typeof(self) weakSelf = self;
    BabyRhythm *rhythm = [[BabyRhythm alloc] init];

    //设置设备连接成功的委托,同一个baby对象，使用不同的channel切换委托回调
    [baby setBlockOnConnectedAtChannel:channelOnPeropheralView block:^(CBCentralManager *central, CBPeripheral *peripheral) {
        [weakSelf.view makeToast:@"连接成功"];
        [weakSelf UI_update_right:1];
        
        [weakSelf logToNotify:LogTypeConnet uuid:peripheral.name content:@"连接成功"];
    }];

    //设置设备连接失败的委托
    [baby setBlockOnFailToConnectAtChannel:channelOnPeropheralView block:^(CBCentralManager *central, CBPeripheral *peripheral, NSError *error) {
        [weakSelf.view makeToast:@"连接失败"];
        [weakSelf UI_update_right:2];
        
        [weakSelf logToNotify:LogTypeError uuid:peripheral.name content:@"连接失败"];
    }];

    //设置设备断开连接的委托
    [baby setBlockOnDisconnectAtChannel:channelOnPeropheralView block:^(CBCentralManager *central, CBPeripheral *peripheral, NSError *error) {
        [weakSelf.view makeToast:@"连接已断开"];
        [weakSelf UI_update_right:3];
        
        [weakSelf logToNotify:LogTypeError uuid:peripheral.name content:@"连接已断开"];
    }];

    //设置发现设备的Services的委托
    [baby setBlockOnDiscoverServicesAtChannel:channelOnPeropheralView block:^(CBPeripheral *peripheral, NSError *error) {
        for (CBService *s in peripheral.services) {
            ///插入section到tableview
            [weakSelf insertSectionToTableView:s];
        }
        [rhythm beats];
    }];
    //设置发现设service的Characteristics的委托
    [baby setBlockOnDiscoverCharacteristicsAtChannel:channelOnPeropheralView block:^(CBPeripheral *peripheral, CBService *service, NSError *error) {
        //插入row到tableview
        [weakSelf insertRowToTableView:service];

    }];
    //设置读取characteristics的委托
    [baby setBlockOnReadValueForCharacteristicAtChannel:channelOnPeropheralView block:^(CBPeripheral *peripheral, CBCharacteristic *characteristics, NSError *error) {
//        NSLog(@"characteristic name:%@ value is:%@",characteristics.UUID,characteristics.value);
    }];
    //设置发现characteristics的descriptors的委托
    [baby setBlockOnDiscoverDescriptorsForCharacteristicAtChannel:channelOnPeropheralView block:^(CBPeripheral *peripheral, CBCharacteristic *characteristic, NSError *error) {
//        NSLog(@"===characteristic name:%@",characteristic.service.UUID);
//        for (CBDescriptor *d in characteristic.descriptors) {
//            NSLog(@"CBDescriptor name is :%@",d.UUID);
//        }
    }];
    //设置读取Descriptor的委托
    [baby setBlockOnReadValueForDescriptorsAtChannel:channelOnPeropheralView block:^(CBPeripheral *peripheral, CBDescriptor *descriptor, NSError *error) {
//        NSLog(@"Descriptor name:%@ value is:%@",descriptor.characteristic.UUID, descriptor.value);
    }];

    //读取rssi的委托
    [baby setBlockOnDidReadRSSI:^(NSNumber *RSSI, NSError *error) {
//        NSLog(@"setBlockOnDidReadRSSI:RSSI:%@",RSSI);
    }];


    //设置beats break委托
    [rhythm setBlockOnBeatsBreak:^(BabyRhythm *bry) {
//        NSLog(@"setBlockOnBeatsBreak call");

        //如果完成任务，即可停止beat,返回bry可以省去使用weak rhythm的麻烦
//        if (<#condition#>) {
//            [bry beatsOver];
//        }

    }];

    //设置beats over委托
    [rhythm setBlockOnBeatsOver:^(BabyRhythm *bry) {
//        NSLog(@"setBlockOnBeatsOver call");
    }];

    //扫描选项->CBCentralManagerScanOptionAllowDuplicatesKey:忽略同一个Peripheral端的多个发现事件被聚合成一个发现事件
    NSDictionary *scanForPeripheralsWithOptions = @{CBCentralManagerScanOptionAllowDuplicatesKey: @YES};
    /*连接选项->
     CBConnectPeripheralOptionNotifyOnConnectionKey :当应用挂起时，如果有一个连接成功时，如果我们想要系统为指定的peripheral显示一个提示时，就使用这个key值。
     CBConnectPeripheralOptionNotifyOnDisconnectionKey :当应用挂起时，如果连接断开时，如果我们想要系统为指定的peripheral显示一个断开连接的提示时，就使用这个key值。
     CBConnectPeripheralOptionNotifyOnNotificationKey:
     当应用挂起时，使用该key值表示只要接收到给定peripheral端的通知就显示一个提
    */
    NSDictionary *connectOptions = @{CBConnectPeripheralOptionNotifyOnConnectionKey: @YES,
            CBConnectPeripheralOptionNotifyOnDisconnectionKey: @YES,
            CBConnectPeripheralOptionNotifyOnNotificationKey: @YES};

    [baby setBabyOptionsAtChannel:channelOnPeropheralView scanForPeripheralsWithOptions:scanForPeripheralsWithOptions connectPeripheralWithOptions:connectOptions scanForPeripheralsWithServices:nil discoverWithServices:nil discoverWithCharacteristics:nil];
}

- (void)logToNotify:(LogType)type uuid:(NSString *)uuid content:(NSString *)content {
    Log *l = [[Log alloc]init];
    l.type = type;
    l.uuid = uuid;
    l.content =content;
    
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeScanLog object:l];
}
@end
