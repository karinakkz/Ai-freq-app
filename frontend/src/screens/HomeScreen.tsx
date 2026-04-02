import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  Share as NativeShare,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { binauralBeatsPlayer } from '../utils/BinauralBeats';
import { ListeningWaveCard } from '../components/ListeningWaveCard';
import { APP_NAME, COMPANY_NAME, SUPPORT_EMAIL } from '../constants/brand';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  surfaceLight: '#161b22',
  deepBlue: '#0044cc',
  electricBlue: '#0088ff',
  cyan: '#00ccff',
  teal: '#00d4aa',
  emerald: '#2ecc71',
  neonGreen: '#00ff88',
  primaryDark: '#0f5c49',
  primary: '#2ecc71',
  text: '#ffffff',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
  border: '#21262d',
  danger: '#ff4757',
  glow: '#00ccff40',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
let externalShare: { open?: (options: any) => Promise<any> } | null = null;

try {
  externalShare = require('react-native-share').default;
} catch {
  externalShare = null;
}

interface Streak {
  current_streak: number;
  total_calm_sessions: number;
  today_sessions: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  created_at: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(true);
  const [stressDetected, setStressDetected] = useState(false);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [listeningStatus, setListeningStatus] = useState('Ambient listening active');
  const [tapCount, setTapCount] = useState(0);

  // Global animations
  const listeningPulse = useRef(new Animated.Value(0)).current;
  const stressFlash = useRef(new Animated.Value(0)).current;
  const shareGlow = useRef(new Animated.Value(0)).current;

  // Start all animations
  useEffect(() => {
    startGlobalAnimations();
    loadData();
  }, []);

