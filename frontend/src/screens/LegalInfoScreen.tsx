import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COMPANY_NAME, SUPPORT_EMAIL } from '../constants/brand';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  surfaceSoft: '#121722',
  emerald: '#0f5c49',
  cyan: '#00bfff',
  text: '#ffffff',
  textSecondary: '#9ba0a6',
};

interface SectionItem {
  title: string;
  body: string;
}

interface LegalInfoScreenProps {
  ctaLabel?: string;
  ctaType?: 'email';
  sections: SectionItem[];
  subtitle: string;
  title: string;
}

export default function LegalInfoScreen({ ctaLabel, ctaType, sections, subtitle, title }: LegalInfoScreenProps) {
  const handleCTA = async () => {
    if (ctaType === 'email') {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID={`legal-screen-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{COMPANY_NAME}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {ctaLabel ? (
          <TouchableOpacity style={styles.ctaButton} onPress={handleCTA} testID={`legal-cta-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            <Ionicons name="mail" size={16} color={COLORS.text} />
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Need help?</Text>
        <Text style={styles.footerBody}>Email {SUPPORT_EMAIL} for support from {COMPANY_NAME}.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: { backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: COLORS.cyan + '22', padding: 18, marginBottom: 16 },
  eyebrow: { color: '#c8fff0', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  ctaButton: { minHeight: 44, alignSelf: 'flex-start', marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.emerald, justifyContent: 'center' },
  ctaText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  sectionCard: { backgroundColor: COLORS.surfaceSoft, borderRadius: 18, borderWidth: 1, borderColor: COLORS.emerald + '55', padding: 16, marginBottom: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  sectionBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  footerCard: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, marginTop: 8 },
  footerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  footerBody: { color: COLORS.cyan, fontSize: 13, marginTop: 6 },
});