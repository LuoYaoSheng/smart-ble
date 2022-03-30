//
//  Tool.h
//  smartBLE
//
//  Created by lys on 2022/3/25.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface Tool : NSObject

// 秒转化可读文字
+ (NSString *)secText:(NSInteger)sec;

// CBCharacteristicProperties 转可读文字
+ (NSString *)CBCharacteristicPropertyToString:(CBCharacteristicProperties)value;

// 写入文件
+ (void)writeToTXTFileWithString:(NSString *)string fileName:(NSString *)fileName;

// 16进制 转 字符串
+ (NSString *)stringFromHexString:(NSString *)hexString;

// 字符串 转 16进制
+ (NSString *)hexStringFromString:(NSString *)string;

+ (NSData *)strToDataWithString:(NSString *)te;

+ (NSString *)convertDataToHexStr:(NSData *)data;

@end

NS_ASSUME_NONNULL_END
