export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-client-id',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://piped-api.lre.yt',
  'https://pipedapi.adminforge.de',
  'https://api-piped.mha.fi',
  'https://pipedapi.spirit.com.de',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.moomoo.me',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.flokinet.to',
  'https://yewtu.be',
  'https://invidious.projectsegfau.lt',
  'https://invidious.lre.yt',
  'https://inv.tux.im',
];

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt.api.ryboflops.lol',
  'https://cobalt.k6.ovh',
  'https://co.wuk.sh',
  'https://cobalt.shite.xyz',
];

const ITAG_MIME: Record<string, string> = {
  '251': 'audio/webm',
  '250': 'audio/webm',
  '249': 'audio/webm',
  '140': 'audio/mp4',
};

function companionizeInvidiousUrl(rawUrl: string) {
  const secureUrl = rawUrl.replace(/^http:\/\//, 'https://');
  if (secureUrl.includes('/companion/videoplayback')) return secureUrl;
  return secureUrl
    .replace('/videoplayback?', '/companion/videoplayback?')
    .replace('/videoplayback/', '/companion/videoplayback/');
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const withTimeout = (ms: number): AbortSignal => {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  }
};

// ── Resolver functions ──────────────────────────────────────────────

async function tryPiped(inst: string, videoId: string): Promise<{ url: string; mimeType: string } | null> {
  try {
    const res = await fetch(`${inst}/streams/${videoId}`, {
      signal: withTimeout(4000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const streams: any[] = data.audioStreams || [];
    const best =
      streams.find((s: any) => s.mimeType?.includes('audio/mp4')) ||
      streams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    return best?.url ? { url: best.url, mimeType: best.mimeType || 'audio/webm' } : null;
  } catch {
    return null;
  }
}

async function tryInvidious(inst: string, videoId: string): Promise<{ url: string; mimeType: string } | null> {
  for (const itag of ['251', '140', '250', '249']) {
    try {
      const latestUrl = `${inst}/latest_version?id=${videoId}&local=true&itag=${itag}`;
      const res = await fetch(latestUrl, {
        signal: withTimeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-1' },
        redirect: 'follow',
      });
      if (res.ok || res.status === 206) {
        try { await res.body?.cancel(); } catch {}
        return {
          url: companionizeInvidiousUrl(res.url || latestUrl),
          mimeType: (res.headers.get('content-type') || ITAG_MIME[itag] || 'audio/webm').split(';')[0],
        };
      }
    } catch {}
  }

  try {
    const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
      signal: withTimeout(4000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const formats: any[] = data.adaptiveFormats || [];
    const audio = formats.find((f: any) => f.type?.startsWith('audio/mp4')) ||
                  formats.find((f: any) => f.type?.startsWith('audio/'));
    return audio?.url ? { url: companionizeInvidiousUrl(audio.url), mimeType: audio.type || 'audio/webm' } : null;
  } catch {
    return null;
  }
}

async function tryCobalt(inst: string, videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Try new Cobalt v10+ API (POST /)
  const payloadNew = JSON.stringify({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    downloadMode: 'audio',
    audioFormat: 'mp3',
    audioBitrate: '128',
  });
  const payloadLegacy = JSON.stringify({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    isAudioOnly: true,
    downloadMode: 'audio',
    audioFormat: 'mp3',
    audioQuality: '128',
  });

  for (const [endpoint, body] of [
    [`${inst}/`, payloadNew],
    [`${inst}/api/json`, payloadLegacy],
  ] as [string, string][]) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body,
        signal: withTimeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) return { url: data.url, mimeType: 'audio/mpeg' };
      }
    } catch {}
  }
  return null;
}

// YouTube innertube (unofficial) — works without any third party
async function tryInnertube(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  try {
    const body = {
      context: {
        client: {
          clientName: 'ANDROID_MUSIC',
          clientVersion: '6.29.58',
          androidSdkVersion: 30,
          hl: 'en',
          gl: 'US',
        },
      },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    };

    const res = await fetch('https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Youtube-Client-Name': '21',
        'X-Youtube-Client-Version': '6.29.58',
        'User-Agent': 'com.google.android.apps.youtube.music/6.29.58 (Linux; U; Android 11) gzip',
      },
      body: JSON.stringify(body),
      signal: withTimeout(6000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    const formats: any[] = [
      ...(data?.streamingData?.adaptiveFormats || []),
      ...(data?.streamingData?.formats || []),
    ];

    const audioFormats = formats
      .filter((f: any) => f.mimeType?.startsWith('audio/') && f.url)
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

    const best = audioFormats[0];
    return best ? { url: best.url, mimeType: best.mimeType?.split(';')[0] || 'audio/webm' } : null;
  } catch {
    return null;
  }
}

// ── Main resolver: all layers run IN PARALLEL ─────────────────────

async function getStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  const shuffledPiped = shuffle(PIPED_INSTANCES).slice(0, 5);
  const shuffledInvidious = shuffle(INVIDIOUS_INSTANCES).slice(0, 4);
  const shuffledCobalt = shuffle(COBALT_INSTANCES).slice(0, 3);

  // Race all sources at the same time — first non-null wins
  const allPromises: Promise<{ url: string; mimeType: string } | null>[] = [
    tryInnertube(videoId),
    ...shuffledCobalt.map((inst) => tryCobalt(inst, videoId)),
    ...shuffledPiped.map((inst) => tryPiped(inst, videoId)),
    ...shuffledInvidious.map((inst) => tryInvidious(inst, videoId)),
  ];

  return new Promise((resolve) => {
    let settled = 0;
    const total = allPromises.length;
    let resolved = false;

    for (const p of allPromises) {
      p.then((result) => {
        settled++;
        if (result && !resolved) {
          resolved = true;
          resolve(result);
        } else if (settled === total && !resolved) {
          resolve(null);
        }
      }).catch(() => {
        settled++;
        if (settled === total && !resolved) resolve(null);
      });
    }
  });
}

// ── Proxy / stream helper ─────────────────────────────────────────

async function streamProxy(
  req: Request,
  sourceUrl: string,
  mimeType: string,
  download: boolean,
  title: string
): Promise<Response> {
  try {
    const range = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    };
    if (range) upstreamHeaders['Range'] = range;

    const candidates = [sourceUrl];
    const companionUrl = companionizeInvidiousUrl(sourceUrl);
    if (companionUrl !== sourceUrl) candidates.push(companionUrl);

    let upstream: Response | null = null;
    for (const candidate of candidates) {
      upstream = await fetch(candidate, { headers: upstreamHeaders, redirect: 'follow' });
      if (upstream.ok || upstream.status === 206) break;
      try { await upstream.body?.cancel(); } catch {}
    }

    if (!upstream || (!upstream.ok && upstream.status !== 206)) {
      return Response.redirect(sourceUrl, 302);
    }

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', mimeType || upstream.headers.get('content-type') || 'audio/webm');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'no-cache');
    if (download) {
      responseHeaders.set('Content-Disposition', `attachment; filename="${title.replace(/[^\w\s-]/g, '')}.mp3"`);
    }
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.redirect(sourceUrl, 302);
  }
}

