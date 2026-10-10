"""Validate actual Android native libraries, rather than inferring compatibility from SDK settings."""
import re
import struct
import zipfile
from pathlib import Path


def sdk_tool(sdk, name):
    candidates = [p for p in Path(sdk).glob(f'build-tools/*/{name}*') if p.is_file()]
    if not candidates:
        raise RuntimeError(f'Android SDK tool is missing: {name}')
    return max(candidates, key=lambda p: tuple(int(n) for n in re.findall(r'\d+', p.parent.name)))


def elf_load_alignments(data):
    if len(data) < 64 or data[:4] != b'\x7fELF' or data[4] != 2 or data[5] not in (1, 2):
        raise RuntimeError('64-bit native library has an invalid ELF header')
    endian = '<' if data[5] == 1 else '>'
    offset = struct.unpack_from(endian + 'Q', data, 32)[0]
    size, count = struct.unpack_from(endian + 'HH', data, 54)
    if size < 56 or offset + size * count > len(data):
        raise RuntimeError('Native library program headers are invalid')
    alignments = [struct.unpack_from(endian + 'IIQQQQQQ', data, offset + i * size)[-1]
                  for i in range(count) if struct.unpack_from(endian + 'I', data, offset + i * size)[0] == 1]
    if not alignments:
        raise RuntimeError('Native library has no LOAD segments')
    return alignments


def inspect_native_libraries(package):
    libraries = []
    abis = set()
    with zipfile.ZipFile(package) as archive:
        for name in archive.namelist():
            match = re.search(r'(?:^|/)lib/([^/]+)/[^/]+\.so$', name)
            if not match:
                continue
            abi = match[1]
            abis.add(abi)
            if abi in ('arm64-v8a', 'x86_64'):
                alignments = elf_load_alignments(archive.read(name))
                if any(a < 16384 or a % 16384 for a in alignments):
                    raise RuntimeError(f'16 KB ELF alignment failed: {name}')
                libraries.append({'path': name, 'min_load_alignment': min(alignments)})
    return {'native_abis': sorted(abis), 'elf_16kb': 'PASS' if libraries else 'NOT_APPLICABLE', 'libraries_64bit': libraries}
