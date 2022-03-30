//
//  ScannerViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/19.
//

#import "ScannerViewController.h"
#import "ScannerCell.h"
#import "EquipmentViewController.h"
#import <QRCodeUIKit/QRCodeUIKit.h>

@interface ScannerViewController () <QuickQRCodeScanResultHandler> {
    NSMutableArray *_dataList;
    BabyBluetooth *baby;
}

@property(weak, nonatomic) IBOutlet UIBarButtonItem *refreshButton;
@property(strong, nonatomic) IBOutlet UITableView *tableview;
@property(strong, nonatomic) WaveView *waveView;

@end

@implementation ScannerViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    [self DATA_init];
    [self UI_init];
    [self BLE_init];
    [self UI_update_wave];
    [self Notice_init];
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    [self BLE_restart];
    // 如果没连接才执行
    [_waveView startAnimate];
}

#pragma makr - init

- (void)DATA_init {
    _dataList = [NSMutableArray array];

    // 初始化 过滤条件
    _filterName = kGetUserDefaults(kFilterNameKey);
    _filterUuid = kGetUserDefaults(kFilterUUIDKey);
    _filterRssi = [kGetUserDefaults(kFilterRSSIKey) integerValue];
    _filterEmpty = [kGetUserDefaults(kFilterEmptyKey) boolValue];
}

- (void)UI_init {
    // 添加无数据时加载图
    _waveView = [[WaveView alloc] initWithFrame:self.view.bounds];
    [self.view addSubview:_waveView];

    // 增加下拉刷新
    MJRefreshNormalHeader *header = [MJRefreshNormalHeader headerWithRefreshingTarget:self refreshingAction:@selector(UI_update_refreshing)];
    header.automaticallyChangeAlpha = YES;
    header.lastUpdatedTimeLabel.hidden = YES;
    self.tableView.mj_header = header;
}

- (void)BLE_init {
    baby = [BabyBluetooth shareBabyBluetooth];
    [self babyDelegate];
}

#pragma mark - data update

- (void)DATA_insert:(CBPeripheral *)peripheral advertisementData:(NSDictionary *)advertisementData RSSI:(NSNumber *)RSSI {

    // 过滤条件
    if (_filterUuid.length > 0 && ![peripheral.identifier.UUIDString containsString:_filterUuid]) {
        return;
    }

    // 监测是否在数组里
    NSInteger index = -1;
    NSString *uuid = peripheral.identifier.UUIDString;

    for (NSInteger idx = 0; idx < _dataList.count; idx++) {
        CBPeripheral *p = (CBPeripheral *) _dataList[(NSUInteger) idx][@"peripheral"];
        if ([p.identifier.UUIDString isEqualToString:uuid]) {
            index = idx;
            break;
        }
    }

    NSDictionary *object = @{
            @"peripheral": peripheral,
            @"advertisementData": advertisementData,
            @"RSSI": RSSI
    };

    NSMutableArray *indexPaths = [[NSMutableArray alloc] init];
    if (index < 0) {
        [_dataList addObject:object];

        NSIndexPath *indexPath = [NSIndexPath indexPathForRow:_dataList.count - 1 inSection:0];
        [indexPaths addObject:indexPath];
        [self.tableView insertRowsAtIndexPaths:indexPaths withRowAnimation:UITableViewRowAnimationAutomatic];

    } else {
        _dataList[(NSUInteger) index] = object;

        NSIndexPath *indexPath = [NSIndexPath indexPathForRow:index inSection:0];
        [indexPaths addObject:indexPath];
        [self.tableView reloadRowsAtIndexPaths:indexPaths withRowAnimation:UITableViewRowAnimationAutomatic];
    }
    [self UI_update_wave];

//    不考虑效果，可以直接全部重加载
//    [self.tableView reloadData];
}

#pragma mark - ui update

- (void)UI_update_wave {
    _waveView.hidden = _dataList.count > 0 ? YES : NO;
}

- (void)UI_update_empty {
    _dataList = [NSMutableArray array];
    [self.tableView reloadData];
    [self UI_update_wave];
}

- (void)UI_update_refreshing {
    [self UI_update_empty];
    [self BLE_restart];
}

- (void)UI_update_endRefreshing {
    UIImage *img = [UIImage systemImageNamed:@"arrow.clockwise"];
    self.refreshButton.image = img;

    [self.tableView.mj_header endRefreshing];
}

#pragma mark - ble start

- (void)BLE_restart {
    [baby cancelAllPeripheralsConnection];
    baby.scanForPeripherals().begin();
}

#pragma mark - Action

