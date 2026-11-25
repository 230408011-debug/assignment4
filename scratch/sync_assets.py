import os
import shutil

root_dir = r"c:\Users\CN\.gemini\antigravity-ide\scratch\head-soccer"
www_dir = os.path.join(root_dir, "www")
android_assets_dir = os.path.join(root_dir, "android", "app", "src", "main", "assets", "public")

print("--- SYNCING SOURCE FILES TO WWW AND ANDROID ASSETS ---")

# Directories and files to sync
items_to_sync = ["index.html", "src", "assets"]

for item in items_to_sync:
    src_path = os.path.join(root_dir, item)
    
    # Sync to www
    www_target = os.path.join(www_dir, item)
    if os.path.isfile(src_path):
        os.makedirs(os.path.dirname(www_target), exist_ok=True)
        shutil.copy2(src_path, www_target)
    elif os.path.isdir(src_path):
        if os.path.exists(www_target):
            shutil.rmtree(www_target)
        shutil.copytree(src_path, www_target)
    print(f"Synced {item} -> www/")

    # Sync to android assets
    android_target = os.path.join(android_assets_dir, item)
    if os.path.isfile(src_path):
        os.makedirs(os.path.dirname(android_target), exist_ok=True)
        shutil.copy2(src_path, android_target)
    elif os.path.isdir(src_path):
        if os.path.exists(android_target):
            shutil.rmtree(android_target)
        shutil.copytree(src_path, android_target)
    print(f"Synced {item} -> android/app/src/main/assets/public/")

print("ASSETS AND SOURCE SYNCHRONIZED SUCCESSFULLY!")
