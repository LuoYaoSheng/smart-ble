import asyncio
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from att_client import AttClient, QueueFullError, RetiredConnectionError, owns_native

class Native:
    is_connected = True
    def __init__(self):
        self.calls, self.live, self.peak, self.disconnects = [], 0, 0, 0
        self.gate = None
        self.ignore_cancel = False
        self.notify = None
    async def read_gatt_char(self, value, **kwargs):
        self.calls.append(('read', value)); self.live += 1; self.peak = max(self.peak, self.live)
        try:
            if self.gate is not None:
                while not self.gate.is_set():
                    try: await self.gate.wait()
                    except asyncio.CancelledError:
                        if not self.ignore_cancel: raise
            await asyncio.sleep(.001)
            return value
        finally: self.live -= 1
    async def write_gatt_char(self, value, data, response=None):
        return await self.read_gatt_char(value)
    async def start_notify(self, characteristic, callback, **kwargs):
        self.notify = callback
        return await self.read_gatt_char(characteristic)
    async def stop_notify(self, characteristic): return await self.read_gatt_char(characteristic)
    async def disconnect(self): self.disconnects += 1; self.is_connected = False

class QueueTests(unittest.IsolatedAsyncioTestCase):
    async def settle(self):
        await asyncio.sleep(.005)
    async def test_one_device_is_serial_and_fifo_including_mixed_methods(self):
        native = Native(); client = AttClient(native)
        result = await asyncio.gather(client.read_gatt_char('read'), client.write_gatt_char('write', b'x', response=True), client.start_notify('notify', lambda *_: None))
        self.assertEqual(native.peak, 1)
        self.assertEqual(result, ['read', 'write', 'notify'])
        self.assertEqual(client.depth, 0)
        await client.disconnect()
    async def test_devices_execute_in_parallel(self):
        a, b = Native(), Native(); a.gate = b.gate = asyncio.Event()
        ca, cb = AttClient(a), AttClient(b)
        tasks = [asyncio.create_task(ca.read_gatt_char('A')), asyncio.create_task(cb.read_gatt_char('B'))]
        await self.settle()
        self.assertEqual(a.live, 1); self.assertEqual(b.live, 1)
        a.gate.set(); await asyncio.gather(*tasks)
        await ca.disconnect(); await cb.disconnect()
    async def test_depth_sixteen_includes_current_request_and_rejects_seventeenth(self):
        native = Native(); native.gate = asyncio.Event(); client = AttClient(native)
        tasks = [asyncio.create_task(client.read_gatt_char(i)) for i in range(16)]
        await self.settle()
        self.assertEqual(client.depth, 16); self.assertEqual(native.live, 1)
        with self.assertRaises(QueueFullError): await client.read_gatt_char(16)
        native.gate.set(); self.assertEqual(await asyncio.gather(*tasks), list(range(16)))
        await client.disconnect()
    async def test_timeout_retires_link_and_old_ack_cannot_complete_queued_request(self):
        native = Native(); native.gate = asyncio.Event(); native.ignore_cancel = True
        retired = []; client = AttClient(native, retired.append, timeouts={'read': .01})
        first = asyncio.create_task(client.read_gatt_char('old'))
        second = asyncio.create_task(client.read_gatt_char('queued'))
        with self.assertRaises(TimeoutError): await first
        with self.assertRaises(RetiredConnectionError): await second
        await self.settle()
        self.assertFalse(client.is_connected); self.assertEqual(native.disconnects, 1)
        with self.assertRaises(RetiredConnectionError): await client.read_gatt_char('new-on-old-link')
        native.gate.set(); await self.settle()
        self.assertEqual(native.calls, [('read', 'old')]); self.assertEqual(len(retired), 1)
    async def test_replacement_native_has_fresh_queue_and_old_notifications_are_ignored(self):
        old = Native(); old_client = AttClient(old)
        seen = []; await old_client.start_notify('status', lambda _, data: seen.append(data))
        old_client.retire('expired')
        new = Native(); new_client = AttClient(new)
        self.assertTrue(owns_native(new_client, new)); self.assertFalse(owns_native(new_client, old))
        old.notify('status', b'late old ACK')
        self.assertEqual(seen, [])
        self.assertEqual(await new_client.read_gatt_char('new'), 'new')
        await new_client.disconnect(); await self.settle()
    async def test_queued_cancel_frees_depth_without_retiring_current_request(self):
        native = Native(); native.gate = asyncio.Event(); client = AttClient(native)
        active = asyncio.create_task(client.read_gatt_char('active'))
        queued = asyncio.create_task(client.write_gatt_char('queued', b'x'))
        await self.settle(); queued.cancel()
        with self.assertRaises(asyncio.CancelledError): await queued
        self.assertEqual(client.depth, 1); self.assertTrue(client.is_connected)
        native.gate.set(); self.assertEqual(await active, 'active'); await client.disconnect()
    async def test_in_flight_cancel_retires_link_and_shutdown_rejects_pending_work(self):
        native = Native(); native.gate = asyncio.Event(); client = AttClient(native)
        active = asyncio.create_task(client.read_gatt_char('active'))
        queued = asyncio.create_task(client.read_gatt_char('queued'))
        await self.settle(); active.cancel()
        with self.assertRaises(asyncio.CancelledError): await active
        with self.assertRaises(RetiredConnectionError): await queued
        await self.settle(); self.assertFalse(client.is_connected)
        self.assertEqual(native.calls, [('read', 'active')])
    async def test_backend_timeout_and_synchronous_factory_failure_do_not_hang_waiters(self):
        native = Native(); client = AttClient(native)
        def invalid_factory(): raise TypeError('invalid native argument')
        with self.assertRaises(TypeError): await client._execute('read', invalid_factory)
        self.assertEqual(await client.read_gatt_char('next'), 'next')
        async def backend_timeout(): raise TimeoutError('native deadline')
        with self.assertRaises(TimeoutError): await client._execute('read', backend_timeout)
        await self.settle()
        self.assertFalse(client.is_connected)
        self.assertEqual(native.disconnects, 1)

    async def test_default_read_write_notify_deadlines_are_distinct(self):
        self.assertEqual(AttClient.TIMEOUTS, {'read': 3.0, 'write': 5.0, 'notify': 3.0})
        for method in ('write', 'notify'):
            native = Native(); native.gate = asyncio.Event()
            client = AttClient(native, timeouts={method: .01})
            operation = client.write_gatt_char('write', b'x') if method == 'write' else client.start_notify('notify', lambda *_: None)
            with self.assertRaises(TimeoutError): await operation
            await self.settle(); self.assertFalse(client.is_connected)
