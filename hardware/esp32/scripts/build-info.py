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
        return subprocess.check_output(
            ["git", "-C", str(repo_root), "rev-parse", "--short", "HEAD"],
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


project_dir = Path(env.subst("$PROJECT_DIR"))
include_dir = project_dir / "include"
include_dir.mkdir(parents=True, exist_ok=True)

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

metadata_path = project_dir / "build-metadata.json"
metadata_path.write_text(
    __import__("json").dumps(
        {
            "firmware_name": firmware_name,
            "version": fw_version,
            "git_sha": git_sha,
            "build_time": build_time,
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
