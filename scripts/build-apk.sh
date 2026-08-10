#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/example/android"
OUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"
DEST="$ROOT_DIR/nitro-theme-transition-example.apk"

if [[ ! -d "$ANDROID_DIR" ]]; then
  echo "error: example/android is missing — run: cd example && bun run prebuild" >&2
  exit 1
fi

cd "$ANDROID_DIR"
./gradlew assembleRelease

APK="$(find "$OUT_DIR" -name '*.apk' -type f | head -n 1)"
if [[ -z "$APK" ]]; then
  echo "error: no APK found under $OUT_DIR" >&2
  exit 1
fi

cp -f "$APK" "$DEST"
echo "APK → $DEST"
