#!/usr/bin/env python3
"""Create/verify local LightBLE OTA packages from actual ESP application images.

No flashing, downloads, signing credentials, or server access. See docs/ota-local-upgrade.md.
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import sys


HARDWARE_CHIPS = {"esp32-wroom-32": 0, "esp32-s3": 9}
PARTITION_SIZE = 0x180000
MANIFEST_KEYS = {"format_version", "target", "hardware", "firmware_version", "size", "sha256"}
SEMVER = re.compile(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?")


def image_metadata(data):
    """Validate the unsigned ESP image structure, checksum and appended digest.

    esp_image_header_t is 24 bytes; the first segment starts with esp_app_desc_t.
    This is a local integrity check, not device compatibility or vendor authentication.
    """
    if len(data) < 24 + 8 + 256 or len(data) > PARTITION_SIZE:
        raise ValueError("应用镜像为空、截断或超过当前 OTA 分区大小 0x180000")
    if data[0] != 0xE9 or not 1 <= data[1] <= 16:
        raise ValueError("不是有效的 ESP 应用镜像头")
    chip = struct.unpack_from("<H", data, 12)[0]
    if chip not in HARDWARE_CHIPS.values():
        raise ValueError("当前仅支持 ESP32 / ESP32-S3 应用镜像")
    if data[23] not in (0, 1):
        raise ValueError("非法 hash_appended 标记")
    offset, checksum = 24, 0xEF
    for index in range(data[1]):
        if offset + 8 > len(data):
            raise ValueError("应用镜像段头截断")
        _, size = struct.unpack_from("<II", data, offset)
        offset += 8
        if offset + size > len(data):
            raise ValueError("应用镜像数据段截断")
        if index == 0:
            if size < 256 or struct.unpack_from("<I", data, offset)[0] != 0xABCD5432:
                raise ValueError("缺少应用描述符；禁止将 bootloader 或整片 Flash 镜像作为 OTA 包")
            version_bytes = data[offset + 16:offset + 48]
            project_bytes = data[offset + 48:offset + 80]
            if b"\0" not in version_bytes or b"\0" not in project_bytes:
                raise ValueError("镜像版本或项目名称字符串没有终止符")
            try:
                version = version_bytes.split(b"\0", 1)[0].decode("ascii")
                target = project_bytes.split(b"\0", 1)[0].decode("ascii")
            except UnicodeDecodeError as exc:
                raise ValueError("镜像版本不是 ASCII SemVer") from exc
            if not SEMVER.fullmatch(version):
                raise ValueError("镜像 app descriptor 版本必须是实际编译的 SemVer，不能使用 SDK 默认版本")
        for byte in data[offset:offset + size]:
            checksum ^= byte
        offset += size
    checksum_offset = (offset // 16 + 1) * 16 - 1
    image_end = checksum_offset + 1
    if checksum_offset >= len(data) or data[checksum_offset] != checksum:
        raise ValueError("镜像段校验和不符或镜像被截断")
    if data[23]:
        if data[image_end:image_end + 32] != hashlib.sha256(data[:image_end]).digest():
            raise ValueError("镜像附加 SHA256 不符")
        image_end += 32
    if image_end != len(data):
        raise ValueError("镜像含未识别的尾部；本工具仅生成普通应用 OTA 包，不处理签名块或合并 Flash 镜像")
    return {"chip_id": chip, "version": version, "target": target, "bytes": len(data)}


def build_manifest(data, hardware, version, target="lightble-peripheral"):
    if hardware not in HARDWARE_CHIPS:
        raise ValueError("hardware 必须是 esp32-wroom-32 或 esp32-s3")
    if target != "lightble-peripheral":
        raise ValueError("当前只有 Peripheral 固件提供 OTA；Observer 不能生成可升级包")
    if not isinstance(version, str) or not SEMVER.fullmatch(version):
        raise ValueError("firmware_version 必须是 SemVer")
    actual = image_metadata(data)
    if actual["chip_id"] != HARDWARE_CHIPS[hardware]:
        raise ValueError("镜像芯片与 hardware 不匹配")
    if actual["version"] != version:
        raise ValueError("manifest 版本与实际镜像版本不一致")
    if actual["target"] != target:
        raise ValueError("manifest target 与实际镜像角色不一致，禁止把 Observer/模拟器刷入 Peripheral")
    return {"format_version": 1, "target": target, "hardware": hardware,
            "firmware_version": version, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("manifest 含重复键: " + key)
        result[key] = value
    return result


def verify_package(directory):
    directory = Path(directory)
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"), object_pairs_hook=reject_duplicate_keys)
    if not isinstance(manifest, dict) or set(manifest) != MANIFEST_KEYS:
        raise ValueError("manifest 必须恰好包含契约六字段")
    if type(manifest["format_version"]) is not int or manifest["format_version"] != 1:
        raise ValueError("format_version 必须是整数 1")
    if type(manifest["size"]) is not int:
        raise ValueError("size 必须是整数")
    data = (directory / "firmware.bin").read_bytes()
    expected = build_manifest(data, manifest["hardware"], manifest["firmware_version"], manifest["target"])
    if manifest != expected:
        raise ValueError("manifest 与实际固件 size / SHA256 不符")
    return expected


def create_package(firmware, hardware, version, output, target="lightble-peripheral"):
    data = Path(firmware).read_bytes()
    manifest = build_manifest(data, hardware, version, target)
    output = Path(output)
    # Never replace previous firmware packages, even when their contents match.
    output.mkdir(parents=True, exist_ok=False)
    (output / "firmware.bin").write_bytes(data)
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", type=Path, help="校验现有本地包目录")
    parser.add_argument("--firmware", type=Path)
    parser.add_argument("--hardware", choices=HARDWARE_CHIPS)
    parser.add_argument("--version", help="必须与镜像 app descriptor 完全一致")
    parser.add_argument("--target", default="lightble-peripheral")
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    try:
        if args.verify:
            if any((args.firmware, args.hardware, args.version, args.output_dir)):
                parser.error("--verify 不可与生成参数混用")
            manifest = verify_package(args.verify)
        else:
            if not all((args.firmware, args.hardware, args.version, args.output_dir)):
                parser.error("生成包必须指定 --firmware --hardware --version --output-dir")
            manifest = create_package(args.firmware, args.hardware, args.version, args.output_dir, args.target)
        print(json.dumps({"status": "PASS_LOCAL_IMAGE_AND_PACKAGE_INTEGRITY", "manifest": manifest,
                          "hardware_validation": "NOT_RUN", "vendor_signature": "NOT_PROVIDED"}, ensure_ascii=False, indent=2))
    except (OSError, ValueError, TypeError) as exc:
        print("OTA package error: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
