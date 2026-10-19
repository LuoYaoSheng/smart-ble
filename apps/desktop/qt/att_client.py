"""One bounded ATT executor per connection, shared by GATT, HID and OTA.

A timed-out/in-flight-cancelled native request cannot safely share the old link
with a subsequent request. Retire that link even if the OS later delivers an ACK.
"""
import asyncio
from collections import deque


class QueueFullError(RuntimeError):
    pass


class RetiredConnectionError(ConnectionError):
    pass


def _consume(task):
    if not task.cancelled():
        try: task.exception()
        except BaseException: pass


class AttClient:
    LIMIT = 16  # waiting + in-flight
    TIMEOUTS = {'read': 3.0, 'write': 5.0, 'notify': 3.0}

    def __init__(self, native, retired=None, timeouts=None):
        self.native = native
        self._retired_callback = retired or (lambda _: None)
        self._timeouts = {**self.TIMEOUTS, **(timeouts or {})}
        self._pending = deque()
        self._active = None
        self._runner = None
        self._operation = None
        self._retired = False
        self._disconnect_task = None

    def __getattr__(self, name):
        return getattr(self.native, name)

    @property
    def is_connected(self):
        return not self._retired and self.native.is_connected

    @property
    def depth(self):
        return len(self._pending) + (1 if self._active is not None else 0)

    async def _execute(self, kind, factory):
        if self._retired: raise RetiredConnectionError('连接已退役，请重新连接')
        if self.depth >= self.LIMIT: raise QueueFullError('ATT 队列已满（含在途最多 16 项）')
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        entry = (future, factory, self._timeouts[kind], kind)
        self._pending.append(entry)
        if self._runner is None or self._runner.done():
            self._runner = asyncio.create_task(self._drain())
        try:
            return await future
        except asyncio.CancelledError:
            if self._active is entry:
                self.retire('在途 ATT 操作已取消，连接已退役')
            else:
                try: self._pending.remove(entry)
                except ValueError: pass
            raise

    async def _drain(self):
        while self._pending and not self._retired:
            entry = self._pending.popleft()
            future, factory, timeout, kind = entry
            if future.done(): continue
            self._active = entry
            try:
                operation = self._operation = asyncio.ensure_future(factory())
            except Exception as error:
                if not future.done(): future.set_exception(error)
                self._active = None
                continue
            try:
                done, _ = await asyncio.wait({operation}, timeout=timeout)
                if not done:
                    if not future.done(): future.set_exception(TimeoutError(f'ATT {kind} 超时（{timeout:g}s），连接已退役，请重连核对状态'))
                    self.retire(f'ATT {kind} 超时（{timeout:g}s），旧连接已退役')
                    break
                if self._retired or future.done():
                    _consume(operation)
                elif operation.cancelled():
                    future.set_exception(RetiredConnectionError('ATT 操作已中止'))
                    self.retire('原生 ATT 操作已中止，连接已退役')
                else:
                    error = operation.exception()
                    if error is not None:
                        future.set_exception(error)
                        if isinstance(error, TimeoutError): self.retire('原生 ATT 操作超时，连接已退役')
                    else: future.set_result(operation.result())
            except asyncio.CancelledError:
                self.retire('ATT 执行器已关闭，连接已退役')
                raise
            finally:
                if self._active is entry: self._active = None
                if self._operation is operation: self._operation = None
                if not operation.done():
                    operation.cancel()
                    operation.add_done_callback(_consume)

    def retire(self, reason='连接已断开', notify=True, disconnect=True):
        if self._retired: return
        self._retired = True
        if self._operation is not None and not self._operation.done():
            self._operation.cancel()
            self._operation.add_done_callback(_consume)
        if self._active is not None:
            future = self._active[0]
            if not future.done(): future.set_exception(RetiredConnectionError(reason))
        for future, *_ in self._pending:
            if not future.done(): future.set_exception(RetiredConnectionError(reason))
        self._pending.clear()
        if notify:
            try: self._retired_callback(reason)
            except RuntimeError: pass  # owner already destroyed; native cleanup still required
        if disconnect: self._begin_disconnect()

    def _begin_disconnect(self):
        if self._disconnect_task is None:
            self._disconnect_task = asyncio.create_task(self.native.disconnect())
            self._disconnect_task.add_done_callback(_consume)
        return self._disconnect_task

    async def disconnect(self):
        self.retire('用户断开连接', notify=False, disconnect=False)
        task = self._begin_disconnect()
        done, _ = await asyncio.wait({task}, timeout=3.0)
        if not done:
            task.cancel()
            raise TimeoutError('原生断开超时，客户端连接已退役')
        return task.result()

    async def read_gatt_char(self, characteristic, **kwargs):
        return await self._execute('read', lambda: self.native.read_gatt_char(characteristic, **kwargs))

    async def write_gatt_char(self, characteristic, data, response=None):
        return await self._execute('write', lambda: self.native.write_gatt_char(characteristic, data, response=response))

    async def start_notify(self, characteristic, callback, **kwargs):
        def owned_callback(char, data):
            if not self._retired: callback(char, data)
        return await self._execute('notify', lambda: self.native.start_notify(characteristic, owned_callback, **kwargs))

    async def stop_notify(self, characteristic):
        return await self._execute('notify', lambda: self.native.stop_notify(characteristic))


def owns_native(current, native):
    return current is native or isinstance(current, AttClient) and current.native is native
