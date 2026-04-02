import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { binauralBeatsPlayer } from '../utils/BinauralBeats';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  surfaceLight: '#161b22',
  deepBlue: '#0044cc',
  electricBlue: '#0088ff',
  cyan: '#00ccff',
  teal: '#00d4aa',
  emerald: '#2ecc71',
  text: '#ffffff',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
  border: '#21262d',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Frequency {
  id: string;
  name: string;
  category: string;
  frequency_hz: number;
  base_hz: number;
  description: string;
  benefits: string[];
  icon: string;
  color: string;
  gradient: string[];
  duration_options: number[];
  best_time: string;
  intensity: string;
}

interface Pack {
  id: string;
  name: string;
  description: string;
  color: string;
  gradient: string[];
  icon: string;
  frequencies: Frequency[];
  tips: string[];
  schedule: { [key: string]: string };
}

const POPULAR_IDS = ['stress_relief', 'deep_sleep', 'laser_focus', 'mood_boost', 'anxiety_relief', 'energy_boost'];

const CATEGORY_META: { [key: string]: { icon: string; color: string; gradient: [string, string]; tagline: string } } = {
  Sleep: { icon: 'moon', color: '#6c5ce7', gradient: ['#4a00e0', '#6c5ce7'], tagline: 'Rest & recharge' },
  Calm: { icon: 'water', color: '#00ccff', gradient: ['#0088ff', '#00ccff'], tagline: 'Peace of mind' },
  Mood: { icon: 'sunny', color: '#fdcb6e', gradient: ['#f39c12', '#fdcb6e'], tagline: 'Feel good' },
  Focus: { icon: 'flash', color: '#0984e3', gradient: ['#0984e3', '#74b9ff'], tagline: 'Lock in' },
  Energy: { icon: 'rocket', color: '#e17055', gradient: ['#d63031', '#e17055'], tagline: 'Power up' },
  Beauty: { icon: 'sparkles', color: '#fd79a8', gradient: ['#e84393', '#fd79a8'], tagline: 'Glow up' },
  Pain: { icon: 'bandage', color: '#74b9ff', gradient: ['#0984e3', '#74b9ff'], tagline: 'Relief' },
  Health: { icon: 'heart', color: '#55efc4', gradient: ['#00b894', '#55efc4'], tagline: 'Wellness' },
  Chakra: { icon: 'sync-circle', color: '#a29bfe', gradient: ['#6c5ce7', '#a29bfe'], tagline: 'Alignment' },
  Meditation: { icon: 'flower', color: '#6c5ce7', gradient: ['#4a00e0', '#6c5ce7'], tagline: 'Go deeper' },
  Recovery: { icon: 'refresh', color: '#00cec9', gradient: ['#00b894', '#00cec9'], tagline: 'Bounce back' },
  Relationships: { icon: 'people', color: '#fd79a8', gradient: ['#e84393', '#fd79a8'], tagline: 'Connect' },
};

