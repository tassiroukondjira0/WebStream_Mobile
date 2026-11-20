/**
 * Incrémente automatiquement la version de l'application.
 *
 * Par défaut, incrémente le patch : 1.1.0 → 1.1.1
 * Avec --minor : 1.1.0 → 1.2.0
 * Avec --major : 1.1.0 → 2.0.0
 *
 * Met à jour :
 *   - app.json (expo.version)
 *   - package.json (version)
 *   - android/app/build.gradle (versionName et versionCode)
 *
 * Usage :
 *   node scripts/bump-version.js
 *   node scripts/bump-version.js --minor
 *   node scripts/bump-version.js --major
 */

const fs = require('fs');
const path = require('path');

// Chemins
const appJsonPath = path.join(__dirname, '..', 'app.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

// Déterminer le type d'incrémentation
const args = process.argv.slice(2);
const bumpType = args[0] === '--minor' ? 'minor' : args[0] === '--major' ? 'major' : 'patch';

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    console.error(`❌ Version invalide : "${version}"`);
    process.exit(1);
  }
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function bumpVersion(version, type) {
  const { major, minor, patch } = parseVersion(version);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function getVersionCode(version) {
  // versionCode = major * 10000 + minor * 100 + patch
  const { major, minor, patch } = parseVersion(version);
  return major * 10000 + minor * 100 + patch;
}

// Lire app.json
console.log('📖 Lecture de app.json...');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
const currentVersion = appJson.expo?.version;

if (!currentVersion) {
  console.error('❌ Version non trouvée dans app.json');
  process.exit(1);
}

console.log(`   Version actuelle : ${currentVersion}`);

// Calculer la nouvelle version
const newVersion = bumpVersion(currentVersion, bumpType);
const newVersionCode = getVersionCode(newVersion);

console.log(`   Type d'incrémentation : ${bumpType}`);
console.log(`   Nouvelle version : ${newVersion}`);
console.log(`   Nouveau versionCode : ${newVersionCode}`);
console.log('');

// Mettre à jour app.json
console.log('✏️  Mise à jour de app.json...');
appJson.expo.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf-8');

// Mettre à jour package.json
console.log('✏️  Mise à jour de package.json...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

// Mettre à jour android/app/build.gradle (seulement si le fichier existe)
if (fs.existsSync(buildGradlePath)) {
  console.log('✏️  Mise à jour de android/app/build.gradle...');
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');

  // Remplacer versionName
  buildGradle = buildGradle.replace(
    /versionName\s+"[^"]*"/,
    `versionName "${newVersion}"`
  );

  // Remplacer versionCode
  buildGradle = buildGradle.replace(
    /versionCode\s+\d+/,
    `versionCode ${newVersionCode}`
  );

  fs.writeFileSync(buildGradlePath, buildGradle, 'utf-8');
} else {
  console.log('⚠️  android/app/build.gradle non trouvé — il sera généré par expo prebuild.');
}

console.log('');
console.log('✅ Version incrémentée avec succès !');
console.log(`   ${currentVersion} → ${newVersion}`);
console.log(`   versionCode : ${getVersionCode(currentVersion)} → ${newVersionCode}`);
console.log('');
console.log('📝 Fichiers modifiés :');
console.log(`   - app.json`);
console.log(`   - package.json`);
console.log(`   - android/app/build.gradle`);
console.log('');
console.log('⚠️  N\'oubliez pas de commit ces changements avant de builder :');
console.log(`   git add app.json package.json android/app/build.gradle`);
console.log(`   git commit -m "Bump version to ${newVersion}"`);
console.log(`   git push`);
