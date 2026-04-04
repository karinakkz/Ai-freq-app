import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
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
  hotPink: '#ff1493',
  text: '#ffffff',
  textSecondary: '#8b949e',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const NUM_BARS = 40;

type MoodState = 'idle' | 'reading' | 'listening' | 'analyzing' | 'playing';

function getBarColor(index: number, total: number, state: MoodState) {
  const ratio = index / total;
  
  if (state === 'reading') {
    // Red/pink pulse colors when reading heart rate
    if (ratio < 0.25) return '#ff1493';
    if (ratio < 0.5) return '#ff6b9d';
    if (ratio < 0.75) return '#ff69b4';
    return '#ffb6c1';
  }
  if (state === 'listening') {
    // Purple/pink when listening to voice
    if (ratio < 0.25) return '#9d4edd';
    if (ratio < 0.5) return '#c77dff';
    if (ratio < 0.75) return '#ff6b9d';
    return '#ffb6c1';
  }
  if (state === 'analyzing') {
    // Orange/yellow when analyzing
    if (ratio < 0.25) return '#ff6b35';
    if (ratio < 0.5) return '#ff9f1c';
    if (ratio < 0.75) return '#ffca3a';
    return '#ffe066';
  }
  // Default: Cyan to pink gradient
  if (ratio < 0.2) return '#0044cc';
  if (ratio < 0.4) return '#00aaff';
  if (ratio < 0.6) return '#00ccff';
  if (ratio < 0.8) return '#ff6b9d';
  return '#ff1493';
}

function buildRibbonPath(width: number, height: number, offset: number, curve: number) {
  const startY = height * (0.72 + offset);
  const controlY = height * (0.48 + curve);
  const endY = height * (0.2 + offset * 0.5);
  return `M 0 ${startY} C ${width * 0.35} ${controlY}, ${width * 0.65} ${height * 0.95}, ${width} ${endY}`;
}

interface PulseWaveCardProps {
  onFrequencyRecommended?: (frequencies: any[]) => void;
}

