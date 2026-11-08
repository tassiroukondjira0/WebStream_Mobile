import * as SecureStore from 'expo-secure-store';

/**
 * Clé utilisée pour stocker temporairement le mot de passe lors de la
 * redirection vers la vérification email. Ce stockage est éphémère
 * et doit être supprimé après utilisation.
 */
const TEMP_PASSWORD_KEY = 'cinemax_temp_password';

/**
 * Stocke le mot de passe temporairement dans SecureStore pour éviter
 * de le passer en paramètre URL lors de la navigation.
 */
export async function saveTempPassword(password: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TEMP_PASSWORD_KEY, password);
  } catch (e) {
    console.error('Erreur sauvegarde mot de passe temporaire:', e);
  }
}

/**
 * Récupère le mot de passe temporaire depuis SecureStore et le supprime
 * immédiatement après lecture pour éviter qu'il ne reste en mémoire.
 */
export async function consumeTempPassword(): Promise<string | null> {
  try {
    const password = await SecureStore.getItemAsync(TEMP_PASSWORD_KEY);
    // Supprimer immédiatement après lecture
    await SecureStore.deleteItemAsync(TEMP_PASSWORD_KEY);
    return password;
  } catch {
    return null;
  }
}

/**
 * Supprime le mot de passe temporaire s'il existe.
 */
export async function clearTempPassword(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TEMP_PASSWORD_KEY);
  } catch {
    // Ignorer si la clé n'existe pas
  }
}
