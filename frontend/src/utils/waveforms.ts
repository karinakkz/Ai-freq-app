export const WAVE_TYPES = ['sine', 'triangle', 'square', 'sawtooth'] as const;

export type WaveType = (typeof WAVE_TYPES)[number];

export const WAVE_TYPE_LABELS: Record<WaveType, string> = {
  sine: 'Sine',
  triangle: 'Triangle',
  square: 'Square',
  sawtooth: 'Sawtooth',
};

export const WAVE_TYPE_SHORT_LABELS: Record<WaveType, string> = {
  sine: 'Sin',
  triangle: 'Tri',
  square: 'Sqr',
  sawtooth: 'Saw',
};

export function getWaveTypeLabel(waveType: WaveType): string {
  return WAVE_TYPE_LABELS[waveType] || WAVE_TYPE_LABELS.sine;
}