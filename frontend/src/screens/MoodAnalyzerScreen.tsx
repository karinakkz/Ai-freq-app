import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  surfaceSoft: '#161b22',
  text: '#ffffff',
  textSecondary: '#8b949e',
  cyan: '#00ccff',
  emerald: '#2ecc71',
  electricBlue: '#00bfff',
  purple: '#9d4edd',
  pink: '#ff6b9d',
  orange: '#ff8c42',
  red: '#ff4757',
  green: '#00d084',
  border: '#30363d',
};

const MOOD_COLORS: Record<string, string> = {
  happy: '#00d084',
  calm: '#00ccff',
  energetic: '#ff8c42',
  stressed: '#ff4757',
  anxious: '#9d4edd',
  sad: '#6c5ce7',
  tired: '#8b949e',
  frustrated: '#ff6b9d',
  overwhelmed: '#e74c3c',
  neutral: '#00bfff',
};

const MOOD_ICONS: Record<string, string> = {
  happy: 'happy',
  calm: 'leaf',
  energetic: 'flash',
  stressed: 'alert-circle',
  anxious: 'pulse',
  sad: 'rainy',
  tired: 'bed',
  frustrated: 'thunderstorm',
  overwhelmed: 'water',
  neutral: 'ellipse',
};

interface MoodAnalysis {
  transcription: string;
  detected_mood: string;
  stress_level: number;
  energy_level: number;
  mood_confidence: number;
  emotional_indicators: string[];
  recommended_frequencies: Array<{
    frequency_id: string;
    priority: number;
    reason: string;
    duration_minutes: number;
    best_time: string;
  }>;
  personalized_plan: {
    immediate: { frequency_id: string; duration: number; reason: string };
    daily_routine: Array<{ time: string; frequency_id: string; duration: number }>;
    weekly_focus: string;
    self_care_tip: string;
  };
  analysis_summary: string;
}

