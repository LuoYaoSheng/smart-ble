"""Image corruption and package provenance tests. Synthetic images are not flashable fixtures."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest


spec = importlib.util.spec_from_file_location("ota_package", Path(__file__).with_name("package-firmware.py"))
ota = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ota)


def image(chip=0, version="1.2.0", appended=True, target="lightble-peripheral"):
    header = bytearray(24)
    header[0:2] = bytes([0xE9, 1])
    struct.pack_into("<H", header, 12, chip)
    header[23] = int(appended)
    segment = bytearray(256)
    struct.pack_into("<I", segment, 0, 0xABCD5432)
    segment[16:16 + len(version)] = version.encode("ascii")
    segment[48:48 + len(target)] = target.encode("ascii")
    result = header + struct.pack("<II", 0x3F400020, len(segment)) + segment
    checksum = 0xEF
    for byte in segment:
        checksum ^= byte
    result += bytes((15 - len(result) % 16) % 16) + bytes([checksum])
    if appended:
        result += hashlib.sha256(result).digest()
    return bytes(result)


class PackageTests(unittest.TestCase):
    def test_both_hardware_families_and_image_digest_modes(self):
        for hardware, chip in ota.HARDWARE_CHIPS.items():
            for appended in (True, False):
                data = image(chip=chip, appended=appended)
                result = ota.build_manifest(data, hardware, "1.2.0")
                self.assertEqual(set(result), ota.MANIFEST_KEYS)
                self.assertEqual(result["sha256"], hashlib.sha256(data).hexdigest())

    def test_wrong_chip_or_unimplemented_target_rejected(self):
        for hardware, target in [("esp32-s3", "lightble-peripheral"), ("esp32-wroom-32", "lightble-observer")]:
            with self.assertRaises(ValueError):
                ota.build_manifest(image(), hardware, "1.2.0", target)

    def test_manifest_cannot_invent_image_version(self):
        with self.assertRaisesRegex(ValueError, "版本不一致"):
            ota.build_manifest(image(), "esp32-wroom-32", "9.0.0")
        with self.assertRaisesRegex(ValueError, "SDK 默认版本"):
            ota.image_metadata(image(version="esp-idf: v4.4.7"))

    def test_other_role_image_cannot_pose_as_peripheral(self):
        for target in ("lightble-observer", "smart-hid-simulator", ""):
            with self.assertRaisesRegex(ValueError, "镜像角色不一致"):
                ota.build_manifest(image(target=target), "esp32-wroom-32", "1.2.0")

    def test_corruption_truncation_bootloader_and_merged_image_rejected(self):
        data = image()
        for bad in (b"", data[:200], b"\x00" + data[1:], data + b"flash-partition", data[:-1],
                    data[:48] + b"x" + data[49:], data[:32] + bytes(4) + data[36:]):
            with self.subTest(size=len(bad)), self.assertRaises(ValueError):
                ota.image_metadata(bad)

    def test_checksum_and_appended_digest_are_checked_independently(self):
        data = image(appended=False)
        with self.assertRaisesRegex(ValueError, "校验和"):
            ota.image_metadata(data[:-1] + bytes([data[-1] ^ 1]))
        data = image()
        with self.assertRaisesRegex(ValueError, "附加 SHA256"):
            ota.image_metadata(data[:-1] + bytes([data[-1] ^ 1]))

    def test_create_verify_and_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source.bin"
            source.write_bytes(image())
            output = root / "package"
            expected = ota.create_package(source, "esp32-wroom-32", "1.2.0", output)
            self.assertEqual(ota.verify_package(output), expected)
            with self.assertRaises(FileExistsError):
                ota.create_package(source, "esp32-wroom-32", "1.2.0", output)
            self.assertEqual(ota.verify_package(output), expected)

    def test_manifest_types_unknown_keys_and_content_tampering(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source.bin"
            source.write_bytes(image())
            output = root / "package"
            base = ota.create_package(source, "esp32-wroom-32", "1.2.0", output)
            for patch in ({"format_version": True}, {"size": float(base["size"])}, {"sha256": "0" * 64}, {"download_url": "https://invalid.test"}):
                (output / "manifest.json").write_text(json.dumps({**base, **patch}))
                with self.subTest(patch=patch), self.assertRaises(ValueError):
                    ota.verify_package(output)

    def test_duplicate_json_keys_rejected(self):
        with self.assertRaisesRegex(ValueError, "重复键"):
            json.loads('{"size":1,"size":2}', object_pairs_hook=ota.reject_duplicate_keys)


if __name__ == "__main__":
    unittest.main()
