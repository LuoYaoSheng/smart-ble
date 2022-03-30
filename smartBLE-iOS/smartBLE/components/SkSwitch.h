//
//  SkSwitch.h
//  smartBLE
//
//  Created by lys on 2022/3/22.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, SkSwitchStyle) {
    SkSwitchStyleNoBorder,
    SkSwitchStyleBorder
};


@interface SkSwitch : UIControl

@property (nonatomic, assign, getter = isOn) BOOL on;

@property (nonatomic, assign) SkSwitchStyle style;

@property (nonatomic, strong) UIColor *onTintColor;
@property (nonatomic, strong) UIColor *tintColor;
@property (nonatomic, strong) UIColor *thumbTintColor;

@property (nonatomic, strong) UIColor *onTextColor;
@property (nonatomic, strong) UIColor *offTextColor;
@property (nonatomic, strong) UIFont *textFont;
@property (nonatomic, strong) NSString *onText;
@property (nonatomic, strong) NSString *offText;

- (void)setOn:(BOOL)on animated:(BOOL)animated;
@end

NS_ASSUME_NONNULL_END
