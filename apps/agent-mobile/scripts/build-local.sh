#!/bin/bash
# ============================================================================
# Quick local Android debug build (no EAS required)
# Requires: Android SDK, JDK 17+, ANDROID_HOME set
# Usage: ./scripts/build-local.sh
# ============================================================================
set -e

cd "$(dirname "$0")/.."

APP_NAME="VoteCapsule Agent"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

echo "================================================"
echo "  Local Android Debug Build - ${APP_NAME}"
echo "================================================"
echo ""

# Verify prerequisites
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  echo "ERROR: ANDROID_HOME or ANDROID_SDK_ROOT not set."
  echo "Please install Android SDK and set the environment variable."
  exit 1
fi

if ! java -version 2>&1 | grep -q "17\|18\|19\|20\|21\|22"; then
  echo "WARNING: JDK 17+ recommended. Current version:"
  java -version 2>&1 | head -1
fi

echo "Installing dependencies..."
npx expo install

echo ""
echo "Running Expo prebuild (Android)..."
npx expo prebuild --platform android --clean

echo ""
echo "Building debug APK..."
cd android

# Use gradlew.bat on Windows (Git Bash / MSYS2), gradlew on Linux/macOS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  ./gradlew.bat assembleDebug
else
  chmod +x ./gradlew
  ./gradlew assembleDebug
fi

cd ..

echo ""
echo "================================================"
echo "  BUILD COMPLETE"
echo "  APK: ${APK_PATH}"
echo "================================================"
echo ""

# Print APK size
if [ -f "$APK_PATH" ]; then
  APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo "  Size: ${APK_SIZE}"
  echo ""
  echo "  Install on device:"
  echo "    adb install -r ${APK_PATH}"
fi
