//
//  CharacteristicVViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import "CharacteristicVViewController.h"
#import "SkSwitch.h"
#import "PeripheralInfo.h"
#import "FSTextView.h"

#define channelOnCharacteristicView @"CharacteristicView"

@interface CharacteristicVViewController () {
    FSTextView *_textView[3];
}
@property(nonatomic, strong) UIScrollView *scrollView;
@property(nonatomic, strong) SkSwitch *onOffSwitch;
@property(nonatomic, strong) UIButton *clearButton;
@end

@implementation CharacteristicVViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [self DATA_init];
    [self UI_init];
    [self BLE_init];
}

- (void)dealloc {
    if(self.characteristic.isNotifying) {
        [baby cancelNotify:self.currPeripheral characteristic:self.characteristic];
    }
}

#pragma mark - ui

- (void)UI_init {
    [self UI_nav];

    self.view.backgroundColor = [UIColor systemGray6Color];
    _scrollView = [[UIScrollView alloc] initWithFrame:self.view.bounds];
    [self.view addSubview:_scrollView];


    CGFloat y = 0;
    UIView *view = [self titleView:[NSString stringWithFormat:@"%@", _serviceUUID] subTitle:[NSString stringWithFormat:@"UUID:%@", _serviceUUID.UUIDString] y:y];
    [_scrollView addSubview:view];

    y = CGRectGetMaxY(view.frame);

    view = [self titleView:[NSString stringWithFormat:@"%@", _characteristic.UUID] subTitle:[Tool CBCharacteristicPropertyToString:_characteristic.properties] y:y];
    [_scrollView addSubview:view];

    CBCharacteristicProperties p = _characteristic.properties;


    // Read 检测
    if ([@[@2, @18, @138, @152] containsObject:@(p)]) {
        y = CGRectGetMaxY(view.frame) + 12;
        view = [self readView:y];
        [_scrollView addSubview:view];
    }

    // write 检测
    if ([@[@8, @136, @138] containsObject:@(p)]) {
        y = CGRectGetMaxY(view.frame) + 12;
        view = [self writeView:y];
        [_scrollView addSubview:view];
    }

    // notice 检测 -- 放最后，扩大区域
    if ([@[@16, @18, @152] containsObject:@(p)]) {
        y = CGRectGetMaxY(view.frame);
        view = [self noticeView:y];
        [_scrollView addSubview:view];
    }
    
    _scrollView.contentSize = CGSizeMake(CGRectGetWidth(_scrollView.frame), CGRectGetMaxY(view.frame) + 12);

}

- (void)UI_nav {
    self.view.backgroundColor = [UIColor systemGray6Color];
//    self.title = @"title";
}

- (UIView *)titleView:(NSString *)title subTitle:(NSString *)subTitle y:(CGFloat)y {

    CGFloat width = CGRectGetWidth(self.view.frame);

    UIView *view = [[UIView alloc] initWithFrame:CGRectMake(0, y, width, 69)];
    view.backgroundColor = [UIColor systemGray6Color];

    width = CGRectGetWidth(view.frame);
    UILabel *titleLabel = [[UILabel alloc] initWithFrame:CGRectMake(12, 12, width - 24, 24)];
    [view addSubview:titleLabel];
    titleLabel.text = title;
    titleLabel.font = [UIFont systemFontOfSize:17];
    titleLabel.textColor = [UIColor colorWithRed:51 / 255.0 green:51 / 255.0 blue:51 / 255.0 alpha:1.0];

    UILabel *subTitleLabel = [[UILabel alloc] initWithFrame:CGRectMake(12, CGRectGetMaxY(titleLabel.frame), width - 24, 21)];
    [view addSubview:subTitleLabel];
    subTitleLabel.text = subTitle;
    subTitleLabel.font = [UIFont systemFontOfSize:15];
    subTitleLabel.textColor = [UIColor colorWithRed:153 / 255.0 green:153 / 255.0 blue:153 / 255.0 alpha:1.0];

    return view;
}

