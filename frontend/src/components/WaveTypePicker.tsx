import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WAVE_TYPES, WAVE_TYPE_SHORT_LABELS, type WaveType } from '../utils/waveforms';

const COLORS = {
  surface: '#0d1117',
  cyan: '#00ccff',
  emerald: '#2ecc71',
  text: '#ffffff',
  textSecondary: '#8b949e',
  border: '#21262d',
};

interface WaveTypePickerProps {
  compact?: boolean;
  onChange: (waveType: WaveType) => void;
  testIDPrefix: string;
  value: WaveType;
}

export function WaveTypePicker({ compact = false, onChange, testIDPrefix, value }: WaveTypePickerProps) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]} testID={`${testIDPrefix}-group`}>
      {WAVE_TYPES.map((waveType) => {
        const active = value === waveType;
        return (
          <TouchableOpacity
            key={waveType}
            activeOpacity={0.85}
            onPress={() => onChange(waveType)}
            style={[styles.chip, compact && styles.chipCompact, active && styles.chipActive]}
            testID={`${testIDPrefix}-${waveType}`}
          >
            <Text style={[styles.chipText, compact && styles.chipTextCompact, active && styles.chipTextActive]}>
              {compact ? WAVE_TYPE_SHORT_LABELS[waveType] : waveType}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowCompact: { gap: 6 },
  chip: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCompact: { minHeight: 44, minWidth: 60, paddingHorizontal: 12, paddingVertical: 10 },
  chipActive: { borderColor: COLORS.cyan, backgroundColor: COLORS.emerald + '18' },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700', textTransform: 'capitalize' },
  chipTextCompact: { fontSize: 11 },
  chipTextActive: { color: COLORS.text },
});