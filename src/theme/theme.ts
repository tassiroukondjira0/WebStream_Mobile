/**
 * Thème de couleurs CinéMax — synchronisé avec le site web.
 *
 * Site web (globals.css) :
 *   --background: #09090b
 *   --foreground: #fafafa
 *   --card: #121217
 *   --primary: #7c3aed (violet)
 *   --muted: #27272a
 *   --muted-foreground: #a1a1aa
 *   --accent: #1e1e24
 */

export const colors = {
  // Fond principal
  background: '#09090b',

  // Texte principal
  foreground: '#fafafa',

  // Cartes et panneaux
  card: '#121217',
  cardForeground: '#fafafa',

  // Couleur primaire — violet CinéMax
  primary: '#7c3aed',
  primaryLight: '#8b5cf6',
  primaryDark: '#6d28d9',
  primaryForeground: '#ffffff',

  // Couleurs atténuées
  muted: '#27272a',
  mutedForeground: '#a1a1aa',

  // Accents
  accent: '#1e1e24',
  accentForeground: '#ffffff',

  // Succès
  success: '#10b981',
  successLight: '#34d399',

  // Avertissement / Premium (or)
  warning: '#f59e0b',
  warningLight: '#fbbf24',

  // Erreur
  error: '#ef4444',
  errorLight: '#f87171',

  // Texte
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',

  // Bordures
  border: '#27272a',
  borderLight: '#3f3f46',

  // Dégradé premium
  premiumGradientStart: '#7c3aed',
  premiumGradientEnd: '#f59e0b',
};

export type ColorKey = keyof typeof colors;
