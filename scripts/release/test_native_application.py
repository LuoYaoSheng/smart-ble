import struct
import tempfile
import unittest
from pathlib import Path
from native_application import verify_linux_application


class NativeApplicationTests(unittest.TestCase):
    def test_actual_elf_machine_prevents_wrong_architecture_label(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'application'
            header = bytearray(20)
            header[:6] = b'\x7fELF\x02\x01'
            struct.pack_into('<H', header, 18, 62)
            path.write_bytes(header)
            self.assertEqual(verify_linux_application(path, 'x64')['machine'], 62)
            with self.assertRaisesRegex(RuntimeError, 'not arm64'):
                verify_linux_application(path, 'arm64')
            struct.pack_into('<H', header, 18, 183)
            path.write_bytes(header)
            self.assertEqual(verify_linux_application(path, 'arm64')['machine'], 183)

    def test_non_native_or_truncated_image_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'application'
            path.write_bytes(b'not an ELF executable')
            with self.assertRaisesRegex(RuntimeError, 'native ELF'):
                verify_linux_application(path, 'arm64')


if __name__ == '__main__':
    unittest.main()
