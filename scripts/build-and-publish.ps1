# Script tout-en-un : incremente la version, build local, copie APK, commit et push
#
# Usage :
#   .\scripts\build-and-publish.ps1
#   .\scripts\build-and-publish.ps1 -Message "Mon message personnalise"
#
# Ce script :
#   0. Incremente la version (patch par defaut : 1.1.0 -> 1.1.1)
#   1. Lance le build Gradle (assembleRelease)
#   2. Copie l'APK vers Web_Stream/apk/
#   3. Commit la nouvelle version dans Web_Stream_Mobile
#   4. Commit et push l'APK dans le depot Web_Stream

param(
    [string]$Message = "Plateforme de streaming"
)

$ErrorActionPreference = 'Stop'

# Chemins
$GradlewPath = Join-Path $PSScriptRoot '..\android\gradlew.bat'
$ApkSource = Join-Path $PSScriptRoot '..\android\app\build\outputs\apk\release\app-release.apk'
$ApkDestDir = Join-Path $PSScriptRoot '..\..\Web_Stream\apk'
$WebStreamRoot = Join-Path $PSScriptRoot '..\..\Web_Stream'

Write-Host "========================================"
Write-Host "  Cinemax - Build & Publish APK"
Write-Host "========================================"
Write-Host ""

# Etape 0 : Nettoyer les anciens APK (local + Git)
Write-Host "[0/6] Nettoyage des anciens APK..."
if (Test-Path $ApkDestDir) {
    $deleted = Get-ChildItem -Path $ApkDestDir -Filter "*.apk" | ForEach-Object {
        Remove-Item $_.FullName -Force
        $_.Name
    }
    if ($deleted.Count -gt 0) {
        Write-Host "  Local supprime : $($deleted -join ', ')"
    } else {
        Write-Host "  Aucun ancien APK local a supprimer."
    }
} else {
    New-Item -ItemType Directory -Path $ApkDestDir -Force | Out-Null
    Write-Host "  Dossier de destination cree."
}

# Supprimer les anciens APK de Git pour eviter qu'ils restent sur GitHub
Push-Location $WebStreamRoot
try {
    $gitDeleted = git ls-files -- 'apk/*.apk' 2>$null
    if ($gitDeleted) {
        git rm --cached $gitDeleted | Out-Null
        Write-Host "  Git supprime : $($gitDeleted -replace 'apk/', '')"
    }
} catch {
    Write-Warning "Impossible de nettoyer les anciens APK de Git."
}
Pop-Location
Write-Host ""

# Etape 1 : Incrementer la version
Write-Host "[1/6] Incrementation de la version..."
node ./scripts/bump-version.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "L'incrementation de la version a echoue."
    exit 1
}
Write-Host ""

# Etape 2 : Build Gradle
Write-Host "[2/6] Build Gradle en cours..."
if (-not (Test-Path $GradlewPath)) {
    Write-Host "  gradlew.bat non trouve - regeneration de la configuration Android..."
    $MobileRoot = Join-Path $PSScriptRoot '..'
    Push-Location $MobileRoot
    npx expo prebuild --platform android 2>&1 | Out-Null
    Pop-Location
}

$AndroidDir = Join-Path $PSScriptRoot '..\android'

# Reappliquer la configuration de signature et Hermes apres prebuild
$gradleProps = Join-Path $PSScriptRoot '..\android\gradle.properties'
$props = Get-Content $gradleProps -Raw

# Desactiver Hermes pour eviter les erreurs .hbc sur Windows
if ($props -match 'hermesEnabled=true') {
    $props = $props -replace 'hermesEnabled=true', 'hermesEnabled=false'
}

# Ajouter android.aapt2FromSdk pour eviter les plantages AAPT2
if ($props -notmatch 'android\.aapt2FromSdk') {
    $props += "`nandroid.aapt2FromSdk=true"
}

# Ajouter la configuration de signature si absente
if ($props -notmatch 'myUploadStoreFile') {
    $props += "`n`n# Signing configuration for release builds"
    $props += "`nmyUploadStoreFile=../../cinemax.keystore"
    $props += "`nmyUploadStorePassword=cinemax2024"
    $props += "`nmyUploadKeyAlias=cinemax"
    $props += "`nmyUploadKeyPassword=cinemax2024"
}
Set-Content $gradleProps $props -NoNewline

