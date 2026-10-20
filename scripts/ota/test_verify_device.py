"""Safety guards only. No Bluetooth discovery or device connection in these tests."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('verify_device', Path(__file__).with_name('verify-device.py'))
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)


class VerifyDeviceGuardTests(unittest.TestCase):
    def test_default_is_scan_only_without_target_or_scenario(self):
        args = VERIFY.parse_args([])
        self.assertFalse(args.write_enabled)
        self.assertIsNone(args.address)
        self.assertIsNone(args.package)
        self.assertIsNone(args.scenario)

    def test_every_partial_mutation_request_is_rejected_before_loading_ble(self):
        partial = [
            ['--address', 'specified-device'],
            ['--package', '/some/package'],
            ['--scenario', 'success'],
            ['--address', 'specified-device', '--package', '/some/package'],
            ['--address', 'specified-device', '--scenario', 'success'],
            ['--package', '/some/package', '--scenario', 'success'],
        ]
        for argv in partial:
            with self.subTest(argv=argv), patch.object(VERIFY, 'execute') as execute, patch.object(VERIFY, 'package_module') as package:
                with self.assertRaises(SystemExit) as result:
                    VERIFY.main(argv)
                self.assertEqual(result.exception.code, 2)
                execute.assert_not_called()
                package.assert_not_called()

    def test_only_all_explicit_arguments_enable_a_scenario(self):
        for scenario in VERIFY.SCENARIOS:
            args = VERIFY.parse_args(['--address', 'specified-device', '--package', '/some/package', '--scenario', scenario])
            self.assertTrue(args.write_enabled)
            self.assertEqual(args.address, 'specified-device')

    def test_invalid_or_infinite_timeouts_and_blank_address_are_rejected(self):
        for argv in (['--timeout', 'nan'], ['--timeout', 'inf'], ['--timeout', '0'], ['--timeout', '1801'],
                     ['--scan-seconds', '31'], ['--address', '', '--package', '/some/package', '--scenario', 'cancel']):
            with self.subTest(argv=argv), self.assertRaises(SystemExit):
                VERIFY.parse_args(argv)

    def test_invalid_local_package_fails_before_scan_or_connection(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(VERIFY, 'execute') as execute:
            output = Path(temp) / 'evidence.json'
            result = VERIFY.main(['--address', 'specified-device', '--package', temp, '--scenario', 'success', '--output', str(output)])
            self.assertEqual(result, 1)
            execute.assert_not_called()
            import json
            evidence = json.loads(output.read_text())
            self.assertEqual(evidence['hardware_result'], 'NOT_RUN_LOCAL_VALIDATION_FAILED')
            self.assertNotIn('before_info', evidence)

    def test_existing_evidence_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(VERIFY, 'execute') as execute:
            output = Path(temp) / 'evidence.json'
            output.write_text('existing')
            with self.assertRaises(SystemExit):
                VERIFY.main(['--output', str(output)])
            self.assertEqual(output.read_text(), 'existing')
            execute.assert_not_called()


class VerifyDeviceResultGateTests(unittest.TestCase):
    def observed(self, **changes):
        result = dict(before_version='1.0.0', after_version='1.0.0', control_status='aborted',
                      verified_result=False, error='device rejected', disconnections=0,
                      injected=True, start_mutated=True, commit_ack=True,
                      transferred_bytes=1024, firmware_size=1024, device_error_codes=['OTA_HASH_MISMATCH'])
        result.update(changes)
        return result

    def test_success_receipt_without_actual_reboot_and_version_is_not_pass(self):
        observed = self.observed(verified_result=True, error=None, after_version='1.0.1')
        self.assertFalse(VERIFY.scenario_passed('success', '1.0.1', observed))
        observed['disconnections'] = 1
        self.assertTrue(VERIFY.scenario_passed('success', '1.0.1', observed))
        observed['after_version'] = '1.0.0'
        self.assertFalse(VERIFY.scenario_passed('success', '1.0.1', observed))

    def test_hash_exception_needs_full_transfer_commit_and_real_error_code(self):
        self.assertTrue(VERIFY.scenario_passed('hash', '1.0.1', self.observed()))
        for change in (dict(commit_ack=False), dict(transferred_bytes=20), dict(device_error_codes=[]),
                       dict(control_status='receiving'), dict(after_version='1.0.1'), dict(start_mutated=False)):
            self.assertFalse(VERIFY.scenario_passed('hash', '1.0.1', self.observed(**change)))

    def test_size_case_cannot_reuse_a_hash_error_as_proof(self):
        self.assertFalse(VERIFY.scenario_passed('size', '1.0.1', self.observed()))
        self.assertTrue(VERIFY.scenario_passed('size', '1.0.1', self.observed(device_error_codes=['OTA_SIZE_MISMATCH'])))

    def test_cancel_requires_actual_aborted_state_and_unchanged_version(self):
        self.assertTrue(VERIFY.scenario_passed('cancel', '1.0.1', self.observed()))
        self.assertFalse(VERIFY.scenario_passed('cancel', '1.0.1', self.observed(control_status='receiving')))
        self.assertFalse(VERIFY.scenario_passed('cancel', '1.0.1', self.observed(after_version='1.0.1')))

    def test_disconnect_needs_real_disconnect_and_failed_device_state(self):
        self.assertFalse(VERIFY.scenario_passed('disconnect', '1.0.1', self.observed(control_status='failed')))
        self.assertTrue(VERIFY.scenario_passed('disconnect', '1.0.1', self.observed(control_status='failed', disconnections=1)))


if __name__ == '__main__':
    unittest.main()
