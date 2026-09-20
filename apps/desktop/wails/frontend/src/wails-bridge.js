//
// SmartBLE Desktop - Wails Bridge (G-WIN)
// E-WIN preload 契约镜像：window.bleAPI -> Wails Go 绑定(window.go.main.App) + 事件(window.runtime)
// 契约源：apps/desktop/electron/src/preload/preload.js（本文件不得私自扩约）
//
// mock 旁路：URL 带 ?mock=true 时不安装桥（app.js 自带 E2E mock polyfill 生效），
// 与 E-WIN「严格浏览器环境 polyfill」同一测试口径。
//
(function () {
    'use strict';
    if (window.location.search.indexOf('mock=true') !== -1) {
        console.warn('[GWIN] mock=true -> wails bridge bypassed, app.js mock polyfill active');
        return;
    }

    function app() {
        var a = window.go && window.go.main && window.go.main.App;
        if (!a) throw new Error('Wails bindings (window.go.main.App) unavailable');
        return a;
    }

    var rt = function () {
        if (!window.runtime) throw new Error('Wails runtime unavailable');
        return window.runtime;
    };

    // 事件订阅：Wails EventsOn 返回反订阅函数，与 E-WIN preload 返回值契约一致
    function sub(eventName, callback) {
        return rt().EventsOn(eventName, function (data) { callback(data); });
    }

    window.bleAPI = {
        // F027 版本元数据：运行时渠道版本（仓库根 VERSION 单源，Go embed 回读）
        getAppVersion: function () { return app().GetAppVersion(); },

        // 退出确认（10_platform §4：close 拦截后 Go 侧发 app:confirm-exit；确认回执退出）
        onConfirmExit: function (callback) {
            return sub('app:confirm-exit', function (data) { callback(data); });
        },
        confirmExit: function (quit) { return app().ConfirmExit(quit); },

        // 初始化（含 platform/arch 回填，对应 E-WIN preload 暴露的 window.platform）
        init: function () {
            var self = this;
            return app().Init().then(async function (r) {
                try {
                    var info = await app().HostPlatform();
                    window.platform = { platform: info.platform, arch: info.arch };
                } catch (e) { /* platform 元数据缺失不阻断 */ }
                return r;
            });
        },

        // 扫描
        startScan: function () { return app().StartScan(); },
        stopScan: function () { return app().StopScan(); },

        // 连接
        connect: function (deviceId) { return app().Connect(deviceId); },
        disconnect: function (deviceId) { return app().Disconnect(deviceId); },

        // 服务
        discoverServices: function (deviceId) { return app().DiscoverServices(deviceId); },

        // 特征值操作（E-WIN 主进程契约：resolve {success,...}，不 reject）
        readCharacteristic: function (deviceId, serviceUuid, charUuid) {
            return app().ReadCharacteristic(deviceId, serviceUuid, charUuid);
        },
        writeCharacteristic: function (deviceId, serviceUuid, charUuid, data, format) {
            return app().WriteCharacteristic(deviceId, serviceUuid, charUuid, data, format);
        },
        writeRaw: function (deviceId, serviceUuid, charUuid, data, withoutResponse) {
            return app().WriteRaw(deviceId, serviceUuid, charUuid, data, withoutResponse);
        },
        notifyCharacteristic: function (deviceId, serviceUuid, charUuid, notify) {
            return app().NotifyCharacteristic(deviceId, serviceUuid, charUuid, notify);
        },

        // 广播（win32 由 Go 侧按 E-WIN 口径返回不支持）
        startAdvertising: function (name, serviceUuids, manufacturerId, manufacturerData, includeName) {
            return app().StartAdvertising(name, serviceUuids, manufacturerId, manufacturerData, includeName);
        },
        stopAdvertising: function () { return app().StopAdvertising(); },

        // 事件监听
        onStateChange: function (callback) { return sub('ble:stateChanged', callback); },
        onDeviceDiscovered: function (callback) { return sub('ble:deviceDiscovered', callback); },
        onDeviceConnected: function (callback) { return sub('ble:deviceConnected', callback); },
        onDeviceDisconnected: function (callback) { return sub('ble:deviceDisconnected', callback); },
        onServicesDiscovered: function (callback) { return sub('ble:servicesDiscovered', callback); },
        onCharacteristicValueChanged: function (callback) { return sub('ble:characteristicValueChanged', callback); },
        onWarning: function (callback) { return sub('ble:warning', callback); }
    };

    console.log('[GWIN] wails bridge installed (bleAPI contract: E-WIN preload mirror)');
})();
