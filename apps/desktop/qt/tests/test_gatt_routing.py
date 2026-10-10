import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gatt_routing import canonical, key, resolve_characteristic

class RoutingTests(unittest.TestCase):
    def client(self):
        chars = [SimpleNamespace(uuid='2a19', service_uuid=uuid) for uuid in ('180a', '180f')]
        return SimpleNamespace(services=[SimpleNamespace(uuid=uuid, characteristics=[char]) for uuid, char in zip(('180a', '180f'), chars)]), chars
    def test_same_characteristic_uuid_routes_to_selected_service_handle(self):
        client, chars = self.client()
        self.assertIs(resolve_characteristic(client, '180a', '2a19'), chars[0])
        self.assertIs(resolve_characteristic(client, '180f', '2a19'), chars[1])
    def test_uuid_only_lookup_rejects_ambiguity_without_operating_device(self):
        client, _ = self.client()
        with self.assertRaises(ValueError): resolve_characteristic(client, None, '2a19')
        with self.assertRaises(ValueError): resolve_characteristic(client, '180d', '2a19')
    def test_full_and_short_uuids_have_same_service_owned_key(self):
        self.assertEqual(key('180a', '2a19'), key('0000180A-0000-1000-8000-00805F9B34FB', '00002A19-0000-1000-8000-00805F9B34FB'))
        self.assertNotEqual(key('180a', '2a19'), key('180f', '2a19'))
