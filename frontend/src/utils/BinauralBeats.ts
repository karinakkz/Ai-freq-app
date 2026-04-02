import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import type { EventSubscription } from 'expo-modules-core';
import { type WaveType } from './waveforms';

/**
 * Binaural Beats Player - uses expo-audio createAudioPlayer
 * Streams server-generated WAV files for real binaural beat tones
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export class BinauralBeatsPlayer {
  private player: AudioPlayer | null = null;
  private playbackSubscription: EventSubscription | null = null;
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private _isPlaying: boolean = false;
  private _currentFreqId: string = '';
  private _currentTitle: string = '';
  private _currentWaveType: WaveType = 'sine';
  private _sessionMinutes: number = 10;
  private initialized: boolean = false;
  private hasStartedPlayback: boolean = false;

  async initialize() {
    if (this.initialized) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      });
      this.initialized = true;
    } catch (error) {
      console.warn('[Audio] Init warning:', error);
    }
  }

  private createPlayer(url: string, title: string, sessionMinutes: number) {
    this.playbackSubscription?.remove();
    this.player = createAudioPlayer(
      { uri: url },
      { downloadFirst: true, updateInterval: 250, keepAudioSessionActive: true }
    );
    this.player.loop = false;
    this.player.volume = 1;
    this.playbackSubscription = this.player.addListener('playbackStatusUpdate', async (status) => {
      if (status.playing && status.currentTime > 0) {
        this.hasStartedPlayback = true;
      }

      if (status.didJustFinish && this.hasStartedPlayback && this.player && this._isPlaying) {
        try {
          await this.player.seekTo(0);
          this.player.play();
        } catch (error) {
          console.warn('[Audio] Manual replay failed:', error);
        }
      }
    });
    this._currentTitle = title;
    this._sessionMinutes = sessionMinutes;
    this.hasStartedPlayback = false;
    this.setSessionTimer(sessionMinutes);
  }

  private async waitForPlayerToLoad(timeoutMs: number = 15000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (!this.player) {
        throw new Error('Audio player unavailable');
      }

      if (this.player.isLoaded) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    throw new Error('Audio load timeout');
  }

  private setSessionTimer(sessionMinutes: number) {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    if (!sessionMinutes || sessionMinutes <= 0) {
      return;
    }

    this.sessionTimer = setTimeout(() => {
      this.stop();
    }, sessionMinutes * 60 * 1000);
  }

  async playBeat(baseHz: number, beatHz: number, freqId: string = 'custom', sessionMinutes: number = 10, waveType: WaveType = 'sine'): Promise<boolean> {
    try {
      await this.initialize();
      await this.stop();

      const url = `${BACKEND_URL}/api/audio/custom?base_hz=${baseHz}&beat_hz=${beatHz}&duration=15&wave_type=${encodeURIComponent(waveType)}`;
      console.log(`[Audio] Playing ${freqId}: ${baseHz}Hz + ${beatHz}Hz (${waveType})`);

      this.createPlayer(url, 'Custom Frequency', sessionMinutes);
      await this.waitForPlayerToLoad();
      if (!this.player) {
        throw new Error('Audio player unavailable after load');
      }
      this.player.play();

      this._isPlaying = true;
      this._currentFreqId = freqId;
      this._currentWaveType = waveType;
      return true;
    } catch (error) {
      console.error('[Audio] Play error:', { error, backendUrl: BACKEND_URL, freqId, sessionMinutes, waveType });
      this._isPlaying = false;
      return false;
    }
  }

  async playFromCatalog(freqId: string, sessionMinutes: number = 10, waveType: WaveType = 'sine'): Promise<boolean> {
    try {
      await this.initialize();
      await this.stop();

      const url = `${BACKEND_URL}/api/audio/generate/${freqId}?duration=15&wave_type=${encodeURIComponent(waveType)}`;
      console.log(`[Audio] Playing catalog: ${freqId} (${waveType})`);

      this.createPlayer(url, freqId.replace(/_/g, ' '), sessionMinutes);
      await this.waitForPlayerToLoad();
      if (!this.player) {
        throw new Error('Catalog player unavailable after load');
      }
      this.player.play();

      this._isPlaying = true;
      this._currentFreqId = freqId;
      this._currentWaveType = waveType;
      return true;
    } catch (error) {
      console.error('[Audio] Catalog play error:', { error, backendUrl: BACKEND_URL, freqId, sessionMinutes, waveType });
      this._isPlaying = false;
      return false;
    }
  }

  async playFrequency(baseHz: number, beatHz: number, freqId: string, sessionMinutes: number = 10, waveType: WaveType = 'sine'): Promise<boolean> {
    if (freqId && freqId !== 'custom') {
      return this.playFromCatalog(freqId, sessionMinutes, waveType);
    }
    return this.playBeat(baseHz, beatHz, freqId, sessionMinutes, waveType);
  }

  async playAlpha(waveType: WaveType = 'sine') { return this.playBeat(200, 10, 'stress_relief', 10, waveType); }
  async playTheta(waveType: WaveType = 'sine') { return this.playBeat(200, 6, 'deep_meditation', 10, waveType); }
  async playDelta(waveType: WaveType = 'sine') { return this.playBeat(200, 2, 'deep_sleep', 10, waveType); }
  async playBeta(waveType: WaveType = 'sine') { return this.playBeat(200, 18, 'laser_focus', 10, waveType); }
  async playGamma(waveType: WaveType = 'sine') { return this.playBeat(200, 40, 'energy_boost', 10, waveType); }

  async stop() {
    try {
      if (this.player) {
        this.player.pause();
        const clearLockScreenControls = (this.player as AudioPlayer & { clearLockScreenControls?: () => void }).clearLockScreenControls;
        if (typeof clearLockScreenControls === 'function') {
          clearLockScreenControls.call(this.player);
        }
        this.player.remove();
        this.player = null;
      }
    } catch (e) { /* ignore */ }
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    this.playbackSubscription?.remove();
    this.playbackSubscription = null;
    this._isPlaying = false;
    this._currentFreqId = '';
    this._currentTitle = '';
    this._currentWaveType = 'sine';
    this._sessionMinutes = 10;
    this.hasStartedPlayback = false;
  }

  async pause() {
    try { if (this.player) { this.player.pause(); this._isPlaying = false; } } catch (e) {}
  }

  async resume() {
    try { if (this.player) { this.player.play(); this._isPlaying = true; } } catch (e) {}
  }

  getIsPlaying(): boolean { return this._isPlaying; }
  getCurrentFreqId(): string { return this._currentFreqId; }
  getCurrentTitle(): string { return this._currentTitle; }
  getCurrentWaveType(): WaveType { return this._currentWaveType; }
  getSessionMinutes(): number { return this._sessionMinutes; }
  async cleanup() { await this.stop(); }
}

export const binauralBeatsPlayer = new BinauralBeatsPlayer();
