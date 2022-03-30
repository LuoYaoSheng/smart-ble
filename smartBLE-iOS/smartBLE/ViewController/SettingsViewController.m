//
//  SettingsViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/19.
//

#import "SettingsViewController.h"

@interface SettingsViewController ()

@property(weak, nonatomic) IBOutlet UILabel *stepLabel;
@property(weak, nonatomic) IBOutlet UISwitch *stopSwitch;
@property(weak, nonatomic) IBOutlet UILabel *versionLabel;

@end

@implementation SettingsViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    [self DATA_init];
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    [self UI_init];
}

- (void)viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];

    kSetUserDefaults([NSNumber numberWithInteger:_stopSwitch.on], kConnectAutoStopKey);
}

#pragma mark - data

- (void)DATA_init {
//    NSNumber *step = kGetUserDefaults(kScanStepKey);
}

#pragma mark - ui

- (void)UI_init {

    NSNumber *step = kGetUserDefaults(kScanStepKey); // 此处一定存在
    _stepLabel.text = [NSString stringWithFormat:@"%@", [Tool secText:[step integerValue]]];

    NSNumber *autoStop = kGetUserDefaults(kConnectAutoStopKey);
    [_stopSwitch setOn:[autoStop boolValue]];

    _versionLabel.text = [NSString stringWithFormat:@"V%@", [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"]];
}

#pragma mark - Action

- (IBAction)githubAction:(id)sender {
    NSURL *url = [NSURL URLWithString:kGitHubUrl];
    [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:^(BOOL success) {
    }];
}

- (IBAction)feedbackAction:(id)sender {
    NSURL *url = [NSURL URLWithString:kFeedbackUrl];
    [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:^(BOOL success) {
    }];
}

- (IBAction)evaluateAction:(id)sender {
    NSString *urlStr = [NSString stringWithFormat:@"itms-apps://itunes.apple.com/WebObjects/MZStore.woa/wa/viewContentsUserReviews?type=Purple+Software&id=%@&pageNumber=0&sortOrdering=2&mt=8", APPID];
    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:urlStr] options:@{} completionHandler:nil];
}

- (IBAction)privacyAction:(id)sender {
    NSURL *url = [NSURL URLWithString:kPrivacyPolicyUrl];
    [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:^(BOOL success) {
    }];
}

@end
