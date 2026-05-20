#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
if [ ! -d android ]; then
  ./node_modules/.bin/cap add android
fi
cd android
echo "sdk.dir=$HOME/android-sdk" > local.properties
grep -q "android.aapt2FromMavenOverride" gradle.properties || printf "\nandroid.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2\n" >> gradle.properties
grep -q "android.useAndroidX=true" gradle.properties || printf "android.useAndroidX=true\n" >> gradle.properties
sed -i "s/compileSdkVersion = 36/compileSdkVersion = 34/g; s/targetSdkVersion = 36/targetSdkVersion = 34/g; s/compileSdkVersion = 35/compileSdkVersion = 34/g; s/targetSdkVersion = 35/targetSdkVersion = 34/g" variables.gradle || true
./gradlew assembleDebug
