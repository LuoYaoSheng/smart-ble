//
//  Common.h
//  smartBLE
//
//  Created by lys on 2022/3/25.
//

#ifndef Common_h
#define Common_h

#import "Tool.h"
#import "EnumConfig.h"
#import "Log.h"

#define APPID @"1614439113"

// 永久存储对象
//#define kSetUserDefaults(object, key) [[NSUserDefaults standardUserDefaults] setObject:object forKey:key];
#define kSetUserDefaults(object, key) \
({ \
NSUserDefaults * defaults = [NSUserDefaults standardUserDefaults]; \
[defaults setObject:object forKey:key]; \
[defaults synchronize]; \
})
//获取对象
#define kGetUserDefaults(key) [[NSUserDefaults standardUserDefaults] objectForKey:key]
//删除某一个对象
#define kRemoveUserDefaults(key) \
({ \
NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults]; \
[defaults removeObjectForKey:_key]; \
[defaults synchronize]; \
})
//清除 NSUserDefaults 保存的所有数据
#define kRemoveAllUserDefaults  [[NSUserDefaults standardUserDefaults] removePersistentDomainForName:[[NSBundle mainBundle] bundleIdentifier]]

/**
 * NSLog相关
 **/
#ifdef DEBUG
#define MLLog(...) NSLog(@"%s 第%d行 \n %@\n\n",__func__,__LINE__,[NSString stringWithFormat:__VA_ARGS__])
#else
#define NSLog(...)
#endif
/**
 * 判断数据是否为空
 **/
#define kISNullString(str) ([str isKindOfClass:[NSNull class]] || str == nil || [str length] < 1 ? YES : NO ) //字符串是否为空

// 常量定义
#define kApiUrl                     @"http://www.i2kai.com"
#define kGitHubUrl                  @"https://github.com/LuoYaoSheng/SimpleBLE"
#define kFeedbackUrl                @"https://github.com/LuoYaoSheng/SimpleBLE/issues"
#define kPrivacyPolicyUrl           @"https://github.com/LuoYaoSheng/SimpleBLE/wiki/privacy"
#define kEvaluateUrl                @"https://weibo.com/u/3319790374"

// 默认值
#define kFilterName                 @"" // 过滤器 - 名称
#define kFilterUUID                 @"" // 过滤器 - UUID
#define kFilterRSSI                 -100 // 过滤器 - RSSI
#define kFilterEmpty                false // 过滤器 - 空名过滤

#define kLogFormat                  0 // 0：HEX , 1：ASCII
#define kLogSimplify                false // 是否简化
#define kLogAutoRoll                true // 是否自动滚动
#define kLogFileName                @"log_ble_file" // Log存储文件名

#define kRspModel                   0 // 响应模式：0：被写入，1：循环
#define kRspStep                    1 // 响应间隔，秒

#define kScanStep                   30 // 扫描间隔，秒
#define kConnectAutoStop            true // 连接后是否停止扫描

// 存储key
#define kFilterNameKey              @"kFilterNameKey"
#define kFilterUUIDKey              @"kFilterUUIDKey"
#define kFilterRSSIKey              @"kFilterRSSIKey"
#define kFilterEmptyKey             @"kFilterEmptyKey"

#define kScanStepKey                @"kScanStepKey"
#define kConnectAutoStopKey         @"kConnectAutoStopKey"

// 通知
#define kNoticeScanFilter           @"notice_scan_filter"
#define kNoticeScanStep             @"notice_scan_step"
#define kNoticeScanRefresh          @"notice_scan_refresh"
#define kNoticeScanLog              @"notice_scan_log"
#define kNoticeBroadcast            @"notice_broadvast"

#endif /* Common_h */
