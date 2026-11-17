@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo        ALLGO MOBILE AUTOMATION - ANDROID STUDIO ^& TEST RUNNER
echo ====================================================================

set "JAVA_HOME=D:\Android\Jdk17\jdk-17.0.20.1+1"
set "ANDROID_HOME=D:\Android\Sdk"
set "ANDROID_AVD_HOME=D:\Android\avd"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%JAVA_HOME%\bin;%PATH%"

echo [*] Launching Android Studio with Customer Mobile project...
start "" "D:\android stdio\bin\studio64.exe" "E:\allgo\apps\customer_mobile\android"

echo [*] Checking for connected devices or running emulator...
for /f "tokens=1,2" %%A in ('adb devices ^| findstr /v "List of devices"') do (
    if "%%B"=="device" (
        set "CONNECTED_DEVICE=%%A"
    )
)

if "!CONNECTED_DEVICE!"=="" (
    echo [*] No device connected. Starting AllGo Android Emulator on Drive D:...
    start "" emulator.exe -avd AllGo_Device_D -no-boot-anim -netdelay none -no-metrics
    echo [*] Waiting for emulator to come online...
    adb wait-for-device
)

echo [*] Setting ADB reverse port forwarding (tcp:3000 -^> tcp:3000)...
adb reverse tcp:3000 tcp:3000

echo [*] Installing latest Customer App APK...
adb install -r "E:\allgo\apks\allgo-customer.apk"

echo [*] Launching AllGo Customer App...
adb shell am start -n in.allgo.customer/in.allgo.customer.MainActivity

echo ====================================================================
echo [SUCCESS] Automation Complete!
echo  - Android Studio opened with: E:\allgo\apps\customer_mobile\android
echo  - Emulator / Device running with: in.allgo.customer
echo  - Verification OTP: 123456 (or live carrier SMS)
echo ====================================================================
pause
