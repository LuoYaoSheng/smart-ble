//
//  AdvertiserViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/19.
//

#import "AdvertiserViewController.h"
#import "BroadcastViewController.h"

@interface AdvertiserViewController ()

@property(weak, nonatomic) IBOutlet UITextField *uuid0TextField;
@property(weak, nonatomic) IBOutlet UITextField *uuid1TextField;
@property(weak, nonatomic) IBOutlet UITextField *uuid2TextField;
@property(weak, nonatomic) IBOutlet UITextField *dataTextField;
@property(weak, nonatomic) IBOutlet UITextField *noticeTextField;
@end

@implementation AdvertiserViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    [self DATA_init];
    [self UI_init];
}

#pragma mark - data

- (void)DATA_init {
    // 给予默认值
}

- (BOOL)DATA_check {
    if ( _uuid1TextField.text.length <= 0) {
        [self.view makeToast:@"请填写:服务UUID"];
        return NO;
    }
    if ( _uuid2TextField.text.length <= 0) {
        [self.view makeToast:@"请填写:特征UUID"];
        return NO;
    }
    if ( _dataTextField.text.length <= 0) {
        [self.view makeToast:@"请填写:特征数据"];
        return NO;
    }
    if ( _noticeTextField.text.length <= 0) {
        [self.view makeToast:@"请填写:通知数据"];
        return NO;
    }
    return YES;
}

#pragma mark - ui

- (void)UI_init {
    _uuid0TextField.text    = @"";
    _uuid0TextField.placeholder = @"自动生成，无需配置";
    _uuid0TextField.enabled = NO;
    
    _uuid1TextField.text    = @"FFF1";
    _uuid2TextField.text    = @"FFF2";
    _dataTextField.text     = @"0102030405";
    _noticeTextField.text   = @"060708090A";
}

#pragma mark - Action

- (IBAction)startAction:(id)sender {
    if ( [self DATA_check] ) {
        [self performSegueWithIdentifier:@"toAdvertiser" sender:self];
    }
}

#pragma mark - prepare segue

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    [super prepareForSegue:segue sender:sender];
    if ([segue.identifier isEqualToString:@"toAdvertiser"]) {
        BroadcastViewController *vc = segue.destinationViewController;
        vc.param = @{
                @"uuid0": _uuid0TextField.text,
                @"uuid1": _uuid1TextField.text,
                @"uuid2": _uuid2TextField.text,
                @"data": _dataTextField.text,
                @"notice": _noticeTextField.text,
        };
    }
}

@end
