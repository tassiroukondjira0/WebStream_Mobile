# Script tout-en-un : build local, copie APK, commit et push
#
# Usage :
#   .\scripts\build-and-publish.ps1
#   .\scripts\build-and-publish.ps1 -Message "Mon message personnalise"
#
# Ce script :
#   1. Lance le build Gradle (assembleRelease)
#   2. Copie l'APK vers Web_Stream/apk/
#   3. Commit et push dans le depot Web_Stream

param(
    [string]$Message = "Plateforme de streaming"
)

$ErrorActionPreference = 'Stop'

# Chemins
$GradlewPath = Join-Path $PSScriptRoot '..\android\gradlew.bat'
$ApkSource = Join-Path $PSScriptRoot '..\android\app\build\outputs\apk\release\app-release.apk'
$ApkDestDir = Join-Path $PSScriptRoot '..\..\Web_Stream\apk'
$ApkDest = Join-Path $ApkDestDir 'cinemax.apk'
$WebStreamRoot = Join-Path $PSScriptRoot '..\..\Web_Stream'

Write-Host "========================================"
Write-Host "  Cinemax - Build & Publish APK"
Write-Host "========================================"
Write-Host ""

# Etape 1 : Build Gradle
Write-Host "[1/4] Build Gradle en cours..."
if (-not (Test-Path $GradlewPath)) {
    Write-Error "gradlew.bat non trouve : $GradlewPath"
    Write-Host "Assurez-vous d'etre dans le dossier Web_Stream_Mobile."
    exit 1
}

$AndroidDir = Join-Path $PSScriptRoot '..\android'
Push-Location $AndroidDir
try {
    & .\gradlew.bat assembleRelease
} catch {
    Write-Error "Le build Gradle a echoue."
    Pop-Location
    exit 1
}
Pop-Location

if (-not (Test-Path $ApkSource)) {
    Write-Error "APK non trouve apres le build : $ApkSource"
    exit 1
}
Write-Host "[1/4] Build termine avec succes !"
Write-Host ""

# Etape 2 : Copier l'APK
Write-Host "[2/4] Copie de l'APK..."
if (-not (Test-Path $ApkDestDir)) {
    New-Item -ItemType Directory -Path $ApkDestDir -Force | Out-Null
}

Copy-Item -Path $ApkSource -Destination $ApkDest -Force
$Stat = Get-Item $ApkDest
$Size = [math]::Round($Stat.Length / 1MB, 2)
Write-Host "[2/4] APK copie - ${Size} MB"
Write-Host ""

# Etape 3 : Message de commit
Write-Host "[3/4] Preparation du commit..."
if (-not $Message) {
    $DateStr = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "Update local APK build ($DateStr)"
}
Write-Host "  Message : $Message"
Write-Host ""

# Etape 4 : Commit et push
Write-Host "[4/4] Commit et push dans Web_Stream..."
Push-Location $WebStreamRoot
try {
    git add .gitattributes
    git add apk\cinemax.apk
    git commit -m $Message
    git push
} catch {
    Write-Error "Le commit ou le push a echoue."
    Write-Host ""
    Write-Host "Vous pouvez le faire manuellement :"
    Write-Host "  git add .gitattributes"
    Write-Host "  git add apk\cinemax.apk"
    Write-Host "  git commit -m `"$Message`""
    Write-Host "  git push"
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "========================================"
Write-Host "  Build publie avec succes !"
Write-Host "  Taille : ${Size} MB"
Write-Host "  Date : $($Stat.LastWriteTime)"
Write-Host "========================================"
