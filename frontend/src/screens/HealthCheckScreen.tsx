import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { binauralBeatsPlayer } from '../utils/BinauralBeats';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  surfaceLight: '#161b22',
  cyan: '#00ccff',
  teal: '#00d4aa',
  emerald: '#2ecc71',
  purple: '#9d4edd',
  pink: '#ff6b9d',
  orange: '#ff9f1c',
  red: '#ff4757',
  text: '#ffffff',
  textSecondary: '#8b949e',
  border: '#21262d',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Step = 'voice' | 'bp' | 'symptoms' | 'sleep' | 'analyzing' | 'playlist';

interface HealthData {
  voiceMood: string;
  stressLevel: number;
  energyLevel: number;
  bloodPressure: { systolic: number; diastolic: number } | null;
  bpCategory: string;
  symptoms: string[];
  sleepQuality: string;
}

interface FrequencySession {
  id: string;
  name: string;
  hz: string;
  duration: number;
  purpose: string;
  color: string;
}

const SYMPTOMS = [
  { id: 'headache', label: 'Headache / Migraine', icon: 'flash' },
  { id: 'anxiety', label: 'Anxiety / Panic', icon: 'pulse' },
  { id: 'depression', label: 'Low Mood / Sadness', icon: 'cloudy-night' },
  { id: 'fatigue', label: 'Fatigue / Exhaustion', icon: 'battery-dead' },
  { id: 'insomnia', label: "Can't Sleep", icon: 'moon' },
  { id: 'stress', label: 'Stressed / Overwhelmed', icon: 'thunderstorm' },
  { id: 'pain', label: 'Body Pain / Tension', icon: 'body' },
  { id: 'focus', label: "Can't Focus", icon: 'eye-off' },
  { id: 'anger', label: 'Anger / Frustration', icon: 'flame' },
  { id: 'nausea', label: 'Nausea / Sick', icon: 'medical' },
];

const SLEEP_OPTIONS = [
  { id: 'great', label: 'Slept Great', icon: 'happy', color: COLORS.emerald },
  { id: 'okay', label: 'Slept Okay', icon: 'remove', color: COLORS.orange },
  { id: 'poor', label: 'Slept Poorly', icon: 'sad', color: COLORS.red },
  { id: 'none', label: 'No Sleep', icon: 'moon', color: COLORS.purple },
];

const BP_CATEGORIES = [
  { id: 'low', label: 'Low (<90/60)', color: '#6c5ce7' },
  { id: 'normal', label: 'Normal (90-120/60-80)', color: COLORS.emerald },
  { id: 'elevated', label: 'Elevated (120-129/<80)', color: COLORS.orange },
  { id: 'high', label: 'High (130+/80+)', color: COLORS.red },
  { id: 'skip', label: 'Skip / Unknown', color: COLORS.textSecondary },
];

