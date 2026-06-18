import os
import re
import shutil
import tempfile

workspace_dir = r"C:\Users\Takashi Sensei\Documents\antigravity\goofy-einstein"
esp_ino_path = os.path.join(workspace_dir, "hardware", "esp01_mqtt", "esp01_mqtt.ino")
dest_bin_path = os.path.join(workspace_dir, "backend", "firmware", "latest.bin")
dest_ver_path = os.path.join(workspace_dir, "backend", "firmware", "version.txt")

def update():
    # 1. Parse version from esp01_mqtt.ino
    if not os.path.exists(esp_ino_path):
        print(f"Error: ESP-01 sketch not found at {esp_ino_path}")
        return
        
    version = None
    with open(esp_ino_path, "r", encoding="utf-8") as f:
        content = f.read()
        match = re.search(r'#define\s+FIRMWARE_VERSION\s+"([^"]+)"', content)
        if match:
            version = match.group(1)
            
    if not version:
        print("Error: Could not find FIRMWARE_VERSION define in esp01_mqtt.ino")
        return
        
    print(f"Detected Firmware Version: {version}")
    
    # 2. Search for the latest compiled .bin in the Temp folder
    temp_dir = tempfile.gettempdir()
    print(f"Searching for compiled binary in Temp folder: {temp_dir}...")
    
    bin_files = []
    # Search AppData Temp folders recursively for esp01_mqtt binaries
    for root, dirs, files in os.walk(temp_dir):
        # Limit search depth to prevent excessive scan time
        depth = root[len(temp_dir):].count(os.path.sep)
        if depth > 4: 
            continue
            
        for file in files:
            if file.endswith(".bin") and "esp01_mqtt" in file:
                full_path = os.path.join(root, file)
                try:
                    mtime = os.path.getmtime(full_path)
                    bin_files.append((full_path, mtime))
                except Exception:
                    pass
                    
    if not bin_files:
        print("Error: Could not find any compiled esp01_mqtt binary in Temp folder.")
        print("Please compile the sketch in Arduino IDE first (Verify/Compile or Upload).")
        return
        
    # Sort by modification time (most recent first)
    bin_files.sort(key=lambda x: x[1], reverse=True)
    latest_bin, latest_time = bin_files[0]
    
    print(f"Found latest binary: {latest_bin}")
    
    # 3. Create destination directory if not exists
    os.makedirs(os.path.dirname(dest_bin_path), exist_ok=True)
    
    # 4. Copy .bin file
    shutil.copy2(latest_bin, dest_bin_path)
    print(f"Copied binary to: {dest_bin_path}")
    
    # 5. Write version.txt
    with open(dest_ver_path, "w", encoding="utf-8") as f:
        f.write(version)
    print(f"Updated version.txt to: {version}")
    print("\nFirmware update files staged successfully! You can now commit and push to deploy.")

if __name__ == "__main__":
    update()
