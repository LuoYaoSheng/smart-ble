//
//  FilterViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/25.
//

#import "FilterViewController.h"

@interface FilterViewController ()
@property(weak, nonatomic) IBOutlet UITextField *nameTextField;
@property(weak, nonatomic) IBOutlet UITextField *uuidTextField;
@property(weak, nonatomic) IBOutlet UISlider *slider;
@property(weak, nonatomic) IBOutlet UISwitch *emptySwitch;
@property(weak, nonatomic) IBOutlet UILabel *valueLabel;
@end

@implementation FilterViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    [self UI_init];
}

- (void)UI_init {
    _nameTextField.text = kGetUserDefaults(kFilterNameKey);
    _uuidTextField.text = kGetUserDefaults(kFilterUUIDKey);
    [_slider setValue:[kGetUserDefaults(kFilterRSSIKey) floatValue]];
    [_emptySwitch setOn:[kGetUserDefaults(kFilterEmptyKey) boolValue]];
    _valueLabel.text = [NSString stringWithFormat:@"%.0f", _slider.value];
}

- (void)UI_back {
    [self.navigationController popViewControllerAnimated:YES];
}

#pragma mark - action

- (IBAction)sliderValue:(UISlider *)sender {
    _valueLabel.text = [NSString stringWithFormat:@"%.0f", sender.value];
}

- (IBAction)filterAction:(id)sender {
    // 保存数据
    kSetUserDefaults(_nameTextField.text, kFilterNameKey);
    kSetUserDefaults(_uuidTextField.text, kFilterUUIDKey);
    kSetUserDefaults([NSNumber numberWithInteger:(NSInteger) _slider.value], kFilterRSSIKey);
    kSetUserDefaults([NSNumber numberWithInteger:_emptySwitch.on], kFilterEmptyKey);

    // 通知赛选条件变更
    NSDictionary *dic = @{
            @"name": _nameTextField.text,
            @"uuid": _uuidTextField.text,
            @"rssi": [NSNumber numberWithInteger:(NSInteger) _slider.value],
            @"empty": [NSNumber numberWithBool:_emptySwitch.on]
    };
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeScanFilter object:dic];
    [self performSelector:@selector(UI_back) withObject:nil afterDelay:0.3];
}

@end
