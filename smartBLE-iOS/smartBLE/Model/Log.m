//
// Created by lys on 2022/3/30.
//

#import "Log.h"


@implementation Log

- (instancetype)init {
    self = [super init];
    if (self) {
        _date = [NSDate date];
    }
    return self;
}

- (NSString *)desc {
    NSTimeZone *zone = [NSTimeZone localTimeZone];
    NSInteger interval = [zone secondsFromGMTForDate: self.date];
    NSDate *localeDate = [self.date  dateByAddingTimeInterval: interval];
    
    NSString *str = [NSString stringWithFormat:@"{\"date\":\"%@\",\"type\":%ld,\"uuid\":\"%@\",\"content\":\"%@\"}", localeDate , (long)self.type, self.uuid, self.content ];
    return str;
}

@end
