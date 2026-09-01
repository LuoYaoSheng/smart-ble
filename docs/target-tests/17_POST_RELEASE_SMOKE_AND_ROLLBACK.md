# 17 发布后烟测与回滚

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：发布后的公开面烟测与回滚预案。发布执行见 TP-G5/6。

## 2. 烟测清单（发布后 24h 内）

- [ ] 落地页四入口可达；下载 URL 200 且 SHA 匹配
- [ ] QR 实机可扫；文本等价可见
- [ ] 小程序正式版：扫描→连接→写入→Notify
- [ ] 公开状态与 Release Metadata 一致
- [ ] Evidence/Limitations 更新

## 3. 回滚触发

产物 SHA 不匹配／关键链接 404／公开声明与事实背离／小程序审核态异常。

## 4. 回滚动作

落地页切 NOT_RELEASED（去直链留说明）；产物下架；Issue 公告；版本表补记。

## 5. 退出条件

预案冻结；TP-G6 后首发布执行并归档。
