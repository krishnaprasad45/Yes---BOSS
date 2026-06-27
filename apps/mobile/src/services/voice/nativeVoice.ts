import { PermissionsAndroid, Platform } from 'react-native';
import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';

/**
 * Thin wrapper over on-device speech-to-text (@react-native-voice/voice) and
 * text-to-speech (react-native-tts). Keeps all the native plumbing — locale,
 * permissions, event wiring, promise-ifying TTS — out of the UI.
 *
 * English-only for now (en-IN); change LOCALE to add languages later.
 */
const LOCALE = 'en-IN';

let ttsReady: Promise<void> | null = null;

/** Lazily initialise TTS once: wait for the engine, set language + rate. */
function initTts(): Promise<void> {
  if (!ttsReady) {
    ttsReady = Tts.getInitStatus()
      .then(() => {
        Tts.setDefaultLanguage(LOCALE);
        Tts.setDefaultRate(0.5); // 0.5 ≈ natural pace on Android
      })
      .catch((e: unknown) => {
        // no_engine etc. — surface once, keep the app usable (overlay shows text).
        ttsReady = null;
        throw e;
      });
  }
  return ttsReady;
}

/** Ask for RECORD_AUDIO at runtime. Returns true only when granted. */
export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone',
      message:
        'Yes Boss listens to your voice command and runs it on-device. ' +
        'Audio is processed by your phone’s speech recogniser, not uploaded.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/** Speak `text` and resolve once playback finishes (or is cancelled). */
export function speak(text: string): Promise<void> {
  return initTts().then(
    () =>
      new Promise<void>(resolve => {
        // react-native-tts's removeEventListener is broken on new RN (calls the
        // removed `removeListener`); addEventListener returns a subscription, so
        // tear down via subscription.remove() instead.
        const subs: { remove: () => void }[] = [];
        const done = () => {
          subs.forEach(s => s.remove());
          resolve();
        };
        const add = (type: 'tts-finish' | 'tts-cancel') =>
          subs.push(Tts.addEventListener(type, done) as unknown as { remove: () => void });
        add('tts-finish');
        add('tts-cancel');
        Tts.stop();
        Tts.speak(text);
      }),
  );
}

/** Stop any in-progress speech immediately (barge-in). */
export function stopSpeaking(): void {
  Tts.stop();
}

export interface ListenHandlers {
  /** Live, not-yet-final transcript (may update many times). */
  onPartial?: (text: string) => void;
  /** Final transcript for the utterance. */
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  /** Recogniser stopped listening (silence / end of speech). */
  onEnd?: () => void;
}

/**
 * Start listening. Wires fresh handlers each call, then starts the recogniser.
 * Caller should `stopListening()` when done or on unmount.
 */
export async function startListening(handlers: ListenHandlers): Promise<void> {
  Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0];
    if (text) handlers.onPartial?.(text);
  };
  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0];
    if (text) handlers.onResult(text);
  };
  Voice.onSpeechError = (e: SpeechErrorEvent) => {
    handlers.onError?.(e.error?.message ?? 'Speech recognition failed');
  };
  Voice.onSpeechEnd = () => handlers.onEnd?.();
  await Voice.start(LOCALE);
}

/** Stop listening and detach all recogniser handlers. */
export async function stopListening(): Promise<void> {
  try {
    await Voice.stop();
  } catch {
    // already stopped — ignore
  }
  Voice.removeAllListeners();
}

/** Fully tear down the recogniser (call on overlay unmount). */
export async function destroyVoice(): Promise<void> {
  try {
    await Voice.destroy();
  } catch {
    // ignore
  }
  Voice.removeAllListeners();
}
