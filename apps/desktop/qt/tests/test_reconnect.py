import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import unittest
from reconnect_policy import reconnect


class ReconnectTests(unittest.IsolatedAsyncioTestCase):
    async def test_three_attempts_match_product_backoff(self):
        delays, calls = [], []
        async def sleep(value): delays.append(value)
        async def connect():
            calls.append(1)
            raise OSError('not connected')
        self.assertFalse(await reconnect(lambda: True, connect, sleep))
        self.assertEqual(delays, [1, 3, 5])
        self.assertEqual(len(calls), 3)
    async def test_user_disconnect_prevents_new_device_access(self):
        async def sleep(_): pass
        async def connect(): self.fail('cancelled recovery must not connect')
        self.assertFalse(await reconnect(lambda: False, connect, sleep))
    async def test_success_stops_retrying(self):
        delays = []
        async def sleep(value): delays.append(value)
        async def connect(): pass
        self.assertTrue(await reconnect(lambda: True, connect, sleep))
        self.assertEqual(delays, [1])
