import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { APP_NAME, COMPANY_NAME, SUPPORT_EMAIL } from '../constants/brand';

const APP_TAGLINE = 'Your AI frequency wellness companion';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  primaryDark: '#0f5c49',
  primary: '#2ecc71',
  cyan: '#00ccff',
  text: '#ffffff',
  textSecondary: '#8b949e',
  border: '#21262d',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [alphaBeatEnabled, setAlphaBeatEnabled] = React.useState(true);
  const [thetaBeatEnabled, setThetaBeatEnabled] = React.useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = React.useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <TouchableOpacity style={styles.premiumCard} onPress={() => router.push('/premium' as never)} testID="settings-open-premium-button">
          <View style={styles.premiumIcon}>
            <Ionicons name="diamond" size={24} color={COLORS.cyan} />
          </View>
          <View style={styles.premiumInfo}>
            <Text style={styles.premiumTitle}>Premium Packs</Text>
            <Text style={styles.premiumText}>Hair glow, weight loss, anti-age, stress relief, energy boost</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="musical-notes" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Binaural Beats</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Configure audio frequencies for stress relief
        </Text>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Ionicons name="water" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Alpha Waves (Calm)</Text>
            <Text style={styles.settingDescription2}>10 Hz - Relaxation & Calm</Text>
          </View>
          <Switch
            value={alphaBeatEnabled}
            onValueChange={setAlphaBeatEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
            thumbColor={alphaBeatEnabled ? COLORS.primary : COLORS.textSecondary}
          />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Ionicons name="flash" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Theta Waves (Focus)</Text>
            <Text style={styles.settingDescription2}>6 Hz - Deep Focus & Meditation</Text>
          </View>
          <Switch
            value={thetaBeatEnabled}
            onValueChange={setThetaBeatEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
            thumbColor={thetaBeatEnabled ? COLORS.primary : COLORS.textSecondary}
          />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Ionicons name="play-circle" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Play on Stress</Text>
            <Text style={styles.settingDescription2}>
              Automatically play beats when stress detected
            </Text>
          </View>
          <Switch
            value={autoPlayEnabled}
            onValueChange={setAutoPlayEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
            thumbColor={autoPlayEnabled ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Your data stays on your device
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>On-Device Processing</Text>
            <Text style={styles.infoText}>
              All voice analysis happens locally. Your audio is never stored permanently.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="time" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Auto-Delete After 24 Hours</Text>
            <Text style={styles.infoText}>
              Tasks and notes are automatically deleted unless you bookmark them.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="lock-closed" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Encrypted Storage</Text>
            <Text style={styles.infoText}>
              All local data is encrypted using device-level security.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Notifications</Text>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Ionicons name="notifications" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Reminder Notifications</Text>
            <Text style={styles.settingDescription2}>Get notified about your reminders</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
            thumbColor={notificationsEnabled ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>About {APP_NAME}</Text>
        </View>

        <View style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <View style={styles.aboutIcon}>
              <Ionicons name="apps" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <View style={styles.aboutIcon}>
              <Ionicons name="heart" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.aboutLabel}>Made with love for your wellness</Text>
          </View>
        </View>

        <View style={styles.infoCard} testID="settings-support-card">
          <View style={styles.infoIconContainer}>
            <Ionicons name="business" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{APP_NAME} by {COMPANY_NAME}</Text>
            <Text style={styles.infoText}>Support: {SUPPORT_EMAIL}</Text>
          </View>
        </View>

        <View style={styles.legalRow}>
          <TouchableOpacity style={styles.legalChip} onPress={() => router.push('/privacy' as never)} testID="settings-open-privacy-button">
            <Text style={styles.legalChipText}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalChip} onPress={() => router.push('/terms' as never)} testID="settings-open-terms-button">
            <Text style={styles.legalChipText}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalChip} onPress={() => router.push('/contact' as never)} testID="settings-open-contact-button">
            <Text style={styles.legalChipText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{APP_NAME}</Text>
        <Text style={styles.footerSubtext}>{APP_TAGLINE}</Text>
        <Text style={styles.footerSubtext}>{COMPANY_NAME} • {SUPPORT_EMAIL}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    padding: 16,
    paddingTop: 24,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cyan + '33',
    padding: 16,
  },
  premiumIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumInfo: { flex: 1 },
  premiumTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  premiumText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription2: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  legalChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cyan + '33',
    justifyContent: 'center',
  },
  legalChipText: { color: COLORS.cyan, fontSize: 13, fontWeight: '700' },
  aboutCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aboutLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  aboutValue: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
