//
//  AdvertiserSettingViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/22.
//

#import "AdvertiserSettingViewController.h"
#import "AdIntervalViewController.h"
#import "BroadcastViewController.h"
#import "SkSwitch.h"

@interface AdvertiserSettingViewController ()
@property(weak, nonatomic) IBOutlet UIView *formatView;
@property(strong, nonatomic) SkSwitch *formatSwitch;
@property(weak, nonatomic) IBOutlet UISwitch *simplifySwitch;
@property(weak, nonatomic) IBOutlet UISwitch *rollSwitch;
@property(weak, nonatomic) IBOutlet UIView *respView;
@property(strong, nonatomic) SkSwitch *respSwitch;
@property(weak, nonatomic) IBOutlet UIView *loopView;
@property(weak, nonatomic) IBOutlet UILabel *loopLabel;
@property(weak, nonatomic) IBOutlet UIButton *stateButton;
@end

@implementation AdvertiserSettingViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [self UI_init];
    [self Notice_init];
}

- (void)viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    _loopLabel.text = [NSString stringWithFormat:@"%ld Sec", _rspStep];
}

// 两种方法给予上级页面赋值  -- 更换到使用通知来处理
// 方法一
//- (void)viewWillDisappear:(BOOL)animated {
//    [super viewWillDisappear:animated];
//
//    // 存储数据
//    BroadcastViewController *vc = [self.navigationController.viewControllers objectAtIndex: self.navigationController.viewControllers.count-1];
//    if ( [vc isKindOfClass:[BroadcastViewController class]]) {
//        vc.logFormat = _logFormat;
//        vc.logSimplify = _logSimplify;
//        vc.logAutoRoll = _logAutoRoll;
//        vc.rspModel =_rspModel;
//        vc.rspStep = _rspStep;
//    }
//}
// 方法二
//- (void)didMoveToParentViewController:(UIViewController *)parent {
//    if (parent == nil) {
//        BroadcastViewController *vc = self.navigationController.viewControllers[self.navigationController.viewControllers.count - 1];
//        if ([vc isKindOfClass:[BroadcastViewController class]]) {
//            vc.logFormat = _logFormat;
//            vc.logSimplify = _logSimplify;
//            vc.logAutoRoll = _logAutoRoll;
//            vc.rspModel = _rspModel;
//            vc.rspStep = _rspStep;
//        }
//    }
//}

#pragma mark - ui

- (void)UI_init {
    UIView *view = _formatView;
    SkSwitch *formatSwitch = [[SkSwitch alloc] initWithFrame:CGRectMake(CGRectGetWidth(view.frame) - 110 - 12, (CGRectGetHeight(view.frame) - 31) * 0.5, 70, 31)];
    [view addSubview:formatSwitch];
    [formatSwitch addTarget:self action:@selector(formatSwitched:) forControlEvents:UIControlEventValueChanged];
    formatSwitch.tintColor = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    formatSwitch.onTintColor = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    formatSwitch.style = SkSwitchStyleBorder;
    formatSwitch.onText = @"HEX";
    formatSwitch.offText = @"ASCII";
    _formatSwitch = formatSwitch;

    view = _respView;
    SkSwitch *respSwitch = [[SkSwitch alloc] initWithFrame:CGRectMake(CGRectGetWidth(view.frame) - 110 - 12, (CGRectGetHeight(view.frame) - 31) * 0.5, 70, 31)];
    [view addSubview:respSwitch];
    [respSwitch addTarget:self action:@selector(respSwitched:) forControlEvents:UIControlEventValueChanged];
    respSwitch.tintColor = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    respSwitch.onTintColor = [UIColor colorWithRed:22 / 255.0 green:119 / 255.0 blue:255 / 255.0 alpha:1.0];
    respSwitch.style = SkSwitchStyleBorder;
    respSwitch.onText = @"写入";
    respSwitch.offText = @"循环";
    _respSwitch = respSwitch;


    // 同步设置
    _formatSwitch.on = (BOOL) _logFormat;
    _simplifySwitch.on = _logSimplify;
    _rollSwitch.on = _logAutoRoll;
    _respSwitch.on = (BOOL) _rspModel;

    _loopView.hidden = !_respSwitch.on;
}


#pragma mark - action

- (void)formatSwitched:(SkSwitch *)sender {
    _logFormat = sender.on;
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeBroadcast object:@{@"type": @(AdvertiserNotifyTypeLogFormat), @"value": @(_logFormat)}];
}

- (IBAction)simplifySwitched:(UISwitch *)sender {
    _logSimplify = sender.on;
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeBroadcast object:@{@"type": @(AdvertiserNotifyTypeLogSimplify), @"value": @(_logSimplify)}];
}

- (IBAction)rollSwitched:(UISwitch *)sender {
    _logAutoRoll = sender.on;
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeBroadcast object:@{@"type": @(AdvertiserNotifyTypeLogAutoRoll), @"value": @(_logAutoRoll)}];
}

- (void)respSwitched:(SkSwitch *)sender {
    _rspModel = sender.on ? 1 : 0;
    _loopView.hidden = !sender.on;

    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeBroadcast object:@{@"type": @(AdvertiserNotifyTypeRspModel), @"value": @(_rspModel)}];
}

- (IBAction)loopAction:(id)sender {
    [self performSegueWithIdentifier:@"toAdInterval" sender:self];
}

- (IBAction)clearAction:(id)sender {
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"温馨提示" message:@"清空后，日志将不会保留" preferredStyle:UIAlertControllerStyleAlert];
    UIAlertAction *action1 = [UIAlertAction actionWithTitle:@"清空" style:UIAlertActionStyleDestructive handler:^(UIAlertAction *_Nonnull action) {
        [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeBroadcast object:@{@"type": @(AdvertiserNotifyTypeClear)}];
    }];
    UIAlertAction *action2 = [UIAlertAction actionWithTitle:@"取消" style:UIAlertActionStyleDefault handler:^(UIAlertAction *_Nonnull action) {
    }];

    [alert addAction:action1];
    [alert addAction:action2];
    [self.navigationController presentViewController:alert animated:YES completion:nil];
}

- (IBAction)stateAction:(id)sender {

    BOOL state = !_state;
    _state = state;

    [_stateButton setTitle:_state ? @"开启" : @"暂停" forState:UIControlStateNormal];
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeBroadcast object:@{@"type": @(AdvertiserNotifyTypeState), @"value": @(_state)}];
}

#pragma mark - prepare segue

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    [super prepareForSegue:segue sender:sender];
    if ([segue.identifier isEqualToString:@"toAdInterval"]) {
        AdIntervalViewController *vc = segue.destinationViewController;
        vc.interval = _rspStep;
    }
}

#pragma mark - 通知
- (void)Notice_init {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(Notice_event:) name:kNoticeBroadcast object:nil];
}

- (void)Notice_event:(NSNotification *)notification {
    if ( [notification.object[@"type"] intValue] == AdvertiserNotifyTypeRspStep) {
        _rspStep = [notification.object[@"value"] integerValue];
        _loopLabel.text = [NSString stringWithFormat:@"%ld Sec", _rspStep];
    }
}
    
@end
