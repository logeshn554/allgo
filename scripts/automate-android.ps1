# Job: Automated runner for Android Studio, emulator lifecycle, and APK deployment.

[CmdletBinding()]
param (
    [ValidateSet('customer', 'partner', 'merchant')]
    [string]$App = 'customer'
)

$ErrorActionPreference = 'Stop'

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "       ALLGO MOBILE AUTOMATION - ANDROID STUDIO & TEST RUNNER       " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

$env:JAVA_HOME = 'D:\Android\Jdk17\jdk-17.0.20.1+1'
$env:ANDROID_HOME = 'D:\Android\Sdk'
$env:ANDROID_AVD_HOME = 'D:\Android\avd'
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:JAVA_HOME\bin;$env:PATH"

$projectMap = @{
    'customer' = 'E:\allgo\apps\customer_mobile\android'
    'partner'  = 'E:\allgo\apps\partner_mobile\android'
    'merchant' = 'E:\allgo\apps\merchant_mobile\android'
}

$apkMap = @{
    'customer' = 'E:\allgo\apks\allgo-customer.apk'
    'partner'  = 'E:\allgo\apks\allgo-partner.apk'
    'merchant' = 'E:\allgo\apks\allgo-merchant.apk'
}

$pkgMap = @{
    'customer' = 'in.allgo.customer'
    'partner'  = 'in.allgo.partner'
    'merchant' = 'in.allgo.merchant'
}

$selectedProject = $projectMap[$App]
$selectedApk = $apkMap[$App]
$selectedPkg = $pkgMap[$App]

Write-Host "[*] Launching Android Studio for $App..." -ForegroundColor Green
Start-Process -FilePath "D:\android stdio\bin\studio64.exe" -ArgumentList "`"$selectedProject`""

Write-Host "[*] Checking ADB connected devices..." -ForegroundColor Green
$devices = & "$env:ANDROID_HOME\platform-tools\adb.exe" devices | Where-Object { $_ -match '\tdevice$' }

if (-not $devices) {
    Write-Host "[*] Starting AllGo Virtual Device on Drive D:..." -ForegroundColor Yellow
    Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList "-avd AllGo_Device_D -no-boot-anim -netdelay none -no-metrics"
    Write-Host "[*] Waiting for device to finish booting..." -ForegroundColor Yellow
    & "$env:ANDROID_HOME\platform-tools\adb.exe" wait-for-device
}

Write-Host "[*] Forwarding API port (adb reverse tcp:3000 tcp:3000)..." -ForegroundColor Green
& "$env:ANDROID_HOME\platform-tools\adb.exe" reverse tcp:3000 tcp:3000

Write-Host "[*] Installing $App APK ($selectedApk)..." -ForegroundColor Green
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r $selectedApk

Write-Host "[*] Starting $App on device..." -ForegroundColor Green
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell am start -n "$selectedPkg/$selectedPkg.MainActivity"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " [SUCCESS] $App Mobile Application launched!" -ForegroundColor Green
Write-Host "  - Verification Code: 123456 (or live SMS)" -ForegroundColor Yellow
Write-Host "  - Android Studio is loaded with $selectedProject" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan
