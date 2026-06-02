import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-client-id',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://inv.nadeko.net',
  'https://invidious.flokinet.to',
  'https://yewtu.be',
  'https://iv.melmac.space',
];

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt.perennialte.ch',
  'https://cobalt.me.uk',
  'https://cobalt.phrenic.club',
  'https://api.cobalt.sp-codes.de',
];

const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://piped-api.hostux.net',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.cl7.it',
  'https://api-piped.mha.fi',
];

// ── Layer 1: Invidious Video API ─────────────────────────────────────────────
async function fetchViaInvidious(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${videoId}?local=true`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const formats = data.adaptiveFormats || [];
      
      // Prioritize MP4 container formats (M4A) for standard Apple Safari / iOS background compatibility
      let bestFormat = formats.find((f: any) => 
        f.type?.startsWith('audio/mp4') || 
        f.type?.includes('codecs="mp4') || 
        f.type?.includes('m4a')
      );
      
      if (!bestFormat) {
        bestFormat = formats.find((f: any) => f.type?.startsWith('audio/'));
      }
      
      if (bestFormat?.url) {
        const streamUrl = String(bestFormat.url).replace(/^http:\/\//, 'https://');
        return { url: streamUrl, mimeType: bestFormat.type || 'audio/mp4' };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Layer 2: Cobalt Instance Pooling ─────────────────────────────────────────
async function fetchViaCobalt(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  for (const inst of COBALT_INSTANCES) {
    try {
      // Try Cobalt v10 standard payload format
      let res = await fetch(inst, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          url,
          downloadMode: 'audio',
          audioFormat: 'mp3',
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        // Fallback to Cobalt legacy payload format
        res = await fetch(inst, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: JSON.stringify({
            url,
            isAudioOnly: true,
          }),
          signal: AbortSignal.timeout(6000),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          return { url: data.url, mimeType: 'audio/mp3' };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Layer 3: Piped API Streams ────────────────────────────────────────────────
async function fetchViaPiped(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  for (const inst of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const audioStreams: any[] = data.audioStreams || [];
      
      // Sort and extract highest bitrate stream
      const best = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (best?.url) {
        return { url: best.url, mimeType: best.mimeType || 'audio/webm' };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function getStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Layer 1: Invidious Video API
  try {
    const invidious = await fetchViaInvidious(videoId);
    if (invidious) return invidious;
  } catch {}

  // Layer 2: Cobalt Instance Pooling
  try {
    const cobalt = await fetchViaCobalt(videoId);
    if (cobalt) return cobalt;
  } catch {}

  // Layer 3: Piped API Streams (Final fallback)
  try {
    const piped = await fetchViaPiped(videoId);
    if (piped) return piped;
  } catch {}

  return null;
}

// Proxy stream — critical because source URLs are IP-locked to source server.
// We fetch on behalf of the browser so the correct server IP makes the request.
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

    // Direct-to-browser Redirect: If all backend resolvers fail to output a 200/206 stream
    // (due to Geolocks, IP throttling), issue a 307 Temporary Redirect to the raw media URL
    // to allow the client browser IP to stream the track natively.
    if (!upstream.ok && upstream.status !== 206) {
      console.warn('[Proxy] Upstream failed, issuing 307 native redirect to:', sourceUrl);
      return new Response(null, {
        status: 307,
        headers: {
          'Location': sourceUrl,
          'Access-Control-Allow-Origin': '*',
        }
      });
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
    // Attempt fallback native redirect on serverless throw
    console.warn('[Proxy] Upstream threw, trying 307 redirect:', e.message);
    return new Response(null, {
      status: 307,
      headers: {
        'Location': sourceUrl,
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    
    // Accept generic proxyUrl query parameters to proxy external streaming tracks directly
    const proxyUrl = url.searchParams.get('proxyUrl');
    const shouldDownload = url.searchParams.get('download') === '1';
    const title = url.searchParams.get('title') || 'audio';
    const shouldStream = url.searchParams.get('stream') === '1' || proxyUrl !== null;

    if (proxyUrl) {
      const decodedProxy = decodeURIComponent(proxyUrl);
      return await streamProxy(req, decodedProxy, 'audio/mp3', shouldDownload, title);
    }

    let videoId = url.searchParams.get('videoId') || url.searchParams.get('id') || '';

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Video ID or proxyUrl required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean and extract the 11-character YouTube videoId
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
});
