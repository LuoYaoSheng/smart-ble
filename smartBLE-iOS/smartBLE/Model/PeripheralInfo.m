//
//  PeripheralInfo.m
//  smartBLE
//
//  Created by lys on 2022/3/28.
//

#import "PeripheralInfo.h"

@implementation PeripheralInfo

- (instancetype)init {
    self = [super init];
    if (self) {
        _characteristics = [[NSMutableArray alloc]init];
    }
    return self;
}

@end
