//
//  BroadcastViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/30.
//

#import "BroadcastViewController.h"
#import "AdvertiserSettingViewController.h"
#import <CoreBluetooth/CoreBluetooth.h>
#import "LogsCell.h"

@interface BroadcastViewController ()<CBPeripheralManagerDelegate>

@property (nonatomic, strong) NSMutableArray *dataList;
@property (nonatomic, strong) UILabel *emtpyLabel;

@property(strong, nonatomic) IBOutlet UITableView *tableview;

@property(nonatomic, strong) CBPeripheralManager *peripheralManager;
@property(nonatomic, strong) CBMutableCharacteristic *characteristic;

// 扫描定时器
@property(nonatomic, strong) NSTimer *timer;

@end

@implementation BroadcastViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    [self DATA_init];
    [self UI_init];
    [self BLE_init];
    [self Notice_init];
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    // 定时器处理
    [self Timer_init];
}

- (void)dealloc {
    // 关闭外设广播

    // 关闭广播
    [[NSNotificationCenter defaultCenter] removeObserver:self];

    // 关闭定时器
    if (self.timer != nil) {
        [self.timer invalidate];
        self.timer = nil;
    }
}

#pragma mark - data

- (void)DATA_init {
    _logFormat = kLogFormat;
    _logSimplify = kLogSimplify;
    _logAutoRoll = kLogAutoRoll;
    _rspModel = kRspModel;
    _rspStep = kRspStep;
    
    _dataList = [NSMutableArray array];
}

- (void)DATA_insert:(Log *)log {
    [_dataList addObject: log];

    NSMutableArray *indexPaths = [[NSMutableArray alloc] init];
    NSIndexPath *indexPath = [NSIndexPath indexPathForRow:_dataList.count - 1 inSection:0];
    [indexPaths addObject:indexPath];
    [self.tableview insertRowsAtIndexPaths:indexPaths withRowAnimation:UITableViewRowAnimationAutomatic];
    [self UI_empty];
    
    [self UI_update_scrollToBottom];
}

#pragma mark - ui

- (void)UI_init {
    _emtpyLabel = [[UILabel alloc]initWithFrame:self.view.bounds];
    [self.view addSubview: _emtpyLabel];
    _emtpyLabel.center = CGPointMake(self.view.center.x, self.view.center.y*0.7);
    _emtpyLabel.text = @"等待设备接入……";
    _emtpyLabel.font = [UIFont systemFontOfSize:19];
    _emtpyLabel.textAlignment = NSTextAlignmentCenter;
    _emtpyLabel.textColor = [UIColor systemGray3Color];
}

- (void)UI_empty {
    _emtpyLabel.hidden = _dataList.count > 0 ? YES:NO;
}

- (void)UI_update_scrollToBottom {
    if(_dataList.count > 0 && _logAutoRoll){
        NSIndexPath *indexpath = [NSIndexPath indexPathForRow:_dataList.count-1 inSection:0];
        [self.tableView scrollToRowAtIndexPath:indexpath atScrollPosition:UITableViewScrollPositionBottom animated:NO];
    }
}

#pragma mark - ble

- (void)BLE_init {
    // 创建外设管理器，会回调peripheralManagerDidUpdateState方法
    self.peripheralManager = [[CBPeripheralManager alloc] initWithDelegate:self queue:dispatch_get_main_queue()];
}

#pragma mark - timer

- (void)Timer_init {
    if (self.timer != nil) {
        [self.timer invalidate];
        self.timer = nil;
    }

    if (_rspModel == 1) {
        if (_rspStep != 0) {
            self.timer = [NSTimer scheduledTimerWithTimeInterval:_rspStep target:self selector:@selector(timerNotice) userInfo:nil repeats:YES];
            [[NSRunLoop currentRunLoop] addTimer:self.timer forMode:NSRunLoopCommonModes];
        }
    }
}

- (void)timerNotice {
    [self bradcasting];
}

#pragma mark - 通知相关

- (void)Notice_init {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(Notice_event:) name:kNoticeBroadcast object:nil];
}

