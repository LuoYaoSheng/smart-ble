//
//  ScannerViewController.h
//  smartBLE
//
//  Created by lys on 2022/3/19.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface ScannerViewController : UITableViewController

@property (nonatomic, strong) NSString *filterName;
@property (nonatomic, strong) NSString *filterUuid;
@property (nonatomic, assign) NSInteger filterRssi;
@property (nonatomic, assign) BOOL filterEmpty;

@end

NS_ASSUME_NONNULL_END