  const startGlobalAnimations = () => {
    // Listening indicator pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(listeningPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(listeningPulse, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shareGlow, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(shareGlow, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  };

  const loadData = async () => {
    try {
      const [streakResponse, tasksResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/streak/current`),
        axios.get(`${BACKEND_URL}/api/tasks?status=active`),
      ]);
      setStreak(streakResponse.data);
      setRecentTasks(tasksResponse.data.slice(0, 3));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBinauralBeats = async () => {
    if (isPlaying) {
      await binauralBeatsPlayer.pause();
      setIsPlaying(false);
    } else {
      const success = await binauralBeatsPlayer.playAlpha();
      if (!success) {
        Alert.alert('Audio issue', 'Alpha waves could not start just now. Please try again.');
        return;
      }
      setIsPlaying(true);
    }
  };

  const handleStressDetected = async () => {
    setStressDetected(true);

    // Flash stress animation
    Animated.sequence([
      Animated.timing(stressFlash, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(stressFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(stressFlash, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(stressFlash, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    Alert.alert(
      'I sense some tension',
      'Your voice patterns suggest you might be feeling stressed. Would you like me to play calming alpha waves?',
      [
        { text: 'Not now', style: 'cancel', onPress: () => setStressDetected(false) },
        {
          text: 'Yes, help me',
          onPress: async () => {
            const success = await binauralBeatsPlayer.playAlpha();
            setIsPlaying(success);
            setStressDetected(false);

            try {
              await axios.post(`${BACKEND_URL}/api/stress/analyze`, {
                speech_rate: 2.5,
                volume_variance: 0.8,
                pause_count: 2,
                stress_level: 'stressed',
              });
            } catch (e) {
              console.error('Error logging stress:', e);
            }
          },
        },
      ]
    );
  };

  const handleTripleTap = () => {
    setTapCount(prev => prev + 1);
    setTimeout(() => setTapCount(0), 500);

    if (tapCount === 2) {
      quickCalm();
    }
  };

  const quickCalm = async () => {
    if (!isPlaying) {
      await toggleBinauralBeats();
    }

    try {
      await axios.post(`${BACKEND_URL}/api/stress/analyze`, {
        speech_rate: 0,
        volume_variance: 0,
        pause_count: 0,
        stress_level: 'calm',
      });
      await loadData();
    } catch (error) {
      console.error('Error logging calm session:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reminder': return 'alarm-outline';
      case 'calendar': return 'calendar-outline';
      default: return 'document-text-outline';
    }
  };

  const listeningDotOpacity = listeningPulse.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.4, 1],
  });
  const shareGlowOpacity = shareGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] });

  const handleShareStreak = async () => {
    const days = streak?.current_streak || 0;
    const appLink = Linking.createURL('/premium');
    const message = `My ${days}-day calm streak! Join ${APP_NAME} ${appLink}`;

    try {
      if (externalShare?.open) {
        await externalShare.open({
          title: 'Share your calm streak',
          subject: 'My calm streak',
          message,
          url: appLink,
        });
      } else {
        await NativeShare.share({ message, url: appLink, title: 'Share your calm streak' });
      }
    } catch (error: any) {
      if (error?.message?.includes('User did not share')) return;
      Alert.alert('Share failed', 'Could not open the share menu just now.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
        <Text style={styles.loadingText}>Initializing AI Freq's...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header with listening status */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleTripleTap}
        activeOpacity={0.9}
      >
        <View style={styles.headerTop}>
          <Text style={styles.appTitle}>{APP_NAME}</Text>
          <View style={styles.listeningBadge}>
            <Animated.View style={[styles.listeningDot, { opacity: listeningDotOpacity }]} />
            <Text style={styles.listeningBadgeText}>
              {isListening ? 'Listening' : 'Paused'}
            </Text>
          </View>
        </View>
        <Text style={styles.brandByline} testID="home-brand-byline">{APP_NAME} by {COMPANY_NAME}</Text>
        <Text style={styles.subtitle}>{listeningStatus}</Text>
      </TouchableOpacity>

      <ListeningWaveCard isPlaying={isPlaying} onTogglePlayback={toggleBinauralBeats} />

      {/* Stress Detection Banner */}
      {stressDetected && (
        <Animated.View style={[styles.stressBanner, { opacity: stressFlash }]}>
          <LinearGradient
            colors={[COLORS.danger + '30', COLORS.surface]}
            style={styles.stressBannerGradient}
          >
            <Ionicons name="heart" size={24} color={COLORS.danger} />
            <View style={styles.stressBannerText}>
              <Text style={styles.stressBannerTitle}>Tension detected</Text>
              <Text style={styles.stressBannerSub}>Want me to help you relax?</Text>
            </View>
            <TouchableOpacity
              style={styles.stressBannerAction}
              onPress={handleStressDetected}
            >
              <Text style={styles.stressBannerActionText}>Help</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Listening Card */}
      <View style={styles.listeningCard}>
        <LinearGradient
          colors={[COLORS.surface, COLORS.deepBlue + '10']}
          style={styles.listeningCardGradient}
        >
          <View style={styles.listeningCardHeader}>
            <View style={styles.listeningIconContainer}>
              <Animated.View style={{ opacity: listeningDotOpacity }}>
                <Ionicons name="ear" size={24} color={COLORS.cyan} />
              </Animated.View>
            </View>
            <View style={styles.listeningCardInfo}>
              <Text style={styles.listeningCardTitle}>Always Listening</Text>
              <Text style={styles.listeningCardSub}>
                Say "Hey Flow" anytime • Stress auto-detect active
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsListening(!isListening)}
              style={[
                styles.listeningToggle,
                isListening && styles.listeningToggleActive,
              ]}
            >
              <View
                style={[
                  styles.listeningToggleDot,
                  isListening && styles.listeningToggleDotActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Streak Counter */}
      <LinearGradient
        colors={[COLORS.surface, COLORS.primaryDark + '20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakCard}
      >
        <View style={styles.streakContent}>
          <LinearGradient
            colors={[COLORS.emerald, COLORS.teal]}
            style={styles.streakCircle}
          >
            <Ionicons name="flame" size={28} color={COLORS.background} />
            <Text style={styles.streakNumber}>{streak?.current_streak || 0}</Text>
          </LinearGradient>
          <View style={styles.streakInfo}>
            <Text style={styles.streakLabel}>Day Calm Streak</Text>
            <Text style={styles.streakDetail}>
              {streak?.today_sessions || 0} calm sessions today
            </Text>
            <Text style={styles.streakTotal}>
              {streak?.total_calm_sessions || 0} total sessions
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.shareButtonWrap}>
        <Animated.View style={[styles.shareGlowLayer, { opacity: shareGlowOpacity }]} />
        <TouchableOpacity style={styles.shareButton} onPress={handleShareStreak} testID="home-share-streak-button">
          <LinearGradient colors={[COLORS.electricBlue, COLORS.deepBlue]} style={styles.shareButtonGradient}>
            <Ionicons name="share-social" size={18} color={COLORS.text} />
            <Text style={styles.shareButtonText}>Share Streak</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Mood Analyzer Feature Card */}
      <TouchableOpacity 
        style={styles.moodAnalyzerCard}
        onPress={() => router.push('/mood')}
        testID="home-mood-analyzer-button"
      >
        <LinearGradient
          colors={['#9d4edd33', COLORS.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.moodAnalyzerGradient}
        >
          <View style={styles.moodAnalyzerIcon}>
            <Ionicons name="pulse" size={24} color="#9d4edd" />
          </View>
          <View style={styles.moodAnalyzerContent}>
            <Text style={styles.moodAnalyzerTitle}>Voice Mood Analyzer</Text>
            <Text style={styles.moodAnalyzerSub}>Speak to get personalized frequency plan</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.supportCard} testID="home-support-card">
        <Ionicons name="mail" size={18} color={COLORS.cyan} />
        <View style={styles.supportTextWrap}>
          <Text style={styles.supportTitle}>Support by {COMPANY_NAME}</Text>
          <Text style={styles.supportText}>{SUPPORT_EMAIL}</Text>
        </View>
      </View>

      {/* Recent Tasks */}
      <View style={styles.tasksSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.cyan} />
        </View>

        {recentTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={32} color={COLORS.cyan} />
            <Text style={styles.emptyText}>
              No tasks yet. Say "Hey Flow" to get started!
            </Text>
          </View>
        ) : (
          recentTasks.map((task) => (
            <TouchableOpacity key={task.id} style={styles.taskCard} activeOpacity={0.7}>
              <View style={styles.taskIconContainer}>
                <Ionicons name={getTypeIcon(task.type)} size={18} color={COLORS.cyan} />
              </View>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.description && (
                  <Text style={styles.taskDescription} numberOfLines={1}>
                    {task.description}
                  </Text>
                )}
              </View>
              <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.emerald} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Tips */}
      <View style={styles.tipsContainer}>
        <View style={styles.tipItem}>
          <Ionicons name="hand-left" size={18} color={COLORS.cyan} />
          <Text style={styles.tipText}>Triple-tap header for instant calm</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="mic" size={18} color={COLORS.emerald} />
          <Text style={styles.tipText}>Voice tab for direct recording</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="heart" size={18} color={COLORS.danger} />
          <Text style={styles.tipText}>Auto-detects stress from your voice</Text>
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
    paddingBottom: 24,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  brandByline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cyan + '40',
    gap: 6,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cyan,
  },
  listeningBadgeText: {
    fontSize: 12,
    color: COLORS.cyan,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Stress Banner
  stressBanner: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stressBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  stressBannerText: {
    flex: 1,
  },
  stressBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
  },
  stressBannerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stressBannerAction: {
    backgroundColor: COLORS.danger + '30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger + '50',
  },
  stressBannerActionText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: 14,
  },

  // Listening Card
  listeningCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cyan + '20',
  },
  listeningCardGradient: {
    padding: 14,
  },
  listeningCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listeningIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cyan + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listeningCardInfo: {
    flex: 1,
  },
  listeningCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  listeningCardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listeningToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  listeningToggleActive: {
    backgroundColor: COLORS.cyan + '40',
  },
  listeningToggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.textSecondary,
  },
  listeningToggleDotActive: {
    backgroundColor: COLORS.cyan,
    alignSelf: 'flex-end',
  },

  // Streak
  streakCard: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.emerald + '20',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
    marginTop: 2,
  },
  streakInfo: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  streakDetail: {
    fontSize: 14,
    color: COLORS.emerald,
    marginTop: 2,
  },
  streakTotal: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  shareButtonWrap: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 18,
  },
  shareGlowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    backgroundColor: COLORS.emerald + '66',
  },
  shareButton: { borderRadius: 18, overflow: 'hidden' },
  shareButtonGradient: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  shareButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  supportCard: {
    marginHorizontal: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cyan + '22',
  },
  supportTextWrap: { flex: 1 },
  supportTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  supportText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },

  // Tasks
  tasksSection: {
    marginHorizontal: 12,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.cyan,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.deepBlue + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Tips
  tipsContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.cyan,
    gap: 10,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },

  // Mood Analyzer Card
  moodAnalyzerCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#9d4edd44',
  },
  moodAnalyzerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  moodAnalyzerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9d4edd22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodAnalyzerContent: {
    flex: 1,
  },
  moodAnalyzerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  moodAnalyzerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