- (void)Notice_event:(NSNotification *)notification {
    switch ([notification.object[@"type"] intValue]) {
        case AdvertiserNotifyTypeLogFormat : {
            _logFormat = [notification.object[@"value"] boolValue];
//            NSLog(@"日志格式：%ld", (long) _logFormat);
            [self.tableView reloadData];
        }
            break;
        case AdvertiserNotifyTypeLogSimplify: {
            _logSimplify = [notification.object[@"value"] boolValue];
//            NSLog(@"日志简化：%ld", (long) _logSimplify);
            [self.tableView reloadData];
        }
            break;
        case AdvertiserNotifyTypeLogAutoRoll: {
            _logAutoRoll = [notification.object[@"value"] boolValue];
//            NSLog(@"滚动模式：%ld", (long) _logAutoRoll);
        }
            break;
        case AdvertiserNotifyTypeRspModel: {
            _rspModel = [notification.object[@"value"] boolValue];
            [self Timer_init];
        }
            break;
        case AdvertiserNotifyTypeRspStep: {
            _rspStep = [notification.object[@"value"] integerValue];
            [self Timer_init];
        }
            break;
        case AdvertiserNotifyTypeClear: {
            _dataList = [NSMutableArray array];
            [self.tableView reloadData];
            [self UI_empty];
        }
            break;
        case AdvertiserNotifyTypeState: {
            if ( self.peripheralManager.isAdvertising) {
                [self.peripheralManager stopAdvertising];
            }else{
                [self.peripheralManager startAdvertising:@{CBAdvertisementDataServiceUUIDsKey: @[[CBUUID UUIDWithString:_param[@"uuid1"]]]}];
            }
        }
            break;
        default:
            break;
    }
}

#pragma mark - action

- (IBAction)settingActoin:(id)sender {
    [self performSegueWithIdentifier:@"toAdSet" sender:self];
}

- (IBAction)shareAction:(id)sender {
    NSMutableString *mString = [NSMutableString stringWithString:@"["];
    for (int i = 0; i < _dataList.count; i++) {
        Log *l = _dataList[i];
        [mString appendString: l.desc ];
        if (i != _dataList.count-1) {
            [mString appendString:@","];
        }
    }
    [mString appendString: @"]" ];
    [UIPasteboard generalPasteboard].string = mString;
    [self.view makeToast:@"已拷贝到粘贴板"];
}

#pragma mark - prepare segue

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {

    [super prepareForSegue:segue sender:sender];
    if ([segue.identifier isEqualToString:@"toAdSet"]) {
        AdvertiserSettingViewController *vc = segue.destinationViewController;
        vc.logFormat = _logFormat;
        vc.logSimplify = _logSimplify;
        vc.logAutoRoll = _logAutoRoll;
        vc.rspModel = _rspModel;
        vc.rspStep = _rspStep;

        vc.state = !self.peripheralManager.isAdvertising;
    }
}

#pragma mark - UITableViewDataSource, UITableViewDelegate

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {

    LogsCell *cell = [LogsCell cellWithTableView:tableView];

    Log *pObj = [_dataList objectAtIndex: indexPath.row];
    [cell setObj:pObj format:!_logFormat simplify:_logSimplify];

    return cell;
}

- (CGFloat)tableView:(UITableView *)tableView heightForRowAtIndexPath:(NSIndexPath *)indexPath {
    return 48;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    return _dataList != nil ? _dataList.count : 0;
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    [tableView deselectRowAtIndexPath:indexPath animated:NO];
    
    Log *l = _dataList[indexPath.row];
    [UIPasteboard generalPasteboard].string = l.desc;
    [self.view makeToast:@"已拷贝该行到粘贴板"];
}


#pragma mark - 蓝牙

/** 创建服务和特征 */
- (void)setupServiceAndCharacteristics {
    // 创建服务
    CBUUID *serviceID = [CBUUID UUIDWithString:_param[@"uuid1"]];
    CBMutableService *service = [[CBMutableService alloc] initWithType:serviceID primary:YES];
    // 创建服务中的特征
    CBUUID *characteristicID = [CBUUID UUIDWithString:_param[@"uuid2"]];
    CBMutableCharacteristic *characteristic = [
            [CBMutableCharacteristic alloc]
            initWithType:characteristicID
              properties:
                      CBCharacteristicPropertyRead |
                              CBCharacteristicPropertyWrite |
                              CBCharacteristicPropertyNotify
                   value:nil
             permissions:CBAttributePermissionsReadable |
                     CBAttributePermissionsWriteable
    ];
    // 特征添加进服务
    service.characteristics = @[characteristic];
    // 服务加入管理
    [self.peripheralManager addService:service];

    // 为了手动给中心设备发送数据
    self.characteristic = characteristic;
}