export default function HealthCheckScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('voice');
  const [healthData, setHealthData] = useState<HealthData>({
    voiceMood: '',
    stressLevel: 5,
    energyLevel: 5,
    bloodPressure: null,
    bpCategory: '',
    symptoms: [],
    sleepQuality: '',
  });
  const [playlist, setPlaylist] = useState<FrequencySession[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [bpInput, setBpInput] = useState({ systolic: '', diastolic: '' });
  const [analysisMessage, setAnalysisMessage] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Microphone access is required for voice analysis');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      // Analyze voice
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await axios.post(`${BACKEND_URL}/api/voice/analyze-mood`, {
        audio_data: base64Audio,
      });

      const analysis = response.data;
      setHealthData(prev => ({
        ...prev,
        voiceMood: analysis.detected_mood || 'neutral',
        stressLevel: analysis.stress_level || 5,
        energyLevel: analysis.energy_level || 5,
      }));

      // Move to next step
      setStep('bp');
    } catch (error) {
      console.error('Analysis error:', error);
      // Continue anyway with defaults
      setStep('bp');
    }
  };

  const handleBPSubmit = () => {
    if (bpInput.systolic && bpInput.diastolic) {
      const sys = parseInt(bpInput.systolic);
      const dia = parseInt(bpInput.diastolic);
      setHealthData(prev => ({
        ...prev,
        bloodPressure: { systolic: sys, diastolic: dia },
        bpCategory: sys < 90 ? 'low' : sys < 120 ? 'normal' : sys < 130 ? 'elevated' : 'high',
      }));
    }
    setStep('symptoms');
  };

  const handleBPCategory = (category: string) => {
    setHealthData(prev => ({ ...prev, bpCategory: category }));
    setStep('symptoms');
  };

  const toggleSymptom = (symptomId: string) => {
    setHealthData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptomId)
        ? prev.symptoms.filter(s => s !== symptomId)
        : [...prev.symptoms, symptomId],
    }));
  };

  const handleSleepSelect = (sleepId: string) => {
    setHealthData(prev => ({ ...prev, sleepQuality: sleepId }));
    generatePlaylist();
  };

  const generatePlaylist = async () => {
    setStep('analyzing');
    setAnalysisMessage('Analyzing your health profile...');

    try {
      // Generate playlist based on health data
      const response = await axios.post(`${BACKEND_URL}/api/health/generate-playlist`, {
        mood: healthData.voiceMood,
        stress_level: healthData.stressLevel,
        energy_level: healthData.energyLevel,
        bp_category: healthData.bpCategory,
        symptoms: healthData.symptoms,
        sleep_quality: healthData.sleepQuality,
      });

      setPlaylist(response.data.playlist);
      setAnalysisMessage(response.data.summary);
      setStep('playlist');
    } catch (error) {
      console.error('Playlist generation error:', error);
      // Generate fallback playlist locally
      const fallbackPlaylist = generateFallbackPlaylist();
      setPlaylist(fallbackPlaylist);
      setAnalysisMessage('Your personalized wellness session is ready!');
      setStep('playlist');
    }
  };

  const generateFallbackPlaylist = (): FrequencySession[] => {
    const sessions: FrequencySession[] = [];
    const { symptoms, stressLevel, energyLevel, bpCategory, sleepQuality } = healthData;

    // High stress or anxiety
    if (stressLevel >= 7 || symptoms.includes('anxiety') || symptoms.includes('stress')) {
      sessions.push({
        id: 'stress_relief',
        name: 'Stress Relief',
        hz: '4Hz Theta',
        duration: 10,
        purpose: 'Deep stress relief & calm',
        color: '#9d4edd',
      });
    }

    // High BP
    if (bpCategory === 'high' || bpCategory === 'elevated') {
      sessions.push({
        id: 'bp_balance',
        name: 'BP Balance',
        hz: '7.83Hz Schumann',
        duration: 15,
        purpose: 'Cardiovascular harmony',
        color: '#ff6b9d',
      });
    }

    // Headache/Pain
    if (symptoms.includes('headache') || symptoms.includes('pain')) {
      sessions.push({
        id: 'pain_relief',
        name: 'Pain Relief',
        hz: '2Hz Delta',
        duration: 10,
        purpose: 'Pain & tension release',
        color: '#00d4aa',
      });
    }

    // Depression/Low mood
    if (symptoms.includes('depression')) {
      sessions.push({
        id: 'mood_lift',
        name: 'Mood Elevation',
        hz: '7.83Hz Schumann',
        duration: 15,
        purpose: 'Lift spirits & positivity',
        color: '#ffca3a',
      });
    }

    // Fatigue/Low energy
    if (symptoms.includes('fatigue') || energyLevel <= 3) {
      sessions.push({
        id: 'energy_boost',
        name: 'Energy Boost',
        hz: '18Hz Beta',
        duration: 10,
        purpose: 'Natural energy & vitality',
        color: '#ff9f1c',
      });
    }

    // Can't focus
    if (symptoms.includes('focus')) {
      sessions.push({
        id: 'focus_enhance',
        name: 'Focus Enhancer',
        hz: '14Hz Beta',
        duration: 10,
        purpose: 'Mental clarity & focus',
        color: '#00ccff',
      });
    }

    // Insomnia/Sleep issues
    if (symptoms.includes('insomnia') || sleepQuality === 'none' || sleepQuality === 'poor') {
      sessions.push({
        id: 'sleep_prep',
        name: 'Sleep Preparation',
        hz: '2Hz Delta',
        duration: 15,
        purpose: 'Deep relaxation for sleep',
        color: '#6c5ce7',
      });
    }

    // Always end with calming session
    if (sessions.length === 0 || !sessions.find(s => s.id === 'calm_finish')) {
      sessions.push({
        id: 'calm_mind',
        name: 'Calm Finish',
        hz: '10Hz Alpha',
        duration: 10,
        purpose: 'Peaceful balance',
        color: '#2ecc71',
      });
    }

    return sessions;
  };

  const playPlaylist = async () => {
    if (playlist.length === 0) return;
    setCurrentPlaying(0);
    setIsPlaying(true);
    await playSession(playlist[0]);
  };

  const playSession = async (session: FrequencySession) => {
    try {
      const frequencyMap: Record<string, () => Promise<boolean>> = {
        'stress_relief': () => binauralBeatsPlayer.playTheta(),
        'bp_balance': () => binauralBeatsPlayer.playBeat(200, 7.83, 'bp_balance', session.duration),
        'pain_relief': () => binauralBeatsPlayer.playDelta(),
        'mood_lift': () => binauralBeatsPlayer.playBeat(200, 7.83, 'mood_lift', session.duration),
        'energy_boost': () => binauralBeatsPlayer.playBeta(),
        'focus_enhance': () => binauralBeatsPlayer.playBeat(200, 14, 'focus_enhance', session.duration),
        'sleep_prep': () => binauralBeatsPlayer.playDelta(),
        'calm_mind': () => binauralBeatsPlayer.playAlpha(),
      };

      const playFn = frequencyMap[session.id] || (() => binauralBeatsPlayer.playAlpha());
      await playFn();

      // Auto-advance after duration
      setTimeout(() => {
        advancePlaylist();
      }, session.duration * 60 * 1000);
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const advancePlaylist = async () => {
    const nextIndex = currentPlaying + 1;
    if (nextIndex < playlist.length) {
      setCurrentPlaying(nextIndex);
      await playSession(playlist[nextIndex]);
    } else {
      // Playlist complete
      setIsPlaying(false);
      setCurrentPlaying(-1);
      await binauralBeatsPlayer.stop();
      Alert.alert('Session Complete', 'Your wellness session has finished. How do you feel?');
    }
  };

  const stopPlaylist = async () => {
    await binauralBeatsPlayer.stop();
    setIsPlaying(false);
    setCurrentPlaying(-1);
  };

  const getTotalDuration = () => {
    return playlist.reduce((sum, s) => sum + s.duration, 0);
  };

  const renderStep = () => {
    switch (step) {
      case 'voice':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>1/4</Text>
              <Text style={styles.stepTitle}>Voice Analysis</Text>
              <Text style={styles.stepSubtitle}>Tell me how you're feeling today</Text>
            </View>

            <View style={styles.voiceContainer}>
              <Animated.View style={[styles.micButton, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                  onPress={isRecording ? stopRecording : startRecording}
                  style={[styles.micButtonInner, isRecording && styles.micButtonRecording]}
                >
                  <LinearGradient
                    colors={isRecording ? [COLORS.red, '#ff6b6b'] : [COLORS.purple, '#c77dff']}
                    style={styles.micGradient}
                  >
                    <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={48}
                      color={COLORS.text}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.voiceInstruction}>
                {isRecording
                  ? 'Listening... Tap to stop'
                  : 'Tap and describe how you feel'}
              </Text>
              <Text style={styles.voiceExample}>
                Example: "I have a headache and feeling stressed"
              </Text>
            </View>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => setStep('bp')}
            >
              <Text style={styles.skipText}>Skip voice analysis →</Text>
            </TouchableOpacity>
          </View>
        );

      case 'bp':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>2/4</Text>
              <Text style={styles.stepTitle}>Blood Pressure</Text>
              <Text style={styles.stepSubtitle}>Enter your BP or select a range</Text>
            </View>

            <View style={styles.bpInputContainer}>
              <View style={styles.bpInputRow}>
                <View style={styles.bpInputField}>
                  <Text style={styles.bpLabel}>Systolic</Text>
                  <TextInput
                    style={styles.bpInput}
                    keyboardType="number-pad"
                    placeholder="120"
                    placeholderTextColor={COLORS.textSecondary}
                    value={bpInput.systolic}
                    onChangeText={(t) => setBpInput(prev => ({ ...prev, systolic: t }))}
                    maxLength={3}
                  />
                </View>
                <Text style={styles.bpSlash}>/</Text>
                <View style={styles.bpInputField}>
                  <Text style={styles.bpLabel}>Diastolic</Text>
                  <TextInput
                    style={styles.bpInput}
                    keyboardType="number-pad"
                    placeholder="80"
                    placeholderTextColor={COLORS.textSecondary}
                    value={bpInput.diastolic}
                    onChangeText={(t) => setBpInput(prev => ({ ...prev, diastolic: t }))}
                    maxLength={3}
                  />
                </View>
              </View>

              {bpInput.systolic && bpInput.diastolic ? (
                <TouchableOpacity style={styles.bpSubmitButton} onPress={handleBPSubmit}>
                  <LinearGradient colors={[COLORS.emerald, COLORS.teal]} style={styles.bpSubmitGradient}>
                    <Text style={styles.bpSubmitText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.orText}>— OR select range —</Text>

            <View style={styles.bpCategories}>
              {BP_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.bpCategory, { borderColor: cat.color }]}
                  onPress={() => handleBPCategory(cat.id)}
                >
                  <View style={[styles.bpCategoryDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.bpCategoryText}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'symptoms':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>3/4</Text>
              <Text style={styles.stepTitle}>Current Symptoms</Text>
              <Text style={styles.stepSubtitle}>Select all that apply</Text>
            </View>

            <View style={styles.symptomsGrid}>
              {SYMPTOMS.map((symptom) => (
                <TouchableOpacity
                  key={symptom.id}
                  style={[
                    styles.symptomCard,
                    healthData.symptoms.includes(symptom.id) && styles.symptomCardActive,
                  ]}
                  onPress={() => toggleSymptom(symptom.id)}
                >
                  <Ionicons
                    name={symptom.icon as any}
                    size={24}
                    color={healthData.symptoms.includes(symptom.id) ? COLORS.cyan : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.symptomText,
                      healthData.symptoms.includes(symptom.id) && styles.symptomTextActive,
                    ]}
                  >
                    {symptom.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setStep('sleep')}
            >
              <LinearGradient colors={[COLORS.cyan, COLORS.teal]} style={styles.continueGradient}>
                <Text style={styles.continueText}>
                  {healthData.symptoms.length > 0
                    ? `Continue with ${healthData.symptoms.length} symptoms`
                    : 'No symptoms - Continue'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      case 'sleep':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>4/4</Text>
              <Text style={styles.stepTitle}>Sleep Quality</Text>
              <Text style={styles.stepSubtitle}>How did you sleep last night?</Text>
            </View>

            <View style={styles.sleepOptions}>
              {SLEEP_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.sleepCard, { borderColor: option.color }]}
                  onPress={() => handleSleepSelect(option.id)}
                >
                  <Ionicons name={option.icon as any} size={32} color={option.color} />
                  <Text style={[styles.sleepText, { color: option.color }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'analyzing':
        return (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={COLORS.cyan} />
            <Text style={styles.analyzingText}>{analysisMessage}</Text>
            <View style={styles.analyzingDots}>
              <View style={[styles.dot, { backgroundColor: COLORS.purple }]} />
              <View style={[styles.dot, { backgroundColor: COLORS.cyan }]} />
              <View style={[styles.dot, { backgroundColor: COLORS.emerald }]} />
            </View>
          </View>
        );

      case 'playlist':
        return (
          <View style={styles.playlistContainer}>
            <View style={styles.playlistHeader}>
              <Text style={styles.playlistTitle}>Your Wellness Session</Text>
              <Text style={styles.playlistDuration}>{getTotalDuration()} minutes</Text>
              <Text style={styles.playlistMessage}>{analysisMessage}</Text>
            </View>

            <ScrollView style={styles.playlistScroll} showsVerticalScrollIndicator={false}>
              {playlist.map((session, index) => (
                <View
                  key={session.id}
                  style={[
                    styles.sessionCard,
                    { borderLeftColor: session.color },
                    currentPlaying === index && styles.sessionCardActive,
                  ]}
                >
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionNumber}>{index + 1}</Text>
                      <Text style={styles.sessionName}>{session.name}</Text>
                      {currentPlaying === index && (
                        <View style={styles.nowPlaying}>
                          <Text style={styles.nowPlayingText}>NOW PLAYING</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sessionHz}>{session.hz}</Text>
                    <Text style={styles.sessionPurpose}>{session.purpose}</Text>
                  </View>
                  <View style={styles.sessionMeta}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.sessionDuration}>{session.duration} min</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.playlistControls}>
              {isPlaying ? (
                <TouchableOpacity style={styles.stopButton} onPress={stopPlaylist}>
                  <LinearGradient colors={[COLORS.red, '#ff6b6b']} style={styles.controlGradient}>
                    <Ionicons name="stop" size={28} color={COLORS.text} />
                    <Text style={styles.controlText}>Stop Session</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.playButton} onPress={playPlaylist}>
                  <LinearGradient colors={[COLORS.emerald, COLORS.teal]} style={styles.controlGradient}>
                    <Ionicons name="play" size={28} color={COLORS.background} />
                    <Text style={[styles.controlText, { color: COLORS.background }]}>Start Session</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Check</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width:
                step === 'voice' ? '25%' :
                step === 'bp' ? '50%' :
                step === 'symptoms' ? '75%' :
                '100%',
            },
          ]}
        />
      </View>

      {renderStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.cyan,
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepNumber: {
    fontSize: 14,
    color: COLORS.cyan,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    marginBottom: 24,
  },
  micButtonInner: {
    borderRadius: 80,
    overflow: 'hidden',
  },
  micButtonRecording: {},
  micGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInstruction: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  voiceExample: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  bpInputContainer: {
    marginBottom: 24,
  },
  bpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bpInputField: {
    alignItems: 'center',
  },
  bpLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  bpInput: {
    width: 100,
    height: 60,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  bpSlash: {
    fontSize: 32,
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginTop: 20,
  },
  bpSubmitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bpSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  bpSubmitText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  orText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginVertical: 16,
  },
  bpCategories: {
    gap: 10,
  },
  bpCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  bpCategoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bpCategoryText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  symptomCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  symptomCardActive: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyan + '15',
  },
  symptomText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  symptomTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 'auto',
    marginBottom: 20,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  sleepOptions: {
    gap: 12,
  },
  sleepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
  },
  sleepText: {
    fontSize: 18,
    fontWeight: '600',
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  analyzingText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  analyzingDots: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playlistContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  playlistHeader: {
    paddingVertical: 20,
  },
  playlistTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  playlistDuration: {
    fontSize: 16,
    color: COLORS.cyan,
    fontWeight: '600',
    marginTop: 4,
  },
  playlistMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  playlistScroll: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionCardActive: {
    backgroundColor: COLORS.cyan + '20',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sessionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  nowPlaying: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nowPlayingText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
  },
  sessionHz: {
    fontSize: 13,
    color: COLORS.cyan,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionPurpose: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionDuration: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  playlistControls: {
    paddingVertical: 16,
  },
  playButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  stopButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  controlGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  controlText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
