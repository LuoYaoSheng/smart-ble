#!/usr/bin/env bash
set -euo pipefail

export LC_ALL=C

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

run_check() {
	local label="$1"
	shift
	printf '\n[%s]\n' "$label"
	"$@"
}

# Test-only fault injection proves set -e propagates a failed child command.
if [[ "${UNIAPP_VERIFY_INJECT_FAILURE:-0}" == "1" ]]; then
	run_check "injected failure" node -e 'process.exit(17)'
fi

shopt -s nullglob
test_files=(tests/unit/*.test.mjs)
if [[ "${#test_files[@]}" -eq 0 ]]; then
	printf 'No UniApp unit tests found.\n' >&2
	exit 1
fi

for test_file in "${test_files[@]}"; do
	run_check "$test_file" node "$test_file"
done

run_check "Smart HID protocol contract" node scripts/check-smart-hid-contract.mjs
run_check "UniApp package lock" node scripts/check-uniapp-package-lock.mjs
run_check "UniApp static assets" node scripts/check-uniapp-assets.mjs
run_check "UniApp Vue SFC parse" node scripts/check-uniapp-sfc.mjs
run_check "UniAutomator config syntax" node --check apps/uniapp/env.js
run_check "UniAutomator Jest syntax" node --check apps/uniapp/jest.config.js
run_check "UniAutomator page-test syntax" node --check apps/uniapp/pages/index/index.test.js
run_check "UniAutomator page-flow syntax" node --check apps/uniapp/pages/page-flow.test.js
run_check "Release metadata check" node scripts/generate-release-metadata.mjs --check
run_check "Version consistency" node scripts/check-version-consistency.mjs
run_check "Git whitespace" git diff --check

printf '\nUniApp verification PASS (%d unit files plus 11 static gates)\n' "${#test_files[@]}"
