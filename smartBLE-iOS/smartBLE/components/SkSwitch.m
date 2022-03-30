//
//  SkSwitch.m
//  smartBLE
//
//  Created by lys on 2022/3/22.
//

#import "SkSwitch.h"

#define SkSwitchMaxHeight 31.0f
#define SkSwitchMinHeight 31.0f

#define SkSwitchMinWidth 51.0f

#define SkSwitchKnobSize 27.0f

@interface SkSwitch ()

@property (nonatomic, strong) UIView *containerView;
@property (nonatomic, strong) UIView *onContentView;
@property (nonatomic, strong) UIView *offContentView;
@property (nonatomic, strong) UIView *knobView;
@property (nonatomic, strong) UILabel *onLabel;
@property (nonatomic, strong) UILabel *offLabel;
@property (nonatomic, strong) UIView *borderView;

- (void)commonInit;

- (CGRect)roundRect:(CGRect)frameOrBounds;

- (void)handleTapTapGestureRecognizerEvent:(UITapGestureRecognizer *)recognizer;

- (void)handlePanGestureRecognizerEvent:(UIPanGestureRecognizer *)recognizer;

- (void)scaleKnodViewFrame:(BOOL)scale;

@end

@implementation SkSwitch

- (id)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:[self roundRect:frame]];
    if (self) {
        [self commonInit];
    }
    return self;
}

- (id)initWithCoder:(NSCoder *)aDecoder
{
    self = [super initWithCoder:aDecoder];
    
    if (self) {
        [self commonInit];
    }
    
    return self;
}

- (void)setBounds:(CGRect)bounds
{
    [super setBounds:[self roundRect:bounds]];
    
    [self setNeedsLayout];
}

- (void)setFrame:(CGRect)frame
{
    [super setFrame:[self roundRect:frame]];
    
    [self setNeedsLayout];
}

- (void)setOnText:(NSString *)onText
{
    if (_onText != onText) {
        _onText = onText;
        
        _onLabel.text = onText;
    }
}

- (void)setOffText:(NSString *)offText
{
    if (_offText != offText) {
        _offText = offText;
        
        _offLabel.text = offText;
    }
}

- (void)setOnTintColor:(UIColor *)onTintColor
{
    if (_onTintColor != onTintColor) {
        _onTintColor = onTintColor;
        
        if (_style == SkSwitchStyleNoBorder) {
            _onContentView.backgroundColor = _onTintColor;
        } else {
            if (_on) {
                _borderView.layer.borderColor = _onTintColor.CGColor;
                
                _knobView.backgroundColor = _onTintColor;
            }
            
            _onLabel.textColor = _onTintColor;
        }
    }
}

- (void)setTintColor:(UIColor *)tintColor
{
    if (_tintColor != tintColor) {
        _tintColor = tintColor;
        
        if (_style == SkSwitchStyleNoBorder) {
            _offContentView.backgroundColor = tintColor;
        } else {
            if (!_on) {
                _borderView.layer.borderColor = _tintColor.CGColor;
                
                _knobView.backgroundColor = _tintColor;
            }
            
            _offLabel.textColor = _tintColor;
        }
    }
}

- (void)setThumbTintColor:(UIColor *)thumbTintColor
{
    if (_thumbTintColor != thumbTintColor) {
        _thumbTintColor = thumbTintColor;
        
        if (_style == SkSwitchStyleNoBorder) {
            _knobView.backgroundColor = _thumbTintColor;
        }
    }
}

- (void)setOnTextColor:(UIColor *)onTextColor
{
    if (_onTextColor != onTextColor) {
        _onTextColor = onTextColor;
        
        if (_style == SkSwitchStyleNoBorder) {
            _onLabel.textColor = onTextColor;
        }
    }
}

- (void)setOffTextColor:(UIColor *)offTextColor
{
    if (_offTextColor != offTextColor) {
        _offTextColor = offTextColor;
        
        if (_style == SkSwitchStyleNoBorder) {
            _offLabel.textColor = _offTextColor;
        }
    }
}

