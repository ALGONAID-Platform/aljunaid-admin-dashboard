/**
 * Background Keepalive Service for Large File Uploads
 *
 * Ensures that large uploads (such as video files up to 2GB) continue running
 * without getting killed/aborted when the user minimizes the browser or presses
 * the home/middle button on mobile devices (Android / iOS) or switches tabs.
 *
 * Techniques employed:
 * 1. Silent HTML5 Audio Loop: Flags the page as an active media session to
 *    prevent the OS (Android Doze, iOS Background Suspension) from freezing
 *    the tab and tearing down open TCP connections.
 * 2. Screen Wake Lock API: Prevents device from entering deep sleep during upload.
 * 3. BeforeUnload Protection: Warns the user before accidental tab closure.
 * 4. Background Web Notifications: Notifies user when upload finishes in background.
 */

// 1-second 8000Hz PCM silence WAV in base64
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let audioKeepaliveEl: HTMLAudioElement | null = null;
let wakeLockSentinel: any = null;
let isKeepaliveActive = false;
let beforeUnloadAttached = false;

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isKeepaliveActive) {
    e.preventDefault();
    const msg = 'هناك ملف فيديو يتم رفعه حالياً إلى الدرس. الخروج من الصفحة سيؤدي إلى إلغاء عملية الرفع!';
    e.returnValue = msg;
    return msg;
  }
}

async function requestWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel?.addEventListener?.('release', () => {
        wakeLockSentinel = null;
      });
    } catch {
      // Screen wake lock might fail if window is minimized or battery saver is active; non-fatal.
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
  if (document.visibilityState === 'visible' && isKeepaliveActive && !wakeLockSentinel) {
    void requestWakeLock();
  }
}

/**
 * Starts background keepalive mechanisms. Call this immediately when a large upload begins.
 */
export function startBackgroundUploadKeepalive() {
  if (typeof window === 'undefined') return;
  isKeepaliveActive = true;

  // 1. Silent Audio Keepalive (prevents mobile OS from suspending background network sockets)
  try {
    if (!audioKeepaliveEl) {
      audioKeepaliveEl = new Audio(SILENT_WAV_DATA_URI);
      audioKeepaliveEl.loop = true;
      audioKeepaliveEl.volume = 0.01; // barely audible/silent
    }
    const playPromise = audioKeepaliveEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Autoplay may be restricted if not triggered by a user gesture.
        // Since upload is initiated by a user file selection, this usually succeeds.
        console.debug('Background keepalive audio notice:', err);
      });
    }
  } catch (err) {
    console.debug('Failed to initialize audio keepalive:', err);
  }

  // 2. Request Screen WakeLock
  void requestWakeLock();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 3. BeforeUnload Protection
  if (!beforeUnloadAttached) {
    window.addEventListener('beforeunload', onBeforeUnload);
    beforeUnloadAttached = true;
  }

  // 4. Request notification permission if not yet decided (to inform user when done)
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

/**
 * Stops background keepalive mechanisms. Call this when upload finishes or errors out.
 */
export function stopBackgroundUploadKeepalive() {
  isKeepaliveActive = false;

  // 1. Stop Audio
  if (audioKeepaliveEl) {
    try {
      audioKeepaliveEl.pause();
      audioKeepaliveEl.currentTime = 0;
    } catch {}
  }

  // 2. Release WakeLock
  releaseWakeLock();
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  // 3. Remove BeforeUnload
  if (beforeUnloadAttached) {
    window.removeEventListener('beforeunload', onBeforeUnload);
    beforeUnloadAttached = false;
  }
}

/**
 * Sends a browser notification to alert the user even if they are in another app or screen is off.
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
