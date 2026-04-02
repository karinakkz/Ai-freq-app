import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';
import { useRouter } from 'expo-router';
import {
  PREMIUM_PACKS,
  LIFETIME_UNLOCK,
  formatTrialRemaining,
  getPremiumState,
  isPackUnlocked,
  type PremiumPackId,
  type PremiumState,
  unlockLifetimeLocally,
  unlockPackLocally,
} from '../utils/premium';
import { APP_NAME, COMPANY_NAME, SUPPORT_EMAIL } from '../constants/brand';
import { useStripePayment } from '../contexts/StripePaymentContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const COLORS = {
  background: '#0a0a0a',
  surface: '#101010',
  surfaceSoft: '#151515',
  emerald: '#0f5c49',
  electricBlue: '#00bfff',
  text: '#ffffff',
  textSecondary: '#9ba0a6',
  border: '#00bfff22',
};

type PurchaseTarget = PremiumPackId | null;

interface PremiumPacksScreenProps {
  cancelled?: string;
  pack_id?: string;
  purchase_type?: string;
  session_id?: string;
}

function resolveReturnUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/premium`;
  }
  return Linking.createURL('/premium');
}

export default function PremiumPacksScreen({ cancelled, pack_id, purchase_type, session_id }: PremiumPacksScreenProps) {
  const router = useRouter();
  const { isNativePaymentAvailable, initiatePayment, checkPaymentStatus } = useStripePayment();
  const [premiumState, setPremiumState] = useState<PremiumState | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingTarget, setProcessingTarget] = useState<PurchaseTarget>(null);
  const [statusText, setStatusText] = useState('');
  const glowAnim = useRef(new Animated.Value(0)).current;

  const refreshState = async () => {
    const next = await getPremiumState();
    setPremiumState(next);
  };

  useEffect(() => {
    refreshState().finally(() => setLoading(false));
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (cancelled === '1') {
      setStatusText('Payment cancelled — your free core app is still available.');
    }
  }, [cancelled]);

  useEffect(() => {
    if (session_id) {
      verifyPayment(session_id, (pack_id as PremiumPackId) || null, purchase_type || null);
    }
  }, [pack_id, purchase_type, session_id]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.55],
  });

  const verifyPayment = async (paymentId: string, targetPackId: PremiumPackId | null, targetPurchaseType: string | null) => {
    setStatusText('Checking payment status...');
    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const statusData = await checkPaymentStatus(paymentId);
        const paid = statusData.payment_status === 'paid' || statusData.status === 'succeeded';

        if (paid) {
          if (targetPurchaseType === 'lifetime') {
            await unlockLifetimeLocally();
            setStatusText('Lifetime unlock active — all premium packs are yours.');
          } else if (targetPackId) {
            await unlockPackLocally(targetPackId);
            setStatusText('Pack unlocked on this device.');
          }
          await refreshState();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setStatusText('Payment is still processing. Please reopen Premium in a moment.');
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatusText('Could not verify the payment yet.');
    } finally {
      setProcessingTarget(null);
    }
  };

  const beginPayment = async (targetPackId: PremiumPackId) => {
    setProcessingTarget(targetPackId);
    
    if (isNativePaymentAvailable) {
      setStatusText('Opening secure payment...');
    } else {
      setStatusText('Creating secure checkout...');
    }

    try {
      const returnUrl = resolveReturnUrl();
      const result = await initiatePayment(targetPackId, returnUrl);

      if (result.success) {
        // For native payments, verify immediately
        if (isNativePaymentAvailable && result.paymentIntentId) {
          await verifyPayment(
            result.paymentIntentId, 
            targetPackId, 
            result.purchaseType || (targetPackId === LIFETIME_UNLOCK.id ? 'lifetime' : 'pack')
          );
        }
        // For web payments, the page will redirect, so nothing to do here
      } else {
        if (result.error === 'Payment cancelled') {
          setStatusText('Payment was cancelled — your free core app is still available.');
        } else {
          Alert.alert('Payment error', result.error || 'Could not complete payment.');
          setStatusText(result.error || 'Could not complete payment.');
        }
        setProcessingTarget(null);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment error', 'Could not start payment just now.');
      setStatusText('Could not start payment.');
      setProcessingTarget(null);
    }
  };

  const restorePurchases = async () => {
    const nextState = await getPremiumState();
    setPremiumState(nextState);

    if (nextState.lifetimeUnlocked) {
      setStatusText('Restored lifetime unlock on this device.');
      return;
    }

    if (nextState.purchasedPackIds.length > 0) {
      setStatusText(`Restored ${nextState.purchasedPackIds.length} purchased pack(s) on this device.`);
      return;
    }

    if (nextState.isTrialActive) {
      setStatusText('Your free trial is still active, so premium packs stay open right now.');
      return;
    }

    setStatusText('No previous purchases were found on this device yet.');
  };

  const trialLabel = useMemo(() => {
    if (!premiumState) return 'Starting trial...';
    if (premiumState.lifetimeUnlocked) return 'Lifetime unlocked forever';
    if (premiumState.isTrialActive) return `Free trial active • ${formatTrialRemaining(premiumState.trialRemainingMs)}`;
    return 'Trial ended • locked packs need purchase';
  }, [premiumState]);

  // Determine overall account status for badges - must be before early return
  const accountStatus = useMemo(() => {
    if (!premiumState) return 'loading';
    if (premiumState.lifetimeUnlocked) return 'lifetime';
    if (premiumState.purchasedPackIds.length > 0) return 'partial';
    if (premiumState.isTrialActive) return 'trial';
    return 'free';
  }, [premiumState]);

  const purchasedCount = premiumState?.purchasedPackIds.length || 0;
  const totalPacks = PREMIUM_PACKS.length;

  if (loading || !premiumState) {
    return (
      <View style={styles.loadingContainer} testID="premium-screen-loading">
        <ActivityIndicator color={COLORS.electricBlue} size="large" />
        <Text style={styles.loadingText}>Loading premium packs…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="premium-packs-screen">
      {/* Account Status Banner */}
      {accountStatus === 'lifetime' && (
        <View style={styles.accountStatusBanner}>
          <LinearGradient colors={['#1ef2aa', '#0f5c49']} style={styles.accountStatusGradient}>
            <Ionicons name="star" size={20} color="#fff" />
            <View style={styles.accountStatusText}>
              <Text style={styles.accountStatusTitle}>Lifetime Member</Text>
              <Text style={styles.accountStatusSub}>All premium packs unlocked forever</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
          </LinearGradient>
        </View>
      )}

      {accountStatus === 'partial' && (
        <View style={styles.accountStatusBanner}>
          <LinearGradient colors={[COLORS.electricBlue, '#1492ff']} style={styles.accountStatusGradient}>
            <Ionicons name="albums" size={20} color="#fff" />
            <View style={styles.accountStatusText}>
              <Text style={styles.accountStatusTitle}>{purchasedCount} Pack{purchasedCount > 1 ? 's' : ''} Owned</Text>
              <Text style={styles.accountStatusSub}>Upgrade to Lifetime for all {totalPacks} packs</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
          </LinearGradient>
        </View>
      )}

      <LinearGradient colors={[COLORS.emerald, '#144c64']} style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Premium wellness vault</Text>
        <Text style={styles.heroTitle}>Most wanted glow packs</Text>
        <Text style={styles.heroText}>Beauty, metabolism, rejuvenation, calm, and clean energy — two days fully open, then premium packs lock.</Text>
        <View style={styles.heroPills}>
          <View style={[
            styles.heroPill, 
            accountStatus === 'lifetime' && styles.heroPillLifetime,
            accountStatus === 'partial' && styles.heroPillOwned,
          ]}>
            <Ionicons 
              name={accountStatus === 'lifetime' ? 'star' : accountStatus === 'partial' ? 'checkmark-circle' : 'timer'} 
              size={14} 
              color={COLORS.text} 
            />
            <Text style={styles.heroPillText}>{trialLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={restorePurchases} style={styles.restoreButton} testID="premium-restore-purchases-button">
          <Ionicons name="refresh" size={15} color={COLORS.text} />
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Lifetime Banner - show different state if already owned */}
      {accountStatus !== 'lifetime' && (
        <>
          <Animated.View style={[styles.lifetimeGlow, { opacity: glowOpacity }]} />
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => beginPayment(LIFETIME_UNLOCK.id)}
            style={styles.lifetimeBanner}
            testID="premium-lifetime-button"
          >
            <LinearGradient colors={[COLORS.electricBlue, '#1d8dff', COLORS.emerald]} style={styles.lifetimeBannerGradient}>
              <View>
                <Text style={styles.lifetimeTitle}>Get All for $49</Text>
                <Text style={styles.lifetimeSub}>Lifetime unlock • future premium add-ons included</Text>
              </View>
              <View style={styles.lifetimePriceWrap}>
                {processingTarget === LIFETIME_UNLOCK.id ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.lifetimePrice}>$49</Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {statusText ? (
        <View style={styles.statusCard} testID="premium-status-card">
          <Ionicons name="information-circle" size={16} color={COLORS.electricBlue} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      ) : null}

      {PREMIUM_PACKS.map((pack) => {
        const unlocked = isPackUnlocked(premiumState, pack.id);
        const owned = premiumState.lifetimeUnlocked || premiumState.purchasedPackIds.includes(pack.id);
        const stateLabel = owned ? 'Owned' : premiumState.isTrialActive ? 'Trial Open' : 'Locked';
        return (
          <View key={pack.id} style={styles.packCard} testID={`premium-pack-${pack.id}`}>
            <LinearGradient colors={[COLORS.surface, '#12181f']} style={styles.packGradient}>
              <View style={styles.packHeader}>
                <View style={styles.packIconWrap}>
                  <Ionicons name={pack.icon as any} size={24} color={COLORS.electricBlue} />
                </View>
                <View style={styles.packMeta}>
                  <Text style={styles.packTitle}>{pack.title}</Text>
                  <Text style={styles.packSubtitle}>{pack.subtitle}</Text>
                </View>
                <View style={[styles.lockBadge, unlocked && styles.lockBadgeUnlocked]}>
                  <Ionicons name={unlocked ? 'checkmark-circle' : 'lock-closed'} size={16} color={unlocked ? '#1ef2aa' : COLORS.electricBlue} />
                </View>
              </View>

              <View style={[styles.stateBadge, owned ? styles.stateBadgeOwned : premiumState.isTrialActive ? styles.stateBadgeTrial : styles.stateBadgeLocked]}>
                <Text style={styles.stateBadgeText}>{stateLabel}</Text>
              </View>

              <Text style={styles.packFrequency}>{pack.frequencyLabel}</Text>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => beginPayment(pack.id)}
                style={styles.buyButton}
                disabled={processingTarget === pack.id || owned}
                testID={`premium-pack-buy-${pack.id}`}
              >
                <LinearGradient colors={owned ? [COLORS.emerald, '#1b7c64'] : [COLORS.electricBlue, '#1492ff']} style={styles.buyButtonGradient}>
                  {processingTarget === pack.id ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : owned ? (
                    <Text style={styles.buyButtonText}>{premiumState.lifetimeUnlocked ? 'Included in Lifetime' : 'Owned on this device'}</Text>
                  ) : (
                    <Text style={styles.buyButtonText}>Buy Now • $4.99</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {!unlocked ? (
              <BlurView intensity={40} tint="dark" style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={18} color={COLORS.electricBlue} />
                <Text style={styles.lockOverlayText}>Locked after trial</Text>
              </BlurView>
            ) : null}
          </View>
        );
      })}

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Core stays free forever</Text>
        <Text style={styles.footerText}>Basic tones, tasks, Hey Flow, and background audio stay available without buying premium.</Text>
        <Text style={styles.footerBrand} testID="premium-brand-byline">{APP_NAME} by {COMPANY_NAME}</Text>
        <Text style={styles.footerSupport} testID="premium-support-email">Support: {SUPPORT_EMAIL}</Text>
        <Text style={styles.footerStripeNote}>Payments are handled securely with Stripe.</Text>
        <View style={styles.footerLinkRow}>
          <TouchableOpacity onPress={() => router.push('/privacy' as never)} testID="premium-open-privacy-button">
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/terms' as never)} testID="premium-open-terms-button">
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/contact' as never)} testID="premium-open-contact-button">
            <Text style={styles.footerLink}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },
  // Account Status Banner
  accountStatusBanner: { marginBottom: 16, borderRadius: 18, overflow: 'hidden' },
  accountStatusGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  accountStatusText: { flex: 1 },
  accountStatusTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  accountStatusSub: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
  // Hero Card
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 16 },
  heroEyebrow: { color: '#c8fff0', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  heroText: { color: '#d8f7ef', fontSize: 14, lineHeight: 20, marginTop: 8 },
  heroPills: { marginTop: 14, gap: 10 },
  heroPill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#ffffff12', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999 },
  heroPillLifetime: { backgroundColor: '#1ef2aa33', borderWidth: 1, borderColor: '#1ef2aa55' },
  heroPillOwned: { backgroundColor: '#00bfff22', borderWidth: 1, borderColor: '#00bfff44' },
  heroPillText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  restoreButton: { minHeight: 44, marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff14', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999 },
  restoreButtonText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  // Lifetime Banner
  lifetimeGlow: { position: 'absolute', top: 184, left: 24, right: 24, height: 82, borderRadius: 30, backgroundColor: '#00bfff33' },
  lifetimeBanner: { marginBottom: 14 },
  lifetimeBannerGradient: { borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#6fdfff88' },
  lifetimeTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  lifetimeSub: { color: '#effcff', fontSize: 13, marginTop: 4 },
  lifetimePriceWrap: { width: 104, height: 56, borderRadius: 18, backgroundColor: '#ffffff16', alignItems: 'center', justifyContent: 'center' },
  lifetimePrice: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  // Status Card
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceSoft, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 12 },
  statusText: { color: COLORS.textSecondary, fontSize: 13, flex: 1 },
  // Pack Cards
  packCard: { marginBottom: 14, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#0f5c4977' },
  packGradient: { padding: 16 },
  packHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#001c2a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.electricBlue + '55' },
  packMeta: { flex: 1 },
  packTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  packSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  lockBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#001c2a', borderWidth: 1, borderColor: COLORS.electricBlue + '44' },
  lockBadgeUnlocked: { borderColor: '#1ef2aa44', backgroundColor: '#0f5c4955' },
  stateBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 12 },
  stateBadgeOwned: { backgroundColor: '#0f5c49aa' },
  stateBadgeTrial: { backgroundColor: '#144c64aa' },
  stateBadgeLocked: { backgroundColor: '#1c1f24' },
  stateBadgeText: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  packFrequency: { color: '#84dfff', fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 14 },
  buyButton: { borderRadius: 16, overflow: 'hidden' },
  buyButtonGradient: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buyButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8 },
  lockOverlayText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  // Footer
  footerCard: { backgroundColor: COLORS.surfaceSoft, borderWidth: 1, borderColor: '#0f5c49aa', borderRadius: 18, padding: 16, marginTop: 8 },
  footerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  footerText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  footerBrand: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginTop: 12 },
  footerSupport: { color: COLORS.electricBlue, fontSize: 13, marginTop: 4 },
  footerStripeNote: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8 },
  footerLinkRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 12 },
  footerLink: { color: '#8adfff', fontSize: 13, fontWeight: '700' },
});