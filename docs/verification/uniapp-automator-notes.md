# UniApp Automator Feasibility Notes

Date: 2026-08-22 (Asia/Shanghai)
Project: `apps/uniapp`
Target: `mp-weixin`

## Scope

This is an environment and non-BLE navigation spike only. It does not mock a successful scan, connection, GATT operation, Smart HID workflow, or peripheral broadcast.

## Installed Environment

- HBuilderX: `5.24.2026081301`
- WeChat Developer Tools: `2.02.2608040`
- Bundled `@dcloudio/uni-automator`: `3.0.0-5020420260812001`; package metadata lists `mp-weixin` support.
- HBuilderX CLI path: `/Applications/HBuilderX.app/Contents/MacOS/cli`
- HBuilderX uni-app automation test extension: `hbuilderx-for-uniapp-test` `5.2.1`, installed from DCloud's official plugin marketplace.
- Test dependencies: installed in HBuilderX's official `hbuilderx-for-uniapp-test-lib` directory; no dependency was added to the Smart BLE project.

The bundled Node library is not equivalent to the HBuilderX automation test extension. The extension is now installed and registers `cli uniapp.test` successfully.

## Official Command Contract

Official documentation checked on 2026-08-22:

- help: `cli uniapp.test --help`
- run: `cli uniapp.test <platform> --project <ProjectPath>`
- WeChat platform: `mp-weixin`
- required argument: `--project <ProjectPath>`
- optional arguments: `--testcaseFile` and `--device_id` for the documented target-specific cases, plus `--help` and `--version`

Source: <https://uniapp.dcloud.net.cn/worktile/auto/hbuilderx-cli-uniapp-test.html>

## Initial Probe Results

### Help

```text
/Applications/HBuilderX.app/Contents/MacOS/cli uniapp.test --help
-1:cli:命令'uniapp.test'不存在或缺少参数 当前命令执行错误
```

### Exact WeChat command

```text
/Applications/HBuilderX.app/Contents/MacOS/cli uniapp.test mp-weixin --project /Users/luoyaosheng/Desktop/project/Open/smart-ble/apps/uniapp
-1:cli:命令'uniapp.test mp-weixin'不存在或缺少参数 当前命令执行错误
```

Before the extension was installed, the second command returned process exit code `0` despite printing an error. Automation wrappers must therefore inspect both output and exit status; exit code alone would create false evidence.

## Minimal Test

`apps/uniapp/pages/index/index.test.js` is intentionally non-BLE. It now:

1. relaunch `pages/index/index`;
2. assert the current page path;
3. use WeChat `Page.selectComponent('#scan-summary')` through `program.evaluate` and assert runtime text is `待开始` / `开始扫描`;
4. assert the four configured TabBar labels and paths;
5. switch to every TabBar page and assert its path.

The official plugin generated `apps/uniapp/jest.config.js` and `apps/uniapp/env.js`. The WeChat CLI is configured as `/Applications/wechatwebdevtools.app/Contents/MacOS/cli` on port `9420`.

## Successful Run

Command:

```bash
/Applications/HBuilderX.app/Contents/MacOS/cli uniapp.test mp-weixin \
  --project /Users/luoyaosheng/Desktop/project/Open/smart-ble/apps/uniapp
```

Final result at 2026-08-22 17:03 (Asia/Shanghai):

- test suites: `1 passed / 1 total`
- tests: `3 passed / 3 total`
- Scan runtime initial state and action text: passed
- four TabBar labels and route switches: passed
- WeChat simulator screenshot: passed
- JSON evidence: `evidence/20260822-1703_E4_mp-weixin_automator-result.json`
- screenshot: `evidence/20260822-1703_E4_mp-weixin_F27-automator-scan.png`

The plugin's final localized aggregate line incorrectly printed `通过 0 / 失败 1` for the 17:03 run, while the immediately preceding Jest output and generated JSON both report one passed suite and three passed tests. The JSON is retained as the machine-readable evidence, and the contradictory plugin line is classified as a reporting defect rather than hidden.

The plugin still prints that GUI HBuilderX cannot find Homebrew Node because its extension-host PATH omits `/opt/homebrew/bin`. This is an environment warning: dependency checks pass and the test command runs through HBuilderX's bundled Node (`UNI_NODE_PATH`) to completion.

## Evidence Status

| Capability | Result | Evidence status |
|---|---|---|
| CLI command registration | available, plugin 5.2.1 | passed |
| Test discovery | one suite, three tests | passed |
| Scan page assertion | runtime `待开始` / `开始扫描` | passed |
| TabBar switching | all four configured paths | passed |
| Element tap | not run | unproven |
| Automated screenshot | Scan page captured | passed |
| BLE behavior | deliberately excluded | unproven |

## Safe Next Step

Expand page automation only for deterministic non-hardware states. Do not mock successful BLE in the page process or promote E5 rows from this suite. Real permission, GATT, Smart HID firmware, and peripheral broadcasting remain on the real-device checklist.
