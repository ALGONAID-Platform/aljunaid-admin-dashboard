export interface UploadProgressUpdate {
  percent: number;
  loaded: number;
  total: number;
}

/** Limit upload progress callbacks so large forms do not re-render for every XHR event. */
export function createUploadProgressReporter(
  onProgress: ((progress: UploadProgressUpdate) => void) | undefined,
  fallbackTotal: number,
) {
  let lastPercent = -1;
  let lastReportedAt = 0;

  return (loadedBytes: number, reportedTotal?: number) => {
    if (!onProgress) return;
    const total = reportedTotal || fallbackTotal;
    if (!total) return;

    const loaded = Math.min(loadedBytes, total);
    const percent = Math.min(100, Math.round((loaded * 100) / total));
    const now = Date.now();
    const complete = percent === 100;
    if (!complete && (percent === lastPercent || now - lastReportedAt < 200)) return;

    lastPercent = percent;
    lastReportedAt = now;
    onProgress({ percent, loaded, total });
  };
}
