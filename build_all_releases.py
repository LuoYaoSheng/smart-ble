#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Smart BLE Release Engineering Script (v1.0.0)
This script orchestrates the build process for all supported platforms
and aggregates the final binaries into a unified /release_artifacts directory.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
RELEASE_DIR = PROJECT_ROOT / "release_artifacts"

def run_command(cmd, cwd, step_name):
    print(f"\n[{step_name}] Running: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, cwd=cwd, check=True, shell=(sys.platform == "win32"))
    except subprocess.CalledProcessError as e:
        print(f"\n❌ [{step_name}] Failed with error: {e}")
        sys.exit(1)

def build_flutter():
    flutter_dir = PROJECT_ROOT / "apps" / "flutter"
    print("\n📦 Building Flutter Android APK...")
    run_command(["flutter", "build", "apk", "--release"], flutter_dir, "Flutter APK")
    
    # Store artifact
    apk_src = flutter_dir / "build" / "app" / "outputs" / "flutter-apk" / "app-release.apk"
    if apk_src.exists():
        shutil.copy(apk_src, RELEASE_DIR / "SmartBLE_Android_Flutter.apk")
        print("✅ Flutter APK copied to releases.")

def build_tauri():
    tauri_dir = PROJECT_ROOT / "apps" / "desktop" / "tauri"
    print("\n📦 Building Tauri Desktop Application...")
    # Note: Requires cargo and npm to be installed
    run_command(["npm", "run", "tauri", "build"], tauri_dir, "Tauri Desktop")
    
    # Store artifact (assuming Windows build .msi)
    msi_dir = tauri_dir / "src-tauri" / "target" / "release" / "bundle" / "msi"
    if msi_dir.exists():
        for file in msi_dir.glob("*.msi"):
            shutil.copy(file, RELEASE_DIR / file.name)
            print(f"✅ Tauri Desktop {file.name} copied to releases.")

def build_electron():
    electron_dir = PROJECT_ROOT / "apps" / "desktop" / "electron"
    print("\n📦 Building Electron Desktop Application...")
    # Using simple electron-builder if available
    run_command(["npm", "run", "build"], electron_dir, "Electron Desktop")
    
    dist_dir = electron_dir / "dist"
    if dist_dir.exists():
        for file in dist_dir.glob("*.exe"):
            shutil.copy(file, RELEASE_DIR / file.name)
            print(f"✅ Electron Desktop {file.name} copied to releases.")

def prepare_uniapp():
    uniapp_dir = PROJECT_ROOT / "apps" / "uniapp"
    print("\n📦 Preparing UniApp WeChat Mini Program...")
    # UniApp CLI usually takes build commands, or it requires HBuilderX.
    # Usually `npm run build:mp-weixin` for Vue-CLI based uniapp
    print("ℹ️  Note: UniApp automated compilation is highly dependent on HBuilderX CLI. Providing dist copy if generated manually.")
    dist_dir = uniapp_dir / "dist" / "build" / "mp-weixin"
    if dist_dir.exists():
        print("✅ UniApp WeChat Mini Program distribution is available.")

def main():
    print(f"🚀 Starting Smart BLE Release Build at: {PROJECT_ROOT}")
    
    # Clean / Create release directory
    if RELEASE_DIR.exists():
        shutil.rmtree(RELEASE_DIR)
    RELEASE_DIR.mkdir(parents=True)
    
    try:
        build_flutter()
    except Exception as e:
        print(f"⚠️ Skipping Flutter build due to environment mismatch: {e}")
        
    try:
        build_tauri()
    except Exception as e:
        print(f"⚠️ Skipping Tauri build due to environment mismatch: {e}")
        
    prepare_uniapp()
    
    print(f"\n🎉 All automated builds complete. Check the '{RELEASE_DIR.name}' folder!")

if __name__ == "__main__":
    main()
