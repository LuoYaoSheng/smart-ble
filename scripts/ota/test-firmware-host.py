#!/usr/bin/env python3
"""Compile the production ESP32 OTA state machine against host I/O stubs.

Needs a C++17 compiler, OpenSSL development headers/libcrypto, and the project's
ArduinoJson dependency (pio pkg install -d hardware/esp32/LightBLE -e fixture_peripheral).
These tests are software checks; they do not verify flash hardware or BLE radio.
"""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
HOST = ROOT / "tests/firmware/host"
PROJECT = ROOT / "hardware/esp32/LightBLE"
json_headers = PROJECT / ".pio/libdeps/fixture_peripheral/ArduinoJson/src"
if not json_headers.is_dir():
    raise SystemExit("Install firmware dependencies first: pio pkg install -d hardware/esp32/LightBLE -e fixture_peripheral")
flags = []
sanitizer = os.environ.get("OTA_HOST_SANITIZER")
if shutil.which("pkg-config"):
    found = subprocess.run(["pkg-config", "--cflags", "--libs", "openssl"], capture_output=True, text=True)
    if found.returncode == 0:
        import shlex
        flags = shlex.split(found.stdout)
if not flags and Path("/opt/homebrew/opt/openssl/include").is_dir():
    flags = ["-I/opt/homebrew/opt/openssl/include", "-L/opt/homebrew/opt/openssl/lib", "-lcrypto"]
if not flags:
    flags = ["-lcrypto"]
with tempfile.TemporaryDirectory(prefix="smart-ble-ota-host-") as temp:
    for chip in (0, 1):
        binary = str(Path(temp) / f"ota-host-{chip}")
        command = [os.environ.get("CXX", "c++"), "-std=c++17", "-pthread", "-Wno-deprecated-declarations",
                   f"-DCONFIG_IDF_TARGET_ESP32S3={chip}", '-DFIRMWARE_VERSION="1.0.0"',
                   "-I" + str(HOST / "stubs"), "-I" + str(PROJECT / "include"), "-I" + str(json_headers),
                   str(PROJECT / "src/ota_server.cpp"), str(HOST / "ota_server_test.cpp"), "-o", binary, *flags]
        if sanitizer:
            command[1:1] = ["-g", "-fno-omit-frame-pointer", "-fno-sanitize-recover=all", "-fsanitize=" + sanitizer]
        subprocess.run(command, check=True)
        arguments = [binary]
        if os.environ.get("OTA_HOST_TEST_BUILT_IMAGES") == "1":
            environment = "fixture_peripheral_s3_ota" if chip else "fixture_peripheral_ota"
            image = PROJECT / ".pio/build" / environment / "firmware.bin"
            if not image.is_file():
                raise SystemExit(f"Build {environment} first before testing its binary")
            arguments.append(str(image))
            observer_env = "fixture_observer_s3" if chip else "fixture_observer"
            observer = PROJECT / ".pio/build" / observer_env / "firmware.bin"
            if observer.is_file():
                arguments.append(str(observer))
        subprocess.run(arguments, check=True, timeout=60)