- (UIView *)noticeView:(CGFloat)y {
    CGFloat width = CGRectGetWidth(self.view.frame);

    UIView *view = [[UIView alloc] initWithFrame:CGRectMake(0, y, width, 229)];
    view.backgroundColor = [UIColor systemBackgroundColor];

    width = CGRectGetWidth(view.frame);


    UIView *topView = [[UIView alloc] initWithFrame:CGRectMake(0, 0, width, 48)];
    [view addSubview:topView];
    topView.backgroundColor = [UIColor systemBackgroundColor];

    UILabel *titleLabel = [[UILabel alloc] initWithFrame:CGRectMake(12, 0, width - 24, CGRectGetHeight(topView.frame))];
    [view addSubview:titleLabel];
    titleLabel.text = @"通知";
    titleLabel.font = [UIFont systemFontOfSize:17];
    titleLabel.textColor = [UIColor colorWithRed:51 / 255.0 green:51 / 255.0 blue:51 / 255.0 alpha:1.0];

    UIColor *color = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    UIButton *btn = [[UIButton alloc] initWithFrame:CGRectMake(width - 72 - 12, (CGRectGetHeight(topView.frame) - 27) * 0.5, 72, 27)];
    [topView addSubview:btn];
    [btn setBackgroundColor:[UIColor clearColor]];
    btn.titleLabel.font = [UIFont systemFontOfSize:12];
    btn.layer.cornerRadius = 13;
    [btn.layer setBorderWidth:1.0];
    btn.layer.borderColor = color.CGColor;
    [btn setTitle:@"监听" forState:UIControlStateNormal];
    [btn setTitleColor:color forState:UIControlStateNormal];
    [btn addTarget:self action:@selector(btnNoticeAction:) forControlEvents:UIControlEventTouchUpInside];

    UIView *vLine = [[UIView alloc] initWithFrame:CGRectMake(0, CGRectGetMaxY(topView.frame), CGRectGetWidth(view.frame), 1)];
    [view addSubview:vLine];
    vLine.backgroundColor = self.view.backgroundColor;

    UIView *bottomView = [[UIView alloc] initWithFrame:CGRectMake(0, CGRectGetMaxY(vLine.frame), CGRectGetWidth(view.frame), 180)];
    [view addSubview:bottomView];
    bottomView.backgroundColor = [UIColor systemBackgroundColor];

    // 通过 UITextView 来达到自动换行的目的，减少操作
    FSTextView *textView = [[FSTextView alloc] initWithFrame:CGRectMake(12, 12, CGRectGetWidth(bottomView.frame) - 24, CGRectGetHeight(bottomView.frame) - 24)];
    [bottomView addSubview:textView];
    textView.backgroundColor = [UIColor clearColor];
    textView.editable = NO;
//    textView.textColor = [UIColor colorWithRed:204 / 255.0 green:204 / 255.0 blue:204 / 255.0 alpha:1.0];
    textView.font = [UIFont systemFontOfSize:17];
//    textView.text = @"测验\t\n测验";
    textView.placeholder = @"读取中……";

    _textView[0] = textView;

    
    UIButton *clearButton = [[UIButton alloc]initWithFrame: CGRectMake( CGRectGetWidth(bottomView.frame)-80, 12, 68, 32)];
    [bottomView addSubview: clearButton];
    clearButton.backgroundColor = [UIColor clearColor];
    [clearButton setTitle:@"clear" forState:UIControlStateNormal];
    [clearButton setTitleColor:color forState:UIControlStateNormal];
    [clearButton addTarget:self action:@selector(clearAction:) forControlEvents:UIControlEventTouchUpInside];
    clearButton.hidden = YES;
    _clearButton = clearButton;
    
    return view;
}

- (UIView *)readView:(CGFloat)y {
    CGFloat width = CGRectGetWidth(self.view.frame);

    UIView *view = [[UIView alloc] initWithFrame:CGRectMake(0, y, width, 169)];
    view.backgroundColor = [UIColor systemBackgroundColor];;

    width = CGRectGetWidth(view.frame);


    UIView *topView = [[UIView alloc] initWithFrame:CGRectMake(0, 0, width, 48)];
    [view addSubview:topView];
    topView.backgroundColor = [UIColor systemBackgroundColor];;

    UILabel *titleLabel = [[UILabel alloc] initWithFrame:CGRectMake(12, 0, width - 24, CGRectGetHeight(topView.frame))];
    [view addSubview:titleLabel];
    titleLabel.text = @"读取";
    titleLabel.font = [UIFont systemFontOfSize:17];
    titleLabel.textColor = [UIColor colorWithRed:51 / 255.0 green:51 / 255.0 blue:51 / 255.0 alpha:1.0];

    UIColor *color = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    UIButton *btn = [[UIButton alloc] initWithFrame:CGRectMake(width - 72 - 12, (CGRectGetHeight(topView.frame) - 27) * 0.5, 72, 27)];
    [topView addSubview:btn];
    [btn setBackgroundColor:[UIColor clearColor]];
    btn.titleLabel.font = [UIFont systemFontOfSize:12];
    btn.layer.cornerRadius = 13;
    [btn.layer setBorderWidth:1.0];
    btn.layer.borderColor = color.CGColor;
    [btn setTitle:@"读取" forState:UIControlStateNormal];
    [btn setTitleColor:color forState:UIControlStateNormal];
    [btn addTarget:self action:@selector(btnReadAction:) forControlEvents:UIControlEventTouchUpInside];
    // todo: 当前没效果，先过滤
    btn.hidden = YES;

    UIView *vLine = [[UIView alloc] initWithFrame:CGRectMake(0, CGRectGetMaxY(topView.frame), CGRectGetWidth(view.frame), 1)];
    [view addSubview:vLine];
    vLine.backgroundColor = self.view.backgroundColor;

    UIView *bottomView = [[UIView alloc] initWithFrame:CGRectMake(0, CGRectGetMaxY(vLine.frame), CGRectGetWidth(view.frame), 120)];
    [view addSubview:bottomView];
    bottomView.backgroundColor = [UIColor systemBackgroundColor];;

    // 通过 UITextView 来达到自动换行的目的，减少操作
    FSTextView *textView = [[FSTextView alloc] initWithFrame:CGRectMake(12, 12, CGRectGetWidth(bottomView.frame) - 24, CGRectGetHeight(bottomView.frame) - 24)];
    [bottomView addSubview:textView];
    textView.editable = NO;
//    textView.textColor = [UIColor colorWithRed:204 / 255.0 green:204 / 255.0 blue:204 / 255.0 alpha:1.0];
    textView.font = [UIFont systemFontOfSize:17];
    textView.placeholder = @"读取中……";

    _textView[1] = textView;

    return view;
}

