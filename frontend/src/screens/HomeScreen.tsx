import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { PulseWaveCard } from '../components/PulseWaveCard';
import { APP_NAME } from '../constants/brand';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  surfaceLight: '#161b22',
  deepBlue: '#0044cc',
  electricBlue: '#0088ff',
  cyan: '#00ccff',
  teal: '#00d4aa',
  emerald: '#2ecc71',
  pink: '#ff6b9d',
  hotPink: '#ff1493',
  purple: '#9d4edd',
  text: '#ffffff',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
  border: '#21262d',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PrescribedFrequency {
  time: string;
  frequency_id: string;
  duration: number;
  reason?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prescribedFrequencies, setPrescribedFrequencies] = useState<PrescribedFrequency[]>([]);
  
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  };

  const loadData = async () => {
    try {
      // Could load user's saved frequency prescriptions here
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleFrequencyRecommended = (frequencies: PrescribedFrequency[]) => {
    setPrescribedFrequencies(frequencies);
  };

  const getFrequencyIcon = (freqId: string) => {
    if (freqId.includes('sleep')) return 'moon';
    if (freqId.includes('energy')) return 'flash';
    if (freqId.includes('stress') || freqId.includes('calm')) return 'leaf';
    if (freqId.includes('focus')) return 'eye';
    if (freqId.includes('mood') || freqId.includes('depression')) return 'sunny';
    if (freqId.includes('pain')) return 'medkit';
    return 'musical-notes';
  };

  const getFrequencyColor = (freqId: string) => {
    if (freqId.includes('sleep')) return '#6c5ce7';
    if (freqId.includes('energy')) return '#ff9f1c';
    if (freqId.includes('stress') || freqId.includes('calm')) return COLORS.teal;
    if (freqId.includes('focus')) return COLORS.cyan;
    if (freqId.includes('mood')) return '#ffca3a';
    if (freqId.includes('pain')) return COLORS.pink;
    return COLORS.emerald;
  };

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.pink} />
        <Text style={styles.loadingText}>Initializing Freq...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>Your AI Wellness Companion</Text>
        </View>
        <Animated.View style={[styles.statusBadge, { opacity: glowOpacity }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Ready</Text>
        </Animated.View>
      </View>

      {/* Main Pulse Wave Card */}
      <PulseWaveCard onFrequencyRecommended={handleFrequencyRecommended} />

      {/* Health Check Button */}
      <TouchableOpacity 
        style={styles.healthCheckCard}
        onPress={() => router.push('/health')}
      >
        <LinearGradient
          colors={['#ff6b9d22', COLORS.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.healthCheckGradient}
        >
          <View style={styles.healthCheckIcon}>
            <Ionicons name="fitness" size={26} color={COLORS.pink} />
          </View>
          <View style={styles.healthCheckContent}>
            <Text style={styles.healthCheckTitle}>Full Health Check</Text>
            <Text style={styles.healthCheckSub}>BP + Symptoms → Smart Playlist</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Prescribed Frequencies */}
      {prescribedFrequencies.length > 0 && (
        <View style={styles.prescriptionSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={18} color={COLORS.pink} />
            <Text style={styles.sectionTitle}>Your Freq Prescription</Text>
          </View>
          
          {prescribedFrequencies.map((freq, index) => (
            <View 
              key={index} 
              style={[styles.freqCard, { borderLeftColor: getFrequencyColor(freq.frequency_id) }]}
            >
              <View style={[styles.freqIcon, { backgroundColor: getFrequencyColor(freq.frequency_id) + '20' }]}>
                <Ionicons 
                  name={getFrequencyIcon(freq.frequency_id) as any} 
                  size={20} 
                  color={getFrequencyColor(freq.frequency_id)} 
                />
              </View>
              <View style={styles.freqInfo}>
                <Text style={styles.freqName}>
                  {freq.frequency_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.freqMeta}>
                  {freq.time} • {freq.duration} min
                </Text>
              </View>
              <TouchableOpacity style={styles.playMiniButton}>
                <Ionicons name="play" size={16} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => router.push('/frequencies')}
        >
          <LinearGradient colors={[COLORS.cyan + '20', COLORS.surface]} style={styles.quickActionGradient}>
            <Ionicons name="musical-notes" size={24} color={COLORS.cyan} />
            <Text style={styles.quickActionText}>Browse Frequencies</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => router.push('/premium')}
        >
          <LinearGradient colors={[COLORS.purple + '20', COLORS.surface]} style={styles.quickActionGradient}>
            <Ionicons name="diamond" size={24} color={COLORS.purple} />
            <Text style={styles.quickActionText}>Premium Packs</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <View style={styles.tipItem}>
          <Ionicons name="heart" size={16} color={COLORS.pink} />
          <Text style={styles.tipText}>Place finger on heart button for pulse reading</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="mic" size={16} color={COLORS.purple} />
          <Text style={styles.tipText}>Tell Freq how you're feeling after pulse</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="musical-notes" size={16} color={COLORS.cyan} />
          <Text style={styles.tipText}>AI prescribes the perfect frequency for you</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.pink + '40',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.pink,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.pink,
    fontWeight: '600',
  },

  // Health Check
  healthCheckCard: {
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.pink + '33',
  },
  healthCheckGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  healthCheckIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.pink + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCheckContent: {
    flex: 1,
  },
  healthCheckTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  healthCheckSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // Prescription Section
  prescriptionSection: {
    marginHorizontal: 12,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  freqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    gap: 12,
  },
  freqIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqInfo: {
    flex: 1,
  },
  freqName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  freqMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  playMiniButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 20,
  },
  quickAction: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Tips
  tipsContainer: {
    paddingHorizontal: 12,
    paddingTop: 20,
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
});
