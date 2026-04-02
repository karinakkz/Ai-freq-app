import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  deepBlue: '#0044cc',
  electricBlue: '#00aaff',
  cyan: '#00ccff',
  teal: '#00d4aa',
  emerald: '#2ecc71',
  text: '#ffffff',
  textSecondary: '#8b949e',
};

const NUM_BARS = 32;

function getBarColor(index: number, total: number) {
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

  useEffect(() => {
    barAnims.forEach((anim, index) => {
      const delay = (index * 90) % 1200;
      const duration = 1100 + (index % 5) * 180;
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
  }, [barAnims, buttonPulse, glowPulse]);

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

  return (
    <View style={styles.card} testID="alpha-wave-section-card">
      <Animated.View style={[styles.glowLayer, { opacity: glowOpacity }]}>
        <LinearGradient colors={['#0b1d4b00', '#00ccff28', '#2ecc7122', '#0b1d4b00']} style={StyleSheet.absoluteFillObject} />
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
          const activeBoost = isPlaying ? 44 : 24;
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
                  backgroundColor: getBarColor(index, NUM_BARS),
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
        <View>
          <Text style={styles.label}>Always listening</Text>
          <Text style={styles.subLabel}>Original live bars with neon ribbon energy underneath</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
          <TouchableOpacity activeOpacity={0.85} onPress={onTogglePlayback} testID="alpha-wave-play-toggle-button">
            <LinearGradient colors={[COLORS.emerald, COLORS.teal]} style={styles.playButton}>
              <Ionicons color={COLORS.background} name={isPlaying ? 'pause' : 'play'} size={34} />
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
  label: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, maxWidth: 210, lineHeight: 17 },
  playButton: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center' },
});