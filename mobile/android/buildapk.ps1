$env:JAVA_HOME        = "C:\Program Files\Android\openjdk\jdk-21.0.8"
$env:PATH             = $env:JAVA_HOME + "\bin;" + $env:PATH
$env:ANDROID_HOME     = "C:\Users\UESR\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\UESR\AppData\Local\Android\Sdk"
$env:GRADLE_USER_HOME = "C:\g"
$env:NODE_ENV         = "production"

Write-Host "=== STARTING assembleDebug (arm64-v8a only) ===" -ForegroundColor Cyan
Write-Host ("Disk free: " + [math]::Round((Get-PSDrive C).Free/1GB,1) + " GB")

# Remove old APK output so we know if a fresh one lands
Remove-Item "app\build\outputs\apk\debug\*.apk" -Force -ErrorAction SilentlyContinue

.\gradlew.bat assembleDebug 2>&1 | Tee-Object -FilePath "C:\Users\UESR\Desktop\build_output.txt"

Write-Host "=== BUILD FINISHED ===" -ForegroundColor Cyan

$apk = Get-ChildItem "app\build\outputs\apk" -Recurse -Filter "*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($apk) {
    Copy-Item $apk.FullName "C:\Users\UESR\Desktop\GuardianLink.apk" -Force
    $mb = [math]::Round($apk.Length / 1MB, 1)
    Write-Host ("SUCCESS: APK copied to Desktop (" + $mb + " MB)") -ForegroundColor Green
} else {
    Write-Host "FAILED: No APK found in build outputs" -ForegroundColor Red
    Write-Host "Check C:\Users\UESR\Desktop\build_output.txt for details"
    # Print last 20 lines of output for quick diagnosis
    Get-Content "C:\Users\UESR\Desktop\build_output.txt" -Tail 20 | Where-Object { $_ -match "FAILED|error:|Error|went wrong|Exception" }
}
