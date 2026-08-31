#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HBUILDER_CLI="${HBUILDERX_CLI:-/Applications/HBuilderX.app/Contents/MacOS/cli}"

if [[ ! -x "$HBUILDER_CLI" ]]; then
	printf 'HBuilderX CLI not found: %s\n' "$HBUILDER_CLI" >&2
	exit 1
fi

"$HBUILDER_CLI" uniapp.test mp-weixin --project "$REPO_ROOT/apps/uniapp"
