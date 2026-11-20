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

# Verification : Node.js doit fonctionner pour expo prebuild et bump-version
Write-Host "Verification de Node.js..."
$nodeTest = Start-Process -FilePath "node" -ArgumentList "-e", "process.stdout.write('ok')" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$env:TEMP\node-test-output.txt"
$nodeOutput = Get-Content "$env:TEMP\node-test-output.txt" -ErrorAction SilentlyContinue
if ($nodeTest.ExitCode -ne 0 -or -not $nodeOutput -or $nodeOutput.Trim() -ne 'ok') {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERREUR : Node.js ne fonctionne pas !" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Le build ne peut pas demarrer sans Node.js fonctionnel."
    Write-Host ""
    Write-Host "Pour reparer Node.js :"
    Write-Host "  1. Desinstallez Node.js : Parametres > Applications > Node.js > Desinstaller"
    Write-Host "  2. Telechargez la derniere version LTS sur https://nodejs.org/"
    Write-Host "  3. Installez Node.js et redemarrez votre terminal"
    Write-Host "  4. Verifiez : node -v  (devrait afficher une version comme v20.x.x)"
    Write-Host ""
    exit 1
}
Remove-Item "$env:TEMP\node-test-output.txt" -ErrorAction SilentlyContinue
Write-Host "Node.js OK."
Write-Host ""

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
$bumpProcess = Start-Process -FilePath "node" -ArgumentList "./scripts/bump-version.js" -NoNewWindow -Wait -PassThru
if ($bumpProcess.ExitCode -ne 0) {
    Write-Error "L'incrementation de la version a echoue (code $($bumpProcess.ExitCode))."
    exit 1
}
Write-Host ""

# Etape 2 : Build Gradle
Write-Host "[2/6] Build Gradle en cours..."
if (-not (Test-Path $GradlewPath)) {
    Write-Warning "gradlew.bat non trouve - regeneration de la configuration Android..."
    $prebuildLog = Join-Path $env:TEMP "expo-prebuild.log"
    $prebuildProcess = Start-Process -FilePath "node" -ArgumentList "./node_modules/expo/bin/cli.js", "prebuild", "--clean", "--platform", "android" -NoNewWindow -Wait -PassThru -RedirectStandardOutput $prebuildLog -RedirectStandardError $prebuildLog
    if ($prebuildProcess.ExitCode -ne 0) {
        Write-Error "La regeneration de la configuration Android a echoue (code $($prebuildProcess.ExitCode))."
        Write-Host "Logs disponibles dans : $prebuildLog"
        if (Test-Path $prebuildLog) {
            Write-Host "--- Debut des logs ---"
            Get-Content $prebuildLog | Select-Object -Last 50
            Write-Host "--- Fin des logs ---"
        }
        exit 1
    }
    if (-not (Test-Path $GradlewPath)) {
        Write-Error "gradlew.bat toujours non trouve apres prebuild. Le dossier android/ n'a pas ete genere."
        Write-Host "Logs disponibles dans : $prebuildLog"
        if (Test-Path $prebuildLog) {
            Write-Host "--- Debut des logs ---"
            Get-Content $prebuildLog | Select-Object -Last 50
            Write-Host "--- Fin des logs ---"
        }
        exit 1
    }
}

$AndroidDir = Join-Path $PSScriptRoot '..\android'
$GradlePropsPath = Join-Path $AndroidDir 'gradle.properties'

# Desactiver Hermes pour eviter l'erreur de compilation .hbc sur Windows
if (Test-Path $GradlePropsPath) {
    $gradleProps = Get-Content $GradlePropsPath -Raw
    if ($gradleProps -match 'hermesEnabled=true') {
        $gradleProps = $gradleProps -replace 'hermesEnabled=true', 'hermesEnabled=false'
        Set-Content -Path $GradlePropsPath -Value $gradleProps -NoNewline
        Write-Host "  Hermes desactive (utilisation de JSC a la place)."
    }
}

