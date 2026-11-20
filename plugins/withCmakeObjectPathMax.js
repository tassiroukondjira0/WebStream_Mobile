const { withGradleProperties } = require('@expo/config-plugins');

const PROPERTY_KEY = 'expo.android.cmakeObjectPathMax';
// 200 garde les chemins d'objets CMake sous la limite Windows de 260 caractères.
// Expo force 1024 par défaut, ce qui empêche CMake de raccourcir les chemins.
const PROPERTY_VALUE = '200';

/**
 * Réduit la longueur maximale des chemins d'objets CMake sous Windows.
 *
 * Sans ça, un projet situé dans un dossier profond (ex:
 * C:\Users\<user>\Downloads\Programs\<app>) génère des chemins de la forme
 * `.../.cxx/Debug/<hash>/arm64-v8a/CMakeFiles/worklets.dir/C_/Users/...` qui
 * dépassent MAX_PATH, et ninja échoue avec :
 *   ninja: error: mkdir(...): No such file or directory
 *
 * @type {import('@expo/config-plugins').ConfigPlugin}
 */
module.exports = function withCmakeObjectPathMax(config) {
  if (process.platform !== 'win32') {
    return config;
  }

  return withGradleProperties(config, (cfg) => {
    const properties = cfg.modResults;
    const existing = properties.find(
      (item) => item.type === 'property' && item.key === PROPERTY_KEY
    );

    if (existing) {
      existing.value = PROPERTY_VALUE;
    } else {
      properties.push({
        type: 'property',
        key: PROPERTY_KEY,
        value: PROPERTY_VALUE,
      });
    }

    return cfg;
  });
};
