$env:JAVA_HOME        = "C:\Program Files\Android\openjdk\jdk-21.0.8"
$env:PATH             = $env:JAVA_HOME + "\bin;" + $env:PATH
$env:ANDROID_HOME     = "C:\Users\UESR\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\UESR\AppData\Local\Android\Sdk"
$env:GRADLE_USER_HOME = "C:\g"
$env:NODE_ENV         = "production"

Write-Host "=== GuardianLink APK (standalone + shield icon) ==="
Write-Host "Free disk: $([math]::Round((Get-PSDrive C).Free/1GB,2)) GB"

.\gradlew.bat assembleDebug 2>&1

$exit = $LASTEXITCODE
Write-Host "EXIT_CODE: $exit"

if ($exit -eq 0) {
    $apk = "app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apk) {
        $mb = [math]::Round((Get-Item $apk).Length/1MB, 1)
        Write-Host "SUCCESS: APK built ($mb MB)"
        Copy-Item $apk "C:\Users\UESR\Desktop\GuardianLink.apk" -Force
        Write-Host "COPIED TO DESKTOP: GuardianLink.apk"
    }
} else {
    Write-Host "BUILD FAILED - exit code $exit"
}
