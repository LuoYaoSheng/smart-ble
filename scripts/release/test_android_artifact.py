import struct
import tempfile
import unittest
import zipfile
from pathlib import Path
from android_artifact import elf_load_alignments, inspect_native_libraries


def elf(alignment):
    value = bytearray(120)
    value[:6] = b'\x7fELF\x02\x01'
    struct.pack_into('<Q', value, 32, 64)
    struct.pack_into('<HH', value, 54, 56, 1)
    struct.pack_into('<IIQQQQQQ', value, 64, 1, 5, 0, 0, 0, 120, 120, alignment)
    return value


class AndroidArtifactTests(unittest.TestCase):
    def test_zip_alignment_cannot_hide_unaligned_64bit_library(self):
        with tempfile.TemporaryDirectory() as folder:
            package = Path(folder) / 'bad.apk'
            with zipfile.ZipFile(package, 'w') as z:
                z.writestr('lib/arm64-v8a/libscanner.so', elf(4096))
            with self.assertRaisesRegex(RuntimeError, 'libscanner.so'):
                inspect_native_libraries(package)

    def test_aab_checks_both_64bit_abis_without_rejecting_32bit(self):
        with tempfile.TemporaryDirectory() as folder:
            package = Path(folder) / 'good.aab'
            with zipfile.ZipFile(package, 'w') as z:
                z.writestr('base/lib/arm64-v8a/libapp.so', elf(16384))
                z.writestr('base/lib/x86_64/libapp.so', elf(65536))
                z.writestr('base/lib/armeabi-v7a/libapp.so', b'32bit fixture')
            result = inspect_native_libraries(package)
            self.assertEqual(result['elf_16kb'], 'PASS')
            self.assertEqual(len(result['libraries_64bit']), 2)
            self.assertEqual(result['native_abis'], ['arm64-v8a', 'armeabi-v7a', 'x86_64'])

    def test_malformed_native_library_fails_closed(self):
        with self.assertRaises(RuntimeError):
            elf_load_alignments(b'broken')


if __name__ == '__main__':
    unittest.main()
