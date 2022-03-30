//
//  LogsViewController.m
//  smartBLE
//
//  Created by lys on 2022/3/19.
//

#import "LogsViewController.h"
#import "LogsCell.h"

@interface LogsViewController ()
@property (nonatomic, strong) NSMutableArray *dataList;
@property (nonatomic, strong) UILabel *emtpyLabel;
@property(strong, nonatomic) IBOutlet UITableView *tableview;
@end

@implementation LogsViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [self DATA_init];
    [self UI_init];
    [self Notice_init];
}

#pragma mark - data
- (void)DATA_init {
    _dataList = [NSMutableArray array];
}

- (void)DATA_insert:(Log *)log {
    [_dataList addObject: log];

    NSMutableArray *indexPaths = [[NSMutableArray alloc] init];
    NSIndexPath *indexPath = [NSIndexPath indexPathForRow:_dataList.count - 1 inSection:0];
    [indexPaths addObject:indexPath];
    [self.tableview insertRowsAtIndexPaths:indexPaths withRowAnimation:UITableViewRowAnimationAutomatic];
    [self UI_empty];
}

#pragma mark - ui
- (void)UI_init {
    _emtpyLabel = [[UILabel alloc]initWithFrame:self.view.bounds];
    [self.view addSubview: _emtpyLabel];
    _emtpyLabel.center = CGPointMake(self.view.center.x, self.view.center.y*0.7);
    _emtpyLabel.text = @"等待设备接入……";
    _emtpyLabel.font = [UIFont systemFontOfSize:19];
    _emtpyLabel.textAlignment = NSTextAlignmentCenter;
    _emtpyLabel.textColor = [UIColor systemGray3Color];
    [self UI_empty];
}

- (void)UI_empty {
    _emtpyLabel.hidden = _dataList.count > 0 ? YES:NO;
}

- (void)UI_update_scrollToBottom {
    if(_dataList.count > 0){
        NSIndexPath *indexpath = [NSIndexPath indexPathForRow:_dataList.count-1 inSection:0];
        [self.tableView scrollToRowAtIndexPath:indexpath atScrollPosition:UITableViewScrollPositionBottom animated:NO];
    }
}

#pragma mark - 通知相关
- (void)Notice_init {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(Notice_event:) name:kNoticeScanLog object:nil];
}

- (void)Notice_event:(NSNotification *)notification {
    [self DATA_insert: notification.object];
    [self UI_update_scrollToBottom];
}

#pragma mark - Action

- (IBAction)clearAction:(id)sender {
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"温馨提示" message:@"清空后，日志将不会保留" preferredStyle:UIAlertControllerStyleAlert];
    UIAlertAction *action1 = [UIAlertAction actionWithTitle:@"清空" style:UIAlertActionStyleDestructive handler:^(UIAlertAction *_Nonnull action) {
        self->_dataList = [NSMutableArray array];
        [self.tableView reloadData];
        [self UI_empty];
        [self.view makeToast:@"日志已清空"];
    }];
    UIAlertAction *action2 = [UIAlertAction actionWithTitle:@"取消" style:UIAlertActionStyleDefault handler:^(UIAlertAction *_Nonnull action) {
    }];

    [alert addAction:action1];
    [alert addAction:action2];
    [self.navigationController presentViewController:alert animated:YES completion:nil];
}

- (IBAction)exportAction:(id)sender {
    NSMutableString *mString = [NSMutableString stringWithString:@"["];
    for (int i = 0; i < _dataList.count; i++) {
        Log *l = _dataList[i];
        [mString appendString: l.desc ];
        if (i != _dataList.count-1) {
            [mString appendString:@","];
        }
    }
    [mString appendString: @"]" ];
    
    [UIPasteboard generalPasteboard].string = mString;
    [self.view makeToast:@"已拷贝到粘贴板"];
}

#pragma mark - UITableViewDataSource, UITableViewDelegate

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {

    LogsCell *cell = [LogsCell cellWithTableView:tableView];

    Log *pObj = [_dataList objectAtIndex: indexPath.row];
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

    Log *l = _dataList[indexPath.row];
    [UIPasteboard generalPasteboard].string = l.desc;
    [self.view makeToast:@"已拷贝该行到粘贴板"];
}

@end