- (void)setStyle:(SkSwitchStyle)style
{
    if (_style != style) {
        _style = style;
        
        if (_style == SkSwitchStyleNoBorder) {
            _onContentView.backgroundColor = _onTintColor;
            _offContentView.backgroundColor = _tintColor;
            
            _borderView.hidden = YES;
            _borderView.layer.borderColor = _on ? _onTintColor.CGColor : _tintColor.CGColor;
            
            _knobView.backgroundColor = _thumbTintColor;
            
            _onLabel.textColor = _onTextColor;
            _offLabel.textColor = _offTextColor;
        } else {
            _onContentView.backgroundColor = [UIColor clearColor];
            _offContentView.backgroundColor = [UIColor clearColor];
            
            _borderView.hidden = NO;
            _borderView.layer.borderColor = _on ? _onTintColor.CGColor : _tintColor.CGColor;
            
            _knobView.backgroundColor = _on ? _onTintColor : _tintColor;
            
            _onLabel.textColor = _onTintColor;
            _offLabel.textColor = _tintColor;
        }
        
        [self setNeedsLayout];
    }
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    
    self.containerView.frame = self.bounds;
    
    CGFloat r = CGRectGetHeight(self.containerView.bounds) / 2.0;
    
    self.containerView.layer.cornerRadius = r;
    self.containerView.layer.masksToBounds = YES;
    
    CGFloat margin = (CGRectGetHeight(self.bounds) - SkSwitchKnobSize) / 2.0;
    
    self.borderView.frame = self.bounds;
    self.borderView.layer.borderWidth = 1.0;
    self.borderView.layer.cornerRadius = r;
    self.borderView.layer.masksToBounds = YES;
    
    if (!self.isOn) {
        // frame of off status
        self.onContentView.frame = CGRectMake(-1 * CGRectGetWidth(self.containerView.bounds),
                                              0,
                                              CGRectGetWidth(self.containerView.bounds),
                                              CGRectGetHeight(self.containerView.bounds));
        
        self.offContentView.frame = CGRectMake(0,
                                               0,
                                               CGRectGetWidth(self.containerView.bounds),
                                               CGRectGetHeight(self.containerView.bounds));
        
        self.knobView.frame = CGRectMake(margin,
                                         margin,
                                         SkSwitchKnobSize,
                                         SkSwitchKnobSize);
    } else {
        // frame of on status
        self.onContentView.frame = CGRectMake(0,
                                              0,
                                              CGRectGetWidth(self.containerView.bounds),
                                              CGRectGetHeight(self.containerView.bounds));
        
        self.offContentView.frame = CGRectMake(CGRectGetWidth(self.containerView.bounds),
                                               0,
                                               CGRectGetWidth(self.containerView.bounds),
                                               CGRectGetHeight(self.containerView.bounds));
        
        self.knobView.frame = CGRectMake(CGRectGetWidth(self.containerView.bounds) - margin - SkSwitchKnobSize,
                                         margin,
                                         SkSwitchKnobSize,
                                         SkSwitchKnobSize);
    }
    
    CGFloat lHeight = 20.0f;
    CGFloat lMargin = r - (sqrtf(powf(r, 2) - powf(lHeight / 2.0, 2))) + margin;
    
    self.onLabel.frame = CGRectMake(lMargin,
                                    r - lHeight / 2.0,
                                    CGRectGetWidth(self.onContentView.bounds) - lMargin - SkSwitchKnobSize - 2 * margin,
                                    lHeight);
    
    self.offLabel.frame = CGRectMake(SkSwitchKnobSize + 2 * margin,
                                     r - lHeight / 2.0,
                                     CGRectGetWidth(self.onContentView.bounds) - lMargin - SkSwitchKnobSize - 2 * margin,
                                     lHeight);
}

- (void)setOn:(BOOL)on
{
    [self setOn:on animated:NO];
}