- (UIView *)writeView:(CGFloat)y {
    CGFloat width = CGRectGetWidth(self.view.frame);

    UIView *view = [[UIView alloc] initWithFrame:CGRectMake(0, y, width, 169)];
    view.backgroundColor = [UIColor systemBackgroundColor];;

    width = CGRectGetWidth(view.frame);


    UIView *topView = [[UIView alloc] initWithFrame:CGRectMake(0, 0, width, 48)];
    [view addSubview:topView];
    topView.backgroundColor = [UIColor systemBackgroundColor];;

    UILabel *titleLabel = [[UILabel alloc] initWithFrame:CGRectMake(12, 0, width - 24, CGRectGetHeight(topView.frame))];
    [view addSubview:titleLabel];
    titleLabel.text = @"写入";
    titleLabel.font = [UIFont systemFontOfSize:17];
    titleLabel.textColor = [UIColor colorWithRed:51 / 255.0 green:51 / 255.0 blue:51 / 255.0 alpha:1.0];

    UIColor *color = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    UIButton *btn = [[UIButton alloc] initWithFrame:CGRectMake(width - 72 - 12, (CGRectGetHeight(topView.frame) - 27) * 0.5, 72, 27)];
    [topView addSubview:btn];
    [btn setBackgroundColor:[UIColor clearColor]];
    btn.titleLabel.font = [UIFont systemFontOfSize:12];
    btn.layer.cornerRadius = 13;
    [btn.layer setBorderWidth:1.0];
    btn.layer.borderColor = color.CGColor;
    [btn setTitle:@"写入" forState:UIControlStateNormal];
    [btn setTitleColor:color forState:UIControlStateNormal];
    [btn addTarget:self action:@selector(btnWriteAction:) forControlEvents:UIControlEventTouchUpInside];

    _onOffSwitch = [[SkSwitch alloc] initWithFrame:CGRectMake(CGRectGetWidth(view.frame) - 164, 8.5, 70, 31)];
    [view addSubview:_onOffSwitch];
    [_onOffSwitch addTarget:self action:@selector(switched:) forControlEvents:UIControlEventValueChanged];
    _onOffSwitch.tintColor = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    _onOffSwitch.onTintColor = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    _onOffSwitch.style = SkSwitchStyleBorder;
    _onOffSwitch.onText = @"HEX";
    _onOffSwitch.offText = @"ASCII";

    UIView *vLine = [[UIView alloc] initWithFrame:CGRectMake(0, CGRectGetMaxY(topView.frame), CGRectGetWidth(view.frame), 1)];
    [view addSubview:vLine];
    vLine.backgroundColor = self.view.backgroundColor;

    UIView *bottomView = [[UIView alloc] initWithFrame:CGRectMake(0, CGRectGetMaxY(vLine.frame), CGRectGetWidth(view.frame), 120)];
    [view addSubview:bottomView];
    bottomView.backgroundColor = [UIColor systemBackgroundColor];;

    // 通过 UITextView 来达到自动换行的目的，减少操作
    FSTextView *textView = [[FSTextView alloc] initWithFrame:CGRectMake(12, 12, CGRectGetWidth(bottomView.frame) - 24, CGRectGetHeight(bottomView.frame) - 24)];
    [bottomView addSubview:textView];
//    textView.editable = NO;
    textView.textColor = [UIColor colorWithRed:204 / 255.0 green:204 / 255.0 blue:204 / 255.0 alpha:1.0];
    textView.font = [UIFont systemFontOfSize:17];
    
    _textView[2] = textView;
    [self UI_update_writePlaceholder];

    return view;
}

