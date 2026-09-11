#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# CLI resolution: HBUILDERX_CLI env first, then common per-OS install paths.
# (macOS keeps /Applications default; Windows HBuilderX typically lives on D:\ or Program Files.)
hb_cli_default() {
  if [[ -n "${HBUILDERX_CLI:-}" ]]; then
    printf '%s' "${HBUILDERX_CLI}"
    return 0
  fi
  local candidates=(
    "/Applications/HBuilderX.app/Contents/MacOS/cli"
    "/d/HBuilderX/cli.exe"
    "/c/Program Files/HBuilderX/cli.exe"
    "/c/HBuilderX/cli.exe"
  )
  local c
  for c in "${candidates[@]}"; do
    if [[ -f "$c" ]]; then
      printf '%s' "$c"
      return 0
    fi
  done
  return 1
}

HBUILDER_CLI="$(hb_cli_default)" || {
  printf 'HBuilderX CLI not found: set HBUILDERX_CLI or install HBuilderX\n' >&2
  exit 1
}

"$HBUILDER_CLI" uniapp.test h5 --project "$REPO_ROOT/apps/uniapp"
