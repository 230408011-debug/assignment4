import os
import shutil
import hashlib
import zipfile
import subprocess

root_dir = r"c:\Users\CN\.gemini\antigravity-ide\scratch\head-soccer"

print("--- STEP 1: CLEANING STALE & TEMPORARY FILES ---")

stale_files = [
    "FURIO_FC_ANDROID_FINAL.zip",
    "FURIO_FC_CLOSED_BETA_FINAL_v0.9.3.zip",
    "app-debug.apk",
    "kit.bak",
    "post.bak",
    "patch_cm.py",
    "patch_cm_midseason.py",
    "patch_cm_tier.py",
    "patch_cw_midseason.py",
    "patch_gamescene.py",
    "patch_player.py",
    "patch_player_physics.py",
    "patch_teamdb_start.py",
    "test_offers.js"
]

for filename in stale_files:
    filepath = os.path.join(root_dir, filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            print(f"Removed stale file: {filename}")
        except Exception as e:
            print(f"Could not remove {filename}: {e}")

# Also clean build outputs before rebuilding
android_dir = os.path.join(root_dir, "android")

print("\n--- STEP 2: BUILDING FRESH ANDROID BINARIES ---")

cmd_env = f'set JAVA_HOME=C:\\Program Files\\Android\\Android Studio\\jbr&& set ANDROID_HOME=C:\\Users\\CN\\AppData\\Local\\Android\\Sdk&& cd /d "{android_dir}" && gradlew.bat'

def run_gradle_task(task_name):
    full_cmd = f'{cmd_env} {task_name}'
    print(f"Executing Gradle Task: {task_name}...")
    res = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Gradle Task {task_name} FAILED!")
        print(res.stderr)
        return False
    print(f"Gradle Task {task_name} SUCCESSFUL!")
    return True

if not run_gradle_task("assembleDebug"):
    raise Exception("assembleDebug failed")

if not run_gradle_task("assembleRelease"):
    raise Exception("assembleRelease failed")

if not run_gradle_task("bundleRelease"):
    raise Exception("bundleRelease failed")

print("\n--- STEP 3: COPYING & COMPUTING SHA-256 HASHES ---")

builds_dir = os.path.join(root_dir, "builds")
os.makedirs(builds_dir, exist_ok=True)

debug_src = os.path.join(android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
release_apk_src = os.path.join(android_dir, "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk")
release_aab_src = os.path.join(android_dir, "app", "build", "outputs", "bundle", "release", "app-release.aab")

debug_dst = os.path.join(builds_dir, "FURIO_FC_2025_LAST_VERSION_DEBUG.apk")
release_apk_dst = os.path.join(builds_dir, "FURIO_FC_2025_LAST_VERSION_RELEASE.apk")
release_aab_dst = os.path.join(builds_dir, "FURIO_FC_2025_LAST_VERSION_RELEASE.aab")

shutil.copy2(debug_src, debug_dst)
shutil.copy2(release_apk_src, release_apk_dst)
shutil.copy2(release_aab_src, release_aab_dst)

def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

hashes = {
    "DEBUG_APK": {
        "filename": "FURIO_FC_2025_LAST_VERSION_DEBUG.apk",
        "path": debug_dst,
        "size": os.path.getsize(debug_dst),
        "sha256": get_sha256(debug_dst)
    },
    "RELEASE_APK": {
        "filename": "FURIO_FC_2025_LAST_VERSION_RELEASE.apk",
        "path": release_apk_dst,
        "size": os.path.getsize(release_apk_dst),
        "sha256": get_sha256(release_apk_dst)
    },
    "RELEASE_AAB": {
        "filename": "FURIO_FC_2025_LAST_VERSION_RELEASE.aab",
        "path": release_aab_dst,
        "size": os.path.getsize(release_aab_dst),
        "sha256": get_sha256(release_aab_dst)
    }
}

print("Binary Hash Table:")
for k, v in hashes.items():
    print(f"[{k}] {v['filename']} | Size: {v['size'] / (1024*1024):.2f} MB | SHA-256: {v['sha256']}")

print("\n--- STEP 4: PACKAGING FINAL ZIP ---")

final_zip_path = os.path.join(root_dir, "FURIO_FC_2025_LAST_VERSION_FINAL.zip")
if os.path.exists(final_zip_path):
    os.remove(final_zip_path)

ignore_dirs = {".git", ".gradle", "node_modules", "build", ".idea", ".vscode", "__pycache__", "tmp", ".tempmediaStorage", "scratch"}
ignore_files = {"FURIO_FC_2025_LAST_VERSION_FINAL.zip", "build_apk.ps1"}

with zipfile.ZipFile(final_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if file in ignore_files or file.endswith(".pyc") or file.endswith(".bak"):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, root_dir)
            zipf.write(full_path, rel_path)

zip_hash = get_sha256(final_zip_path)
zip_size = os.path.getsize(final_zip_path) / (1024 * 1024)

print(f"\nFINAL ZIP PACKAGE CREATED: FURIO_FC_2025_LAST_VERSION_FINAL.zip ({zip_size:.2f} MB)")
print(f"ZIP SHA-256: {zip_hash}")

# Save hash metadata to tests/BUILD_HASHES.json
hash_metadata = {
    "builds": hashes,
    "final_zip": {
        "filename": "FURIO_FC_2025_LAST_VERSION_FINAL.zip",
        "size_mb": round(zip_size, 2),
        "sha256": zip_hash
    }
}

import json
with open(os.path.join(root_dir, "tests", "BUILD_HASHES.json"), "w") as f:
    json.dump(hash_metadata, f, indent=2)

print("Saved build hashes to tests/BUILD_HASHES.json!")
