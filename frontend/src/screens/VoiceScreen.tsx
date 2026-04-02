import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import axios from 'axios';
import * as Speech from 'expo-speech';
import { binauralBeatsPlayer } from '../utils/BinauralBeats';
import { APP_NAME } from '../constants/brand';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  deepBlue: '#0044cc',
  electricBlue: '#0088ff',
  cyan: '#00ccff',
  teal: '#00d4aa',
  emerald: '#2ecc71',
  text: '#ffffff',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
  border: '#21262d',
  danger: '#ff4757',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const VOICE_BARS = 24;

const getAudioMimeType = (audioUri: string) => {
  const normalized = audioUri.toLowerCase();
  if (normalized.endsWith('.caf')) return 'audio/x-caf';
  if (normalized.endsWith('.wav')) return 'audio/wav';
  if (normalized.endsWith('.mp4') || normalized.endsWith('.m4a')) return 'audio/mp4';
  return 'application/octet-stream';
};

export default function VoiceScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [aiActionData, setAiActionData] = useState<any>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(true);
  const [voiceStatusNotice, setVoiceStatusNotice] = useState('');
  const [voiceDebugText, setVoiceDebugText] = useState('');
  const [preferredVoiceId, setPreferredVoiceId] = useState<string | undefined>(undefined);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const isRecording = recorderState.isRecording;
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const ambientAnims = useRef(
    [...Array(VOICE_BARS)].map(() => new Animated.Value(0))
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim1 = useRef(new Animated.Value(0)).current;
  const ringAnim2 = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPermission();
    loadVoices();

    // Always-alive ambient wave
    ambientAnims.forEach((anim, index) => {
      const delay = (index * 100) % 800;
      const duration = 1000 + (index % 4) * 300;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    });

    // Breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.timing(ringAnim1, { toValue: 1, duration: 1500, useNativeDriver: true })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(ringAnim2, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      ringAnim1.setValue(0);
      ringAnim2.setValue(0);
    }
  }, [isRecording]);

  const checkPermission = async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    setPermissionGranted(status.granted);
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });
  };

  const loadVoices = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const englishVoices = voices.filter((voice) => voice.language?.toLowerCase().startsWith('en'));
      const enhancedVoices = englishVoices.filter((voice) => String(voice.quality).toLowerCase() === 'enhanced');
      const voicePool = enhancedVoices.length ? enhancedVoices : englishVoices;
      const femalePatterns = ['samantha', 'ava', 'victoria', 'karen', 'zira', 'susan', 'serena', 'female', 'woman'];
      const fallbackPatterns = ['daniel', 'alex', 'thomas', 'fred', 'bruce', 'aaron'];
      const preferredVoice = voicePool.find((voice) =>
        femalePatterns.some((pattern) => voice.name.toLowerCase().includes(pattern) || voice.identifier.toLowerCase().includes(pattern))
      ) || voicePool.find((voice) =>
        fallbackPatterns.some((pattern) => voice.name.toLowerCase().includes(pattern) || voice.identifier.toLowerCase().includes(pattern))
      ) || voicePool[0];

      if (preferredVoice?.identifier) {
        setPreferredVoiceId(preferredVoice.identifier);
      }
    } catch (error) {
      console.warn('[Voice] Could not load voices:', error);
    }
  };

  const buildFallbackReply = (action: string | null, actionData: any) => {
    if (action === 'create_task' && actionData?.title) {
      return `Done — I created ${actionData.title}.`;
    }
    if (action === 'play_frequency' && actionData?.frequency_id) {
      return 'I found a frequency for you and it is ready to play.';
    }
    return 'I heard you and I am here.';
  };

  const resolveRecordedUri = async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const nextUri = recorderState.url || recorder.uri;
      if (nextUri) {
        return nextUri;
      }
      await new Promise((resolve) => setTimeout(resolve, 180));
    }

    return recorderState.url || recorder.uri || '';
  };

  const speakReply = (text: string) => {
    if (!voiceRepliesEnabled || !text?.trim()) return;
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    speechTimeoutRef.current = setTimeout(async () => {
      try {
        await binauralBeatsPlayer.stop();
        await Speech.stop();
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'duckOthers',
        });
        Speech.speak(text, {
          language: 'en-US',
          pitch: 1.04,
          rate: 0.92,
          voice: preferredVoiceId,
          useApplicationAudioSession: false,
          onStart: () => setVoiceStatusNotice('Flow is speaking'),
          onDone: () => setVoiceStatusNotice('Flow answered'),
          onError: () => setVoiceStatusNotice('Flow answered'),
        });
      } catch (error) {
        console.warn('[Voice] Speak error:', error);
      }
    }, 420);
  };

  const startRecording = async () => {
    try {
      await binauralBeatsPlayer.stop();
      Speech.stop();
      if (!permissionGranted) {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert('Permission Required', 'Please grant microphone permission to use voice commands.');
          return;
        }
        setPermissionGranted(true);
      }

      setTranscription('');
      setAiResponse('');
      setAiAction(null);
      setAiActionData(null);
      setVoiceStatusNotice('');
      setVoiceDebugText('Mic ready');

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      console.log('[Voice] Recording started');
      setVoiceDebugText('Recording started');
    } catch (error) {
      console.error('[Voice] Start recording error:', error);
      setVoiceDebugText('Recording failed to start');
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      setVoiceStatusNotice('Finishing your recording...');
      setVoiceDebugText('Recorder stopped');
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      const recordedUri = await resolveRecordedUri();
      console.log('[Voice] Recording stopped, URI:', recordedUri);
      setVoiceDebugText(recordedUri ? `Recorded file ready` : 'Recorded file missing');

      if (recordedUri) {
        setIsProcessing(true);
        await uploadAndProcess(recordedUri);
      } else {
        Alert.alert('Error', 'No audio recorded. Please try again.');
      }
    } catch (error) {
      console.error('[Voice] Stop recording error:', error);
      setIsProcessing(false);
    }
  };

  const uploadAndProcess = async (audioUri: string) => {
    try {
      const fileUri = audioUri.startsWith('blob:')
        ? audioUri
        : audioUri.startsWith('file://')
          ? audioUri
          : `file://${audioUri}`;
      console.log('[Voice] Uploading:', fileUri);
      const filename = fileUri.split('/').pop() || 'recording.m4a';
      const mimeType = getAudioMimeType(fileUri);
      setVoiceDebugText(`Uploading ${filename}`);

      const buildFormData = (fieldName: 'audio' | 'file') => {
        const formData = new FormData();
        formData.append(fieldName, {
          uri: fileUri,
          type: mimeType,
          name: filename,
        } as any);
        return formData;
      };

      const requestConfig = {
        headers: {
          Accept: 'application/json',
        },
        timeout: 45000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      };

      let response;

      if (Platform.OS !== 'web') {
        const postNativeVoice = async (endpoint: string, fieldName: 'audio' | 'file') => {
          const nativeResponse = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
            },
            body: buildFormData(fieldName),
          });

          const rawText = await nativeResponse.text();
          let data: any = {};
          try {
            data = rawText ? JSON.parse(rawText) : {};
          } catch {
            data = { detail: rawText };
          }

          return {
            ok: nativeResponse.ok,
            status: nativeResponse.status,
            data,
          };
        };

        setVoiceStatusNotice('Uploading your voice...');
        const primary = await postNativeVoice('/api/voice/transcribe', 'audio');
        setVoiceDebugText(`Primary upload ${primary.status}`);

        if (primary.ok) {
          response = { data: primary.data };
        } else {
          setVoiceStatusNotice('Trying backup voice route...');
          setVoiceDebugText(`Fallback after ${primary.status}`);
          const fallback = await postNativeVoice('/api/voice/process', 'file');
          setVoiceDebugText(`Backup upload ${fallback.status}`);
          if (!fallback.ok) {
            throw { response: { status: fallback.status, data: fallback.data } };
          }
          response = { data: fallback.data };
        }
      } else {
        const buildWebFormData = async (fieldName: 'audio' | 'file') => {
          const localResponse = await fetch(fileUri);
          const blob = await localResponse.blob();
          const formData = new FormData();
          formData.append(fieldName, blob, filename);
          return formData;
        };

        try {
          response = await axios.post(
            `${BACKEND_URL}/api/voice/transcribe`,
            await buildWebFormData('audio'),
            requestConfig
          );
        } catch (error: any) {
          const statusCode = error?.response?.status;
          if (statusCode === 422 || statusCode === 500) {
            setVoiceStatusNotice('Retrying your voice...');
            response = await axios.post(
              `${BACKEND_URL}/api/voice/process`,
              await buildWebFormData('file'),
              requestConfig
            );
          } else {
            throw error;
          }
        }
      }

      console.log('[Voice] Response:', JSON.stringify(response.data));
      setVoiceDebugText('AI response received');

      const { text, ai_response, action, action_data, mood } = response.data;
      const spokenReply = action === 'create_task' && action_data?.title
        ? `Done — I created ${action_data.title}.`
        : ai_response || buildFallbackReply(action || null, action_data);
      setTranscription(text || '');
      setAiResponse(spokenReply);
      setAiAction(action || null);
      setAiActionData(action_data || null);
      setVoiceStatusNotice(
        action === 'create_task' && action_data?.title
          ? `Created: ${action_data.title}`
          : action === 'play_frequency'
            ? 'Frequency recommendation ready'
            : 'Flow answered'
      );
      speakReply(spokenReply);

      if (action === 'play_frequency' && action_data?.frequency_id) {
        setVoiceStatusNotice('Flow found a frequency and the play button is ready below');
      }
    } catch (error: any) {
      console.error('[Voice] Upload error:', error?.response?.data || error.message);
      setVoiceDebugText(`Voice error: ${error?.response?.status || 'unknown'}`);
      Alert.alert(
        'Oops!',
        error?.response?.data?.detail || "I didn't catch that. Please try again — speak clearly and close to the mic."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Also support text chat (for when voice doesn't work)
  const sendTextMessage = async (message: string) => {
    setIsProcessing(true);
    setVoiceStatusNotice('');
    try {
      const response = await axios.post(`${BACKEND_URL}/api/chat`, { message });
      const { reply, action, action_data, mood } = response.data;
      const spokenReply = action === 'create_task' && action_data?.title
        ? `Done — I created ${action_data.title}.`
        : reply || buildFallbackReply(action || null, action_data);
      setTranscription(message);
      setAiResponse(spokenReply);
      setAiAction(action || null);
      setAiActionData(action_data || null);
      setVoiceStatusNotice(
        action === 'create_task' && action_data?.title
          ? `Created: ${action_data.title}`
          : 'Flow answered'
      );
      speakReply(spokenReply);
    } catch (error: any) {
      console.error('[Voice] Chat error:', error);
      Alert.alert('Error', `Could not reach ${APP_NAME}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoicePress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  function getBarColor(index: number): string {
    const ratio = index / VOICE_BARS;
    if (ratio < 0.3) return COLORS.electricBlue;
    if (ratio < 0.5) return COLORS.cyan;
    if (ratio < 0.7) return COLORS.teal;
    return COLORS.emerald;
  }

  const ring1Scale = ringAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ring1Opacity = ringAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const ring2Scale = ringAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const ring2Opacity = ringAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} testID="voice-screen">
      {/* Ambient wave bars */}
      <View style={styles.ambientWaveContainer}>
        {ambientAnims.map((anim, index) => {
          const barColor = getBarColor(index);
          const baseHeight = 12 + Math.sin(index * 0.5) * 8;
          const boost = isRecording ? 3.5 : 1.8;
          const animatedScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, boost] });
          const animatedOpacity = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: isRecording ? [0.5, 1, 0.5] : [0.2, 0.6, 0.2],
          });
          const breatheScale = breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });
          return (
            <Animated.View key={index} style={[styles.ambientBar, {
              height: baseHeight, backgroundColor: barColor, opacity: animatedOpacity,
              transform: [{ scaleY: animatedScale }, { scaleY: breatheScale }],
            }]} />
          );
        })}
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.voiceToggle}
          onPress={() => setVoiceRepliesEnabled((prev) => !prev)}
          testID="voice-replies-toggle-button"
        >
          <Ionicons name={voiceRepliesEnabled ? 'volume-high' : 'volume-mute'} size={16} color={COLORS.cyan} />
          <Text style={styles.voiceToggleText}>{voiceRepliesEnabled ? 'Voice replies on' : 'Voice replies off'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>
          {isRecording ? 'Listening... Tap to stop' : isProcessing ? 'Processing...' : 'Tap the mic and tell me anything'}
        </Text>

        {voiceStatusNotice ? (
          <View style={styles.noticeBadge} testID="voice-status-notice">
            <Ionicons name="sparkles" size={14} color={COLORS.cyan} />
            <Text style={styles.noticeText}>{voiceStatusNotice}</Text>
          </View>
        ) : null}

        {/* Voice Button */}
        <View style={styles.voiceButtonContainer}>
          {isRecording && (
            <>
              <Animated.View style={[styles.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} />
              <Animated.View style={[styles.ring, styles.ringOuter, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} />
            </>
          )}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity onPress={handleVoicePress} disabled={isProcessing} activeOpacity={0.8} testID="voice-record-button">
              <LinearGradient
                colors={isRecording ? [COLORS.danger, '#cc2233'] : isProcessing ? [COLORS.deepBlue, COLORS.deepBlue] : [COLORS.cyan, COLORS.electricBlue]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.voiceButton}
              >
                {isProcessing ? (
                  <ActivityIndicator size="large" color={COLORS.text} />
                ) : (
                  <Ionicons name={isRecording ? 'stop' : 'mic'} size={56} color={COLORS.text} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {isRecording && (
          <View style={styles.recordingIndicator} testID="voice-recording-indicator">
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
        )}

        {/* Result */}
        {transcription ? (
          <View style={styles.resultCard} testID="voice-result-card">
            <Text style={styles.resultLabel}>You said:</Text>
            <Text style={styles.resultText} testID="voice-transcription-text">"{transcription}"</Text>
            {aiResponse ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.resultLabel}>{APP_NAME}:</Text>
                <Text style={styles.aiText} testID="voice-ai-response-text">{aiResponse}</Text>
              </>
            ) : null}
            {aiAction === 'create_task' && aiActionData?.task_created && (
              <View style={styles.actionBadge} testID="voice-task-created-badge">
                <Ionicons name="checkmark-circle" size={16} color={COLORS.emerald} />
                <Text style={styles.actionBadgeText}>Task created</Text>
              </View>
            )}
            {aiAction === 'play_frequency' && aiActionData?.frequency_id && (
              <TouchableOpacity
                style={styles.playFreqBtn}
                onPress={() => {
                  binauralBeatsPlayer.playFromCatalog(aiActionData.frequency_id);
                }}
                testID="voice-play-recommended-frequency-button"
              >
                <Ionicons name="play" size={16} color={COLORS.text} />
                <Text style={styles.playFreqText}>Play recommended frequency</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : !isRecording && !isProcessing ? (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Try saying:</Text>
            {[
              { text: 'Remind me to call Mom at 5pm', icon: 'alarm' },
              { text: 'I can\'t sleep tonight', icon: 'moon' },
              { text: 'I\'m feeling stressed', icon: 'heart' },
              { text: 'Play something for focus', icon: 'flash' },
              { text: 'Create a note about project ideas', icon: 'document-text' },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionItem}
                onPress={() => sendTextMessage(item.text)}
                testID={`voice-suggestion-${i}`}
              >
                <Ionicons name={item.icon as any} size={16} color={COLORS.cyan} />
                <Text style={styles.suggestionText}>{item.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1 },
  ambientWaveContainer: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    height: 60, paddingHorizontal: 12, gap: 2,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.cyan + '20',
  },
  ambientBar: {
    width: (SCREEN_WIDTH - 24 - (VOICE_BARS * 2)) / VOICE_BARS, minWidth: 3, borderRadius: 2,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20, alignItems: 'center' },
  voiceToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cyan + '30',
    marginBottom: 18,
  },
  voiceToggleText: { fontSize: 12, color: COLORS.cyan, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: 'bold', color: COLORS.cyan, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  noticeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.cyan + '30', backgroundColor: COLORS.surface,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
  },
  noticeText: { fontSize: 12, color: COLORS.cyan, fontWeight: '600' },
  voiceButtonContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 20, width: 180, height: 180 },
  ring: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: COLORS.cyan },
  ringOuter: { width: 160, height: 160, borderRadius: 80, borderColor: COLORS.electricBlue },
  voiceButton: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger },
  recordingText: { fontSize: 15, color: COLORS.danger, fontWeight: '600' },
  resultCard: {
    backgroundColor: COLORS.surface, padding: 18, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.cyan + '30', width: '100%', marginTop: 8,
  },
  resultLabel: { fontSize: 11, color: COLORS.cyan, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  resultText: { fontSize: 15, color: COLORS.text, lineHeight: 22, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  aiText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  actionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, backgroundColor: COLORS.emerald + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  actionBadgeText: { fontSize: 13, color: COLORS.emerald, fontWeight: '600' },
  playFreqBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 10, backgroundColor: COLORS.cyan + '20', paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.cyan + '40',
  },
  playFreqText: { fontSize: 13, color: COLORS.cyan, fontWeight: '600' },
  suggestions: { width: '100%', marginTop: 8 },
  suggestionsTitle: { fontSize: 13, color: COLORS.cyan, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 2,
    borderLeftColor: COLORS.cyan, gap: 10,
  },
  suggestionText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
});
