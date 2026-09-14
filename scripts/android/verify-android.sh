#!/usr/bin/env bash
# verify-android.sh — Android 根级验证入口（MAC-002）
# 固定 JDK 17/21：Android Gradle Plugin 线尚未对 JDK 25 完成验证，默认 JDK 25
# 时给出明确错误，而不是让构建在深处以难解的兼容性错误失败。
#
# 解析顺序：ANDROID_JAVA_HOME → JAVA_HOME（若已是 17/21）→ macOS /usr/libexec/java_home
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

java_version_of() {
  local bin="$1/bin/java"
  [ -x "$bin" ] || return 1
  "$bin" -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/'
}

RESOLVED=""

if [ -n "${ANDROID_JAVA_HOME:-}" ]; then
  v="$(java_version_of "$ANDROID_JAVA_HOME" || echo '')"
  if [ "$v" = "17" ] || [ "$v" = "21" ]; then
    RESOLVED="$ANDROID_JAVA_HOME"
  else
    printf 'ERROR: ANDROID_JAVA_HOME 指向 JDK %s（%s）；Android 验证只支持 JDK 17/21。\n' "${v:-未知}" "$ANDROID_JAVA_HOME" >&2
    exit 2
  fi
fi

if [ -z "$RESOLVED" ] && [ -n "${JAVA_HOME:-}" ]; then
  v="$(java_version_of "$JAVA_HOME" || echo '')"
  if [ "$v" = "17" ] || [ "$v" = "21" ]; then
    RESOLVED="$JAVA_HOME"
  fi
fi

if [ -z "$RESOLVED" ] && [ -x /usr/libexec/java_home ]; then
  for v in 21 17; do
    candidate="$(/usr/libexec/java_home -v "$v" 2>/dev/null || true)"
    # java_home 在缺少精确版本时可能回退到默认 JVM（如 -v 21 返回 temurin-25），
    # 必须实测候选的真实主版本再接受。
    if [ -n "$candidate" ] && [ "$(java_version_of "$candidate" || echo '')" = "$v" ]; then
      RESOLVED="$candidate"
      break
    fi
  done
fi

if [ -z "$RESOLVED" ]; then
  default_v="$(java_version_of "${JAVA_HOME:-/usr}" 2>/dev/null || echo '未知')"
  printf 'ERROR: 未找到 JDK 17/21（当前默认 JAVA_HOME=%s，版本 %s）。\n' "${JAVA_HOME:-未设置}" "$default_v" >&2
  printf 'Android 验证固定 JDK 17/21（JDK 25 未验证）。请安装 Temurin 17/21 并设置 ANDROID_JAVA_HOME 或 JAVA_HOME。\n' >&2
  exit 2
fi

printf 'android jdk: %s (java version %s)\n' "$RESOLVED" "$(java_version_of "$RESOLVED")"
# macOS 常规 SDK 位置兜底，避免干净 shell 漏带 ANDROID_HOME。
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
cd "$REPO_ROOT/apps/android"
JAVA_HOME="$RESOLVED" ./gradlew assembleDebug testDebugUnitTest
