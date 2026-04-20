// High-quality Speech-to-Text using the Web Speech API
// Falls back gracefully when not supported

export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'error';

export interface SpeechRecognitionOptions {
  onResult: (transcript: string, isFinal: boolean) => void;
  onStatusChange: (status: SpeechStatus) => void;
  onError: (error: string) => void;
  language?: string;
  continuous?: boolean;
}

// ── Minimal Web Speech API types (not in lib.dom.d.ts in all TS versions) ────
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function createSpeechRecognizer(options: SpeechRecognitionOptions): SpeechRecognitionInstance | null {
  if (!isSpeechSupported()) {
    options.onError('Speech recognition is not supported in this browser.');
    return null;
  }

  const API = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new API();

  rec.continuous = options.continuous ?? true;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.lang = options.language ?? 'en-US';

  rec.onstart = () => options.onStatusChange('listening');

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      const t = r[0].transcript;
      if (r.isFinal) final += t;
      else interim += t;
    }
    if (final) options.onResult(final, true);
    else if (interim) options.onResult(interim, false);
  };

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    const msgs: Record<string, string> = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not found or not accessible.',
      'not-allowed': 'Microphone permission denied. Please allow access.',
      'network': 'Network error during speech recognition.',
      'aborted': 'Speech recognition was aborted.',
    };
    options.onStatusChange('error');
    options.onError(msgs[event.error] ?? 'Speech error: ' + event.error);
  };

  rec.onend = () => options.onStatusChange('idle');

  return rec;
}
