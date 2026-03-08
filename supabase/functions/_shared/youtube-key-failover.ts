export function getYouTubeApiKeys(): string[] {
  const env = Deno.env.toObject();

  const keys = Object.entries(env)
    .filter(([name, value]) => /^YOUTUBE_API_KEY(?:_\d+)?$/.test(name) && !!value)
    .sort(([a], [b]) => {
      if (a === "YOUTUBE_API_KEY") return -1;
      if (b === "YOUTUBE_API_KEY") return 1;

      const aMatch = a.match(/_(\d+)$/);
      const bMatch = b.match(/_(\d+)$/);
      const aNum = aMatch ? Number(aMatch[1]) : Number.MAX_SAFE_INTEGER;
      const bNum = bMatch ? Number(bMatch[1]) : Number.MAX_SAFE_INTEGER;
      return aNum - bNum;
    })
    .map(([, value]) => value as string);

  return [...new Set(keys)];
}

export async function fetchYouTubeWithFailover(
  keys: string[],
  buildUrl: (apiKey: string) => string,
): Promise<{ ok: true; data: any } | { ok: false; error: string; status: number }> {
  if (keys.length === 0) {
    return { ok: false, error: "YouTube API key not configured", status: 500 };
  }

  // Rotate starting key to spread quota usage across all configured keys.
  const startIndex = Math.floor(Date.now() / 60_000) % keys.length;
  const rotatedKeys = keys.map((_, index) => keys[(startIndex + index) % keys.length]);

  let lastError = "All API keys exhausted";
  let lastStatus = 403;

  for (const [index, apiKey] of rotatedKeys.entries()) {
    try {
      const response = await fetch(buildUrl(apiKey));
      const data = await response.json().catch(() => ({}));

      if (response.ok && !data.error) {
        return { ok: true, data };
      }

      const reason = data?.error?.errors?.[0]?.reason || "";
      const message = data?.error?.message || `YouTube API error (${response.status})`;

      lastError = message;
      lastStatus = response.status || 500;

      const shouldTryNextKey =
        response.status === 401 ||
        response.status === 403 ||
        response.status === 429 ||
        /quota|limit|rate|key/i.test(reason) ||
        /quota|limit|rate|key/i.test(message);

      console.warn(`YouTube key attempt ${index + 1}/${rotatedKeys.length} failed: ${message}`);

      if (!shouldTryNextKey) {
        return { ok: false, error: message, status: lastStatus };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      lastError = message;
      lastStatus = 500;
      console.warn(`YouTube key attempt ${index + 1}/${rotatedKeys.length} failed: ${message}`);
    }
  }

  return { ok: false, error: lastError, status: lastStatus };
}
