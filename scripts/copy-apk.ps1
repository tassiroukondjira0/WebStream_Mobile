# Copie l'APK du build local vers le dossier apk/ du projet Web_Stream
# pour qu'il soit disponible au téléchargement en production.
#
# Usage : ./scripts/copy-apk.ps1
# Exécuter après : cd android && .\gradlew.bat assembleRelease

$ErrorActionPreference = 'Stop'

$ApkSource = Join-Path $PSScriptRoot '..\android\app\build\outputs\apk\release\app-release.apk'
$ApkDestDir = Join-Path $PSScriptRoot '..\..\Web_Stream\apk'
$ApkDest = Join-Path $ApkDestDir 'cinemax.apk'

# Vérifier que l'APK source existe
if (-not (Test-Path $ApkSource)) {
    Write-Error "APK non trouvé : $ApkSource"
    Write-Host "Lancez d'abord : cd android ; .\gradlew.bat assembleRelease"
    exit 1
}

# Créer le dossier de destination s'il n'existe pas
if (-not (Test-Path $ApkDestDir)) {
    New-Item -ItemType Directory -Path $ApkDestDir -Force | Out-Null
    Write-Host "Dossier créé : $ApkDestDir"
}

# Copier l'APK
Copy-Item -Path $ApkSource -Destination $ApkDest -Force
$Stat = Get-Item $ApkDest
$Size = [math]::Round($Stat.Length / 1MB, 2)

Write-Host "APK copié avec succès !"
Write-Host "  Source : $ApkSource"
Write-Host "  Destination : $ApkDest"
Write-Host "  Taille : ${Size} MB"
Write-Host "  Date de build : $($Stat.LastWriteTime)"
Write-Host ""
Write-Host "N'oubliez pas de committer le fichier :"
Write-Host "  git -C ..\..\Web_Stream add apk\cinemax.apk"
Write-Host "  git -C ..\..\Web_Stream commit -m 'Update local APK build'"
Write-Host "  git -C ..\..\Web_Stream push"
