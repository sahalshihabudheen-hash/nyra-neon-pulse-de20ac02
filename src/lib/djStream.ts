const DJ_STREAM_PROBE_TIMEOUT_MS = 4500;

export const getDjStreamUrl = (videoId: string, options?: { stream?: boolean; title?: string }) => {
  const params = new URLSearchParams({ videoId });
  if (options?.stream) params.set('stream', '1');
  if (options?.title) params.set('title', options.title);
  return `/api/get-audio-url?${params.toString()}`;
};

export async function canUseDjModeTrack(videoId: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DJ_STREAM_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(getDjStreamUrl(videoId), { signal: controller.signal });
    if (!response.ok) return false;

    const data = await response.json().catch(() => null);
    return Boolean(data?.success && (data.audioUrl || data.audioUrl1));
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function filterDjModeTracks<T extends { id: string }>(
  tracks: T[],
  limit = tracks.length
): Promise<T[]> {
  const uniqueTracks = tracks.filter((track, index, all) => (
    track.id && all.findIndex(candidate => candidate.id === track.id) === index
  ));

  const checked = await Promise.all(
    uniqueTracks.slice(0, limit).map(async track => (
      await canUseDjModeTrack(track.id) ? track : null
    ))
  );

  return checked.filter((track): track is T => Boolean(track));
}
