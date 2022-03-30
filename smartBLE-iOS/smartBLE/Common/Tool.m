//
//  Tool.m
//  smartBLE
//
//  Created by lys on 2022/3/25.
//

#import "Tool.h"

@implementation Tool

// 秒转化可读文字
+ (NSString *)secText:(NSInteger)sec {
    if (sec == 0) {
        return @"Never";
    } else if (sec < 60) {
        return [NSString stringWithFormat:@"%ld Sec", (long) sec];
    } else {
        return [NSString stringWithFormat:@"%ld Min", sec / 60];
    }
}

// CBCharacteristicProperties 转可读文字
+ (NSString *)CBCharacteristicPropertyToString:(CBCharacteristicProperties)value {
    NSString *str;
    switch (value) {
        case 2:
            str = @"Read";
            break;
        case 8:
            str = @"Write";
            break;
        case 16:
            str = @"Notify";
            break;
        case 18:
            str = @"Read、Notify";
            break;
        case 136:
            str = @"Write、Extended Properties";
            break;
        case 138:
            str = @"Read、Write、Extended Properties";
            break;
        case 152:
            str = @"Read、Notify、Extended Properties";
            break;
        default:
            str = [NSString stringWithFormat:@"default properties %ld", value];
            break;
    }
//    return [NSString stringWithFormat:@"支持类型: %@",str];
    return [NSString stringWithFormat:@"%@", str];
}

// 写入文件
+ (void)writeToTXTFileWithString:(NSString *)string fileName:(NSString *)fileName {
    dispatch_async(dispatch_get_global_queue(0, 0), ^{
        @synchronized (self) {
            //获取沙盒路径
            NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
            //获取文件路径
            NSString *fullName = [NSString stringWithFormat:@"%@.txt", fileName];
            NSString *theFilePath = [[paths objectAtIndex:0] stringByAppendingPathComponent:fullName];
            //创建文件管理器
            NSFileManager *fileManager = [NSFileManager defaultManager];
            //如果文件不存在 创建文件
            if (![fileManager fileExistsAtPath:theFilePath]) {
                [@"" writeToFile:theFilePath atomically:YES encoding:NSUTF8StringEncoding error:nil];
            }
            NSFileHandle *fileHandle = [NSFileHandle fileHandleForUpdatingAtPath:theFilePath];
            [fileHandle seekToEndOfFile];  //将节点跳到文件的末尾
            NSData *stringData = [[NSString stringWithFormat:@"%@\n", string] dataUsingEncoding:NSUTF8StringEncoding];
            [fileHandle writeData:stringData]; //追加写入数据
            [fileHandle closeFile];
        }
    });
}

// 16进制 转 字符串
+ (NSString *)stringFromHexString:(NSString *)hexString {
    char *myBuffer = (char *) malloc((size_t) ((int) [hexString length] / 2 + 1));
    bzero(myBuffer, [hexString length] / 2 + 1);
    for (int i = 0; i < [hexString length] - 1; i += 2) {
        unsigned int anInt;
        NSString *hexCharStr = [hexString substringWithRange:NSMakeRange(i, 2)];
        NSScanner *scanner = [[NSScanner alloc] initWithString:hexCharStr];
        [scanner scanHexInt:&anInt];
        myBuffer[i / 2] = (char) anInt;
    }
    NSString *unicodeString = [NSString stringWithCString:myBuffer encoding:4];
    return unicodeString;
}

// 字符串 转 16进制
+ (NSString *)hexStringFromString:(NSString *)string {
    NSData *myD = [string dataUsingEncoding:NSUTF8StringEncoding];
    Byte *bytes = (Byte *) [myD bytes];
    //下面是Byte 转换为16进制。
    NSString *hexStr = @"";
    for (int i = 0; i < [myD length]; i++) {
        NSString *newHexStr = [NSString stringWithFormat:@"%x", bytes[i] & 0xff];///16进制数
        if ([newHexStr length] == 1) {
            hexStr = [NSString stringWithFormat:@"%@0%@", hexStr, newHexStr];
        } else {
            hexStr = [NSString stringWithFormat:@"%@%@", hexStr, newHexStr];
        }
    }
    return hexStr;
}

+ (NSData *)strToDataWithString:(NSString *)str {

    NSString *te = str;
    if ([te hasPrefix:@"0x"]) {
        te = [te substringFromIndex:2];
    }

    NSMutableData *data = [NSMutableData data];
    int idx;
    for (idx = 0; idx + 2 <= te.length; idx += 2) {
        NSRange range = NSMakeRange(idx, 2);
        NSString *hexStr = [te substringWithRange:range];
        NSScanner *scanner = [NSScanner scannerWithString:hexStr];
        unsigned int intValue;
        [scanner scanHexInt:&intValue];

        [data appendBytes:&intValue length:1];
    }
    return data;
}

+ (NSString *)convertDataToHexStr:(NSData *)data {
    if (!data || [data length] == 0) {
        return @"";
    }
    NSMutableString *string = [[NSMutableString alloc] initWithCapacity:[data length]];

    [data enumerateByteRangesUsingBlock:^(const void *bytes, NSRange byteRange, BOOL *stop) {
        unsigned char *dataBytes = (unsigned char *) bytes;
        for (NSInteger i = 0; i < byteRange.length; i++) {
            NSString *hexStr = [NSString stringWithFormat:@"%x", (dataBytes[i]) & 0xff];
            if ([hexStr length] == 2) {
                [string appendString:hexStr];
            } else {
                [string appendFormat:@"0%@", hexStr];
            }
        }
    }];

    return string;
}

@end
