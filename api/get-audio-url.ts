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
];

async function getStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Try Piped instances in parallel
  const pipedResults = await Promise.all(
    PIPED_INSTANCES.map(async (inst) => {
      try {
        const res = await fetch(`${inst}/streams/${videoId}`, {
          signal: AbortSignal.timeout(7000),
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
  if (pipedHit) return pipedHit;

  // Try Invidious instances in parallel
  const invidiousResults = await Promise.all(
    INVIDIOUS_INSTANCES.map(async (inst) => {
      try {
        const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
          signal: AbortSignal.timeout(7000),
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

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(
        JSON.stringify({ error: `Upstream ${upstream.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    return new Response(
      JSON.stringify({ error: `Proxy failed: ${e.message}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
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