- (void)UI_update_writePlaceholder {
    _textView[2].placeholder = _onOffSwitch.on ? @"请输入要发送的字符串":@"请输入十六进制，例：FF01";
}

- (void)UI_back {
    [self.navigationController popViewControllerAnimated:YES];
}

- (void)insertReadText:(CBCharacteristic *)characteristics {
    NSString *str  = [[NSString alloc] initWithData:characteristics.value encoding:NSUTF8StringEncoding];
    _textView[1].text = [NSString stringWithFormat:@"String: %@\n\nHEX: %@", str, [Tool hexStringFromString:str] ];
}

- (void)insertNotifyText:(CBCharacteristic *)characteristics {
    NSString *str  = [[NSString alloc] initWithData:characteristics.value encoding:NSUTF8StringEncoding];
    _textView[0].text = [NSString stringWithFormat:@"%@String: %@\nHEX: %@\n\n", _textView[0].text, str, [Tool hexStringFromString:str] ];
    _textView[0].layoutManager.allowsNonContiguousLayout = NO;
    [_textView[0] scrollRangeToVisible:NSMakeRange(_textView[0].text.length, 1)];
    
    if ( _textView[0].text.length > 0) {
        _clearButton.hidden = NO;
    }else{
        _clearButton.hidden = YES;
    }
}

#pragma mark - ble

- (void)BLE_init {
    [self babyDelegate];
    baby.channel(channelOnCharacteristicView).characteristicDetails(self.currPeripheral, self.characteristic);
}

#pragma mark - data

- (void)DATA_init {

}

#pragma mark - action

- (void)btnNoticeAction:(UIButton *)pBtn {
    NSLog(@"监听");
    
    __weak typeof(self)weakSelf = self;
    if(self.currPeripheral.state != CBPeripheralStateConnected) {
        [self.view makeToast:@"peripheral已经断开连接，请重新连接"];
        return;
    }
    if (self.characteristic.properties & CBCharacteristicPropertyNotify ||  self.characteristic.properties & CBCharacteristicPropertyIndicate) {
        
        if(self.characteristic.isNotifying) {
            [baby cancelNotify:self.currPeripheral characteristic:self.characteristic];
            [pBtn setTitle:@"通知" forState:UIControlStateNormal];
        }else{
            [weakSelf.currPeripheral setNotifyValue:YES forCharacteristic:self.characteristic];
            [pBtn setTitle:@"取消通知" forState:UIControlStateNormal];
            [baby notify:self.currPeripheral
          characteristic:self.characteristic
                   block:^(CBPeripheral *peripheral, CBCharacteristic *characteristics, NSError *error) {
//                NSLog(@"new value %@",characteristics.value);
//                [self insertReadValues:characteristics];
                [weakSelf insertNotifyText: characteristics];
                
                [weakSelf logToNotify:LogTypeNotify uuid:characteristics.UUID.UUIDString content: [Tool convertDataToHexStr:characteristics.value]];
            }];
        }
    }
    else{
        [self.view makeToast:@"这个characteristic没有nofity的权限"];
        return;
    }
}

- (void)btnReadAction:(UIButton *)pBtn {
    NSLog(@"读取---当前未处理，后期优化再考虑");
}

- (void)btnWriteAction:(UIButton *)pBtn {
    NSLog(@"写入");
    
    NSData *data;
    if ( _onOffSwitch.on ) {
        data = [_textView[2].text dataUsingEncoding:NSUTF8StringEncoding];
    }else{
        data = [Tool strToDataWithString: _textView[2].text];
    }
    NSLog(@"--------写入：%@", data);

    [self.currPeripheral writeValue:data forCharacteristic:self.characteristic type:CBCharacteristicWriteWithResponse];
}

- (void)switched:(UISwitch *)sender {
    NSLog(@"Switch current state %@", sender.on ? @"On" : @"Off");
    [self UI_update_writePlaceholder];
}

