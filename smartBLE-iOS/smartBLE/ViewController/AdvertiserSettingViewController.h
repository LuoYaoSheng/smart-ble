//
//  AdvertiserSettingViewController.h
//  smartBLE
//
//  Created by lys on 2022/3/22.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface AdvertiserSettingViewController : UIViewController
// 配置参数
@property (nonatomic, assign) NSInteger logFormat;
@property (nonatomic, assign) BOOL logSimplify;
@property (nonatomic, assign) BOOL logAutoRoll;
@property (nonatomic, assign) NSInteger rspModel;
@property (nonatomic, assign) NSInteger rspStep;

@property (nonatomic, assign) BOOL state;

@end

NS_ASSUME_NONNULL_END
