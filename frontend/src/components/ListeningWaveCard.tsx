import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { binauralBeatsPlayer } from '../utils/BinauralBeats';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  deepBlue: '#0044cc',
  electricBlue: '#00aaff',
  cyan: '#00ccff',
  teal: '#00d4aa',
  emerald: '#2ecc71',
  purple: '#9d4edd',
  pink: '#ff6b9d',
  text: '#ffffff',
  textSecondary: '#8b949e',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const NUM_BARS = 32;

type MoodState = 'idle' | 'listening' | 'analyzing' | 'playing';

function getBarColor(index: number, total: number, state: MoodState) {
  if (state === 'listening') {
    // Purple/pink gradient when listening
    const ratio = index / total;
    if (ratio < 0.25) return '#9d4edd';
    if (ratio < 0.5) return '#c77dff';
    if (ratio < 0.75) return '#e0aaff';
    return '#f0d6ff';
  }
  if (state === 'analyzing') {
    // Orange/yellow when analyzing
    const ratio = index / total;
    if (ratio < 0.25) return '#ff6b35';
    if (ratio < 0.5) return '#ff9f1c';
    if (ratio < 0.75) return '#ffca3a';
    return '#ffe066';
  }
  // Default teal/green gradient (original)
  const ratio = index / total;
  if (ratio < 0.25) return '#1547d5';
  if (ratio < 0.5) return '#1c7ce5';
  if (ratio < 0.75) return '#10b6d8';
  return '#19d48c';
}

function buildRibbonPath(width: number, height: number, offset: number, curve: number) {
  const startY = height * (0.72 + offset);
  const controlY = height * (0.48 + curve);
  const endY = height * (0.2 + offset * 0.5);
  return `M 0 ${startY} C ${width * 0.35} ${controlY}, ${width * 0.65} ${height * 0.95}, ${width} ${endY}`;
}

interface ListeningWaveCardProps {
  isPlaying: boolean;
  onTogglePlayback: () => void;
}

