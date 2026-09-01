# 落地页与 Release 差距报告

```yaml
status: REVIEW
generated_from: reports/target-vs-current/target-vs-current.json
```

记录数（筛选后）：14

| Target | Kind | Impl | Verify | Sev | First Breakpoint | FIX |
|---|---|---|---|---|---|---|
| FEAT-004 | RELEASE | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | 仓库根 VERSION 单源文件缺失 | FIX-RELEASE-001 |
| FEAT-066 | RELEASE | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | 仓库根 VERSION 单源文件缺失 | FIX-RELEASE-001 |
| FEAT-075 | LANDING | PARTIAL | AUTOMATED_FAIL | P0 | docs/index.md 三卡均链 releases/latest 假主下载 | FIX-LANDING-001 |
| WEB-001 | LANDING | PARTIAL | BLOCKED_BY_TOOLCHAIN | P0 | 假主下载 releases/latest；另有 Playwright BLOCKED_BY_TOOLCHAIN | FIX-LANDING-001 |
| STATE-W001-01 | LANDING | PARTIAL | BLOCKED_BY_TOOLCHAIN | — | 自动化未执行（BLOCKED_BY_TOOLCHAIN）；产品态需静态核对 | FIX-TEST-002 |
| STATE-W001-02 | LANDING | PARTIAL | BLOCKED_BY_TOOLCHAIN | — | 自动化未执行（BLOCKED_BY_TOOLCHAIN）；产品态需静态核对 | FIX-TEST-002 |
| STATE-W001-03 | LANDING | NOT_IMPLEMENTED | AUTOMATED_FAIL | P0 | NOT_RELEASED 无产物时应无下载链接；当前仍暴露 releases/latest | FIX-LANDING-001 |
| STATE-W001-04 | LANDING | PARTIAL | BLOCKED_BY_TOOLCHAIN | — | 自动化未执行（BLOCKED_BY_TOOLCHAIN）；产品态需静态核对 | FIX-TEST-002 |
| OP-W001-03 | LANDING | PARTIAL | AUTOMATED_FAIL | P0 | 下载 CTA 指向 releases/latest 而非 NOT_RELEASED/真实产物 | FIX-LANDING-001 |
| OP-W001-04 | LANDING | PARTIAL | AUTOMATED_FAIL | P0 | 下载 CTA 指向 releases/latest 而非 NOT_RELEASED/真实产物 | FIX-LANDING-001 |
| OP-W001-05 | LANDING | PARTIAL | AUTOMATED_FAIL | P0 | 下载 CTA 指向 releases/latest 而非 NOT_RELEASED/真实产物 | FIX-LANDING-001 |
| CLAIM-016 | LANDING | PARTIAL | AUTOMATED_FAIL | P0 | docs/index.md download-hub → releases/latest | FIX-LANDING-001 |
| CLAIM-018 | LANDING | PARTIAL | AUTOMATED_FAIL | P0 | docs/index.md download-hub → releases/latest | FIX-LANDING-001 |
| CLAIM-028 | LANDING | PARTIAL | AUTOMATED_FAIL | P0 | docs/index.md download-hub → releases/latest | FIX-LANDING-001 |