export function PulseWaveCard({ onFrequencyRecommended }: PulseWaveCardProps) {
  const window = useWindowDimensions();
  const cardWidth = Math.max(window.width - 24, 280);
  const cardHeight = 320; // Bigger waves
  const barAnims = useRef(Array.from({ length: NUM_BARS }, () => new Animated.Value(0))).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;

  const [moodState, setMoodState] = useState<MoodState>('idle');
  const [statusText, setStatusText] = useState('Place finger on heart to read pulse');
  const [subText, setSubText] = useState('Then tell Freq how you feel');
  const [bpm, setBpm] = useState<number | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Bar animations
    barAnims.forEach((anim, index) => {
      const delay = (index * 60) % 800;
      const baseDuration = moodState === 'reading' ? 300 : moodState === 'listening' ? 400 : 900;
      const duration = baseDuration + (index % 5) * 60;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    });

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [barAnims, glowPulse, moodState]);

  // Heart pulse animation when reading
  useEffect(() => {
    if (moodState === 'reading') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartPulse, { toValue: 1.3, duration: 150, useNativeDriver: true }),
          Animated.timing(heartPulse, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(heartPulse, { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.timing(heartPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      heartPulse.setValue(1);
    }
  }, [moodState, heartPulse]);

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const ribbonPaths = useMemo(
    () => [
      buildRibbonPath(cardWidth, cardHeight, -0.04, -0.08),
      buildRibbonPath(cardWidth, cardHeight, 0.03, 0.02),
      buildRibbonPath(cardWidth, cardHeight, 0.11, 0.08),
    ],
    [cardWidth, cardHeight]
  );

  const handlePulsePress = async () => {
    if (moodState === 'idle') {
      startPulseReading();
    } else if (moodState === 'reading') {
      finishPulseAndListen();
    } else if (moodState === 'listening') {
      stopRecordingAndAnalyze();
    } else if (moodState === 'playing' || isPlaying) {
      await binauralBeatsPlayer.stop();
      setMoodState('idle');
      setIsPlaying(false);
      setStatusText('Place finger on heart to read pulse');
      setSubText('Then tell Freq how you feel');
      setBpm(null);
    }
  };

  const startPulseReading = () => {
    setMoodState('reading');
    setStatusText('Reading pulse...');
    setSubText('Keep finger steady');
    
    // Simulate pulse reading (3 seconds)
    setTimeout(() => {
      const simulatedBpm = Math.floor(Math.random() * 30) + 65; // 65-95 BPM
      setBpm(simulatedBpm);
      setStatusText(`Pulse: ${simulatedBpm} BPM`);
      setSubText('Tap again and tell Freq how you feel');
    }, 3000);
  };

  const finishPulseAndListen = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Microphone access required');
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
      setStatusText('Listening...');
      setSubText('Tell Freq how you\'re feeling');
    } catch (error) {
      console.error('Recording error:', error);
      setMoodState('idle');
    }
  };

  const stopRecordingAndAnalyze = async () => {
    if (!recording) return;

    setMoodState('analyzing');
    setStatusText('Analyzing...');
    setSubText('Creating your frequency prescription');

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) throw new Error('No recording');

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await axios.post(`${BACKEND_URL}/api/voice/analyze-mood`, {
        audio_data: base64Audio,
        heart_rate: bpm,
      });

      const analysis = response.data;
      
      // Play recommended frequency
      await playRecommendedFrequency(analysis);
      
      // Notify parent of recommendations
      if (onFrequencyRecommended && analysis.personalized_plan?.daily_routine) {
        onFrequencyRecommended(analysis.personalized_plan.daily_routine);
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      setStatusText('Try again');
      setSubText('Tap the heart to start over');
      setMoodState('idle');
    }
  };

  const playRecommendedFrequency = async (analysis: any) => {
    setMoodState('playing');
    setIsPlaying(true);
    
    const mood = analysis.detected_mood?.toLowerCase() || 'neutral';
    const stressLevel = analysis.stress_level || 5;
    const immediateFreq = analysis.personalized_plan?.immediate?.frequency_id || 'calm_mind';
    
    const frequencyMap: Record<string, { method: () => Promise<boolean>, hz: string, desc: string }> = {
      'stress_relief': { method: () => binauralBeatsPlayer.playTheta(), hz: '4Hz', desc: 'Stress Relief' },
      'anxiety_relief': { method: () => binauralBeatsPlayer.playBeat(200, 8, 'anxiety', 15), hz: '8Hz', desc: 'Anxiety Relief' },
      'deep_meditation': { method: () => binauralBeatsPlayer.playTheta(), hz: '6Hz', desc: 'Deep Calm' },
      'depression_lift': { method: () => binauralBeatsPlayer.playBeat(200, 7.83, 'mood', 20), hz: '7.83Hz', desc: 'Mood Lift' },
      'focus_enhancer': { method: () => binauralBeatsPlayer.playAlpha(), hz: '10Hz', desc: 'Focus' },
      'calm_mind': { method: () => binauralBeatsPlayer.playAlpha(), hz: '10Hz', desc: 'Calm Mind' },
      'energy_boost': { method: () => binauralBeatsPlayer.playBeta(), hz: '18Hz', desc: 'Energy' },
      'deep_sleep': { method: () => binauralBeatsPlayer.playDelta(), hz: '2Hz', desc: 'Deep Sleep' },
      'pain_relief': { method: () => binauralBeatsPlayer.playDelta(), hz: '2Hz', desc: 'Pain Relief' },
    };

    let freqToPlay = frequencyMap[immediateFreq];
    
    if (!freqToPlay) {
      if (stressLevel >= 7 || mood === 'stressed' || mood === 'anxious') {
        freqToPlay = frequencyMap['stress_relief'];
      } else if (mood === 'sad' || mood === 'depressed') {
        freqToPlay = frequencyMap['depression_lift'];
      } else if (mood === 'tired') {
        freqToPlay = frequencyMap['energy_boost'];
      } else {
        freqToPlay = frequencyMap['calm_mind'];
      }
    }

    const success = await freqToPlay.method();
    
    if (success) {
      setStatusText(`Playing: ${freqToPlay.desc}`);
      setSubText(`${freqToPlay.hz} • Tap heart to stop`);
    } else {
      setStatusText('Playback failed');
      setSubText('Tap to try again');
      setMoodState('idle');
      setIsPlaying(false);
    }
  };

  const getButtonIcon = () => {
    if (moodState === 'playing' || isPlaying) return 'pause';
    if (moodState === 'listening') return 'stop';
    if (moodState === 'analyzing') return 'hourglass';
    return 'heart';
  };

  const getButtonColors = (): [string, string] => {
    if (moodState === 'playing') return [COLORS.emerald, COLORS.teal];
    if (moodState === 'listening') return [COLORS.purple, '#c77dff'];
    if (moodState === 'analyzing') return ['#ff9f1c', '#ffca3a'];
    if (moodState === 'reading') return [COLORS.hotPink, COLORS.pink];
    return [COLORS.pink, COLORS.hotPink];
  };

  return (
    <View style={[styles.card, { height: cardHeight }]} testID="pulse-wave-card">
      <Animated.View style={[styles.glowLayer, { opacity: glowOpacity }]}>
        <LinearGradient 
          colors={['#ff149310', '#ff6b9d30', '#00ccff20', '#ff149310']} 
          style={StyleSheet.absoluteFillObject} 
        />
      </Animated.View>

      {/* Ribbon waves */}
      <View style={styles.ribbonLayer}>
        <Svg height={cardHeight} viewBox={`0 0 ${cardWidth} ${cardHeight}`} width={cardWidth}>
          <Defs>
            <SvgGradient id="ribbonPink" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ff1493" stopOpacity="0.15" />
              <Stop offset="30%" stopColor="#ff6b9d" stopOpacity="0.6" />
              <Stop offset="60%" stopColor="#00ccff" stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#ff1493" stopOpacity="0.7" />
            </SvgGradient>
            <SvgGradient id="ribbonPinkSoft" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ff1493" stopOpacity="0.08" />
              <Stop offset="50%" stopColor="#ff6b9d" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#00ccff" stopOpacity="0.35" />
            </SvgGradient>
          </Defs>
          {ribbonPaths.map((path, index) => (
            <Path
              key={`soft-${index}`}
              d={path}
              fill="none"
              opacity={0.9 - index * 0.2}
              stroke="url(#ribbonPinkSoft)"
              strokeWidth={22 - index * 4}
            />
          ))}
          {ribbonPaths.map((path, index) => (
            <Path
              key={`sharp-${index}`}
              d={path}
              fill="none"
              opacity={0.95 - index * 0.15}
              stroke="url(#ribbonPink)"
              strokeWidth={5 - index * 0.8}
            />
          ))}
        </Svg>
      </View>

      {/* Animated bars */}
      <View style={[styles.barsWrap, { bottom: 100 }]} testID="pulse-wave-bars">
        {barAnims.map((anim, index) => {
          const baseHeight = 20 + ((index * 11) % 30);
          const activeBoost = moodState === 'reading' ? 60 : moodState === 'listening' ? 50 : moodState === 'playing' ? 45 : 25;
          const scaleY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1 + activeBoost / (baseHeight + 10)],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.35, 0.95, 0.35],
          });

          return (
            <Animated.View
              key={`bar-${index}`}
              style={[
                styles.bar,
                {
                  backgroundColor: getBarColor(index, NUM_BARS, moodState),
                  height: baseHeight + 20,
                  opacity,
                  transform: [{ scaleY }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Footer with pulse button */}
      <View style={styles.footer}>
        <View style={styles.footerText}>
          <Text style={styles.label}>{statusText}</Text>
          <Text style={styles.subLabel}>{subText}</Text>
          {bpm && moodState !== 'idle' && (
            <View style={styles.bpmBadge}>
              <Ionicons name="heart" size={12} color={COLORS.pink} />
              <Text style={styles.bpmText}>{bpm} BPM</Text>
            </View>
          )}
        </View>
        
        <Animated.View style={{ transform: [{ scale: heartPulse }] }}>
          <TouchableOpacity 
            activeOpacity={0.85} 
            onPress={handlePulsePress}
            disabled={moodState === 'analyzing'}
          >
            <LinearGradient colors={getButtonColors()} style={styles.pulseButton}>
              {moodState === 'analyzing' ? (
                <ActivityIndicator color={COLORS.text} size="large" />
              ) : (
                <Ionicons color={COLORS.text} name={getButtonIcon()} size={40} />
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
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#ff6b9d33',
  },
  glowLayer: { ...StyleSheet.absoluteFillObject },
  ribbonLayer: { ...StyleSheet.absoluteFillObject, top: 10, pointerEvents: 'none' },
  barsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 140,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bar: { width: 8, borderRadius: 5 },
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
  label: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, maxWidth: 200, lineHeight: 18 },
  bpmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: COLORS.pink + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bpmText: {
    color: COLORS.pink,
    fontSize: 12,
    fontWeight: '700',
  },
  pulseButton: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
});
