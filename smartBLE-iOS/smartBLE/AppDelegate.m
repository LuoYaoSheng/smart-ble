//
//  AppDelegate.m
//  smartBLE
//
//  Created by lys on 2022/3/18.
//

#import "AppDelegate.h"
#import "IQKeyboardManager.h"

@interface AppDelegate ()

// 扫描定时器
@property(nonatomic, strong) NSTimer *timer;
@property(nonatomic, assign) NSTimeInterval timeInterval;

@end

@implementation AppDelegate


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // Override point for customization after application launch.
    // 全局键盘操作
    [self setKeyBoard];
    // 延迟获取，否则可能为空
    [self performSelector:@selector(setSceneWindow) withObject:nil afterDelay:0.3];

    // 初始化数据
    [self DATA_init];
    // 开启扫描定时器
    [self Timer_init];

    // 添加通知
    [self Notice_init];

    return YES;
}


#pragma mark - UISceneSession lifecycle


- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options {
    // Called when a new scene session is being created.
    // Use this method to select a configuration to create the new scene with.

    return [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
}


- (void)application:(UIApplication *)application didDiscardSceneSessions:(NSSet<UISceneSession *> *)sceneSessions {
    // Called when the user discards a scene session.
    // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
    // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
}

- (void)setSceneWindow {
    NSArray *windows = [[UIApplication sharedApplication] windows];
    for (UIWindow *window in [windows reverseObjectEnumerator]) {
        if ([window isKindOfClass:[UIWindow class]] &&
                window.windowLevel == UIWindowLevelNormal &&
                CGRectEqualToRect(window.bounds, [UIScreen mainScreen].bounds)) {
            self.window = window;
            break;
        }
    }
//    如果低于13.0版本，使用该方法。因项目限制最低版本13.0，故忽略
//    self.window = [UIApplication sharedApplication].keyWindow;
}

- (void)setKeyBoard {
    IQKeyboardManager *manager = [IQKeyboardManager sharedManager];
    manager.enable = YES;
    manager.shouldResignOnTouchOutside = YES;
}

#pragma mark - data

- (void)DATA_init {
    // 将所有默认数据写入存储中
    NSString *filterName = kGetUserDefaults(kFilterNameKey);
    if (filterName == nil) {
        kSetUserDefaults(kFilterName, kFilterNameKey);
    }

    NSString *filterUUID = kGetUserDefaults(kFilterUUIDKey);
    if (filterUUID == nil) {
        kSetUserDefaults(kFilterUUID, kFilterUUIDKey);
    }

    NSNumber *filterRSSI = kGetUserDefaults(kFilterRSSIKey);
    if (filterRSSI == nil) {
        kSetUserDefaults([NSNumber numberWithInteger:kFilterRSSI], kFilterRSSIKey);
    }
    NSNumber *filterEmpty = kGetUserDefaults(kFilterEmptyKey);
    if (filterEmpty == nil) {
        kSetUserDefaults([NSNumber numberWithInteger:kFilterEmpty], kFilterEmptyKey);
    }

    NSNumber *step = kGetUserDefaults(kScanStepKey);
    if (step == nil) {
        kSetUserDefaults([NSNumber numberWithInteger:kScanStep], kScanStepKey);
        _timeInterval = kScanStep;
    } else {
        _timeInterval = [step integerValue];
    }

    NSNumber *autoStop = kGetUserDefaults(kConnectAutoStopKey);
    if (autoStop == nil) {
        kSetUserDefaults([NSNumber numberWithInteger:kConnectAutoStop], kConnectAutoStopKey);
    }
}

#pragma mark - 通知相关

- (void)Notice_init {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(Notice_scanStep:) name:kNoticeScanStep object:nil];
}

- (void)Notice_scanStep:(NSNotification *)notification {
    _timeInterval = [notification.object[@"value"] integerValue];
    [self.timer invalidate];
    self.timer = nil;
    [self Timer_init];
}

#pragma mark - 定时器

- (void)Timer_init {
    if (_timeInterval != 0) { //Never 不开启定时器
        self.timer = [NSTimer scheduledTimerWithTimeInterval:_timeInterval target:self selector:@selector(timerNotice) userInfo:nil repeats:YES];
        [[NSRunLoop currentRunLoop] addTimer:self.timer forMode:NSRunLoopCommonModes];
    }
}

- (void)timerNotice {
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeScanRefresh object:nil];
}

@end
