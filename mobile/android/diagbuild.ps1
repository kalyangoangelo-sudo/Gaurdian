$env:JAVA_HOME        = "C:\Program Files\Android\openjdk\jdk-21.0.8"
$env:PATH             = $env:JAVA_HOME + "\bin;" + $env:PATH
$env:ANDROID_HOME     = "C:\Users\UESR\AppData\Local\Android\Sdk"
$env:GRADLE_USER_HOME = "C:\g"
$env:NODE_ENV         = "production"

$output = .\gradlew.bat assembleDebug --stacktrace 2>&1
$output | Where-Object { $_ -match "What went wrong|Execution failed|error:|Caused by|> " } | Select-Object -First 40
