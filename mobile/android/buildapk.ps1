$env:JAVA_HOME = 'C:\Program Files\Android\openjdk\jdk-21.0.8'
$env:GRADLE_USER_HOME = 'D:\g'
$env:TEMP = 'D:\Temp'
$env:TMP = 'D:\Temp'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$androidDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $androidDir
Write-Host '[GuardianLink] Starting APK build...'
& .\gradlew assembleRelease --no-daemon 2>&1 | Tee-Object -FilePath build.log
$apkPath = Join-Path $androidDir 'app\build\outputs\apk\release\app-release.apk'
if (Test-Path $apkPath) {
  $dest = 'C:\Users\UESR\Desktop\GuardianLink2.apk'
  Copy-Item $apkPath $dest -Force
  $sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 1)
  Write-Host "[GuardianLink] SUCCESS: $dest ($sizeMB MB)"
} else {
  Write-Host '[GuardianLink] ERROR: APK not found.' -ForegroundColor Red
  Get-Content build.log | Select-Object -Last 50
  exit 1
}
