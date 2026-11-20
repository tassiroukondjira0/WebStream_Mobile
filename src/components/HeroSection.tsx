import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Sparkles } from 'lucide-react-native';
import { colors } from '@/theme/theme';

/**
 * Hero section immersive pour l'accueil mobile.
 * Inspiré du HeroSection du site web avec dégradés violet/fuchsia
 * et message de bienvenue.
 */
export function HeroSection() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Background gradient layers */}
      <View style={styles.bgBase} />
      <View style={styles.bgGradientTop} />
      <View style={styles.bgGradientBottom} />
      <View style={styles.bgGradientLeft} />
      <View style={styles.bgGradientRight} />

      {/* Glow effects */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      {/* Content */}
      <View style={styles.content}>
        {/* Kicker */}
        <View style={styles.kickerRow}>
          <View style={styles.kickerDot} />
          <Text style={styles.kickerText}>Bienvenue chez vous</Text>
        </View>

        {/* Main title */}
        <Text style={styles.title}>
          Vos prochains{' '}
          <Text style={styles.titleHighlight}>coups de cœur.</Text>
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          Votre univers de films, séries, anime et K-Dramas en streaming.
        </Text>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push('/explore')}
            activeOpacity={0.8}
          >
            <Search color={colors.primaryForeground} size={16} />
            <Text style={styles.btnPrimaryText}>Explorer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push({ pathname: '/(tabs)/films' })}
            activeOpacity={0.8}
          >
            <Sparkles color={colors.textPrimary} size={16} />
            <Text style={styles.btnSecondaryText}>Nouveautés</Text>
          </TouchableOpacity>
        </View>

        {/* Credit */}
        <Text style={styles.credit}>Une CinéMax production</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    height: 260,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bgBase: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.card,
  },
  bgGradientTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
  },
  bgGradientBottom: {
    ...StyleSheet.absoluteFill,
    bottom: 0,
    height: '60%',
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
  },
  bgGradientLeft: {
    ...StyleSheet.absoluteFill,
    width: '50%',
    backgroundColor: 'rgba(9, 9, 11, 0.4)',
  },
  bgGradientRight: {
    ...StyleSheet.absoluteFill,
    left: '50%',
    backgroundColor: 'rgba(9, 9, 11, 0.2)',
  },
  glowTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    ...{ shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(217, 70, 239, 0.1)',
    ...{ shadowColor: '#d946ef', shadowOpacity: 0.3, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    zIndex: 1,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  kickerText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: colors.primaryLight,
    fontStyle: 'italic',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnSecondaryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  credit: {
    color: colors.textTertiary,
    fontSize: 10,
  },
});
