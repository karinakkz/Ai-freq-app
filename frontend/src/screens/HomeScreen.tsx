import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
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
  pink: '#ff6b9d',
  purple: '#9d4edd',
  text: '#ffffff',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
  border: '#21262d',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState({ current_streak: 0, sessions_today: 0 });
  const [tasks, setTasks] = useState<any[]>([]);
  
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shareGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(shareGlowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shareGlowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  };

  const loadData = async () => {
    try {
      const [streakRes, tasksRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/streak/current`).catch(() => ({ data: { current_streak: 0, sessions_today: 0 } })),
        axios.get(`${BACKEND_URL}/api/tasks?status=active`).catch(() => ({ data: [] })),
      ]);
      setStreakData(streakRes.data);
      setTasks(tasksRes.data.slice(0, 3));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleShareStreak = async () => {
    try {
      await Share.share({
        message: `I'm on a ${streakData.current_streak}-day calm streak with ${APP_NAME}! 🧘✨ Join me in finding your perfect frequency.`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const shareGlowOpacity = shareGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
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
          <Text style={styles.subtitle}>{APP_NAME} by {COMPANY_NAME}</Text>
        </View>
        <Animated.View style={[styles.listeningBadge, { opacity: glowOpacity }]}>
          <View style={styles.listeningDot} />
          <Text style={styles.listeningText}>Listening</Text>
        </Animated.View>
      </View>

      {/* Main Wave Card with Mic */}
      <ListeningWaveCard isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />

      {/* Streak Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <Ionicons name="flame" size={24} color={COLORS.cyan} />
          <Text style={styles.streakCount}>{streakData.current_streak}</Text>
        </View>
        <View style={styles.streakInfo}>
          <Text style={styles.streakTitle}>Day Calm Streak</Text>
          <Text style={styles.streakSub}>{streakData.sessions_today} calm sessions today</Text>
        </View>
      </View>

      {/* Share Streak Button */}
      <View style={styles.shareButtonWrap}>
        <Animated.View style={[styles.shareGlowLayer, { opacity: shareGlowOpacity }]} />
        <TouchableOpacity style={styles.shareButton} onPress={handleShareStreak}>
          <LinearGradient colors={[COLORS.electricBlue, COLORS.deepBlue]} style={styles.shareButtonGradient}>
            <Ionicons name="share-social" size={18} color={COLORS.text} />
            <Text style={styles.shareButtonText}>Share Streak</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Health Check Feature Card - Pastel Hot Pink */}
      <TouchableOpacity 
        style={styles.healthCheckCard}
        onPress={() => router.push('/health')}
      >
        <LinearGradient
          colors={['#ff85a230', COLORS.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.healthCheckGradient}
        >
          <View style={[styles.healthCheckIcon, { backgroundColor: '#ff85a225' }]}>
            <Ionicons name="heart-circle" size={28} color="#ff85a2" />
          </View>
          <View style={styles.healthCheckContent}>
            <Text style={styles.healthCheckTitle}>Full Health Check</Text>
            <Text style={styles.healthCheckSub}>Voice + BP + Symptoms → Smart Playlist</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Support Card */}
      <View style={styles.supportCard}>
        <View style={styles.supportIcon}>
          <Ionicons name="mail" size={18} color={COLORS.cyan} />
        </View>
        <View style={styles.supportInfo}>
          <Text style={styles.supportTitle}>Support by {COMPANY_NAME}</Text>
          <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
        </View>
      </View>

      {/* Recent Tasks */}
      <View style={styles.tasksSection}>
        <View style={styles.tasksSectionHeader}>
          <Text style={styles.tasksSectionTitle}>Recent Tasks</Text>
          <TouchableOpacity onPress={() => router.push('/tasks')}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        {tasks.length === 0 ? (
          <View style={styles.noTasksCard}>
            <Ionicons name="sparkles" size={24} color={COLORS.textMuted} />
            <Text style={styles.noTasksText}>No tasks yet. Say "Hey Freq" to get started!</Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <View key={task.id || index} style={styles.taskItem}>
              <View style={styles.taskDot} />
              <Text style={styles.taskText} numberOfLines={1}>{task.title}</Text>
            </View>
          ))
        )}
      </View>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <View style={styles.tipItem}>
          <Ionicons name="hand-left" size={14} color={COLORS.textMuted} />
          <Text style={styles.tipText}>Triple-tap header for instant calm</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="mic" size={14} color={COLORS.textMuted} />
          <Text style={styles.tipText}>Voice tab for direct recording</Text>
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
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.emerald + '40',
    gap: 6,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.emerald,
  },
  listeningText: {
    fontSize: 12,
    color: COLORS.emerald,
    fontWeight: '600',
  },

  // Streak
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  streakIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakCount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  streakInfo: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  streakSub: {
    fontSize: 12,
    color: COLORS.emerald,
    marginTop: 2,
  },

  // Share Button
  shareButtonWrap: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  shareGlowLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.electricBlue,
  },
  shareButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shareButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },

  // Health Check Card - Pastel Hot Pink
  healthCheckCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ff85a244',
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
    backgroundColor: '#ff6b9d22',
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

  // Support
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  supportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cyan + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportInfo: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  supportEmail: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Tasks
  tasksSection: {
    marginHorizontal: 12,
    marginTop: 16,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tasksSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  noTasksCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
  },
  noTasksText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cyan,
  },
  taskText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },

  // Tips
  tipsContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 6,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
