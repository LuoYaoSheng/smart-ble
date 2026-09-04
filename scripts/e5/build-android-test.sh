#!/usr/bin/env bash
# E5 Android test compile probe (does not install / does not claim E5 PASS).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Resolve CLI: HBUILDERX_CLI env first, then common per-OS install paths.
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
CLI="$(hb_cli_default)" || {
  echo "HBuilderX CLI missing: set HBUILDERX_CLI or install HBuilderX" >&2
  exit 2
}
PROJECT="${ROOT}/apps/uniapp"
OUT_DIR="${ROOT}/verification/e5/android"
mkdir -p "${OUT_DIR}"
LOG="${OUT_DIR}/apk-build-attempt.txt"

if [[ ! -x "${CLI}" ]]; then
  echo "HBuilderX CLI missing: ${CLI}" >&2
  exit 2
fi

DEVICE_ID="${E5_ANDROID_DEVICE_ID:-}"
if [[ -z "${DEVICE_ID}" ]]; then
  DEVICE_ID="$(adb devices 2>/dev/null | awk '/\tdevice$/{print $1; exit}')"
fi
if [[ -z "${DEVICE_ID}" ]]; then
  echo "No adb device for compile launch; set E5_ANDROID_DEVICE_ID" >&2
  exit 3
fi

{
  echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "git=$(git -C "${ROOT}" rev-parse HEAD)"
  echo "command=${CLI} launch app-android --project ${PROJECT} --deviceId ${DEVICE_ID} --compile true"
  echo "---"
  "${CLI}" launch app-android --project "${PROJECT}" --deviceId "${DEVICE_ID}" --compile true || true
} >"${LOG}" 2>&1

sed -E 's/\x1b\[[0-9;]*m//g' "${LOG}" >"${LOG}.clean" && mv "${LOG}.clean" "${LOG}"

echo "log=${LOG}"
if grep -q 'Invalid value "iife"' "${LOG}"; then
  echo "RESULT=BLOCKED_IIFE"
  exit 4
fi
if grep -q '项目 uniapp 编译成功' "${LOG}"; then
  APP_JS="${PROJECT}/unpackage/dist/dev/app-plus/app-service.js"
  if [[ -f "${APP_JS}" ]]; then
    echo "compile_artifact=${APP_JS}"
    # shasum ships with macOS/Git Bash perl; sha256sum is the coreutils fallback.
    echo "compile_sha256=$( (shasum -a 256 "${APP_JS}" 2>/dev/null || sha256sum "${APP_JS}") | awk '{print $1}')"
  fi
  echo "RESULT=COMPILE_OK"
  # launch may still print 已停止运行 after successful compile (no install / no custom base)
  exit 0
fi
if grep -qiE 'Build failed|编译失败|Failed to parse source' "${LOG}"; then
  echo "RESULT=FAIL"
  exit 5
fi
echo "RESULT=UNKNOWN"
exit 6
