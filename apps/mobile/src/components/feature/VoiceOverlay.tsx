import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { font, radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { Mic, X } from '@/components/ui/icons';
import {
  destroyVoice,
  requestMicPermission,
  speak,
  startListening,
  stopListening,
  stopSpeaking,
} from '@/services/voice/nativeVoice';

const GREETING = 'Yes Boss! How can I help?';

type Phase = 'greeting' | 'listening' | 'thinking' | 'speaking' | 'denied' | 'error';

const PHASE_HINT: Record<Phase, string> = {
  greeting: 'Starting…',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  denied: 'Microphone permission needed',
  error: 'Something went wrong',
};

/**
 * Full-screen voice assistant overlay (Phase 0 — on-device echo).
 *
 * Flow: greet (TTS) → listen (STT) → echo the transcript back (TTS) → idle,
 * with a tap-to-talk button to go again. Phase 1 swaps the echo for a backend
 * intent call. The pulsing rings use the built-in Animated API (no native dep).
 */
export function VoiceOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [phase, setPhase] = useState<Phase>('greeting');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');

  // Latest phase in a ref so async callbacks don't capture a stale value.
  const phaseRef = useRef<Phase>('greeting');
  const setPhaseSafe = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Pulsing-ring animation, driven while listening/speaking.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const active = phase === 'listening' || phase === 'speaking';
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  /** Listen for one utterance, resolve with the final transcript (or ''). */
  const listenOnce = useCallback(
    () =>
      new Promise<string>(resolve => {
        let settled = false;
        const finish = (text: string) => {
          if (settled) return;
          settled = true;
          stopListening();
          resolve(text);
        };
        setTranscript('');
        startListening({
          onPartial: t => setTranscript(t),
          onResult: t => {
            setTranscript(t);
            finish(t);
          },
          onEnd: () => finish(''),
          onError: () => finish(''),
        }).catch(() => finish(''));
      }),
    [],
  );

  // Closed flag flips on unmount so the recursive loop stops cleanly.
  const closedRef = useRef(false);

  /**
   * One conversational turn, then recurse to keep listening for follow-ups
   * until the overlay closes. Phase 0 just echoes; Phase 1 calls the backend.
   */
  const converse = useCallback(async () => {
    if (closedRef.current) return;
    setReply('');
    setPhaseSafe('listening');
    const said = await listenOnce();
    if (closedRef.current) return;
    if (!said) return; // silence — wait for a mic tap to go again

    setPhaseSafe('thinking');
    // Phase 0: echo. Phase 1 replaces this with the backend intent call.
    const answer = `You said: ${said}`;
    setReply(answer);
    setPhaseSafe('speaking');
    await speak(answer);
    if (closedRef.current) return;
    await converse();
  }, [listenOnce, setPhaseSafe]);

  // Drive the whole session when the overlay opens.
  useEffect(() => {
    if (!visible) return;
    closedRef.current = false;
    (async () => {
      setTranscript('');
      setReply('');
      const ok = await requestMicPermission();
      if (closedRef.current) return;
      if (!ok) {
        setPhaseSafe('denied');
        return;
      }
      setPhaseSafe('greeting');
      await speak(GREETING);
      if (closedRef.current) return;
      await converse();
    })();
    return () => {
      closedRef.current = true;
      stopSpeaking();
      destroyVoice();
    };
  }, [visible, converse, setPhaseSafe]);

  const close = () => {
    closedRef.current = true;
    stopSpeaking();
    destroyVoice();
    onClose();
  };

  const ringStyle = (delay: number) => {
    const t = Animated.add(pulse, delay) as unknown as Animated.Value;
    return {
      transform: [
        {
          scale: t.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [1, 2.2, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
      opacity: t.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [0.35, 0.12, 0],
        extrapolate: 'clamp',
      }),
    };
  };

  const tapToTalk = phase === 'listening' && !transcript;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={close} hitSlop={12}>
          <X size={22} color={colors.textMuted} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.center}>
          {/* Animated mic with pulsing rings */}
          <View style={styles.micWrap}>
            <Animated.View style={[styles.ring, ringStyle(0)]} />
            <Animated.View style={[styles.ring, ringStyle(0.5)]} />
            <TouchableOpacity
              style={styles.micBtn}
              activeOpacity={0.85}
              disabled={phase !== 'listening'}
              onPress={() => phase === 'listening' && converse()}>
              <Mic size={34} color={colors.onPrimary} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>{PHASE_HINT[phase]}</Text>

          {phase === 'thinking' && (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
          )}

          {/* Live transcript / reply */}
          {!!transcript && <Text style={styles.transcript}>{transcript}</Text>}
          {!!reply && <Text style={styles.reply}>{reply}</Text>}

          {tapToTalk && <Text style={styles.cta}>Tap the mic and speak</Text>}

          {(phase === 'denied' || phase === 'error') && (
            <TouchableOpacity style={styles.retry} onPress={close}>
              <Text style={styles.retryText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(5,20,36,0.92)',
      paddingHorizontal: spacing.xl,
    },
    closeBtn: {
      position: 'absolute',
      top: 56,
      right: spacing.xl,
      width: 42,
      height: 42,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    micWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
    ring: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary,
    },
    micBtn: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: { fontSize: font.size.md, color: colors.textMuted, fontWeight: '600' },
    transcript: {
      fontSize: font.size.xl,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    reply: { fontSize: font.size.md, color: colors.primary, textAlign: 'center' },
    cta: { fontSize: font.size.sm, color: colors.textFaint },
    retry: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
    },
    retryText: { color: colors.text, fontWeight: '600' },
  });
