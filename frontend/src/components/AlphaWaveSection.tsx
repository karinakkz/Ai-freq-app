import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ThreeDWaveVisualizer } from './ThreeDWaveVisualizer';
import { WaveTypePicker } from './WaveTypePicker';
import { getWaveTypeLabel, type WaveType } from '../utils/waveforms';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  deepBlue: '#0044cc',
  cyan: '#00ccff',
  teal: '#00d4aa',
  emerald: '#2ecc71',
  text: '#ffffff',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
};

interface AlphaWaveSectionProps {
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onWaveTypeChange: (waveType: WaveType) => void;
  waveType: WaveType;
}

export function AlphaWaveSection({ isPlaying, onTogglePlayback, onWaveTypeChange, waveType }: AlphaWaveSectionProps) {
  const [showImmersive, setShowImmersive] = useState(false);
  const window = useWindowDimensions();
  const isLandscape = window.width > window.height;
  const waveTypeLabel = useMemo(() => getWaveTypeLabel(waveType), [waveType]);

  useEffect(() => {
    const applyOrientation = async () => {
      try {
        if (showImmersive) {
          await ScreenOrientation.unlockAsync();
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
      } catch (error) {
        console.warn('[Orientation] Unable to change lock:', error);
      }
    };

    applyOrientation();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => null);
    };
  }, [showImmersive]);

  return (
    <>
      <LinearGradient colors={[COLORS.surface, COLORS.deepBlue + '26', COLORS.surface]} style={styles.card}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.eyebrow}>Alpha waves control room</Text>
            <Text style={styles.title}>Choose your sound shape</Text>
            <Text style={styles.subtitle}>Sine, triangle, square, or sawtooth — then open the 3D player.</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowImmersive(true)}
            style={styles.expandButton}
            testID="alpha-wave-open-immersive-button"
          >
            <Ionicons name="expand" size={18} color={COLORS.cyan} />
            <Text style={styles.expandText}>3D</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.visualizerWrap} testID="alpha-wave-section-card">
          <ThreeDWaveVisualizer
            height={220}
            isLandscape={false}
            isPlaying={isPlaying}
            testID="alpha-wave-visualizer"
            waveType={waveType}
            width={Math.max(window.width - 56, 240)}
          />
        </View>

        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusTitle}>Current wave</Text>
            <Text style={styles.statusValue}>{waveTypeLabel} • 10 Hz Alpha</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onTogglePlayback}
            style={styles.playButton}
            testID="alpha-wave-play-toggle-button"
          >
            <LinearGradient colors={isPlaying ? [COLORS.cyan, '#3b82f6'] : [COLORS.emerald, COLORS.teal]} style={styles.playButtonGradient}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={COLORS.background} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.selectorLabel}>Wave type</Text>
        <WaveTypePicker onChange={onWaveTypeChange} testIDPrefix="alpha-wave-type-picker" value={waveType} />
      </LinearGradient>

      <Modal animationType="fade" onRequestClose={() => setShowImmersive(false)} transparent visible={showImmersive}>
        <View style={[styles.modalBackdrop, isLandscape && styles.modalBackdropLandscape]} testID="alpha-wave-immersive-modal">
          <LinearGradient
            colors={isLandscape ? ['#1b0620', '#2b0f63', '#0044cc', '#00ccff', '#2ecc71'] : [COLORS.background, '#061226', '#05243d']}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.modalHeader, isLandscape && styles.modalHeaderLandscape]}>
            <View>
              <Text style={styles.modalEyebrow}>{isLandscape ? 'Rainbow landscape mode' : 'Immersive player'}</Text>
              <Text style={styles.modalTitle}>Alpha Waves • {waveTypeLabel}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowImmersive(false)}
              style={styles.closeButton}
              testID="alpha-wave-close-immersive-button"
            >
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalBody, isLandscape && styles.modalBodyLandscape]}>
            <ThreeDWaveVisualizer
              height={isLandscape ? Math.max(window.height - 120, 240) : Math.min(window.width + 40, 420)}
              isLandscape={isLandscape}
              isPlaying={isPlaying}
              testID="alpha-wave-immersive-visualizer"
              waveType={waveType}
              width={isLandscape ? Math.max(window.width - 96, 320) : Math.max(window.width - 32, 280)}
            />

            <View style={[styles.controlPanel, isLandscape && styles.controlPanelLandscape]}>
              <View style={styles.controlPanelTop}>
                <View>
                  <Text style={styles.controlPanelLabel}>3D shape selector</Text>
                  <Text style={styles.controlPanelValue}>{isLandscape ? 'Rainbow accents active' : 'Flip sideways for rainbow mode'}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onTogglePlayback}
                  style={styles.modalPlayButton}
                  testID="alpha-wave-immersive-play-toggle-button"
                >
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={COLORS.background} />
                </TouchableOpacity>
              </View>

              <WaveTypePicker compact={isLandscape} onChange={onWaveTypeChange} testIDPrefix="alpha-wave-immersive-type-picker" value={waveType} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.deepBlue + '40',
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  eyebrow: { fontSize: 11, color: COLORS.cyan, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 6 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: 6, maxWidth: 240 },
  expandButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.cyan + '40',
    backgroundColor: '#ffffff10',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandText: { color: COLORS.cyan, fontSize: 13, fontWeight: '700' },
  visualizerWrap: { marginTop: 20, alignItems: 'center', justifyContent: 'center', minHeight: 230 },
  statusRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  statusTitle: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  statusValue: { fontSize: 16, color: COLORS.text, fontWeight: '700', marginTop: 4 },
  playButton: { alignSelf: 'center' },
  playButtonGradient: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  selectorLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 18, marginBottom: 10, fontWeight: '700' },
  modalBackdrop: { flex: 1, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 20, backgroundColor: '#02040aee' },
  modalBackdropLandscape: { paddingTop: 24, paddingHorizontal: 24, paddingBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderLandscape: { marginBottom: 10 },
  modalEyebrow: { fontSize: 12, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1 },
  modalTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 6 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff18',
  },
  modalBody: { flex: 1, justifyContent: 'space-between', paddingTop: 18 },
  modalBodyLandscape: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  controlPanel: {
    marginTop: 18,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ffffff18',
    backgroundColor: '#020917aa',
  },
  controlPanelLandscape: { width: 320, marginTop: 0 },
  controlPanelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
  controlPanelLabel: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  controlPanelValue: { fontSize: 15, color: COLORS.text, fontWeight: '700', marginTop: 4 },
  modalPlayButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.cyan, alignItems: 'center', justifyContent: 'center' },
});