# Reappliquer la config de signature dans build.gradle si prebuild l'a reset
$buildGradle = Join-Path $PSScriptRoot '..\android\app\build.gradle'
$bg = Get-Content $buildGradle -Raw
if ($bg -match 'signingConfig signingConfigs\.debug\s+def enableShrinkResources') {
    # Le release utilise encore debug signing - le remplacer
    $bg = $bg -replace
        "(signingConfigs \{[\s\S]*?debug \{[\s\S]*?\})\s*\}",
        "`$1`n        release {`n            storeFile file(findProperty('myUploadStoreFile') ?: '../../cinemax.keystore')`n            storePassword findProperty('myUploadStorePassword') ?: ''`n            keyAlias findProperty('myUploadKeyAlias') ?: 'cinemax'`n            keyPassword findProperty('myUploadKeyPassword') ?: ''`n        }`n    }"
    $bg = $bg -replace
        'release \{\s*// Caution! In production.*?signingConfig signingConfigs\.debug',
        'release {`n            signingConfig signingConfigs.release'
    Set-Content $buildGradle $bg -NoNewline
}

# Arreter les daemons Gradle pour eviter les conflits
Write-Host "  Arret des daemons Gradle..."
Push-Location $AndroidDir
& .\gradlew.bat --stop | Out-Null
Pop-Location

# Nettoyer les caches CMake pour eviter les erreurs de chemin
$cmakeCache = Join-Path $PSScriptRoot '..\android\app\.cxx'
if (Test-Path $cmakeCache) {
    Remove-Item -Recurse -Force $cmakeCache -ErrorAction SilentlyContinue
}

Push-Location $AndroidDir
try {
    & .\gradlew.bat assembleRelease --no-daemon
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
Write-Host "[2/6] Build termine avec succes !"
Write-Host ""

# Etape 3 : Copier et renommer l'APK avec la version
Write-Host "[3/6] Copie de l'APK..."

# Lire la version pour le nom de fichier
$version = node -p "require('./app.json').expo.version"
$ApkDest = Join-Path $ApkDestDir "cinemax-${version}.apk"

Copy-Item -Path $ApkSource -Destination $ApkDest -Force
$Stat = Get-Item $ApkDest
$Size = [math]::Round($Stat.Length / 1MB, 2)
Write-Host "[3/6] APK copie et renomme : cinemax-${version}.apk (${Size} MB)"
Write-Host ""

# Etape 4 : Commit des changements de version dans le repo mobile
Write-Host "[4/6] Commit de la nouvelle version dans Web_Stream_Mobile..."
$MobileRoot = Join-Path $PSScriptRoot '..'
Push-Location $MobileRoot
try {
    $versionInfo = node -p "require('./app.json').expo.version"
    git add app.json package.json android/app/build.gradle
    git commit -m "Bump version to $versionInfo"
    git push
} catch {
    Write-Warning "Le commit de la version a echoue - vous pouvez le faire manuellement."
}
Pop-Location
Write-Host ""

# Etape 5 : Message de commit
Write-Host "[5/6] Preparation du commit..."
if (-not $Message) {
    $DateStr = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "Update local APK build ($DateStr)"
}
Write-Host "  Message : $Message"
Write-Host ""

# Etape 6 : Commit et push
Write-Host "[6/6] Commit et push dans Web_Stream..."
Push-Location $WebStreamRoot
try {
    git add .gitattributes
    git add "apk\cinemax-${version}.apk"
    git commit -m $Message
    git push
} catch {
    Write-Error "Le commit ou le push a echoue."
    Write-Host ""
    Write-Host "Vous pouvez le faire manuellement :"
    Write-Host "  git add .gitattributes"
    Write-Host "  git add apk\cinemax-${version}.apk"
    Write-Host "  git commit -m `"$Message`""
    Write-Host "  git push"
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "========================================"
Write-Host "  Build publie avec succes !"
Write-Host "  Fichier : cinemax-${version}.apk"
Write-Host "  Taille  : ${Size} MB"
Write-Host "  Date    : $($Stat.LastWriteTime)"
Write-Host ""
Write-Host "  Pour installer sur votre telephone :"
Write-Host "    1. Transfert le fichier vers votre telephone"
Write-Host "    2. Autorisez l'installation depuis une source inconnue"
Write-Host "    3. Ouvrez le fichier cinemax-${version}.apk"
Write-Host "========================================"
