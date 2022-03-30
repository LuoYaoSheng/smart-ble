
#ifndef EnumConfig_h
#define EnumConfig_h


typedef NS_ENUM(NSInteger, AdvertiserNotifyType) {
    AdvertiserNotifyTypeLogFormat = 0,
    AdvertiserNotifyTypeLogSimplify,
    AdvertiserNotifyTypeLogAutoRoll,
    AdvertiserNotifyTypeRspModel,
    AdvertiserNotifyTypeRspStep,
    AdvertiserNotifyTypeClear,
    AdvertiserNotifyTypeState,
} NS_ENUM_AVAILABLE(10_13, 10_0);

typedef NS_ENUM(NSInteger, LogType) {
    LogTypeConnet = 0,
    LogTypeRead,
    LogTypeReceive,
    LogTypeWrite,
    LogTypeNotify,
    LogTypeError,
} NS_ENUM_AVAILABLE(10_13, 10_0);

#endif /* Common_h */
