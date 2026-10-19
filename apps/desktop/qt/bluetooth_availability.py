"""Actual Windows adapter/radio facts, separate from scanner exception wording."""
import asyncio
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class Availability:
    state: str
    word: str
    hint: str
    dot: str = 'unknown'

    @property
    def can_scan(self): return self.state == 'ready'


MESSAGES = {
    'checking': ('正在检测蓝牙', '正在检测蓝牙适配器，请稍候', 'unknown'),
    'ready': ('蓝牙就绪', '蓝牙就绪，可以扫描附近的 BLE 设备', 'on'),
    'no_adapter': ('未检测到蓝牙适配器', '未检测到蓝牙适配器；连接支持 BLE 的适配器后，请重新检测', 'unknown'),
    'off': ('蓝牙未开启', '请在 Windows 设置中开启蓝牙后重新检测', 'off'),
    'disabled': ('蓝牙被系统禁用', '请检查设备或系统设置后重新检测', 'off'),
    'permission_denied': ('蓝牙权限未授予', '请检查 Windows 蓝牙访问权限后重新检测', 'off'),
    'unsupported': ('平台不支持', '本客户端的蓝牙实现需要 Windows WinRT 接口', 'unknown'),
    'unsupported_adapter': ('适配器不支持 BLE', '请使用支持低功耗蓝牙的适配器', 'unknown'),
    'unknown': ('蓝牙状态未知', '无法确认无线电状态，请重新检测', 'unknown'),
    'error': ('蓝牙检测失败', '蓝牙检测失败，请重新检测；未确认平台不支持或蓝牙关闭', 'unknown'),
}


def availability(state):
    return Availability(state, *MESSAGES[state])


def exception_availability(error):
    code = getattr(error, 'winerror', None)
    if isinstance(error, PermissionError) or code in (5, -2147024891, 0x80070005):
        return availability('permission_denied')
    return availability('error')


async def query_windows_availability(adapter_factory=None, platform_name=None):
    if (platform_name or sys.platform) != 'win32': return availability('unsupported')
    try:
        if adapter_factory is None:
            from bleak.backends.winrt.util import assert_mta
            from winrt.windows.devices.bluetooth import BluetoothAdapter
            await assert_mta()
            adapter_factory = BluetoothAdapter.get_default_async
        adapter = await asyncio.wait_for(adapter_factory(), timeout=3)
        if adapter is None: return availability('no_adapter')
        if not adapter.is_low_energy_supported: return availability('unsupported_adapter')
        radio = await asyncio.wait_for(adapter.get_radio_async(), timeout=3)
        if radio is None: return availability('unknown')
        value = getattr(radio.state, 'name', '').upper()
        return availability({'ON': 'ready', 'OFF': 'off', 'DISABLED': 'disabled'}.get(value, 'unknown'))
    except Exception as error:
        return exception_availability(error)