export default function FrequenciesScreen() {
  const [allFrequencies, setAllFrequencies] = useState<Frequency[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedPackId, setExpandedPackId] = useState<string | null>('weight_loss_pack');
  const [playingStatus, setPlayingStatus] = useState('');
  const [selectedSessionMinutes, setSelectedSessionMinutes] = useState(10);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadData = async () => {
    try {
      const [freqRes, recRes, packsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/frequencies`),
        axios.get(`${BACKEND_URL}/api/frequencies/recommend/now`),
        axios.get(`${BACKEND_URL}/api/packs`),
      ]);
      setAllFrequencies(freqRes.data);
      setRecommendation(recRes.data);
      setPacks(packsRes.data);
      if (packsRes.data?.length && !expandedPackId) {
        setExpandedPackId(packsRes.data[0].id);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const playFrequency = async (freq: Frequency) => {
    if (playingId === freq.id) {
      await binauralBeatsPlayer.stop();
      setPlayingId(null);
      setPlayingStatus('');
      return;
    }

    setPlayingStatus(`Loading ${freq.name}...`);
    try {
      const success = await binauralBeatsPlayer.playFrequency(freq.base_hz, freq.frequency_hz, freq.id, selectedSessionMinutes);
      if (success) {
        setPlayingId(freq.id);
        setPlayingStatus(`Now playing: ${freq.name} (${freq.frequency_hz} Hz) • ${selectedSessionLabel}`);
        Alert.alert(
          `Playing ${freq.name}`,
          `${freq.frequency_hz} Hz binaural beat\n\nSession: ${selectedSessionLabel}\nUse headphones for the full effect!\nBase: ${freq.base_hz} Hz\nBeat: ${freq.frequency_hz} Hz`,
          [{ text: 'Got it!' }]
        );
      } else {
        setPlayingStatus('Audio failed - check volume & headphones');
      }
    } catch (error) {
      console.error('Play error:', error);
      setPlayingStatus('Playback error');
    }
  };

  const getIcon = (icon: string): any => {
    const map: { [k: string]: string } = {
      moon: 'moon', cloud: 'cloud', eye: 'eye', 'shield-checkmark': 'shield-checkmark',
      water: 'water', leaf: 'leaf', heart: 'heart', sunny: 'sunny', happy: 'happy',
      'heart-circle': 'heart-circle', trophy: 'trophy', flash: 'flash', bulb: 'bulb',
      locate: 'locate', 'color-palette': 'color-palette', book: 'book', rocket: 'rocket',
      fitness: 'fitness', sparkles: 'sparkles', star: 'star', diamond: 'diamond',
      scale: 'scale', bandage: 'bandage', medkit: 'medkit', pulse: 'pulse',
      body: 'body', barbell: 'barbell', shield: 'shield', nutrition: 'nutrition',
      sync: 'sync', infinite: 'infinite', globe: 'globe', mic: 'mic', prism: 'prism',
      'sync-circle': 'sync-circle', flower: 'flower', planet: 'planet', refresh: 'refresh',
      airplane: 'airplane', cafe: 'cafe', people: 'people', chatbubbles: 'chatbubbles',
    };
    return map[icon] || 'musical-notes';
  };

  const popularFreqs = allFrequencies.filter(f => POPULAR_IDS.includes(f.id));
  const categories = [...new Set(allFrequencies.map(f => f.category))];
  const categoryFreqs = expandedCategory ? allFrequencies.filter(f => f.category === expandedCategory) : [];
  const sessionOptions = [
    { label: '10 min', value: 10 },
    { label: '30 min', value: 30 },
    { label: '8 hr', value: 480 },
  ];
  const selectedSessionLabel = sessionOptions.find((option) => option.value === selectedSessionMinutes)?.label || `${selectedSessionMinutes} min`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
        <Text style={styles.loadingText}>Loading your healing library...</Text>
      </View>
    );
  }

  const renderFreqCard = (freq: Frequency) => {
    const isPlaying = playingId === freq.id;
    return (
      <View key={freq.id} style={[styles.freqCard, isPlaying && { borderColor: freq.color + '60' }]}>
        <TouchableOpacity
          style={styles.freqHeader}
          onPress={() => playFrequency(freq)}
          activeOpacity={0.7}
          testID={`frequency-card-${freq.id}`}
        >
          <LinearGradient colors={freq.gradient as [string, string]} style={styles.freqIcon}>
            <Ionicons name={getIcon(freq.icon)} size={20} color="#fff" />
          </LinearGradient>
          <View style={styles.freqInfo}>
            <Text style={styles.freqName} testID={`frequency-name-${freq.id}`}>{freq.name}</Text>
            <Text style={styles.freqMeta}>{freq.frequency_hz} Hz · {freq.category}</Text>
          </View>
          <View
            style={[styles.playBtn, isPlaying && { backgroundColor: freq.color + '30', borderColor: freq.color }]}
            testID={`frequency-play-button-${freq.id}`}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={isPlaying ? freq.color : COLORS.cyan} />
          </View>
        </TouchableOpacity>
        <Text style={styles.freqDesc}>{freq.description}</Text>
        <View style={styles.benefitsRow}>
          {freq.benefits.slice(0, 3).map((b, i) => (
            <View key={i} style={[styles.tag, { borderColor: freq.color + '40' }]}>
              <Text style={[styles.tagText, { color: freq.color }]}>{b}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} testID="frequencies-screen">

      {/* Now Playing Bar */}
      {playingStatus ? (
        <View style={styles.nowPlayingBar} testID="frequency-now-playing-bar">
          <Ionicons name="musical-notes" size={16} color={COLORS.cyan} />
          <Text style={styles.nowPlayingText} testID="frequency-now-playing-text">{playingStatus}</Text>
          {playingId && (
            <TouchableOpacity
              onPress={() => { binauralBeatsPlayer.stop(); setPlayingId(null); setPlayingStatus(''); }}
              testID="frequency-now-playing-close-button"
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="timer" size={20} color={COLORS.cyan} />
          <Text style={styles.sectionTitle}>Session Length</Text>
        </View>
        <Text style={styles.sectionSub}>Pick how long Flow should keep playing</Text>
        <View style={styles.sessionRow}>
          {sessionOptions.map((option) => {
            const active = option.value === selectedSessionMinutes;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.sessionChip, active && styles.sessionChipActive]}
                onPress={() => setSelectedSessionMinutes(option.value)}
                testID={`frequency-session-${option.value}`}
              >
                <Text style={[styles.sessionChipText, active && styles.sessionChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ===== WEIGHT LOSS PACK ===== */}
      {packs.map(pack => (
        <View key={pack.id} style={styles.packSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setExpandedPackId(expandedPackId === pack.id ? null : pack.id)}
            testID={`frequency-pack-toggle-${pack.id}`}
          >
            <LinearGradient colors={pack.gradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.packCard}>
              <View style={styles.packBadge}>
                <Ionicons name="star" size={14} color="#fff" />
                <Text style={styles.packBadgeText}>Featured Pack</Text>
              </View>
              <View style={styles.packHeader}>
                <Ionicons name={getIcon(pack.icon)} size={32} color="#fff" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.packName} testID={`frequency-pack-name-${pack.id}`}>{pack.name}</Text>
                  <Text style={styles.packDesc}>{pack.description}</Text>
                </View>
                <View style={styles.packOpenButton}>
                  <Text style={styles.packOpenText}>{expandedPackId === pack.id ? 'Hide' : 'Open'}</Text>
                  <Ionicons name={expandedPackId === pack.id ? 'chevron-up' : 'chevron-down'} size={18} color="#fff" />
                </View>
              </View>

              <View style={styles.packTips}>
                {pack.tips.map((tip, i) => (
                  <View key={i} style={styles.packTipItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#ffffffcc" />
                    <Text style={styles.packTipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {expandedPackId === pack.id ? (
            <View testID={`frequency-pack-content-${pack.id}`}>
              <Text style={styles.packFreqTitle}>Frequencies in this Pack:</Text>
              {(pack.frequencies || []).map(freq => renderFreqCard(freq))}
            </View>
          ) : null}
        </View>
      ))}

      {/* ===== SMART RECOMMENDATION ===== */}
      {recommendation && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => playFrequency(recommendation.frequency)} testID="frequency-recommendation-card">
          <Animated.View style={{ transform: [{ scale: playingId === recommendation.frequency.id ? pulseAnim : 1 }] }}>
            <LinearGradient
              colors={recommendation.frequency.gradient as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.recCard}
            >
              <View style={styles.recBadge}>
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.recBadgeText}>Recommended right now</Text>
              </View>
              <View style={styles.recContent}>
                <Ionicons name={getIcon(recommendation.frequency.icon)} size={28} color="#fff" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.recName}>{recommendation.frequency.name}</Text>
                  <Text style={styles.recReason}>{recommendation.reason}</Text>
                </View>
                <View style={styles.recPlayBtn}>
                  <Ionicons name={playingId === recommendation.frequency.id ? 'pause' : 'play'} size={22} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* ===== START HERE ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={20} color={COLORS.cyan} />
          <Text style={styles.sectionTitle}>Start Here</Text>
        </View>
        <Text style={styles.sectionSub}>Most popular — tap to play</Text>
        {popularFreqs.map(freq => renderFreqCard(freq))}
      </View>

      {/* ===== EXPLORE LIBRARY ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="library" size={20} color={COLORS.cyan} />
          <Text style={styles.sectionTitle}>Full Library ({allFrequencies.length})</Text>
        </View>
        <Text style={styles.sectionSub}>Tap a category to browse</Text>

        <View style={styles.catGrid}>
          {categories.map(cat => {
            const meta = CATEGORY_META[cat] || { icon: 'musical-notes', color: COLORS.cyan, gradient: [COLORS.deepBlue, COLORS.cyan] as [string, string], tagline: '' };
            const count = allFrequencies.filter(f => f.category === cat).length;
            const isOpen = expandedCategory === cat;

            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catCard, isOpen && { borderColor: meta.color, borderWidth: 2 }]}
                onPress={() => setExpandedCategory(isOpen ? null : cat)}
                activeOpacity={0.7}
                testID={`frequency-category-${cat.toLowerCase()}`}
              >
                <LinearGradient colors={meta.gradient} style={styles.catIconCircle}>
                  <Ionicons name={getIcon(meta.icon)} size={16} color="#fff" />
                </LinearGradient>
                <Text style={styles.catName}>{cat}</Text>
                <Text style={[styles.catCount, { color: meta.color }]}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Expanded frequencies */}
        {expandedCategory && categoryFreqs.length > 0 && (
          <View style={styles.expanded}>
            <View style={styles.expandedHeader}>
              <Text style={styles.expandedTitle}>{expandedCategory} ({categoryFreqs.length})</Text>
              <TouchableOpacity onPress={() => setExpandedCategory(null)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {categoryFreqs.map(freq => renderFreqCard(freq))}
          </View>
        )}
      </View>

      {/* ===== HOW IT WORKS ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={20} color="#fdcb6e" />
          <Text style={styles.sectionTitle}>How It Works</Text>
        </View>

        <View style={styles.howCard}>
          <Ionicons name="headset" size={24} color={COLORS.cyan} style={styles.howIcon} />
          <Text style={styles.howTitle}>Put on headphones</Text>
          <Text style={styles.howText}>Binaural beats need stereo — each ear gets a slightly different tone. Your brain does the magic.</Text>
        </View>
        <View style={styles.howCard}>
          <Ionicons name="pulse" size={24} color={COLORS.teal} style={styles.howIcon} />
          <Text style={styles.howTitle}>Your brain syncs up</Text>
          <Text style={styles.howText}>The difference between tones creates the healing frequency. 200 Hz left + 210 Hz right = 10 Hz alpha waves.</Text>
        </View>
        <View style={styles.howCard}>
          <Ionicons name="sparkles" size={24} color={COLORS.emerald} style={styles.howIcon} />
          <Text style={styles.howTitle}>Feel the shift</Text>
          <Text style={styles.howText}>Within minutes your brainwaves shift. Sleep, focus, calm, energy — whatever you need.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Ionicons name="headset" size={18} color={COLORS.textMuted} />
        <Text style={styles.footerText}>Headphones required for binaural effect</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },

  // Now Playing
  nowPlayingBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.cyan + '30',
  },
  nowPlayingText: { flex: 1, fontSize: 13, color: COLORS.cyan, fontWeight: '500' },

  // Pack
  packSection: { marginHorizontal: 12, marginTop: 12 },
  packCard: { borderRadius: 16, padding: 18 },
  packBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  packBadgeText: { fontSize: 12, color: '#ffffffcc', fontWeight: '600' },
  packHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  packName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  packDesc: { fontSize: 13, color: '#ffffffbb', lineHeight: 19 },
  packOpenButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff20', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  packOpenText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  packTips: { marginTop: 12, gap: 6 },
  packTipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  packTipText: { fontSize: 12, color: '#ffffffcc', flex: 1, lineHeight: 18 },
  packFreqTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginTop: 12, marginBottom: 8 },

  // Recommendation
  recCard: { marginHorizontal: 12, marginTop: 12, borderRadius: 14, padding: 16 },
  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  recBadgeText: { fontSize: 12, color: '#ffffffcc', fontWeight: '600' },
  recContent: { flexDirection: 'row', alignItems: 'center' },
  recName: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  recReason: { fontSize: 12, color: '#ffffffbb' },
  recPlayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff30', justifyContent: 'center', alignItems: 'center' },

  // Sections
  section: { marginHorizontal: 12, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  sectionSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10, paddingLeft: 28 },
  sessionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingLeft: 28 },
  sessionChip: {
    minWidth: 72, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  sessionChipActive: { borderColor: COLORS.cyan, backgroundColor: COLORS.cyan + '18' },
  sessionChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  sessionChipTextActive: { color: COLORS.cyan },

  // Freq Card
  freqCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  freqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  freqIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  freqInfo: { flex: 1 },
  freqName: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  freqMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.cyan + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.cyan + '30' },
  freqDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 8 },
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '500' },

  // Category Grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: {
    width: (SCREEN_WIDTH - 24 - 24) / 4,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  catIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  catName: { fontSize: 10, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  catCount: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Expanded
  expanded: { marginTop: 12 },
  expandedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  expandedTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.cyan },

  // How it works
  howCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  howIcon: { marginBottom: 8 },
  howTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  howText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 20, paddingBottom: 30, gap: 8 },
  footerText: { fontSize: 12, color: COLORS.textMuted },
});
