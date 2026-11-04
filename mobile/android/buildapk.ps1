$env:JAVA_HOME        = "C:\Program Files\Android\openjdk\jdk-21.0.8"
$env:PATH             = $env:JAVA_HOME + "\bin;" + $env:PATH
$env:ANDROID_HOME     = "C:\Users\UESR\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\UESR\AppData\Local\Android\Sdk"
$env:NODE_ENV         = "production"

# Use C:\g for Gradle work (existing cache — no re-downloading)
# Use D: only for large output files and temp
$env:GRADLE_USER_HOME = "C:\g"

# Redirect temp/intermediate build outputs to D: to save C: space
if (!(Test-Path "D:\guardian-build")) { New-Item -ItemType Directory -Path "D:\guardian-build" | Out-Null }
if (!(Test-Path "D:\guardian-build\tmp")) { New-Item -ItemType Directory -Path "D:\guardian-build\tmp" | Out-Null }
$env:TEMP = "D:\guardian-build\tmp"
$env:TMP  = "D:\guardian-build\tmp"

Write-Host "=== GuardianLink APK Build ===" -ForegroundColor Cyan
Write-Host ("C: free: " + [math]::Round((Get-PSDrive C).Free/1GB,1) + " GB")
Write-Host ("D: free: " + [math]::Round((Get-PSDrive D).Free/1GB,1) + " GB")
Write-Host "Gradle cache: C:\g  |  Temp/output: D:\guardian-build"

# Remove old APK output
Remove-Item "app\build\outputs\apk\debug\*.apk" -Force -ErrorAction SilentlyContinue

.\gradlew.bat assembleDebug 2>&1 | Tee-Object -FilePath "D:\guardian-build\build_output.txt"

Write-Host "=== BUILD FINISHED ===" -ForegroundColor Cyan

$apk = Get-ChildItem "app\build\outputs\apk" -Recurse -Filter "*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($apk) {
    Copy-Item $apk.FullName "C:\Users\UESR\Desktop\GuardianLink.apk" -Force
    $mb = [math]::Round($apk.Length / 1MB, 1)
    Write-Host ("SUCCESS: GuardianLink.apk on Desktop (" + $mb + " MB)") -ForegroundColor Green
} else {
    Write-Host "FAILED: No APK found" -ForegroundColor Red
    Write-Host "Check D:\guardian-build\build_output.txt for details"
    Get-Content "D:\guardian-build\build_output.txt" -Tail 30 | Where-Object { $_ -match "FAILED|error:|went wrong|Exception" }
}
