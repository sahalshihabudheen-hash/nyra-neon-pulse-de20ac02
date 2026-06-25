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
  'https://pipedapi.cl7.it',
  'https://piped-api.hostux.net',
  'https://pipedapi.adminforge.de',
  'https://api-piped.mha.fi',
  'https://pipedapi.swish.re',
  'https://pipedapi.spirit.com.de',
  'https://pipedapi.leptons.xyz',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.pablohud.space',
  'https://pipedapi.tokyo.cl7.it',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.river.rocks',
  'https://pipedapi.us.reallysoliddns.cf'
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.flokinet.to',
  'https://yewtu.be',
  'https://invidious.projectsegfau.lt',
  'https://invidious.lre.yt',
  'https://invidious.slipfox.xyz',
  'https://invidious.nerdvpn.de',
  'https://inv.tux.im'
];

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt.api.ryboflops.lol',
  'https://cobalt.k6.ovh',
  'https://cobalt.shite.xyz',
  'https://co.wuk.sh'
];

// Helper to shuffle arrays for load distribution and rate-limit bypassing
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Resilient fetch signal timeout
const getTimeoutSignal = (ms: number) => {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }
};

async function tryCobalt(inst: string, videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Try new Cobalt v10+ API format first (POST /)
  try {
    const res = await fetch(`${inst}/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '128'
      }),
      signal: getTimeoutSignal(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) return { url: data.url, mimeType: 'audio/mpeg' };
    }
  } catch {}

  // Fallback: try legacy endpoint (POST /api/json)
  try {
    const res = await fetch(`${inst}/api/json`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioQuality: '128'
      }),
      signal: getTimeoutSignal(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) return { url: data.url, mimeType: 'audio/mpeg' };
    }
  } catch {}

  return null;
}

async function getStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Layer 1: High-Performance Cobalt Extractors (new API + legacy fallback)
  const shuffledCobalt = shuffle(COBALT_INSTANCES);
  const cobaltResults = await Promise.all(
    shuffledCobalt.slice(0, 3).map((inst) => tryCobalt(inst, videoId))
  );
  
  const cobaltHit = cobaltResults.find((r) => r !== null);
  if (cobaltHit) {
    console.log('Successfully resolved via Cobalt API');
    return cobaltHit;
  }

  // Layer 2: Piped Instances (Parallel Race)
  const shuffledPiped = shuffle(PIPED_INSTANCES);
  const pipedResults = await Promise.all(
    shuffledPiped.slice(0, 5).map(async (inst) => {
      try {
        const res = await fetch(`${inst}/streams/${videoId}`, {
          signal: getTimeoutSignal(3500),
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        const audioStreams: any[] = data.audioStreams || [];
        const best = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        return best?.url ? { url: best.url, mimeType: best.mimeType || 'audio/webm' } : null;
      } catch {
        return null;
      }
    })
  );
  
  const pipedHit = pipedResults.find((r) => r !== null);
  if (pipedHit) {
    console.log('Successfully resolved via Piped API');
    return pipedHit;
  }

  // Layer 3: Invidious Instances
  const shuffledInvidious = shuffle(INVIDIOUS_INSTANCES);
  const invidiousResults = await Promise.all(
    shuffledInvidious.slice(0, 4).map(async (inst) => {
      try {
        const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
          signal: getTimeoutSignal(3500),
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        const format = (data.adaptiveFormats || []).find((f: any) => f.type?.startsWith('audio/'));
        return format?.url ? { url: format.url, mimeType: format.type || 'audio/webm' } : null;
      } catch {
        return null;
      }
    })
  );
  
  return invidiousResults.find((r) => r !== null) || null;
}

// Proxy stream with robust fallback.
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

    const upstream = await fetch(sourceUrl, { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      console.warn(`Upstream returned ${upstream.status}. Invoking client redirect fallback.`);
      return Response.redirect(sourceUrl, 302);
    }

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set(
      'Content-Type',
      mimeType || upstream.headers.get('content-type') || 'audio/webm'
    );
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'no-cache');
    if (download) {
      responseHeaders.set(
        'Content-Disposition',
        `attachment; filename="${title.replace(/[^\w\s-]/g, '')}.mp3"`
      );
    }
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (e: any) {
    console.error(`Proxy stream failed: ${e.message}. Redirecting directly to video source.`);
    return Response.redirect(sourceUrl, 302);
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
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

        const contentLength = upstream.headers.get('content-length');
        const contentRange = upstream.headers.get('content-range');
        if (contentLength) responseHeaders.set('Content-Length', contentLength);
        if (contentRange) responseHeaders.set('Content-Range', contentRange);

        return new Response(upstream.body, {
          status: upstream.status,
          headers: responseHeaders,
        });
      } catch (proxyErr: any) {
        console.error('API proxyUrl routing error:', proxyErr);
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
    } else {
      return new Response(
        JSON.stringify({ audioUrl: streamInfo.url, audioUrl1: streamInfo.url, success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
