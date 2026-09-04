#!/usr/bin/env bash
set -euo pipefail

export LC_ALL=C

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---------------------------------------------------------------------------
# Resolve a Node runtime capable of importing the locked .ts protocol mirror
# (core/protocols/hid-provisioning-protocol.ts) directly: needs built-in type
# stripping (Node >= 23.6.0, or >= 22.18.0). The app itself never hits this
# because vite/HBuilderX compiles .ts; only bare-node unit tests do.
# Resolution order: NODE_BIN env -> system node -> nvm-windows installs.
# ---------------------------------------------------------------------------
node_supports_ts() {
	local v major minor
	v="$("$1" --version 2>/dev/null)" || return 1
	v="${v#v}"
	major="${v%%.*}"
	minor="$(printf '%s' "$v" | cut -d. -f2)"
	case "$major" in
		''|*[!0-9]*) return 1 ;;
	esac
	if [ "$major" -ge 24 ]; then return 0; fi
	if [ "$major" -eq 23 ] && [ "$minor" -ge 6 ]; then return 0; fi
	if [ "$major" -eq 22 ] && [ "$minor" -ge 18 ]; then return 0; fi
	return 1
}

if [ -n "${NODE_BIN:-}" ]; then
	:
elif node_supports_ts "$(command -v node)"; then
	NODE_BIN="$(command -v node)"
else
	NVM_ROOT="${NVM_HOME:-${APPDATA:-}/nvm}"
	found=""
	if [ -d "$NVM_ROOT" ]; then
		for cand in $(ls -1d "$NVM_ROOT"/v* 2>/dev/null | sort -V); do
			exe="$cand/node.exe"
			[ -f "$exe" ] || continue
			if node_supports_ts "$exe"; then found="$exe"; fi
		done
	fi
	if [ -z "$found" ]; then
		printf 'BLOCKED: no Node with built-in .ts type stripping on PATH or under NVM_HOME.\n' >&2
		printf 'Unit tests import core/protocols/hid-provisioning-protocol.ts; need Node >= 22.18 or >= 23.6, or set NODE_BIN.\n' >&2
		exit 1
	fi
	NODE_BIN="$found"
fi
printf 'unit-test node: %s (%s)\n' "$NODE_BIN" "$("$NODE_BIN" --version)"

run_check() {
	local label="$1"
	shift
	printf '\n[%s]\n' "$label"
	"$@"
}

# Test-only fault injection proves set -e propagates a failed child command.
if [[ "${UNIAPP_VERIFY_INJECT_FAILURE:-0}" == "1" ]]; then
	run_check "injected failure" "$NODE_BIN" -e 'process.exit(17)'
fi

shopt -s nullglob
test_files=(tests/unit/*.test.mjs)
if [[ "${#test_files[@]}" -eq 0 ]]; then
	printf 'No UniApp unit tests found.\n' >&2
	exit 1
fi

for test_file in "${test_files[@]}"; do
	run_check "$test_file" "$NODE_BIN" "$test_file"
done

run_check "Smart HID protocol contract" "$NODE_BIN" scripts/check-smart-hid-contract.mjs
run_check "UniApp package lock" "$NODE_BIN" scripts/check-uniapp-package-lock.mjs
run_check "UniApp static assets" "$NODE_BIN" scripts/check-uniapp-assets.mjs
run_check "UniApp Vue SFC parse" "$NODE_BIN" scripts/check-uniapp-sfc.mjs
run_check "UniAutomator config syntax" "$NODE_BIN" --check apps/uniapp/env.js
run_check "UniAutomator Jest syntax" "$NODE_BIN" --check apps/uniapp/jest.config.js
run_check "UniAutomator page-test syntax" "$NODE_BIN" --check apps/uniapp/pages/index/index.test.js
run_check "UniAutomator page-flow syntax" "$NODE_BIN" --check apps/uniapp/pages/page-flow.test.js
run_check "Release metadata check" "$NODE_BIN" scripts/generate-release-metadata.mjs --check
run_check "Version consistency" "$NODE_BIN" scripts/check-version-consistency.mjs
run_check "Git whitespace" git diff --check

printf '\nUniApp verification PASS (%d unit files plus 11 static gates)\n' "${#test_files[@]}"
