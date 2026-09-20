//
// SmartBLE Desktop - Automation Shim (G-WIN 测试基建，非产品功能)
// Go 侧 automation.go 在 SMARTBLE_AUTOMATION_PORT 设置时启动 TCP 服务，经
// wails 事件把 eval 请求转发到本 shim 执行，结果经 App.AutomationResult 回执。
// 生产启动（无 env）时 AutomationEnabled()=false，本 shim 自行休眠，零行为差异。
// 独立于 wails-bridge.js：mock 模式（?mock=true 桥旁路）下仍可用。
//
(function () {
    'use strict';
    function bindings() {
        return window.go && window.go.main && window.go.main.App;
    }

    function install() {
        var app = bindings();
        if (!app || typeof app.AutomationEnabled !== 'function') return;
        app.AutomationEnabled().then(function (on) {
            if (!on) return;

            // console.error 缓冲（走查收尾断言「无未捕获渲染层错误」用）
            window.__automationErrors = [];
            var origError = console.error.bind(console);
            console.error = function () {
                try {
                    window.__automationErrors.push(
                        Array.prototype.map.call(arguments, function (a) {
                            return typeof a === 'object' ? JSON.stringify(a) : String(a);
                        }).join(' ').slice(0, 300));
                } catch (_) { /* 不因序列化失败丢原始错误 */ }
                origError.apply(null, arguments);
            };

            window.runtime.EventsOn('automation:eval', function (msg) {
                (async function () {
                    var out;
                    try {
                        var v = await eval(msg.expr); // eslint-disable-line no-eval
                        out = { ok: true, v: v === undefined ? null : v };
                    } catch (e) {
                        out = { ok: false, err: String(e) };
                    }
                    try {
                        await bindings().AutomationResult(String(msg.id), JSON.stringify(out));
                    } catch (e) {
                        origError('[automation] result failed: ' + e);
                    }
                })();
            });
            console.log('[GWIN] automation shim active');
        }).catch(function () { /* 探针失败即静默 */ });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install);
    } else {
        install();
    }
})();