export default function MoodAnalyzerScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      setAnalysis(null);
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
      setIsAnalyzing(true);
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      
      if (!uri) {
        setError('Recording failed');
        setIsAnalyzing(false);
        return;
      }

      // Upload and analyze
      await analyzeMood(uri);
      
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Could not process recording');
      setIsAnalyzing(false);
    }
  };

  const analyzeMood = async (audioUri: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web: Fetch blob and send
        const response = await fetch(audioUri);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('audio', blob, 'recording.m4a');
        
        const result = await axios.post(`${BACKEND_URL}/api/voice/analyze-mood`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        if (result.data.success) {
          setAnalysis(result.data.analysis);
        } else {
          setError(result.data.error || 'Analysis failed');
        }
      } else {
        // Native: Use FileSystem
        const result = await FileSystem.uploadAsync(`${BACKEND_URL}/api/voice/analyze-mood`, audioUri, {
          fieldName: 'audio',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        });
        
        const data = JSON.parse(result.body);
        if (data.success) {
          setAnalysis(data.analysis);
        } else {
          setError(data.error || 'Analysis failed');
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err?.response?.data?.detail || 'Could not analyze your voice');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodColor = (mood: string) => MOOD_COLORS[mood] || COLORS.cyan;
  const getMoodIcon = (mood: string) => MOOD_ICONS[mood] || 'ellipse';

  const playFrequency = (frequencyId: string) => {
    router.push(`/frequencies?play=${frequencyId}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Mood Analyzer</Text>
        <Text style={styles.headerSub}>Speak naturally about how you're feeling</Text>
      </View>

      {/* Recording Section */}
      <View style={styles.recordSection}>
        <Animated.View style={[styles.recordButtonOuter, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              isAnalyzing && styles.recordButtonDisabled,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color={COLORS.text} size="large" />
            ) : (
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={48}
                color={COLORS.text}
              />
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.recordStatus}>
          {isAnalyzing
            ? 'Analyzing your mood...'
            : isRecording
            ? `Recording... ${formatDuration(recordingDuration)}`
            : 'Tap to start speaking'}
        </Text>

        <Text style={styles.recordHint}>
          Share how you're feeling today - your stress, energy, mood, or anything on your mind
        </Text>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="warning" size={20} color={COLORS.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Analysis Results */}
      {analysis && (
        <View style={styles.resultsSection}>
          {/* Mood Summary Card */}
          <LinearGradient
            colors={[getMoodColor(analysis.detected_mood) + '33', COLORS.surface]}
            style={styles.moodCard}
          >
            <View style={styles.moodHeader}>
              <View style={[styles.moodIconWrap, { backgroundColor: getMoodColor(analysis.detected_mood) + '44' }]}>
                <Ionicons name={getMoodIcon(analysis.detected_mood) as any} size={32} color={getMoodColor(analysis.detected_mood)} />
              </View>
              <View style={styles.moodMeta}>
                <Text style={styles.moodLabel}>Detected Mood</Text>
                <Text style={[styles.moodValue, { color: getMoodColor(analysis.detected_mood) }]}>
                  {analysis.detected_mood.charAt(0).toUpperCase() + analysis.detected_mood.slice(1)}
                </Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{Math.round(analysis.mood_confidence * 100)}%</Text>
              </View>
            </View>

            <Text style={styles.analysisSummary}>{analysis.analysis_summary}</Text>

            {/* Stress & Energy Meters */}
            <View style={styles.metersRow}>
              <View style={styles.meter}>
                <Text style={styles.meterLabel}>Stress Level</Text>
                <View style={styles.meterBar}>
                  <View style={[styles.meterFill, { width: `${analysis.stress_level * 10}%`, backgroundColor: analysis.stress_level > 6 ? COLORS.red : analysis.stress_level > 3 ? COLORS.orange : COLORS.green }]} />
                </View>
                <Text style={styles.meterValue}>{analysis.stress_level}/10</Text>
              </View>
              <View style={styles.meter}>
                <Text style={styles.meterLabel}>Energy Level</Text>
                <View style={styles.meterBar}>
                  <View style={[styles.meterFill, { width: `${analysis.energy_level * 10}%`, backgroundColor: analysis.energy_level > 6 ? COLORS.green : analysis.energy_level > 3 ? COLORS.orange : COLORS.red }]} />
                </View>
                <Text style={styles.meterValue}>{analysis.energy_level}/10</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Immediate Recommendation */}
          {analysis.personalized_plan.immediate && (
            <View style={styles.immediateCard}>
              <View style={styles.immediateHeader}>
                <Ionicons name="flash" size={20} color={COLORS.cyan} />
                <Text style={styles.immediateTitle}>Start Now</Text>
              </View>
              <Text style={styles.immediateReason}>{analysis.personalized_plan.immediate.reason}</Text>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => playFrequency(analysis.personalized_plan.immediate.frequency_id)}
              >
                <LinearGradient colors={[COLORS.cyan, COLORS.electricBlue]} style={styles.playButtonGradient}>
                  <Ionicons name="play" size={20} color={COLORS.text} />
                  <Text style={styles.playButtonText}>
                    Play {analysis.personalized_plan.immediate.frequency_id.replace(/_/g, ' ')} • {analysis.personalized_plan.immediate.duration}min
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Recommended Frequencies */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended Frequencies</Text>
            {analysis.recommended_frequencies.map((freq, index) => (
              <TouchableOpacity
                key={index}
                style={styles.freqCard}
                onPress={() => playFrequency(freq.frequency_id)}
              >
                <View style={styles.freqPriority}>
                  <Text style={styles.freqPriorityText}>{freq.priority}</Text>
                </View>
                <View style={styles.freqMeta}>
                  <Text style={styles.freqName}>{freq.frequency_id.replace(/_/g, ' ')}</Text>
                  <Text style={styles.freqReason}>{freq.reason}</Text>
                </View>
                <View style={styles.freqAction}>
                  <Text style={styles.freqDuration}>{freq.duration_minutes}min</Text>
                  <Ionicons name="play-circle" size={24} color={COLORS.cyan} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Daily Routine */}
          {analysis.personalized_plan.daily_routine && analysis.personalized_plan.daily_routine.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Daily Plan</Text>
              <View style={styles.routineCard}>
                {analysis.personalized_plan.daily_routine.map((item, index) => (
                  <View key={index} style={styles.routineItem}>
                    <View style={styles.routineTime}>
                      <Text style={styles.routineTimeText}>{item.time}</Text>
                    </View>
                    <View style={styles.routineLine} />
                    <TouchableOpacity
                      style={styles.routineContent}
                      onPress={() => playFrequency(item.frequency_id)}
                    >
                      <Text style={styles.routineFreq}>{item.frequency_id.replace(/_/g, ' ')}</Text>
                      <Text style={styles.routineDuration}>{item.duration} min</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Weekly Focus & Tip */}
          <View style={styles.tipsSection}>
            {analysis.personalized_plan.weekly_focus && (
              <View style={styles.tipCard}>
                <Ionicons name="calendar" size={20} color={COLORS.purple} />
                <View style={styles.tipContent}>
                  <Text style={styles.tipLabel}>Weekly Focus</Text>
                  <Text style={styles.tipText}>{analysis.personalized_plan.weekly_focus}</Text>
                </View>
              </View>
            )}
            {analysis.personalized_plan.self_care_tip && (
              <View style={styles.tipCard}>
                <Ionicons name="heart" size={20} color={COLORS.pink} />
                <View style={styles.tipContent}>
                  <Text style={styles.tipLabel}>Self-Care Tip</Text>
                  <Text style={styles.tipText}>{analysis.personalized_plan.self_care_tip}</Text>
                </View>
              </View>
            )}
          </View>

          {/* What You Said */}
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>What you said:</Text>
            <Text style={styles.transcriptText}>"{analysis.transcription}"</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerTitle: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  headerSub: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  
  recordSection: { alignItems: 'center', marginBottom: 24 },
  recordButtonOuter: { marginBottom: 16 },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  recordButtonActive: { backgroundColor: COLORS.red },
  recordButtonDisabled: { backgroundColor: COLORS.textSecondary },
  recordStatus: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  recordHint: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.red + '22',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: COLORS.red, fontSize: 14, flex: 1 },
  
  resultsSection: { gap: 16 },
  
  moodCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  moodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  moodIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  moodMeta: { flex: 1 },
  moodLabel: { color: COLORS.textSecondary, fontSize: 12 },
  moodValue: { fontSize: 24, fontWeight: '800' },
  confidenceBadge: { backgroundColor: COLORS.surfaceSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  confidenceText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  analysisSummary: { color: COLORS.text, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  
  metersRow: { flexDirection: 'row', gap: 16 },
  meter: { flex: 1 },
  meterLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 6 },
  meterBar: { height: 8, backgroundColor: COLORS.surfaceSoft, borderRadius: 4, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 4 },
  meterValue: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'right' },
  
  immediateCard: { backgroundColor: COLORS.surfaceSoft, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.cyan + '44' },
  immediateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  immediateTitle: { color: COLORS.cyan, fontSize: 16, fontWeight: '800' },
  immediateReason: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12 },
  playButton: { borderRadius: 12, overflow: 'hidden' },
  playButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  playButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  
  section: { marginTop: 8 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  
  freqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  freqPriority: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.cyan + '33', alignItems: 'center', justifyContent: 'center' },
  freqPriorityText: { color: COLORS.cyan, fontSize: 14, fontWeight: '800' },
  freqMeta: { flex: 1 },
  freqName: { color: COLORS.text, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  freqReason: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  freqAction: { alignItems: 'center', gap: 4 },
  freqDuration: { color: COLORS.textSecondary, fontSize: 11 },
  
  routineCard: { backgroundColor: COLORS.surfaceSoft, borderRadius: 16, padding: 16 },
  routineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  routineTime: { width: 70 },
  routineTimeText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  routineLine: { width: 2, height: 40, backgroundColor: COLORS.cyan + '44', marginHorizontal: 12 },
  routineContent: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, padding: 10 },
  routineFreq: { color: COLORS.text, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  routineDuration: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  
  tipsSection: { gap: 12 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.surfaceSoft, borderRadius: 12, padding: 14 },
  tipContent: { flex: 1 },
  tipLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 4 },
  tipText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  
  transcriptCard: { backgroundColor: COLORS.surfaceSoft, borderRadius: 12, padding: 14, marginTop: 8 },
  transcriptLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 6 },
  transcriptText: { color: COLORS.text, fontSize: 14, fontStyle: 'italic' },
});