- (void)peripheralManagerDidUpdateState:(CBPeripheralManager *)peripheral {

    switch (peripheral.state) {
        case CBManagerStatePoweredOn://开启
        {
            // 创建Service（服务）和Characteristics（特征）
            [self setupServiceAndCharacteristics];
            // 根据服务的UUID开始广播
            [self.peripheralManager startAdvertising:@{CBAdvertisementDataServiceUUIDsKey: @[[CBUUID UUIDWithString:_param[@"uuid1"]]]}];
        }
            break;
        case CBManagerStateResetting://重置中
            [self.view makeToast:@"手机蓝牙已断开连接，重置中..."];
            break;
        case CBManagerStateUnsupported://不支持
            [self.view makeToast:@"手机不支持蓝牙功能，请更换手机。"];
            break;
        case CBManagerStateUnauthorized://未授权
        {
            UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"授权使用蓝牙" message:@"用于搜索、连接和监听蓝牙事件" preferredStyle:UIAlertControllerStyleAlert];
            UIAlertAction *action1 = [UIAlertAction actionWithTitle:@"拒绝" style:UIAlertActionStyleDestructive handler:^(UIAlertAction *_Nonnull action) {
                //取消处理
                [self.view makeToast:@"功能受限，请开启蓝牙授权。"];
            }];

            UIAlertAction *action2 = [UIAlertAction actionWithTitle:@"授权" style:UIAlertActionStyleDefault handler:^(UIAlertAction *_Nonnull action) {
                // 跳转app设置
                [[UIApplication sharedApplication] openURL:[NSURL URLWithString:UIApplicationOpenSettingsURLString] options:@{} completionHandler:nil];
            }];

            [alert addAction:action1];
            [alert addAction:action2];
            [self.navigationController presentViewController:alert animated:YES completion:nil];
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
            [self.view makeToast:@"手机没有识别到蓝牙，请检查手机。"];
            break;
    }
}

/** 中心设备读取数据的时候回调 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral didReceiveReadRequest:(CBATTRequest *)request {
    NSLog(@"-----  中心设备读取数据的时候回调 %d", peripheral.isAdvertising);
    // 请求中的数据，这里把文本框中的数据发给中心设备
    request.value = [Tool strToDataWithString:_param[@"data"]];
    // 成功响应请求
    [peripheral respondToRequest:request withResult:CBATTErrorSuccess];
    
    Log *log = [[Log alloc] init];
    log.date = [NSDate date];
    log.type = LogTypeRead;
    log.uuid = request.characteristic.UUID.UUIDString;
    log.content = [Tool convertDataToHexStr:request.value] ;
    [self DATA_insert:log];
}

/** 中心设备写入数据的时候回调 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral didReceiveWriteRequests:(NSArray<CBATTRequest *> *)requests {
    // 写入数据的请求
    CBATTRequest *request = requests.lastObject;
    NSLog(@"中心设备写入数据的时候回调:---%@", request.value);

    Log *log = [[Log alloc] init];
    log.date = [NSDate date];
    log.type = LogTypeReceive;
    log.uuid = request.characteristic.UUID.UUIDString;
    log.content = [Tool convertDataToHexStr:request.value] ;
//    [_dataList addObject:log];
    [self DATA_insert:log];

    // 写入什么返回什么
    [peripheral respondToRequest:request withResult:CBATTErrorSuccess];

    log.type = LogTypeWrite;
    log.uuid = request.characteristic.UUID.UUIDString;
    log.content = [Tool convertDataToHexStr:request.value] ;
//    [_dataList addObject:log];
    [self DATA_insert:log];

    // 如果是响应模式，那就换这边处理
    if (_rspModel == 0) {
        NSLog(@"广播回应");
        [self bradcasting];
    }
}

/** 通过固定的特征发送数据到中心设备 */
- (void)bradcasting {
    BOOL sendSuccess = [self.peripheralManager updateValue:[Tool strToDataWithString:_param[@"notice"]] forCharacteristic:self.characteristic onSubscribedCentrals:nil];

    Log *log = [[Log alloc] init];
    log.date = [NSDate date];
    log.uuid = self.characteristic.UUID.UUIDString;
    if (!sendSuccess) {
        [self.view makeToast:@"数据发送失败"];
        log.type = LogTypeError;
        log.content = @"数据发送失败";
    } else {
        log.type = LogTypeNotify;
        log.content = _param[@"notice"];
    }
//    [_dataList addObject: log ];
    [self DATA_insert:log];
}

/** 订阅成功回调 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral central:(CBCentral *)central didSubscribeToCharacteristic:(CBCharacteristic *)characteristic {
    NSLog(@"订阅成功回调: %s", __FUNCTION__);
}

@end