- (void)setOn:(BOOL)on animated:(BOOL)animated
{
    if (_on == on) {
        return;
    }
    
    _on = on;
    
    CGFloat margin = (CGRectGetHeight(self.bounds) - SkSwitchKnobSize) / 2.0;
    
    CGRect onFrame = self.onContentView.frame;
    CGRect offFrame = self.offContentView.frame;
    CGRect knobFrame = self.knobView.frame;
    
    if (!self.isOn) {
        // frame of off status
        self.onContentView.frame = CGRectMake(-1 * CGRectGetWidth(self.containerView.bounds),
                                              0,
                                              CGRectGetWidth(self.containerView.bounds),
                                              CGRectGetHeight(self.containerView.bounds));
        
        self.offContentView.frame = CGRectMake(0,
                                               0,
                                               CGRectGetWidth(self.containerView.bounds),
                                               CGRectGetHeight(self.containerView.bounds));
        
        self.knobView.frame = CGRectMake(margin,
                                         margin,
                                         SkSwitchKnobSize,
                                         SkSwitchKnobSize);
        
        if (_style == SkSwitchStyleBorder) {
            self.borderView.layer.borderColor = _tintColor.CGColor;
            
            self.knobView.backgroundColor = _tintColor;
        }
    } else {
        // frame of on status
        self.onContentView.frame = CGRectMake(0,
                                              0,
                                              CGRectGetWidth(self.containerView.bounds),
                                              CGRectGetHeight(self.containerView.bounds));
        
        self.offContentView.frame = CGRectMake(CGRectGetWidth(self.containerView.bounds),
                                               0,
                                               CGRectGetWidth(self.containerView.bounds),
                                               CGRectGetHeight(self.containerView.bounds));
        
        self.knobView.frame = CGRectMake(CGRectGetWidth(self.containerView.bounds) - margin - SkSwitchKnobSize,
                                         margin,
                                         SkSwitchKnobSize,
                                         SkSwitchKnobSize);
        
        if (_style == SkSwitchStyleBorder) {
            self.borderView.layer.borderColor = _onTintColor.CGColor;
            
            self.knobView.backgroundColor = _onTintColor;
        }
    }
    
    if (animated) {
        // on
        CABasicAnimation *animation1 = [CABasicAnimation animationWithKeyPath:@"bounds"];
        [animation1 setFromValue:[NSValue valueWithCGRect:CGRectMake(0, 0, CGRectGetWidth(onFrame), CGRectGetHeight(onFrame))]];
        [animation1 setToValue:[NSValue valueWithCGRect:CGRectMake(0, 0, CGRectGetWidth(self.onContentView.frame), CGRectGetHeight(self.onContentView.frame))]];
        [animation1 setDuration:0.3];
        [animation1 setTimingFunction:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
        [self.onContentView.layer addAnimation:animation1 forKey:NULL];
        
        CABasicAnimation *animation2 = [CABasicAnimation animationWithKeyPath:@"position"];
        [animation2 setFromValue:[NSValue valueWithCGPoint:CGPointMake(CGRectGetMidX(onFrame), CGRectGetMidY(onFrame))]];
        [animation2 setToValue:[NSValue valueWithCGPoint:CGPointMake(CGRectGetMidX(self.onContentView.frame), CGRectGetMidY(self.onContentView.frame))]];
        [animation2 setDuration:0.3];
        [animation2 setTimingFunction:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
        [self.onContentView.layer addAnimation:animation2 forKey:NULL];
        
        // off
        CABasicAnimation *animation3 = [CABasicAnimation animationWithKeyPath:@"bounds"];
        [animation3 setFromValue:[NSValue valueWithCGRect:CGRectMake(0, 0, CGRectGetWidth(offFrame), CGRectGetHeight(offFrame))]];
        [animation3 setToValue:[NSValue valueWithCGRect:CGRectMake(0, 0, CGRectGetWidth(self.offContentView.frame), CGRectGetHeight(self.offContentView.frame))]];
        [animation3 setDuration:0.3];
        [animation3 setTimingFunction:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
        [self.offContentView.layer addAnimation:animation3 forKey:NULL];
        
        CABasicAnimation *animation4 = [CABasicAnimation animationWithKeyPath:@"position"];
        [animation4 setFromValue:[NSValue valueWithCGPoint:CGPointMake(CGRectGetMidX(offFrame), CGRectGetMidY(offFrame))]];
        [animation4 setToValue:[NSValue valueWithCGPoint:CGPointMake(CGRectGetMidX(self.offContentView.frame), CGRectGetMidY(self.offContentView.frame))]];
        [animation4 setDuration:0.3];
        [animation4 setTimingFunction:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
        [self.offContentView.layer addAnimation:animation4 forKey:NULL];
        
        // knob
        CABasicAnimation *animation5 = [CABasicAnimation animationWithKeyPath:@"bounds"];
        [animation5 setFromValue:[NSValue valueWithCGRect:CGRectMake(0, 0, CGRectGetWidth(knobFrame), CGRectGetHeight(knobFrame))]];
        [animation5 setToValue:[NSValue valueWithCGRect:CGRectMake(0, 0, CGRectGetWidth(self.knobView.frame), CGRectGetHeight(self.knobView.frame))]];
        [animation5 setDuration:0.3];
        [animation5 setTimingFunction:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
        [self.knobView.layer addAnimation:animation5 forKey:NULL];
        
        CABasicAnimation *animation6 = [CABasicAnimation animationWithKeyPath:@"position"];
        [animation6 setFromValue:[NSValue valueWithCGPoint:CGPointMake(CGRectGetMidX(knobFrame), CGRectGetMidY(knobFrame))]];
        [animation6 setToValue:[NSValue valueWithCGPoint:CGPointMake(CGRectGetMidX(self.knobView.frame), CGRectGetMidY(self.knobView.frame))]];
        [animation6 setDuration:0.3];
        [animation6 setTimingFunction:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
        [self.knobView.layer addAnimation:animation6 forKey:NULL];
    }
}

#pragma mark - Private API

- (void)commonInit
{
    self.backgroundColor = [UIColor clearColor];
    
    _style = SkSwitchStyleNoBorder;
    
    _onTintColor = [UIColor colorWithRed:130 / 255.0 green:200 / 255.0 blue:90 / 255.0 alpha:1.0];
    _tintColor = [UIColor colorWithWhite:0.75 alpha:1.0];
    _thumbTintColor = [UIColor colorWithWhite:1.0 alpha:1.0];
    
    _textFont = [UIFont systemFontOfSize:10.0f];
    _onTextColor = [UIColor whiteColor];
    _offTextColor = _onTextColor;
    
    _containerView = [[UIView alloc] initWithFrame:self.bounds];
    _containerView.backgroundColor = [UIColor clearColor];
    [self addSubview:_containerView];
    
    _borderView = [[UIView alloc] initWithFrame:CGRectZero];
    _borderView.userInteractionEnabled = NO;
    _borderView.backgroundColor = [UIColor colorWithWhite:0.9 alpha:0.2];
    _borderView.layer.borderColor = _on ? _onTintColor.CGColor : _tintColor.CGColor;
    _borderView.hidden = (_style == SkSwitchStyleNoBorder) ? YES : NO;
    [_containerView addSubview:_borderView];
    
    _onContentView = [[UIView alloc] initWithFrame:self.bounds];
    _onContentView.backgroundColor = (_style == SkSwitchStyleNoBorder) ? _onTintColor : [UIColor clearColor];
    [_containerView addSubview:_onContentView];
    
    _offContentView = [[UIView alloc] initWithFrame:self.bounds];
    _offContentView.backgroundColor = (_style == SkSwitchStyleNoBorder) ? _tintColor : [UIColor clearColor];
    [_containerView addSubview:_offContentView];
    
    _onLabel = [[UILabel alloc] initWithFrame:CGRectZero];
    _onLabel.backgroundColor = [UIColor clearColor];
    _onLabel.textAlignment = NSTextAlignmentCenter;
    _onLabel.textColor = _onTextColor;
    _onLabel.font = _textFont;
    _onLabel.text = _onText;
    [_onContentView addSubview:_onLabel];
    
    _offLabel = [[UILabel alloc] initWithFrame:CGRectZero];
    _offLabel.backgroundColor = [UIColor clearColor];
    _offLabel.textAlignment = NSTextAlignmentCenter;
    _offLabel.textColor = _offTextColor;
    _offLabel.font = _textFont;
    _offLabel.text = _offText;
    [_offContentView addSubview:_offLabel];
    
    _knobView = [[UIView alloc] initWithFrame:CGRectMake(0, 0, SkSwitchKnobSize, SkSwitchKnobSize)];
    _knobView.backgroundColor = (_style == SkSwitchStyleNoBorder) ? _thumbTintColor : (_on ? _onTintColor : _tintColor);
    _knobView.layer.cornerRadius = SkSwitchKnobSize / 2.0;
    [_containerView addSubview:_knobView];
    
    UITapGestureRecognizer *tapGesture = [[UITapGestureRecognizer alloc] initWithTarget:self
                                                                                 action:@selector(handleTapTapGestureRecognizerEvent:)];
    [self addGestureRecognizer:tapGesture];
    
    UIPanGestureRecognizer *panGesture = [[UIPanGestureRecognizer alloc] initWithTarget:self
                                                                                 action:@selector(handlePanGestureRecognizerEvent:)];
    [self addGestureRecognizer:panGesture];
}

- (CGRect)roundRect:(CGRect)frameOrBounds
{
    CGRect newRect = frameOrBounds;
    
    if (newRect.size.height > SkSwitchMaxHeight) {
        newRect.size.height = SkSwitchMaxHeight;
    }
    
    if (newRect.size.height < SkSwitchMinHeight) {
        newRect.size.height = SkSwitchMinHeight;
    }
    
    if (newRect.size.width < SkSwitchMinWidth) {
        newRect.size.width = SkSwitchMinWidth;
    }
    
    return newRect;
}

- (void)handleTapTapGestureRecognizerEvent:(UITapGestureRecognizer *)recognizer
{
    if (recognizer.state == UIGestureRecognizerStateEnded) {
        [self setOn:!self.isOn animated:YES];
        [self sendActionsForControlEvents:UIControlEventValueChanged];
    }
}

- (void)handlePanGestureRecognizerEvent:(UIPanGestureRecognizer *)recognizer
{
    
    switch (recognizer.state) {
        case UIGestureRecognizerStateBegan:{
            [self scaleKnodViewFrame:YES];
            break;
        }
        case UIGestureRecognizerStateCancelled:
        case UIGestureRecognizerStateFailed: {
            [self scaleKnodViewFrame:NO];
            break;
        }
        case UIGestureRecognizerStateChanged:{
            break;
        }
        case UIGestureRecognizerStateEnded:
            [self setOn:!self.isOn animated:YES];
            [self sendActionsForControlEvents:UIControlEventValueChanged];
            break;
        case UIGestureRecognizerStatePossible:
            break;
    }
}

- (void)scaleKnodViewFrame:(BOOL)scale
{
    CGFloat margin = (CGRectGetHeight(self.bounds) - SkSwitchKnobSize) / 2.0;
    CGFloat offset = 6.0f;
    
    CGRect preFrame = self.knobView.frame;
    
    if (self.isOn) {
        self.knobView.frame = CGRectMake(CGRectGetWidth(self.containerView.bounds) - SkSwitchKnobSize - margin - (scale ? offset : 0),
                                         margin,
                                         SkSwitchKnobSize + (scale ? offset : 0),
                                         SkSwitchKnobSize);
    } else {
        self.knobView.frame = CGRectMake(margin,
                                         margin,
                                         SkSwitchKnobSize + (scale ? offset : 0),
                                         SkSwitchKnobSize);
    }
    
    CABasicAnimation *animation1 = [CABasicAnimation animationWithKeyPath:@"bounds"];
    [animation1 setFromValue:[NSValue valueWithCGRect:CGRectMake(0, 0, CGRectGetWidth(preFrame), CGRectGetHeight(preFrame))]];
    [animation1 setToValue:[NSValue valueWithCGRect:CGRectMake(0, 0, CGRectGetWidth(self.knobView.frame), CGRectGetHeight(self.knobView.frame))]];
    [animation1 setDuration:0.3];
    [animation1 setTimingFunction:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
    [self.knobView.layer addAnimation:animation1 forKey:NULL];
    
    CABasicAnimation *animation2 = [CABasicAnimation animationWithKeyPath:@"position"];
    [animation2 setFromValue:[NSValue valueWithCGPoint:CGPointMake(CGRectGetMidX(preFrame), CGRectGetMidY(preFrame))]];
    [animation2 setToValue:[NSValue valueWithCGPoint:CGPointMake(CGRectGetMidX(self.knobView.frame), CGRectGetMidY(self.knobView.frame))]];
    [animation2 setDuration:0.3];
    [animation2 setTimingFunction:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
    [self.knobView.layer addAnimation:animation2 forKey:NULL];
}

@end
