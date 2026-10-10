"""Validate native PE application images and plugins in Windows application outputs (including Python extension modules)."""
import argparse
import json
import struct
from pathlib import Path

MACHINES = {'x64': 0x8664, 'arm64': 0xAA64}
NATIVE_SUFFIXES = ('.exe', '.dll', '.node', '.pyd')


def machine(path):
    with Path(path).open('rb') as stream:
        header = stream.read(64)
        if len(header) != 64 or header[:2] != b'MZ':
            raise RuntimeError(f'Invalid native PE image: {path}')
        stream.seek(struct.unpack_from('<I', header, 60)[0])
        pe = stream.read(6)
    if len(pe) != 6 or pe[:4] != b'PE\0\0':
        raise RuntimeError(f'Invalid PE header: {path}')
    return struct.unpack_from('<H', pe, 4)[0]


def verify(paths, architecture):
    checked = []
    for path in paths:
        if machine(path) != MACHINES[architecture]:
            raise RuntimeError(f'Native image is not {architecture}: {path}')
        checked.append(str(path))
    if not checked:
        raise RuntimeError('No native Windows images were found')
    return {'architecture': architecture, 'verified_images': checked}


def images(directory):
    return [p for p in Path(directory).rglob('*') if p.is_file() and p.suffix.lower() in NATIVE_SUFFIXES]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--architecture', required=True, choices=MACHINES)
    args = parser.parse_args()
    files = images(args.directory)
    print(json.dumps(verify(files, args.architecture), indent=2))
