import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import type { WaveType } from '../utils/waveforms';

interface ThreeDWaveVisualizerProps {
  height: number;
  isLandscape: boolean;
  isPlaying: boolean;
  testID?: string;
  waveType: WaveType;
  width: number;
}

function getWaveValue(waveType: WaveType, angle: number) {
  const sineValue = Math.sin(angle);
  if (waveType === 'square') return sineValue >= 0 ? 1 : -1;
  if (waveType === 'triangle') return (2 / Math.PI) * Math.asin(sineValue);
  if (waveType === 'sawtooth') return 2 * ((angle / (2 * Math.PI)) - Math.floor(angle / (2 * Math.PI) + 0.5));
  return sineValue;
}

function createWavePath(width: number, height: number, amplitude: number, baseline: number, phase: number, waveType: WaveType, stretch: number) {
  const steps = 40;
  let path = `M 0 ${baseline}`;

  for (let step = 0; step <= steps; step += 1) {
    const x = (width / steps) * step;
    const angle = phase + (step / steps) * Math.PI * stretch;
    const y = baseline - getWaveValue(waveType, angle) * amplitude;
    path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }

  path += ` L ${width} ${height} L 0 ${height} Z`;
  return path;
}

export function ThreeDWaveVisualizer({ height, isLandscape, isPlaying, testID, waveType, width }: ThreeDWaveVisualizerProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      setPhase((prev) => (prev + (isPlaying ? 0.12 : 0.03)) % (Math.PI * 2));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const colors = isLandscape
    ? ['#ff5f6d', '#ffc371', '#2ecc71', '#00ccff', '#9b5de5']
    : ['#0044cc', '#00ccff', '#2ecc71'];

  const particles = useMemo(
    () => Array.from({ length: isLandscape ? 16 : 10 }, (_, index) => ({
      cx: 20 + ((index * 43) % Math.max(width - 20, 1)),
      cy: 18 + ((index * 31) % Math.max(height - 18, 1)),
      r: index % 3 === 0 ? 3 : 2,
      opacity: index % 2 === 0 ? 0.28 : 0.18,
    })),
    [height, isLandscape, width]
  );

  const waveLayers = [
    { amplitude: height * 0.12, baseline: height * 0.55, opacity: 0.18, stretch: 2.4, fill: 'url(#waveFillBack)' },
    { amplitude: height * 0.16, baseline: height * 0.48, opacity: 0.3, stretch: 2.8, fill: 'url(#waveFillMid)' },
    { amplitude: height * 0.21, baseline: height * 0.4, opacity: 0.95, stretch: 3.4, fill: 'url(#waveFillFront)' },
  ];

  return (
    <View style={styles.container} testID={testID}>
      <View style={[styles.halo, isLandscape && styles.haloLandscape]} />
      <View style={[styles.canvasShell, isLandscape && styles.canvasShellLandscape]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <SvgGradient id="waveFillBack" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors[0]} stopOpacity="0.08" />
              <Stop offset="100%" stopColor={colors[1]} stopOpacity="0.45" />
            </SvgGradient>
            <SvgGradient id="waveFillMid" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors[1]} stopOpacity="0.18" />
              <Stop offset="100%" stopColor={colors[Math.min(colors.length - 1, 2)]} stopOpacity="0.65" />
            </SvgGradient>
            <SvgGradient id="waveFillFront" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors[0]} stopOpacity="0.5" />
              <Stop offset="50%" stopColor={colors[1]} stopOpacity="0.86" />
              <Stop offset="100%" stopColor={colors[colors.length - 1]} stopOpacity="0.94" />
            </SvgGradient>
          </Defs>

          {particles.map((particle, index) => (
            <Circle
              key={`particle-${index}`}
              cx={particle.cx}
              cy={particle.cy}
              fill={colors[index % colors.length]}
              opacity={particle.opacity}
              r={particle.r}
            />
          ))}

          {Array.from({ length: isLandscape ? 6 : 4 }, (_, index) => (
            <Ellipse
              key={`ring-${index}`}
              cx={width / 2}
              cy={height * (0.72 - index * 0.08)}
              rx={width * (0.18 + index * 0.11)}
              ry={height * (0.06 + index * 0.02)}
              stroke={colors[index % colors.length]}
              strokeOpacity={isLandscape ? 0.32 : 0.18}
              strokeWidth={index === 0 ? 2 : 1}
            />
          ))}

          {waveLayers.map((layer, index) => (
            <Path
              key={`wave-${index}`}
              d={createWavePath(width, height, layer.amplitude, layer.baseline, phase + index * 0.45, waveType, layer.stretch)}
              fill={layer.fill}
              opacity={isPlaying ? layer.opacity : layer.opacity * 0.55}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: '82%',
    height: '70%',
    borderRadius: 999,
    backgroundColor: '#00ccff18',
    transform: [{ scaleX: 1.06 }, { scaleY: 1.18 }],
  },
  haloLandscape: { backgroundColor: '#9b5de51c', width: '92%', height: '84%' },
  canvasShell: {
    overflow: 'hidden',
    borderRadius: 24,
    transform: [{ perspective: 900 }, { rotateX: '62deg' }, { scaleY: 1.02 }],
  },
  canvasShellLandscape: { transform: [{ perspective: 1100 }, { rotateX: '50deg' }, { scaleY: 1.08 }] },
});