// ── Edge handler ──────────────────────────────────────────────────

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);

    // Generic CORS proxy
    const proxyUrl = url.searchParams.get('proxyUrl');
    if (proxyUrl) {
      try {
        const decodedUrl = decodeURIComponent(proxyUrl);
        const range = req.headers.get('range');
        const upstreamHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
        };
        if (range) upstreamHeaders['Range'] = range;

        const upstream = await fetch(decodedUrl, { headers: upstreamHeaders });
        const responseHeaders = new Headers(corsHeaders);
        responseHeaders.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Cache-Control', 'no-cache');
        
        const shouldDownload = url.searchParams.get('download') === '1';
        const title = url.searchParams.get('title') || 'audio';
        if (shouldDownload) {
          responseHeaders.set('Content-Disposition', `attachment; filename="${title.replace(/[^\w\s-]/g, '')}.mp3"`);
        }

        const contentLength = upstream.headers.get('content-length');
        const contentRange = upstream.headers.get('content-range');
        if (contentLength) responseHeaders.set('Content-Length', contentLength);
        if (contentRange) responseHeaders.set('Content-Range', contentRange);

        return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
      } catch (proxyErr: any) {
        return new Response(JSON.stringify({ error: proxyErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let videoId = url.searchParams.get('videoId') || url.searchParams.get('id') || '';
    const shouldStream = url.searchParams.get('stream') === '1';
    const shouldDownload = url.searchParams.get('download') === '1';
    const title = url.searchParams.get('title') || 'audio';

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Video ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const match = videoId.match(/(?:v=|\/|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
    if (match) videoId = match[1];
    videoId = videoId.trim().substring(0, 11);

    const streamInfo = await getStreamInfo(videoId);

    if (!streamInfo) {
      return new Response(JSON.stringify({ error: 'Audio stream unavailable', videoId }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (shouldStream || shouldDownload) {
      return await streamProxy(req, streamInfo.url, streamInfo.mimeType, shouldDownload, title);
    }

    return new Response(
      JSON.stringify({ audioUrl: streamInfo.url, audioUrl1: streamInfo.url, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