export function ListeningWaveCard({ isPlaying, onTogglePlayback }: ListeningWaveCardProps) {
  const window = useWindowDimensions();
  const cardWidth = Math.max(window.width - 24, 280);
  const barAnims = useRef(Array.from({ length: NUM_BARS }, () => new Animated.Value(0))).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  const [moodState, setMoodState] = useState<MoodState>('idle');
  const [statusText, setStatusText] = useState('Tap to speak • AI will find your perfect frequency');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);

  useEffect(() => {
    barAnims.forEach((anim, index) => {
      const delay = (index * 90) % 1200;
      const baseDuration = moodState === 'listening' ? 400 : 1100;
      const duration = baseDuration + (index % 5) * 80;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, { toValue: 1.05, duration: 1400, useNativeDriver: true }),
        Animated.timing(buttonPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [barAnims, buttonPulse, glowPulse, moodState]);

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.48],
  });

  const ribbonPaths = useMemo(
    () => [
      buildRibbonPath(cardWidth, 220, -0.04, -0.08),
      buildRibbonPath(cardWidth, 220, 0.03, 0.02),
      buildRibbonPath(cardWidth, 220, 0.11, 0.08),
    ],
    [cardWidth]
  );

  const handleButtonPress = async () => {
    if (moodState === 'idle') {
      // Start listening
      await startRecording();
    } else if (moodState === 'listening') {
      // Stop listening and analyze
      await stopRecordingAndAnalyze();
    } else if (moodState === 'playing' || isPlaying) {
      // Stop playing
      await binauralBeatsPlayer.pause();
      setMoodState('idle');
      setStatusText('Tap to speak • AI will find your perfect frequency');
      setDetectedMood(null);
      onTogglePlayback();
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setStatusText('Microphone permission needed');
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
      setMoodState('listening');
      setStatusText('Listening... Speak naturally about how you feel');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setStatusText('Could not start recording');
    }
  };

  const stopRecordingAndAnalyze = async () => {
    if (!recording) return;

    setMoodState('analyzing');
    setStatusText('Analyzing your mood...');

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Read and send to backend
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await axios.post(`${BACKEND_URL}/api/voice/analyze-mood`, {
        audio_data: base64Audio,
      });

      const analysis = response.data;
      const mood = analysis.detected_mood || 'neutral';
      
      setDetectedMood(mood);
      
      // Play the recommended frequency with full analysis context
      await playRecommendedFrequency(analysis);
      
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setStatusText('Analysis failed • Tap to try again');
      setMoodState('idle');
    }
  };

  const playRecommendedFrequency = async (analysis: any) => {
    setMoodState('playing');
    
    try {
      let success = false;
      const mood = analysis.detected_mood?.toLowerCase() || 'neutral';
      const stressLevel = analysis.stress_level || 5;
      const energyLevel = analysis.energy_level || 5;
      const immediateFreq = analysis.personalized_plan?.immediate?.frequency_id || 'stress_relief';
      
      // Comprehensive mood-to-frequency mapping
      const frequencyMap: Record<string, { method: () => Promise<boolean>, hz: string, desc: string }> = {
        // Delta (2Hz) - Deep healing, sleep, pain
        'deep_sleep': { method: () => binauralBeatsPlayer.playDelta(), hz: '2Hz Delta', desc: 'Deep restorative sleep' },
        'pain_relief': { method: () => binauralBeatsPlayer.playDelta(), hz: '2Hz Delta', desc: 'Pain & tension relief' },
        
        // Theta (4-6Hz) - Stress, anxiety, meditation
        'stress_relief': { method: () => binauralBeatsPlayer.playTheta(), hz: '4Hz Theta', desc: 'Deep stress relief' },
        'anxiety_relief': { method: () => binauralBeatsPlayer.playBeat(200, 8, 'anxiety_relief', 15), hz: '8Hz Alpha-Theta', desc: 'Anxiety calming' },
        'deep_meditation': { method: () => binauralBeatsPlayer.playTheta(), hz: '6Hz Theta', desc: 'Deep meditation' },
        'weight_loss': { method: () => binauralBeatsPlayer.playTheta(), hz: '6Hz Theta', desc: 'Metabolic balance' },
        'depression_lift': { method: () => binauralBeatsPlayer.playBeat(200, 7.83, 'depression_lift', 20), hz: '7.83Hz Schumann', desc: 'Mood elevation' },
        
        // Alpha (8-12Hz) - Calm focus, relaxation
        'focus_enhancer': { method: () => binauralBeatsPlayer.playAlpha(), hz: '10Hz Alpha', desc: 'Calm focus' },
        'calm_mind': { method: () => binauralBeatsPlayer.playAlpha(), hz: '10Hz Alpha', desc: 'Mental calm' },
        'clear_skin': { method: () => binauralBeatsPlayer.playBeat(200, 10, 'clear_skin', 15), hz: '10Hz + 528Hz', desc: 'Cellular repair' },
        'anti_aging': { method: () => binauralBeatsPlayer.playBeat(200, 10, 'anti_aging', 15), hz: '10Hz + 528Hz', desc: 'Rejuvenation' },
        'immune_boost': { method: () => binauralBeatsPlayer.playBeat(200, 10, 'immune_boost', 15), hz: '10Hz + 528Hz', desc: 'Immune support' },
        
        // Beta (14-18Hz) - Energy, confidence, alertness
        'confidence_boost': { method: () => binauralBeatsPlayer.playBeat(200, 14, 'confidence_boost', 15), hz: '14Hz Beta', desc: 'Confidence & clarity' },
        'energy_boost': { method: () => binauralBeatsPlayer.playBeta(), hz: '18Hz Beta', desc: 'Energy & vitality' },
        
        // Gamma (40Hz) - Peak performance, motivation
        'motivation_drive': { method: () => binauralBeatsPlayer.playGamma(), hz: '40Hz Gamma', desc: 'Peak motivation' },
      };

      // Get the frequency to play
      let freqToPlay = frequencyMap[immediateFreq];
      
      // Fallback based on mood if specific frequency not found
      if (!freqToPlay) {
        if (mood === 'anxious' || mood === 'stressed' || mood === 'overwhelmed' || stressLevel >= 7) {
          freqToPlay = frequencyMap['stress_relief'];
        } else if (mood === 'sad' || mood === 'frustrated') {
          freqToPlay = frequencyMap['depression_lift'];
        } else if (mood === 'tired' || energyLevel <= 3) {
          freqToPlay = frequencyMap['energy_boost'];
        } else if (mood === 'energetic' || energyLevel >= 8) {
          freqToPlay = frequencyMap['calm_mind'];
        } else {
          freqToPlay = frequencyMap['focus_enhancer'];
        }
      }

      // Play the frequency
      success = await freqToPlay.method();
      
      if (success) {
        const summary = analysis.analysis_summary || `Detected: ${mood}`;
        setStatusText(`${freqToPlay.hz} • ${freqToPlay.desc}`);
      } else {
        setStatusText('Could not play frequency • Tap to retry');
        setMoodState('idle');
      }
    } catch (error) {
      console.error('Playback failed:', error);
      setStatusText('Playback failed • Tap to retry');
      setMoodState('idle');
    }
  };

  const getButtonIcon = () => {
    switch (moodState) {
      case 'listening':
        return 'stop';
      case 'analyzing':
        return 'hourglass';
      case 'playing':
        return 'pause';
      default:
        return isPlaying ? 'pause' : 'mic';
    }
  };

  const getButtonColors = (): [string, string] => {
    switch (moodState) {
      case 'listening':
        return [COLORS.purple, '#c77dff'];
      case 'analyzing':
        return ['#ff9f1c', '#ffca3a'];
      case 'playing':
        return [COLORS.emerald, COLORS.teal];
      default:
        return isPlaying ? [COLORS.emerald, COLORS.teal] : [COLORS.cyan, COLORS.electricBlue];
    }
  };

  return (
    <View style={styles.card} testID="alpha-wave-section-card">
      <Animated.View style={[styles.glowLayer, { opacity: glowOpacity }]}>
        <LinearGradient 
          colors={
            moodState === 'listening' 
              ? ['#9d4edd00', '#9d4edd28', '#c77dff22', '#9d4edd00']
              : ['#0b1d4b00', '#00ccff28', '#2ecc7122', '#0b1d4b00']
          } 
          style={StyleSheet.absoluteFillObject} 
        />
      </Animated.View>

      <View style={styles.ribbonLayer}>
        <Svg height={220} viewBox={`0 0 ${cardWidth} 220`} width={cardWidth}>
          <Defs>
            <SvgGradient id="ribbonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#16d17f" stopOpacity="0.12" />
              <Stop offset="50%" stopColor="#63ecff" stopOpacity="0.72" />
              <Stop offset="100%" stopColor="#14d38a" stopOpacity="0.78" />
            </SvgGradient>
            <SvgGradient id="ribbonGlowSoft" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#16d17f" stopOpacity="0.08" />
              <Stop offset="50%" stopColor="#63ecff" stopOpacity="0.34" />
              <Stop offset="100%" stopColor="#14d38a" stopOpacity="0.42" />
            </SvgGradient>
          </Defs>
          {ribbonPaths.map((path, index) => (
            <Path
              key={`soft-${index}`}
              d={path}
              fill="none"
              opacity={0.9 - index * 0.2}
              stroke="url(#ribbonGlowSoft)"
              strokeWidth={18 - index * 3}
            />
          ))}
          {ribbonPaths.map((path, index) => (
            <Path
              key={`sharp-${index}`}
              d={path}
              fill="none"
              opacity={0.95 - index * 0.18}
              stroke="url(#ribbonGlow)"
              strokeWidth={4 - index * 0.6}
            />
          ))}
        </Svg>
      </View>

      <View style={styles.barsWrap} testID="listening-wave-bars">
        {barAnims.map((anim, index) => {
          const baseHeight = 16 + ((index * 13) % 26);
          const activeBoost = moodState === 'listening' ? 54 : (isPlaying || moodState === 'playing') ? 44 : 24;
          const scaleY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1 + activeBoost / (baseHeight + 8)],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.3, 0.9, 0.3],
          });

          return (
            <Animated.View
              key={`bar-${index}`}
              style={[
                styles.bar,
                {
                  backgroundColor: getBarColor(index, NUM_BARS, moodState),
                  height: baseHeight + 18,
                  opacity,
                  transform: [{ scaleY }],
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerText}>
          <Text style={styles.label}>
            {moodState === 'listening' ? 'Listening...' : 
             moodState === 'analyzing' ? 'Analyzing...' :
             moodState === 'playing' ? 'Playing for you' : 'Say Freq!'}
          </Text>
          <Text style={styles.subLabel} numberOfLines={2}>{statusText}</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
          <TouchableOpacity 
            activeOpacity={0.85} 
            onPress={handleButtonPress} 
            testID="alpha-wave-play-toggle-button"
            disabled={moodState === 'analyzing'}
          >
            <LinearGradient colors={getButtonColors()} style={styles.playButton}>
              {moodState === 'analyzing' ? (
                <ActivityIndicator color={COLORS.background} size="large" />
              ) : (
                <Ionicons color={COLORS.background} name={getButtonIcon()} size={34} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 8,
    height: 250,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#103a9d55',
  },
  glowLayer: { ...StyleSheet.absoluteFillObject },
  ribbonLayer: { ...StyleSheet.absoluteFillObject, top: 14, pointerEvents: 'none' },
  barsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 76,
    height: 110,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bar: { width: 10, borderRadius: 6 },
  footer: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  footerText: {
    flex: 1,
  },
  label: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, maxWidth: 220, lineHeight: 17 },
  playButton: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center' },
});