- (void)clearAction:(UIButton *)pBtn {
    
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"提示" message:@"是否确认清空数据？" preferredStyle:UIAlertControllerStyleAlert];
    UIAlertAction *action1 = [UIAlertAction actionWithTitle:@"清空" style:UIAlertActionStyleDestructive handler:^(UIAlertAction *_Nonnull action) {
        self->_textView[0].text = @"";
        self->_clearButton.hidden = YES;
    }];

    UIAlertAction *action2 = [UIAlertAction actionWithTitle:@"取消" style:UIAlertActionStyleDefault handler:^(UIAlertAction *_Nonnull action) {
    }];

    [alert addAction:action1];
    [alert addAction:action2];
    [self.navigationController presentViewController:alert animated:YES completion:nil];
    
}

#pragma mark - 蓝牙配置和操作

- (void)babyDelegate {

    __weak typeof(self) weakSelf = self;

    //设置设备断开连接的委托
    [baby setBlockOnDisconnectAtChannel:channelOnCharacteristicView block:^(CBCentralManager *central, CBPeripheral *peripheral, NSError *error) {
        [weakSelf.view makeToast:@"连接已断开"];
        [weakSelf logToNotify:LogTypeError uuid:peripheral.identifier.UUIDString content:@"连接已断开"];
        [weakSelf performSelector:@selector(UI_back) withObject:nil afterDelay:0.3];
    }];

    //设置读取characteristics的委托
    [baby setBlockOnReadValueForCharacteristicAtChannel:channelOnCharacteristicView block:^(CBPeripheral *peripheral, CBCharacteristic *characteristics, NSError *error) {
//        NSLog(@"CharacteristicViewController===characteristic name:%@ value is:%@",characteristics.UUID,characteristics.value);
//        [weakSelf insertReadValues:characteristics];
        [weakSelf insertReadText:characteristics];
        
        [weakSelf logToNotify:LogTypeRead uuid:characteristics.UUID.UUIDString content: [Tool convertDataToHexStr:characteristics.value]];
    }];
    //设置发现characteristics的descriptors的委托
    [baby setBlockOnDiscoverDescriptorsForCharacteristicAtChannel:channelOnCharacteristicView block:^(CBPeripheral *peripheral, CBCharacteristic *characteristic, NSError *error) {
        NSLog(@"CharacteristicViewController===characteristic name:%@", characteristic.service.UUID);
        for (CBDescriptor *d in characteristic.descriptors) {
            NSLog(@"CharacteristicViewController CBDescriptor name is :%@", d.UUID);
//            [weakSelf insertDescriptor:d];
        }
    }];
    //设置读取Descriptor的委托
    [baby setBlockOnReadValueForDescriptorsAtChannel:channelOnCharacteristicView block:^(CBPeripheral *peripheral, CBDescriptor *descriptor, NSError *error) {
//        for (int i =0 ; i<descriptors.count; i++) {
//            if (descriptors[i]==descriptor) {
//                UITableViewCell *cell = [weakSelf.tableView cellForRowAtIndexPath:[NSIndexPath indexPathForRow:i inSection:2]];
////                NSString *valueStr = [[NSString alloc]initWithData:descriptor.value encoding:NSUTF8StringEncoding];
//                cell.detailTextLabel.text = [NSString stringWithFormat:@"%@",descriptor.value];
//            }
//        }
        NSLog(@"CharacteristicViewController Descriptor name:%@ value is:%@", descriptor.characteristic.UUID, descriptor.value);
    }];

    //设置写数据成功的block
    [baby setBlockOnDidWriteValueForCharacteristicAtChannel:channelOnCharacteristicView block:^(CBCharacteristic *characteristic, NSError *error) {
//        NSLog(@"setBlockOnDidWriteValueForCharacteristicAtChannel characteristic:%@ and new value:%@", characteristic.UUID, characteristic.value);
        [weakSelf.view makeToast:[NSString stringWithFormat:@"%@ 写入成功", characteristic.UUID]];
        [weakSelf logToNotify:LogTypeWrite uuid:characteristic.UUID.UUIDString content: [Tool convertDataToHexStr:characteristic.value]];
    }];

    //设置通知状态改变的block
    [baby setBlockOnDidUpdateNotificationStateForCharacteristicAtChannel:channelOnCharacteristicView block:^(CBCharacteristic *characteristic, NSError *error) {
        NSLog(@"uid:%@,isNotifying:%@", characteristic.UUID, characteristic.isNotifying ? @"on" : @"off");
        
        [weakSelf logToNotify:LogTypeNotify uuid:characteristic.UUID.UUIDString content: characteristic.isNotifying? @"Notification开启":@"Notification关闭"];
    }];
}

- (void)logToNotify:(LogType)type uuid:(NSString *)uuid content:(NSString *)content {
    Log *l = [[Log alloc]init];
    l.type = type;
    l.uuid = uuid;
    l.content =content;
    
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeScanLog object:l];
}

@end

