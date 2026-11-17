# Job: Patch APK binary assets (10.0.2.2 -> 127.0.0.1 for USB reverse routing) and resign with debug key.

import sys
import os
import zipfile
import subprocess

SDK_BUILD_TOOLS = r"D:\Android\Sdk\build-tools\34.0.0"
ZIPALIGN = os.path.join(SDK_BUILD_TOOLS, "zipalign.exe")
APKSIGNER = os.path.join(SDK_BUILD_TOOLS, "apksigner.bat")
KEYSTORE = r"E:\allgo\apks\debug.keystore"

def patch_apk(src_apk, dst_apk):
    unaligned_apk = dst_apk + ".unaligned"
    print(f"[*] Reading {src_apk}...")
    
    with zipfile.ZipFile(src_apk, 'r') as zin, zipfile.ZipFile(unaligned_apk, 'w') as zout:
        for item in zin.infolist():
            filename = item.filename
            # Skip old signatures so apksigner can re-sign cleanly
            if filename.startswith("META-INF/") and (filename.endswith(".SF") or filename.endswith(".RSA") or filename.endswith(".MF")):
                continue
            
            data = zin.read(filename)
            if filename == "assets/flutter_assets/kernel_blob.bin":
                count = data.count(b"http://10.0.2.2:3000")
                print(f"[*] Found {count} occurrences of http://10.0.2.2:3000 in {filename}")
                data = data.replace(b"http://10.0.2.2:3000", b"http://127.0.0.1:3000")
                print(f"[*] Replaced with http://127.0.0.1:3000")
            
            # Preserve compression
            zout.writestr(item, data)
    
    print(f"[*] Running zipalign...")
    if os.path.exists(dst_apk):
        os.remove(dst_apk)
    subprocess.check_call([ZIPALIGN, "-p", "-f", "4", unaligned_apk, dst_apk])
    os.remove(unaligned_apk)

    print(f"[*] Signing with apksigner...")
    subprocess.check_call([
        APKSIGNER, "sign",
        "--ks", KEYSTORE,
        "--ks-pass", "pass:android",
        "--ks-key-alias", "androiddebugkey",
        "--key-pass", "pass:android",
        dst_apk
    ])
    
    print(f"[SUCCESS] Patched & signed: {dst_apk}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python patch_and_sign_apk.py <src_apk> <dst_apk>")
        sys.exit(1)
    patch_apk(sys.argv[1], sys.argv[2])
