import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
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
  pastelPink: '#ffb6c1', // Light pastel pink like flower
  flowerPink: '#ffc0cb', // Flower pink
  text: '#ffffff',
  textSecondary: '#8b949e',
};

const NUM_BARS = 32;

type MoodState = 'idle' | 'reading' | 'analyzing' | 'playing';

function getBarColor(index: number, total: number, state: MoodState) {
  if (state === 'reading') {
    // Pastel pink when reading pulse
    const ratio = index / total;
    if (ratio < 0.25) return '#ffb6c1';
    if (ratio < 0.5) return '#ffc0cb';
    if (ratio < 0.75) return '#ffd1dc';
    return '#ffe4e9';
  }
  if (state === 'analyzing') {
    // Orange/yellow when analyzing
    const ratio = index / total;
    if (ratio < 0.25) return '#ff6b35';
    if (ratio < 0.5) return '#ff9f1c';
    if (ratio < 0.75) return '#ffca3a';
    return '#ffe066';
  }
  // Default teal/green gradient
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
  const heartPulse = useRef(new Animated.Value(1)).current;

  const [moodState, setMoodState] = useState<MoodState>('idle');
  const [statusText, setStatusText] = useState('Press to get health frequency prescription');
  const [bpm, setBpm] = useState<number | null>(null);

  useEffect(() => {
    barAnims.forEach((anim, index) => {
      const delay = (index * 90) % 1200;
      const baseDuration = moodState === 'reading' ? 300 : 1100;
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
  }, [barAnims, glowPulse, moodState]);

  // Heart pulse animation when reading
  useEffect(() => {
    if (moodState === 'reading') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartPulse, { toValue: 1.15, duration: 150, useNativeDriver: true }),
          Animated.timing(heartPulse, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(heartPulse, { toValue: 1.1, duration: 100, useNativeDriver: true }),
          Animated.timing(heartPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      heartPulse.setValue(1);
    }
  }, [moodState, heartPulse]);

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.48],
  });

  const ribbonPaths = useMemo(
    () => [
      buildRibbonPath(cardWidth, 280, -0.04, -0.08),
      buildRibbonPath(cardWidth, 280, 0.03, 0.02),
      buildRibbonPath(cardWidth, 280, 0.11, 0.08),
    ],
    [cardWidth]
  );

  const handleButtonPress = async () => {
    if (moodState === 'idle') {
      startPulseReading();
    } else if (moodState === 'playing' || isPlaying) {
      await binauralBeatsPlayer.stop();
      setMoodState('idle');
      setStatusText('Press to get health frequency prescription');
      setBpm(null);
      onTogglePlayback();
    }
  };

  const startPulseReading = () => {
    setMoodState('reading');
    setStatusText('Reading your pulse...');
    setBpm(null);

    // Simulate pulse reading (3 seconds)
    setTimeout(() => {
      const simulatedBpm = Math.floor(Math.random() * 30) + 65; // 65-95 BPM
      setBpm(simulatedBpm);
      analyzeAndPlay(simulatedBpm);
    }, 3000);
  };

  const analyzeAndPlay = async (heartRate: number) => {
    setMoodState('analyzing');
    setStatusText('Analyzing health data...');

    // Brief analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Determine frequency based on heart rate
    let frequency: { method: () => Promise<boolean>, hz: string, desc: string };
    
    if (heartRate > 90) {
      // High heart rate - needs calming
      frequency = { 
        method: () => binauralBeatsPlayer.playTheta(), 
        hz: '4Hz Theta', 
        desc: 'Stress Relief & Calm' 
      };
    } else if (heartRate > 80) {
      // Slightly elevated - gentle relaxation
      frequency = { 
        method: () => binauralBeatsPlayer.playAlpha(), 
        hz: '10Hz Alpha', 
        desc: 'Relaxation & Balance' 
      };
    } else if (heartRate < 60) {
      // Low heart rate - needs energy
      frequency = { 
        method: () => binauralBeatsPlayer.playBeta(), 
        hz: '18Hz Beta', 
        desc: 'Energy & Vitality' 
      };
    } else {
      // Normal range - maintain balance
      frequency = { 
        method: () => binauralBeatsPlayer.playAlpha(), 
        hz: '10Hz Alpha', 
        desc: 'Balance & Wellness' 
      };
    }

    setMoodState('playing');
    const success = await frequency.method();
    
    if (success) {
      setStatusText(`${frequency.hz} • ${frequency.desc}`);
    } else {
      setStatusText('Could not play • Tap to retry');
      setMoodState('idle');
    }
  };

  const getButtonIcon = () => {
    if (moodState === 'playing' || isPlaying) return 'pause';
    if (moodState === 'analyzing') return 'hourglass';
    return 'finger-print';
  };

  const getButtonColors = (): [string, string] => {
    if (moodState === 'reading') return [COLORS.pastelPink, COLORS.flowerPink];
    if (moodState === 'analyzing') return ['#ff9f1c', '#ffca3a'];
    if (moodState === 'playing') return [COLORS.emerald, COLORS.teal];
    return [COLORS.cyan, COLORS.electricBlue];
  };

  return (
    <View style={styles.card} testID="alpha-wave-section-card">
      {/* Floating Always Listening bar at top */}
      <View style={styles.floatingBar}>
        <View style={styles.floatingDot} />
        <Text style={styles.floatingText}>Always Listening</Text>
      </View>

      <Animated.View style={[styles.glowLayer, { opacity: glowOpacity }]}>
        <LinearGradient 
          colors={
            moodState === 'reading' 
              ? ['#ffb6c100', '#ffb6c128', '#ffc0cb22', '#ffb6c100']
              : ['#0b1d4b00', '#00ccff28', '#2ecc7122', '#0b1d4b00']
          } 
          style={StyleSheet.absoluteFillObject} 
        />
      </Animated.View>

      <View style={styles.ribbonLayer}>
        <Svg height={280} viewBox={`0 0 ${cardWidth} 280`} width={cardWidth}>
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
          const activeBoost = moodState === 'reading' ? 54 : (isPlaying || moodState === 'playing') ? 44 : 24;
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
            {moodState === 'reading' ? 'Reading Pulse...' : 
             moodState === 'analyzing' ? 'Analyzing...' :
             moodState === 'playing' ? 'Playing for you' : 'Health Frequency'}
          </Text>
          <Text style={styles.subLabel} numberOfLines={2}>{statusText}</Text>
          
          {/* Pulse result in pastel pink */}
          {bpm && (
            <View style={styles.bpmBadge}>
              <Ionicons name="heart" size={12} color={COLORS.pastelPink} />
              <Text style={styles.bpmText}>{bpm} BPM</Text>
            </View>
          )}
        </View>
        
        <Animated.View style={{ transform: [{ scale: heartPulse }] }}>
          <TouchableOpacity 
            activeOpacity={0.85} 
            onPress={handleButtonPress} 
            testID="alpha-wave-play-toggle-button"
            disabled={moodState === 'analyzing' || moodState === 'reading'}
          >
            <LinearGradient colors={getButtonColors()} style={styles.playButton}>
              {(moodState === 'analyzing' || moodState === 'reading') ? (
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
    height: 320,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#103a9d55',
  },
  floatingBar: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
  },
  floatingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
  },
  floatingText: {
    fontSize: 11,
    color: COLORS.emerald,
    fontWeight: '600',
  },
  glowLayer: { ...StyleSheet.absoluteFillObject },
  ribbonLayer: { ...StyleSheet.absoluteFillObject, top: 14, pointerEvents: 'none' },
  barsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    height: 150,
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
  label: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, maxWidth: 200, lineHeight: 17 },
  bpmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#ffb6c120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bpmText: {
    color: COLORS.pastelPink,
    fontSize: 12,
    fontWeight: '700',
  },
  playButton: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center' },
});
