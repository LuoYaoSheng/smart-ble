"""PlatformIO pre-build script: generate firmware build metadata header."""

Import("env")

import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def read_firmware_version():
    flags = env.get("BUILD_FLAGS", [])
    for flag in flags:
        match = re.search(r'FIRMWARE_VERSION=\\"([^"\\]+)\\"', str(flag))
        if match:
            return match.group(1)
    return "1.0.0"


def read_git_sha():
    project_dir = Path(env["PROJECT_DIR"])
    repo_root = project_dir
    for candidate in [project_dir, *project_dir.parents]:
        if (candidate / ".git").exists():
            repo_root = candidate
            break
    try:
        revision = subprocess.check_output(
            ["git", "-C", str(repo_root), "rev-parse", "--short", "HEAD"],
            text=True,
        ).strip()
        changed = subprocess.run(["git", "-C", str(repo_root), "diff", "--quiet", "HEAD"], check=False)
        return revision + ("-dirty" if changed.returncode else "")
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


project_dir = Path(env.subst("$PROJECT_DIR"))
build_dir = Path(env.subst("$BUILD_DIR"))
include_dir = build_dir / "generated"
include_dir.mkdir(parents=True, exist_ok=True)
env.Prepend(CPPPATH=[str(include_dir)])

def read_fixture_target():
    flags = " ".join(str(flag) for flag in env.get("BUILD_FLAGS", []))
    match = re.search(r"FIXTURE_ROLE=(\w+)", flags)
    targets = {"peripheral": "lightble-peripheral", "observer": "lightble-observer", "shid_sim": "smart-hid-simulator"}
    if not match or match.group(1) not in targets:
        raise RuntimeError("Firmware environment requires a recognized FIXTURE_ROLE")
    return targets[match.group(1)]


fw_target = read_fixture_target()
fw_version = read_firmware_version()
git_sha = read_git_sha()
build_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
firmware_name = "LightBLE"

header_path = include_dir / "firmware_build_info.h"
header_path.write_text(
    "\n".join(
        [
            "#pragma once",
            "",
            f'#define FW_FIRMWARE_NAME "{firmware_name}"',
            f'#define FW_VERSION "{fw_version}"',
            f'#define FW_GIT_SHA "{git_sha}"',
            f'#define FW_BUILD_TIME "{build_time}"',
            "",
            "#ifndef FIRMWARE_VERSION",
            f'#define FIRMWARE_VERSION "{fw_version}"',
            "#endif",
            "",
        ]
    ),
    encoding="utf-8",
)

metadata_path = build_dir / "build-metadata.json"
metadata_path.write_text(
    __import__("json").dumps(
        {
            "firmware_name": firmware_name,
            "target": fw_target,
            "version": fw_version,
            "git_sha": git_sha,
            "build_time": build_time,
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)


def embed_app_version(source, target, env):
    """The Arduino SDK ships a precompiled app descriptor with the IDF version.

    Change only its fixed version/project_name slots in the linked ELF, before esptool creates
    the image and computes image checksums. No SDK archive or binary is mutated.
    """
    import struct
    elf_path = Path(str(target[0]))
    raw = bytearray(elf_path.read_bytes())
    if raw[:6] != b"\x7fELF\x01\x01":
        raise RuntimeError("firmware ELF must be ELF32 little endian")
    nm = env.subst("$NM")
    if not nm or nm == "$NM":
        nm = env.subst("$CC").replace("gcc", "nm")
    symbols = subprocess.check_output([nm, str(elf_path)], text=True)
    matches = re.findall(r"^([0-9a-fA-F]+)\s+\w\s+esp_app_desc$", symbols, re.M)
    if len(matches) != 1:
        raise RuntimeError("firmware must contain exactly one esp_app_desc")
    address = int(matches[0], 16)
    phoff = struct.unpack_from("<I", raw, 28)[0]
    phentsize, phnum = struct.unpack_from("<HH", raw, 42)
    offsets = []
    for i in range(phnum):
        kind, file_offset, vaddr, _, filesz = struct.unpack_from("<IIIII", raw, phoff + i * phentsize)
        if kind == 1 and vaddr <= address and address + 256 <= vaddr + filesz:
            offsets.append(file_offset + address - vaddr)
    if len(offsets) != 1 or struct.unpack_from("<I", raw, offsets[0])[0] != 0xABCD5432:
        raise RuntimeError("app descriptor missing or malformed in ELF")
    version = fw_version.encode("ascii")
    if not version or len(version) >= 32:
        raise RuntimeError("FIRMWARE_VERSION must fit ESP application version[32]")
    at = offsets[0] + 16
    raw[at:at + 32] = version.ljust(32, b"\0")
    project_name = fw_target.encode("ascii")
    if len(project_name) >= 32:
        raise RuntimeError("Firmware target must fit ESP project_name[32]")
    raw[at + 32:at + 64] = project_name.ljust(32, b"\0")
    elf_path.write_bytes(raw)
    print("Embedded firmware app descriptor version: " + fw_version)


env.AddPostAction("$BUILD_DIR/${PROGNAME}.elf", embed_app_version)


def verify_application_version(source, target, env):
    import struct
    image = Path(str(target[0])).read_bytes()
    version = image[48:80].split(b"\0", 1)[0].decode("ascii")
    project_name = image[80:112].split(b"\0", 1)[0].decode("ascii")
    chip = struct.unpack_from("<H", image, 12)[0]
    expected_chip = 9 if env.get("BOARD_MCU") == "esp32s3" else 0
    if (len(image) < 288 or image[0] != 0xE9 or chip != expected_chip or
            struct.unpack_from("<I", image, 32)[0] != 0xABCD5432 or version != fw_version or project_name != fw_target):
        raise RuntimeError("OTA image descriptor does not match build version/chip")
    print(f"Verified OTA image: chip={chip}, version={version}, target={project_name}")


env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", verify_application_version)
