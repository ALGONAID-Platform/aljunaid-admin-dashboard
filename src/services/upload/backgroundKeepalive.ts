/**
 * Background Keepalive Service for Large File Uploads
 *
 * Best-effort browser helpers for an in-progress upload. These do not make
 * uploads independent of the page: browsers may suspend or terminate a hidden
 * tab, particularly on mobile. Resuming after that requires a resumable server
 * upload protocol.
 */
let wakeLockSentinel: any = null;
let isKeepaliveActive = false;
let beforeUnloadAttached = false;

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isKeepaliveActive) {
    e.preventDefault();
    const msg = 'هناك ملف فيديو يتم رفعه حالياً. قد يؤدي إغلاق الصفحة إلى إلغاء عملية الرفع.';
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
 * Starts best-effort foreground protections when a large upload begins.
 */
export function startBackgroundUploadKeepalive() {
  if (typeof window === 'undefined') return;
  isKeepaliveActive = true;

  // A wake lock can help while the page is visible, but does not keep a
  // backgrounded page or its network request alive.
  void requestWakeLock();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Warn when navigation or closing the page may interrupt the upload.
  if (!beforeUnloadAttached) {
    window.addEventListener('beforeunload', onBeforeUnload);
    beforeUnloadAttached = true;
  }

}

/**
 * Stops background keepalive mechanisms. Call this when upload finishes or errors out.
 */
export function stopBackgroundUploadKeepalive() {
  isKeepaliveActive = false;

  // Release WakeLock
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
