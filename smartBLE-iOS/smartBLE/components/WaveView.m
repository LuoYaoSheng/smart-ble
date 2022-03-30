//
//  WaveView.m
//  smartBLE
//
//  Created by lys on 2022/3/23.
//

#import "WaveView.h"

@interface WaveView ()

@end

@implementation WaveView

- (instancetype)initWithFrame:(CGRect)frame {
    self = [super initWithFrame:frame];
    if (self) {
        [self DATA_init];
        [self UI_init];
    }
    return self;
}

- (void)DATA_init {

}

- (void)UI_init {
    self.backgroundColor = [UIColor clearColor];
    [self startAnimate];
}

- (void)animateView:(NSTimeInterval)delay {
    UIView *view = [[UIView alloc] initWithFrame:CGRectMake(0, 0, 108, 108)];
    [self addSubview: view ];
    view.layer.cornerRadius = 0.5*108 + 1.0;
    view.backgroundColor = [UIColor colorWithRed:194/255.0 green:233/255.0 blue:251/255.0 alpha:1.0];
    view.center = CGPointMake(self.center.x, self.center.y*0.8);

    CGFloat scale = CGRectGetWidth(self.frame) / 108.f;

    [UIView animateWithDuration:3
                          delay:delay
                        options:UIViewAnimationOptionRepeat
                     animations:^(void) {
                         view.transform = CGAffineTransformMakeScale(scale, scale);
                         view.backgroundColor = [UIColor colorWithRed:212/255.0 green:227/255.0 blue:246/255.0 alpha:1.0];
                         view.alpha = 0.0;
                     }
                     completion:nil];
}

- (void)startAnimate {
    [self animateView:0];
    [self animateView:1];
    [self animateView:2];
}

@end
