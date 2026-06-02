import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-client-id',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Piped instances - these proxy Google Video CDN through their own IP
// When we proxy through our edge function, the request uses OUR IP to hit Piped.
// Piped then fetches from Google's CDN using PIPED'S IP, which is allowed.
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://piped-api.hostux.net',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.cl7.it',
  'https://api-piped.mha.fi',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.flokinet.to',
  'https://yewtu.be',
  'https://iv.melmac.space',
];

async function fetchViaPiped(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  for (const inst of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const audioStreams: any[] = data.audioStreams || [];
      const best = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (best?.url) return { url: best.url, mimeType: best.mimeType || 'audio/webm' };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchViaInvidious(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const format = (data.adaptiveFormats || []).find((f: any) => f.type?.startsWith('audio/'));
      if (format?.url) return { url: format.url, mimeType: format.type || 'audio/webm' };
    } catch {
      continue;
    }
  }
  return null;
}

async function getStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  const piped = await fetchViaPiped(videoId);
  if (piped) return piped;
  const invidious = await fetchViaInvidious(videoId);
  if (invidious) return invidious;
  return null;
}

// Proxy the audio stream from the source through our edge function.
// This is essential because the source URLs are IP-locked to the proxy server's IP.
// The browser cannot directly access them — WE must fetch and forward.
async function streamProxy(req: Request, sourceUrl: string, mimeType: string, download: boolean, title: string) {
  try {
    const range = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    };
    if (range) upstreamHeaders['Range'] = range;

    // No timeout - let the stream run for the full song duration
    const upstream = await fetch(sourceUrl, { headers: upstreamHeaders });
    
    if (!upstream.ok && upstream.status !== 206) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `Stream proxy failed: ${e.message}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function returnJson(url: string) {
  return new Response(
    JSON.stringify({ audioUrl: url, audioUrl1: url, success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let videoId = url.searchParams.get('videoId') || url.searchParams.get('id') || '';
    const shouldStream = url.searchParams.get('stream') === '1';
    const shouldDownload = url.searchParams.get('download') === '1';
    const title = url.searchParams.get('title') || 'audio';

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalise video ID
    if (videoId.length > 11 || videoId.includes('?') || videoId.includes('/')) {
      const match = videoId.match(/(?:v=|\/|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    }
    videoId = videoId.trim().substring(0, 11);

    const streamInfo = await getStreamInfo(videoId);

    if (!streamInfo) {
      return new Response(
        JSON.stringify({ error: 'Audio stream unavailable', videoId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (shouldStream || shouldDownload) {
      // Always proxy — the stream URL is IP-locked to the source server.
      // Redirecting to it won't work from the browser's IP.
      return await streamProxy(req, streamInfo.url, streamInfo.mimeType, shouldDownload, title);
    } else {
      return returnJson(streamInfo.url);
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