# Arreter les daemons Gradle existants pour eviter les conflits
Write-Host "  Arret des daemons Gradle..."
Push-Location $AndroidDir
try {
    $stopProcess = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "--stop" -NoNewWindow -Wait -PassThru
} catch {}
Pop-Location
Start-Sleep -Seconds 2

# Nettoyer les caches CMake pour eviter les erreurs de chemin trop long
Write-Host "  Nettoyage des caches CMake..."
$cmakeCaches = @(
    Join-Path $PSScriptRoot '..\node_modules\expo-modules-core\android\.cxx'
    Join-Path $PSScriptRoot '..\node_modules\react-native-worklets\android\.cxx'
    Join-Path $PSScriptRoot '..\node_modules\react-native-reanimated\android\.cxx'
)
foreach ($cache in $cmakeCaches) {
    if (Test-Path $cache) {
        Remove-Item -Recurse -Force $cache -ErrorAction SilentlyContinue
        Write-Host "    Cache CMake nettoye : $cache"
    }
}

# Desactiver AAPT2 daemon pour eviter le crash sur Windows
if (Test-Path $GradlePropsPath) {
    $gradleProps = Get-Content $GradlePropsPath -Raw
    if ($gradleProps -notmatch 'android. aaptOptions. noCompress') {
        # Ajouter la desactivation du daemon AAPT2
        $gradleProps = $gradleProps -replace '(?m)^org\.gradle\.daemon=true$', 'org.gradle.daemon=false'
        Set-Content -Path $GradlePropsPath -Value $gradleProps -NoNewline
        Write-Host "  Daemon Gradle desactive pour ce build."
    }
}

# Executer le build Gradle avec capture de logs
$buildLog = Join-Path $env:TEMP "gradle-build.log"
Write-Host "  Execution de Gradle (logs : $buildLog)"
Push-Location $AndroidDir
try {
    $gradleProcess = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "assembleRelease", "--no-daemon" -NoNewWindow -Wait -PassThru -RedirectStandardOutput $buildLog -RedirectStandardError $buildLog
    if ($gradleProcess.ExitCode -ne 0) {
        Write-Error "Le build Gradle a echoue (code $($gradleProcess.ExitCode))."
        Write-Host ""
        Write-Host "--- Dernieres lignes des logs ---" -ForegroundColor Yellow
        Get-Content $buildLog | Select-String -Pattern "FAILURE|Error:|caused by|Exception" -Context 2,2 | Select-Object -Last 20
        Write-Host "--- Fin des logs ---" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Logs complets : $buildLog"
        Pop-Location
        exit 1
    }
} catch {
    Write-Error "Le build Gradle a echoue : $($_.Exception.Message)"
    Pop-Location
    exit 1
}
Pop-Location

# Restaurer le daemon Gradle pour les futurs builds
if (Test-Path $GradlePropsPath) {
    $gradleProps = Get-Content $GradlePropsPath -Raw
    if ($gradleProps -match 'org\.gradle\.daemon=false') {
        $gradleProps = $gradleProps -replace 'org\.gradle\.daemon=false', 'org.gradle.daemon=true'
        Set-Content -Path $GradlePropsPath -Value $gradleProps -NoNewline
    }
}

if (-not (Test-Path $ApkSource)) {
    Write-Error "APK non trouve apres le build : $ApkSource"
    exit 1
}
Write-Host "[2/6] Build termine avec succes !"
Write-Host ""

# Etape 3 : Copier et renommer l'APK avec la version
Write-Host "[3/6] Copie de l'APK..."

# Lire la version pour le nom de fichier (lecture directe depuis app.json, sans Node.js)
$appJson = Get-Content (Join-Path $PSScriptRoot '..\app.json') -Raw | ConvertFrom-Json
$version = $appJson.expo.version
if (-not $version) {
    Write-Error "Version non trouvee dans app.json."
    exit 1
}
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
    git add app.json package.json
    git commit -m "Bump version to $version"
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
