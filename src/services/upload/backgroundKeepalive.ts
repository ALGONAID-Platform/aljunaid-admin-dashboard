/**
 * Background Keepalive Service for Large File Uploads
 *
 * Keeps uploads alive when the user switches to another app or the mobile screen dims:
 * 1. Silent Audio Loop: Tricks mobile operating systems (iOS Safari & Android Chrome)
 *    into treating the web page as an active media session. This prevents aggressive OS
 *    tab suspension and keep TCP network sockets open in the background.
 * 2. Web Audio Context: Secondary keepalive to protect JavaScript event loop execution.
 * 3. Screen Wake Lock: Keeps display on while viewing foreground progress.
 * 4. Automatic Resumption: Re-engages protections when returning to foreground.
 * 5. Notifications: Sends browser push notification when upload finishes while away.
 */

let wakeLockSentinel: any = null;
let isKeepaliveActive = false;
let beforeUnloadAttached = false;
let silentAudioEl: HTMLAudioElement | null = null;
let silentAudioBlobUrl: string | null = null;
let audioContext: any = null;
let oscillator: any = null;

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isKeepaliveActive) {
    e.preventDefault();
    const msg = 'هناك ملف فيديو يتم رفعه حالياً. قد يؤدي إغلاق الصفحة إلى إلغاء عملية الرفع.';
    e.returnValue = msg;
    return msg;
  }
}

/**
 * Generates an in-memory 1-second silent WAV audio Blob URL.
 */
function getSilentAudioUrl(): string {
  if (silentAudioBlobUrl) return silentAudioBlobUrl;
  try {
    const sampleRate = 8000;
    const numSamples = sampleRate; // 1 second
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // fmt subchunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);          // 16 for PCM
    view.setUint16(20, 1, true);           // AudioFormat = 1 (PCM)
    view.setUint16(22, 1, true);           // NumChannels = 1 (mono)
    view.setUint32(24, sampleRate, true);  // SampleRate = 8000
    view.setUint32(28, sampleRate, true);  // ByteRate = 8000 * 1 * 1
    view.setUint16(32, 1, true);           // BlockAlign = 1
    view.setUint16(34, 8, true);           // BitsPerSample = 8

    // data subchunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples, true);

    // Fill audio data with 128 (silence in 8-bit unsigned PCM)
    const pcm = new Uint8Array(buffer, 44, numSamples);
    pcm.fill(128);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    silentAudioBlobUrl = URL.createObjectURL(blob);
    return silentAudioBlobUrl;
  } catch {
    return 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  }
}

function startSilentAudio() {
  if (typeof window === 'undefined') return;
  try {
    if (!silentAudioEl) {
      silentAudioEl = new Audio(getSilentAudioUrl());
      silentAudioEl.loop = true;
      // 0.001 is completely inaudible, but prevents iOS WebKit from pruning volume=0 elements
      silentAudioEl.volume = 0.001;
      silentAudioEl.setAttribute('playsinline', 'true');
      silentAudioEl.setAttribute('webkit-playsinline', 'true');
    }
    const playPromise = silentAudioEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Handled silently if user-gesture was missed; non-fatal
      });
    }
  } catch {
    // Non-fatal
  }
}

function stopSilentAudio() {
  if (silentAudioEl) {
    try {
      silentAudioEl.pause();
      silentAudioEl.currentTime = 0;
      silentAudioEl.src = '';
      silentAudioEl.load();
    } catch {}
    silentAudioEl = null;
  }
  if (silentAudioBlobUrl) {
    try {
      URL.revokeObjectURL(silentAudioBlobUrl);
    } catch {}
    silentAudioBlobUrl = null;
  }
}

function startWebAudioKeepalive() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    if (!oscillator && audioContext.state !== 'closed') {
      oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0.0001; // inaudible
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
    }
  } catch {
    // Non-fatal
  }
}

function stopWebAudioKeepalive() {
  if (oscillator) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch {}
    oscillator = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    try {
      void audioContext.close();
    } catch {}
    audioContext = null;
  }
}

async function requestWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel || wakeLockSentinel.released) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel?.addEventListener?.('release', () => {
          wakeLockSentinel = null;
        });
      }
    } catch {
      // Screen wake lock might fail on battery saver; non-fatal.
    }
  }
}

function releaseWakeLock() {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
}

function handleVisibilityChange() {
  if (isKeepaliveActive) {
    if (document.visibilityState === 'visible') {
      // Re-acquire wake lock for foreground
      void requestWakeLock();

      // Check and resume audio if OS suspended it
      if (silentAudioEl && silentAudioEl.paused) {
        silentAudioEl.play().catch(() => {});
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    }
  }
}

/**
 * Starts background survival mechanisms when a large upload begins.
 */
export function startBackgroundUploadKeepalive() {
  if (typeof window === 'undefined') return;
  isKeepaliveActive = true;

  // 1. Silent audio loops keep the background thread alive on iOS & Android
  startSilentAudio();
  startWebAudioKeepalive();

  // 2. Request screen wake lock for foreground viewing
  void requestWakeLock();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 3. Prevent accidental navigation or page refresh
  if (!beforeUnloadAttached) {
    window.addEventListener('beforeunload', onBeforeUnload);
    beforeUnloadAttached = true;
  }

  // 4. Request notification permission if not yet determined
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

/**
 * Stops background keepalive mechanisms. Call this when upload finishes or is cancelled.
 */
export function stopBackgroundUploadKeepalive() {
  isKeepaliveActive = false;

  stopSilentAudio();
  stopWebAudioKeepalive();
  releaseWakeLock();
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  if (beforeUnloadAttached) {
    window.removeEventListener('beforeunload', onBeforeUnload);
    beforeUnloadAttached = false;
  }
}

/**
 * Sends a browser notification to alert the user even if they are in another app.
 */
export function sendBackgroundUploadNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/logo.png',
        tag: 'video-upload-complete',
      });
    } catch {}
  }
}
