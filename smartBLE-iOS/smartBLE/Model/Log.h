//
// Created by lys on 2022/3/30.
//

#import <Foundation/Foundation.h>


@interface Log : NSObject
@property (nonatomic, assign) NSInteger type;
@property (nonatomic, strong) NSString *uuid;
@property (nonatomic, strong) NSString *content;
@property (nonatomic, strong) NSDate *date;

- (NSString *)desc;
@end
