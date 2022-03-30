//
//  AdIntervalViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/26.
//

#import "AdIntervalViewController.h"
#import "AdvertiserSettingViewController.h"
#import "IntervalCell.h"

@interface AdIntervalViewController ()
@property(strong, nonatomic) NSMutableArray *dataList;
@end

@implementation AdIntervalViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [self DATA_init];
}

#pragma mark - data

- (void)DATA_init {

    _dataList = [@[
            @{@"title": @"1 Sec", @"value": @1, @"checked": @false},
            @{@"title": @"2 Sec", @"value": @2, @"checked": @false},
            @{@"title": @"3 Sec", @"value": @3, @"checked": @false},
            @{@"title": @"4 Sec", @"value": @4, @"checked": @false},
            @{@"title": @"5 Sec", @"value": @5, @"checked": @false},
            @{@"title": @"6 Sec", @"value": @6, @"checked": @false},
            @{@"title": @"7 Sec", @"value": @7, @"checked": @false},
            @{@"title": @"8 Sec", @"value": @8, @"checked": @false},
            @{@"title": @"9 Sec", @"value": @9, @"checked": @false},
            @{@"title": @"10 Sec", @"value": @10, @"checked": @false},
            @{@"title": @"15 Sec", @"value": @15, @"checked": @false},
            @{@"title": @"30 Sec", @"value": @30, @"checked": @false}] mutableCopy];

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

#pragma mark - ui

- (void)UI_back {
//    AdvertiserSettingViewController *vc = [self.navigationController.viewControllers objectAtIndex:self.navigationController.viewControllers.count - 2];
//    vc.rspStep = _interval;
    [self.navigationController popViewControllerAnimated:YES];
}

#pragma mark - UITableViewDataSource, UITableViewDelegate

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {

    IntervalCell *cell = [IntervalCell cellWithTableView:tableView];
    NSDictionary *pObj = _dataList[(NSUInteger) indexPath.row];
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
        NSMutableDictionary *dic1 = [NSMutableDictionary dictionaryWithDictionary:_dataList[(NSUInteger) index]];
        dic1[@"checked"] = @false;
        _dataList[(NSUInteger) index] = dic1;

        NSIndexPath *indexPath1 = [NSIndexPath indexPathForRow:index inSection:0];
        [indexPaths addObject:indexPath1];
    }

    NSMutableDictionary *dic = [NSMutableDictionary dictionaryWithDictionary:_dataList[(NSUInteger) indexPath.row]];
    dic[@"checked"] = @true;
    _dataList[(NSUInteger) indexPath.row] = dic;
    [indexPaths addObject:indexPath];

    [self.tableView reloadRowsAtIndexPaths:indexPaths withRowAnimation:UITableViewRowAnimationAutomatic];

    // 更新选中值
    _interval = [dic[@"value"] integerValue];
    [[NSNotificationCenter defaultCenter] postNotificationName:kNoticeBroadcast object:@{@"type": @(AdvertiserNotifyTypeRspStep), @"value": @(_interval)}];
    [self performSelector:@selector(UI_back) withObject:nil afterDelay:0.3];
}

@end