- (IBAction)scanAction:(id)sender {
    QuickQRCodeScanController *scanVC = [QuickQRCodeScanController new];
    scanVC.hidesBottomBarWhenPushed = YES; // 隐藏tabbar -- 重点: 要push的viewcontroller
    [self.navigationController pushViewController:scanVC animated:YES];
    scanVC.resultHandler = self;
}

- (IBAction)refreshAction:(id)sender {
    if (![self.tableView.mj_header isRefreshing]) {
        UIImage *img = [UIImage systemImageNamed:@"rays"];
        self.refreshButton.image = img;

        [self.tableView.mj_header beginRefreshing];
    }
}

#pragma mark - UITableViewDataSource, UITableViewDelegate

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {

    ScannerCell *cell = [ScannerCell cellWithTableView:tableView];
    NSDictionary *pObj = _dataList[(NSUInteger) indexPath.row];
    [cell setObj:pObj];

    return cell;
}

- (CGFloat)tableView:(UITableView *)tableView heightForRowAtIndexPath:(NSIndexPath *)indexPath {
    return 102;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    return _dataList != nil ? _dataList.count : 0;
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    [tableView deselectRowAtIndexPath:indexPath animated:NO];

    [baby cancelScan];

    NSDictionary *dic = _dataList[(NSUInteger) indexPath.row];
    CBPeripheral *peripheral = dic[@"peripheral"];
    [self toEquipmentViewController:peripheral];
}

#pragma mark - 蓝牙配置和操作

- (void)babyDelegate {
    __weak typeof(self) weakSelf = self;
    // 蓝牙权限
    [baby setBlockOnCentralManagerDidUpdateState:^(CBCentralManager *central) {
        switch (central.state) {
            case CBManagerStatePoweredOn://开启
                // ... 执行相关操作
                break;
            case CBManagerStateResetting://重置中
                [weakSelf.view makeToast:@"手机蓝牙已断开连接，重置中..."];
                break;
            case CBManagerStateUnsupported://不支持
                [weakSelf.view makeToast:@"手机不支持蓝牙功能，请更换手机。"];
                break;
            case CBManagerStateUnauthorized://未授权
            {
                UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"授权使用蓝牙" message:@"用于搜索、连接和监听蓝牙事件" preferredStyle:UIAlertControllerStyleAlert];
                UIAlertAction *action1 = [UIAlertAction actionWithTitle:@"拒绝" style:UIAlertActionStyleDestructive handler:^(UIAlertAction *_Nonnull action) {
                    //取消处理
                    [weakSelf.view makeToast:@"功能受限，请开启蓝牙授权。"];
                }];

                UIAlertAction *action2 = [UIAlertAction actionWithTitle:@"授权" style:UIAlertActionStyleDefault handler:^(UIAlertAction *_Nonnull action) {
                    // 跳转app设置
                    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:UIApplicationOpenSettingsURLString] options:@{} completionHandler:nil];
                }];

                [alert addAction:action1];
                [alert addAction:action2];
                [weakSelf.navigationController presentViewController:alert animated:YES completion:nil];
            }
                break;
            case CBManagerStatePoweredOff://未开启
            {
                // 实际上不会进来，默认已操作
                NSURL *url = [NSURL URLWithString:@"prefs:root=Bluetooth"];
                [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
            }
                break;
            default:
                [weakSelf.view makeToast:@"手机没有识别到蓝牙，请检查手机。"];
                break;
        }
    }];
    // 设置扫描到设备的委托
    [baby setBlockOnDiscoverToPeripherals:^(CBCentralManager *central, CBPeripheral *peripheral, NSDictionary *advertisementData, NSNumber *RSSI) {

//        NSLog(@"peripheral: %@", peripheral);
//        NSLog(@"advertisementData: %@", advertisementData);

        [weakSelf DATA_insert:peripheral advertisementData:advertisementData RSSI:RSSI];
        [weakSelf UI_update_endRefreshing];
    }];

    //设置查找设备的过滤器
    [baby setFilterOnDiscoverPeripherals:^BOOL(NSString *peripheralName, NSDictionary *advertisementData, NSNumber *RSSI) {

        // 空名 过滤
        if (weakSelf.filterEmpty && peripheralName.length == 0) {
            return NO;
        }
        // 名称前缀 过滤
        if (weakSelf.filterName.length > 0 && ![peripheralName hasPrefix:weakSelf.filterName]) {
            return NO;
        }
        // UUID 过滤 - 放置到添加中
        // RSSI 过滤
        if ([RSSI integerValue] - weakSelf.filterRssi < 0) {
            return NO;
        }
        return YES;
    }];


    //设置发现设service的Characteristics的委托
    [baby setBlockOnDiscoverCharacteristics:^(CBPeripheral *peripheral, CBService *service, NSError *error) {
        NSLog(@"1 ===service name:%@", service.UUID);
        for (CBCharacteristic *c in service.characteristics) {
            NSLog(@"1 charateristic name is :%@", c.UUID);
        }
    }];
    //设置读取characteristics的委托
    [baby setBlockOnReadValueForCharacteristic:^(CBPeripheral *peripheral, CBCharacteristic *characteristics, NSError *error) {
        NSLog(@"1 characteristic name:%@ value is:%@", characteristics.UUID, characteristics.value);
    }];
    //设置发现characteristics的descriptors的委托
    [baby setBlockOnDiscoverDescriptorsForCharacteristic:^(CBPeripheral *peripheral, CBCharacteristic *characteristic, NSError *error) {
        NSLog(@"1 ===characteristic name:%@", characteristic.service.UUID);
        for (CBDescriptor *d in characteristic.descriptors) {
            NSLog(@"1 CBDescriptor name is :%@", d.UUID);
        }
    }];
    //设置读取Descriptor的委托
    [baby setBlockOnReadValueForDescriptors:^(CBPeripheral *peripheral, CBDescriptor *descriptor, NSError *error) {
        NSLog(@"1 Descriptor name:%@ value is:%@", descriptor.characteristic.UUID, descriptor.value);
    }];

    [baby setBlockOnCancelAllPeripheralsConnectionBlock:^(CBCentralManager *centralManager) {
        NSLog(@"1 setBlockOnCancelAllPeripheralsConnectionBlock");
    }];

    [baby setBlockOnCancelScanBlock:^(CBCentralManager *centralManager) {
        NSLog(@"1 setBlockOnCancelScanBlock");
    }];

