//
//  IntervalViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/21.
//

#import "IntervalViewController.h"
#import "IntervalCell.h"

@interface IntervalViewController ()
@property(assign, nonatomic) NSInteger interval;
@property(strong, nonatomic) NSMutableArray *dataList;
@end

@implementation IntervalViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.

    [self DATA_init];
}

- (void)DATA_init {

    NSNumber *step = kGetUserDefaults(kScanStepKey); // 此处一定存在
    _interval = [step integerValue];

    _dataList = [NSMutableArray arrayWithObjects:
            @{@"title": [Tool secText:5], @"value": @5, @"checked": @false},
            @{@"title": [Tool secText:30], @"value": @30, @"checked": @false},
            @{@"title": [Tool secText:60], @"value": @60, @"checked": @false},
            @{@"title": [Tool secText:120], @"value": @120, @"checked": @false},
            @{@"title": [Tool secText:300], @"value": @300, @"checked": @false},
            @{@"title": [Tool secText:1800], @"value": @1800, @"checked": @false},
            @{@"title": [Tool secText:0], @"value": @0, @"checked": @false},
                    nil];

    [self DATA_update_checked];
}

- (NSInteger)DATA_getIndex {
    for (NSInteger i = 0; i < _dataList.count; i++) {
        NSDictionary *dic = _dataList[i];
        if ([dic[@"value"] integerValue] == _interval) {
            return i;
        }
    }
    return -1;
}

- (void)DATA_update_checked {
    for (NSInteger i = 0; i < _dataList.count; i++) {
        NSMutableDictionary *dic = [NSMutableDictionary dictionaryWithDictionary:_dataList[i]];
        if ([dic[@"value"] integerValue] == _interval) {
            dic[@"checked"] = @true;
            _dataList[i] = dic;
            break;;
        }
    }
}

- (void)UI_back {
    [self.navigationController popViewControllerAnimated:YES];
}

#pragma mark - UITableViewDataSource, UITableViewDelegate

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {

    IntervalCell *cell = [IntervalCell cellWithTableView:tableView];
    NSDictionary *pObj = [_dataList objectAtIndex:indexPath.row];
    [cell setObj:pObj];
    return cell;
}

- (CGFloat)tableView:(UITableView *)tableView heightForRowAtIndexPath:(NSIndexPath *)indexPath {
    return 48;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    return _dataList != nil ? _dataList.count : 0;
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    [tableView deselectRowAtIndexPath:indexPath animated:NO];

    // 更新两行 - 旧的去掉勾，新的增加勾
    NSMutableArray *indexPaths = [NSMutableArray array];

    NSInteger index = [self DATA_getIndex];
    if (index >= 0) {
        NSMutableDictionary *dic1 = [NSMutableDictionary dictionaryWithDictionary:_dataList[index]];
        dic1[@"checked"] = @false;
        _dataList[index] = dic1;

        NSIndexPath *indexPath1 = [NSIndexPath indexPathForRow:index inSection:0];
        [indexPaths addObject:indexPath1];
    }

    NSMutableDictionary *dic = [NSMutableDictionary dictionaryWithDictionary:_dataList[indexPath.row]];
    dic[@"checked"] = @true;
    _dataList[indexPath.row] = dic;
    [indexPaths addObject:indexPath];

    [self.tableView reloadRowsAtIndexPaths:indexPaths withRowAnimation:UITableViewRowAnimationAutomatic];

    // 更新选中值
    _interval = [dic[@"value"] integerValue];
    // 存储
    kSetUserDefaults([NSNumber numberWithInteger:_interval], kScanStepKey);

    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeScanStep object:dic];

    [self performSelector:@selector(UI_back) withObject:nil afterDelay:0.3];
}

@end

