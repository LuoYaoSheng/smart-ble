import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import asyncio
import json
import unittest
from hid_protocol import C, VECTORS, INFO, INPUT, STATUS, ProtocolError, build_frames, candidate_json, chunk_size, parse_info, parse_pairing_qr, parse_status, profile_match, provision, recovery_action


class SharedVectorTests(unittest.TestCase):
    def test_shared_candidate_qr_info_status_frames_and_recovery_vectors(self):
        for suite, function in [('qr', parse_pairing_qr), ('deviceInfo', parse_info), ('status', parse_status)]:
            for case in VECTORS['suites'][suite]['cases']:
                with self.subTest(suite=suite, id=case['id']):
                    result = function(case['input'])
                    expected = case['expect']
                    self.assertEqual(result is not None, expected['ok'])
                    if expected['ok']:
                        self.assertEqual(result, {key: value for key, value in expected.items() if key != 'ok'})
        for case in VECTORS['suites']['candidate']['cases']:
            with self.subTest(id=case['id']):
                if case['expect']['ok']:
                    self.assertEqual(candidate_json(case['input']), case['expect']['json'])
                else:
                    with self.assertRaises(ProtocolError): candidate_json(case['input'])
        for case in VECTORS['suites']['framingMtu']['cases']:
            with self.subTest(id=case['id']): self.assertEqual(chunk_size(case['mtu']), case['expect'])
        for case in VECTORS['suites']['frames']['cases']:
            with self.subTest(id=case['id']):
                payload = bytes.fromhex(case['payloadHex']) if 'payloadHex' in case else bytes.fromhex(case['fill']['byte']) * case['fill']['length']
                if case['expect']['ok']:
                    self.assertEqual([frame.hex() for frame in build_frames(payload, case['chunkSize'])], case['expect']['frames'])
                else:
                    with self.assertRaises(ProtocolError): build_frames(payload, case['chunkSize'])
        for case in VECTORS['suites']['errorRecovery']['cases']:
            with self.subTest(id=case['id']): self.assertEqual(recovery_action(case['code']), case['expect'])

    def test_profile_requires_identity_confirmation_for_name_only_match(self):
        self.assertEqual(profile_match('SHID-00000001', []), 'WEAK')
        self.assertEqual(profile_match('', [C['serviceUuid'].upper()]), 'STRONG')
        self.assertIsNone(profile_match('ordinary-device', []))


class FakeClient:
    mtu_size = 23
    def __init__(self, statuses, product='smart-hid'):
        self.statuses, self.product = statuses, product
        self.device_id = 'HID-00000001'
        self.writes, self.stops = [], 0
    async def read_gatt_char(self, uuid):
        assert uuid == INFO
        return json.dumps({'product': self.product, 'protocol': '1.0', 'device_id': self.device_id, 'firmware': '1.2.0', 'state': 'unprovisioned'}).encode()
    async def start_notify(self, uuid, callback):
        assert uuid == STATUS
        self.callback = callback
    async def stop_notify(self, uuid):
        assert uuid == STATUS
        self.stops += 1
    async def write_gatt_char(self, uuid, frame, response):
        assert uuid == INPUT and response is True
        self.writes.append(frame)
        if frame[0] == frame[1] - 1:
            for state in self.statuses: self.callback(None, json.dumps(state).encode())


class TransactionTests(unittest.IsolatedAsyncioTestCase):
    def candidate(self):
        return VECTORS['suites']['candidate']['cases'][0]['input']
    async def test_ready_requires_an_observed_new_attempt_and_unsubscribes(self):
        client = FakeClient([{'state': 'provisioning', 'step': 'received'}, {'state': 'ready', 'step': 'ready'}])
        result = await provision(client, self.candidate(), lambda _: None, timeout=.2)
        self.assertTrue(result['ok'])
        self.assertEqual(client.stops, 1)
        self.assertTrue(client.writes)
    async def test_stale_ready_is_not_a_success_receipt(self):
        client = FakeClient([{'state': 'ready', 'step': 'ready'}])
        with self.assertRaises(TimeoutError): await provision(client, self.candidate(), lambda _: None, timeout=.02)
        self.assertEqual(client.stops, 1)
    async def test_error_receipt_preserves_failure(self):
        client = FakeClient([{'state': 'error', 'error': 'wifi_failed'}])
        result = await provision(client, self.candidate(), lambda _: None, timeout=.2)
        self.assertFalse(result['ok'])
        self.assertEqual(result['status']['error'], 'wifi_failed')
    async def test_invalid_device_id_never_writes(self):
        client = FakeClient([])
        client.device_id = 'unverified-device'
        with self.assertRaises(ProtocolError): await provision(client, self.candidate(), lambda _: None)
        self.assertEqual(client.writes, [])

    async def test_wrong_identity_never_writes(self):
        client = FakeClient([], product='other-device')
        with self.assertRaises(ProtocolError): await provision(client, self.candidate(), lambda _: None)
        self.assertEqual(client.writes, [])


if __name__ == '__main__': unittest.main()