//    NSDictionary *scanForPeripheralsWithOptions = @{CBCentralManagerScanOptionAllowDuplicatesKey:@YES};
//    //连接设备->
//    [baby setBabyOptionsWithScanForPeripheralsWithOptions:scanForPeripheralsWithOptions connectPeripheralWithOptions:nil scanForPeripheralsWithServices:nil discoverWithServices:nil discoverWithCharacteristics:nil];
}

#pragma mark - 通知相关

- (void)Notice_init {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(Notice_scanRefresh:) name:kNoticeScanRefresh object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(Notice_scanFilter:) name:kNoticeScanFilter object:nil];
}

- (void)Notice_scanRefresh:(NSNotification *)notification {
    [self UI_update_empty];
    [self BLE_restart];
}

- (void)Notice_scanFilter:(NSNotification *)notification {

    _filterName = [NSString stringWithFormat:@"%@", notification.object[@"name"]];
    _filterUuid = [NSString stringWithFormat:@"%@", notification.object[@"uuid"]];
    _filterRssi = [notification.object[@"rssi"] integerValue];
    _filterEmpty = [notification.object[@"empty"] boolValue];

    [self UI_update_refreshing];
}

#pragma mark - QuickQRCodeScanController

- (BOOL)handleResult:(NSString *)text withQRCodeScanController:(QuickQRCodeScanController *)scanVC {

    NSArray *msgs = [text componentsSeparatedByString:@";"];
    if (![@"LightBLE" isEqualToString:msgs[0]] || msgs.count < 3) {
        return NO;
    }

    // 需要从列表里面去获取~~~
    CBPeripheral *peripheral;
    for (NSDictionary *dic in _dataList) {
        CBPeripheral *peer = dic[@"peripheral"];
        if ( [peer.identifier.UUIDString isEqualToString:msgs[1]] ) {
            peripheral = peer;
            break;
        }
    }
    if ( peripheral == nil ) {
        [self.navigationController popViewControllerAnimated:YES];
        [self.view makeToast:@"设备不在连接范围内"];
        return YES;
    }
    
    // 通过 setValue: forKey: 赋值 readonly  --- 会报错，先忽略
//    NSUUID *uuid = [[NSUUID new] initWithUUIDString:msgs[1]];
//    CBPeripheral *peripheral = [CBPeripheral new];
//    [peripheral setValue:msgs[2] forKey:NSStringFromSelector(@selector(name))];
//    [peripheral setValue:uuid forKey:NSStringFromSelector(@selector(identifier))];

    [self performSelector:@selector(toEquipmentViewController:) withObject:peripheral afterDelay:0.3];
    [self.navigationController popViewControllerAnimated:YES];

    return YES;
}

- (void)toEquipmentViewController:(CBPeripheral *)peripheral {
    EquipmentViewController *vc = [[EquipmentViewController alloc] init];
    vc->baby = self->baby;
    vc.currPeripheral = peripheral;
    [self.navigationController pushViewController:vc animated:YES];
}

@end
