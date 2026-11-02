import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Check,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  CreditCard,
  Smartphone,
  MapPin,
  Phone,
  Loader2,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { getBaseApiUrl } from '@/services/api';
import { colors } from '@/theme/theme';

const PERKS = [
  'Accès illimité à l\'intégralité du catalogue',
  'Qualité vidéo Ultra HD 4K',
  'Zéro coupure publicitaire',
  'Reprise de lecture synchronisée',
  'Téléchargement hors ligne (à venir)',
  'Soutien direct aux créateurs',
];

const COUNTRY_PRICES: Record<string, { monthly: string; yearly: string; currency: string }> = {
  MA: { monthly: '3,50', yearly: '35', currency: '€' },
  FR: { monthly: '3,50', yearly: '35', currency: '€' },
};
const DEFAULT_PRICES = { monthly: '1 500', yearly: '15 000', currency: 'FCFA' };

function getPrices(country: string | null) {
  if (!country) return DEFAULT_PRICES;
  return COUNTRY_PRICES[country] ?? DEFAULT_PRICES;
}

interface Country {
  code: string;
  label: string;
  methods: { code: string; label: string }[];
}

interface PaymentConfigResponse {
  countries: Country[];
}

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();

  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<'MONTHLY' | 'YEARLY' | null>(null);

  useEffect(() => {
    fetch(`${getBaseApiUrl()}/api/payment/config`)
      .then((res) => res.json())
      .then((data: PaymentConfigResponse) => {
        setConfig(data);
        setConfigLoading(false);
      })
      .catch(() => {
        setConfigLoading(false);
      });
  }, []);

  const availableMethods = config?.countries.find((c) => c.code === selectedCountry)?.methods ?? [];
  const canSubscribe = Boolean(selectedCountry && selectedPaymentMethod);
  const isPremium = user?.role === 'SUBSCRIBER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const subscribe = async (plan: 'MONTHLY' | 'YEARLY') => {

    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour souscrire au Premium.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!selectedCountry || !selectedPaymentMethod) {
      Alert.alert('Information manquante', 'Veuillez choisir votre pays et votre moyen de paiement.');
      return;
    }

    try {
      setLoadingPlan(plan);
      const baseUrl = getBaseApiUrl();

      let endpoint = '/api/payment/initiate';
      if (selectedPaymentMethod === 'PAYPAL') {
        endpoint = '/api/payment/paypal/create-order';
      }

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          country: selectedCountry,
          paymentMethod: selectedPaymentMethod,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        Alert.alert('Erreur', data?.error || 'Le paiement n\'a pas pu être initié.');
        setLoadingPlan(null);
        return;
      }

      // Ouvrir le lien de paiement dans le navigateur
      await Linking.openURL(data.url);
    } catch {
      Alert.alert('Erreur', 'Connexion au service de paiement impossible.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pass Premium</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badgeContainer}>
            <Sparkles color={colors.warning} size={14} />
            <Text style={styles.badgeText}>Pass Cinéma Indépendant</Text>
          </View>
          <Text style={styles.heroTitle}>Choisissez l&apos;expérience Premium</Text>
          <Text style={styles.heroSub}>
            Profitez d&apos;une plateforme de streaming éthique, fluide et performante. Sans engagement, annulable en 1 clic.
          </Text>
          <View style={styles.paymentHint}>
            <Smartphone color={colors.textTertiary} size={14} />
            <Text style={styles.paymentHintText}>Paiement sécurisé par carte ou Mobile Money</Text>
          </View>
        </View>

        {/* Premium status */}
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Check color={colors.success} size={16} />
            <Text style={styles.premiumBadgeText}>Vous bénéficiez déjà de l&apos;accès Premium.</Text>
          </View>
        )}

        {/* Country selector */}
        {!isPremium && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MapPin color={colors.textSecondary} size={18} />
                <Text style={styles.sectionTitle}>Votre pays</Text>
              </View>
              {configLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : config ? (
                <View style={styles.selectWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {config.countries.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        style={[
                          styles.countryChip,
                          selectedCountry === c.code && styles.countryChipActive,
                        ]}
                        onPress={() => {
                          setSelectedCountry(c.code);
                          setSelectedPaymentMethod(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.countryChipText,
                            selectedCountry === c.code && styles.countryChipTextActive,
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            {/* Payment method */}
            {selectedCountry && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Phone color={colors.textSecondary} size={18} />
                  <Text style={styles.sectionTitle}>Moyen de paiement</Text>
                </View>
                <View style={styles.methodsGrid}>
                  {availableMethods.map((method) => (
                    <TouchableOpacity
                      key={method.code}
                      style={[
                        styles.methodCard,
                        selectedPaymentMethod === method.code && styles.methodCardActive,
                      ]}
                      onPress={() => setSelectedPaymentMethod(method.code)}
                      activeOpacity={0.7}
                    >
                      {method.code === 'CARD' ? (
                        <CreditCard
                          color={selectedPaymentMethod === method.code ? colors.warning : colors.textSecondary}
                          size={18}
                        />
                      ) : (
                        <Phone
                          color={selectedPaymentMethod === method.code ? colors.warning : colors.textSecondary}
                          size={18}
                        />
                      )}
                      <Text
                        style={[
                          styles.methodText,
                          selectedPaymentMethod === method.code && styles.methodTextActive,
                        ]}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Plans */}
            <View style={styles.plansContainer}>
              {/* Monthly */}
              <View style={styles.planCard}>
                <View style={styles.planTagMonthly}>
                  <Text style={styles.planTagText}>Mensuel</Text>
                </View>
                <Text style={styles.planTitle}>Abonnement Mensuel</Text>
                <Text style={styles.planSub}>Sans engagement, résiliable à tout moment</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceValue}>{getPrices(selectedCountry).monthly}</Text>
                  <Text style={styles.priceCurrency}>
                    {getPrices(selectedCountry).currency} / mois
                  </Text>
                </View>
                <View style={styles.perksList}>
                  {PERKS.slice(0, 4).map((perk, i) => (
                    <View key={i} style={styles.perkRow}>
                      <Check color={colors.success} size={14} />
                      <Text style={styles.perkText}>{perk}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.planBtn, styles.planBtnMonthly]}
                  onPress={() => subscribe('MONTHLY')}
                  disabled={loadingPlan !== null || !canSubscribe}
                  activeOpacity={0.8}
                >
                  {loadingPlan === 'MONTHLY' ? (
                    <Loader2 color={colors.primaryForeground} size={16} />
                  ) : (
                    <Text style={styles.planBtnText}>Souscrire mensuellement</Text>
                  )}
                </TouchableOpacity>
                {!canSubscribe && (
                  <Text style={styles.disabledHint}>
                    Choisissez votre pays et moyen de paiement.
                  </Text>
                )}
              </View>

              {/* Yearly */}
              <View style={[styles.planCard, styles.planCardYearly]}>
                <View style={styles.planTagYearly}>
                  <Text style={styles.planTagTextYearly}>Économisez 2 mois</Text>
                </View>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planTitle}>Abonnement Annuel</Text>
                  <ShieldCheck color={colors.warning} size={18} />
                </View>
                <Text style={styles.planSub}>Le pass le plus avantageux</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceValue, styles.priceValueYearly]}>
                    {getPrices(selectedCountry).yearly}
                  </Text>
                  <Text style={styles.priceCurrency}>
                    {getPrices(selectedCountry).currency} / an
                  </Text>
                </View>
                <View style={styles.perksList}>
                  {PERKS.map((perk, i) => (
                    <View key={i} style={styles.perkRow}>
                      <Check color={colors.warning} size={14} />
                      <Text style={[styles.perkText, styles.perkTextYearly]}>{perk}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.planBtn, styles.planBtnYearly]}
                  onPress={() => subscribe('YEARLY')}
                  disabled={loadingPlan !== null || !canSubscribe}
                  activeOpacity={0.8}
                >
                  {loadingPlan === 'YEARLY' ? (
                    <Loader2 color={colors.foreground} size={16} />
                  ) : (
                    <Text style={[styles.planBtnText, styles.planBtnTextYearly]}>
                      Choisir la formule Annuelle
                    </Text>
                  )}
                </TouchableOpacity>
                {!canSubscribe && (
                  <Text style={styles.disabledHint}>
                    Choisissez votre pays et moyen de paiement.
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Le paiement est traité par PayDunya via votre moyen de paiement. L&apos;accès Premium est activé automatiquement dès la confirmation.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSub: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  paymentHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentHintText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
  },
  premiumBadgeText: {
    color: colors.successLight,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  selectWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryChip: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  countryChipActive: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  countryChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  countryChipTextActive: {
    color: colors.warning,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
    minWidth: '45%',
  },
  methodCardActive: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  methodText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  methodTextActive: {
    color: colors.warning,
  },
  plansContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardYearly: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
  },
  planTagMonthly: {
    position: 'absolute',
    top: -1,
    left: 16,
    backgroundColor: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planTagText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planTagYearly: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planTagTextYearly: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  planSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 16,
  },
  priceValue: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
  },
  priceValueYearly: {
    color: colors.warning,
  },
  priceCurrency: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  perksList: {
    gap: 8,
    marginBottom: 16,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    color: colors.foreground,
    fontSize: 12,
    lineHeight: 16,
  },
  perkTextYearly: {
    color: colors.textPrimary,
  },
  planBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  planBtnMonthly: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planBtnYearly: {
    backgroundColor: colors.warning,
  },
  planBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  planBtnTextYearly: {
    color: colors.background,
  },
  disabledHint: {
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  footerNote: {
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 24,
    lineHeight: 16,
  },
});
