export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-client-id',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
  'Access-Control-Max-Age': '86400',
};

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://piped-api.hostux.net',
  'https://pipedapi.cl7.it',
  'https://api-piped.mha.fi',
  'https://pipedapi.astreapp.it',
  'https://pipedapi.adminforge.de',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.flokinet.to',
  'https://yewtu.be',
  'https://iv.melmac.space',
];

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt.api.unblockvideos.com',
  'https://api.v0.cobalt.tools',
  'https://cobalt.instavids.net/api',
];

async function fetchStream(videoId: string): Promise<string | null> {
  // 1. Try Cobalt (Fastest & most reliable for high-quality audio)
  for (const inst of COBALT_INSTANCES) {
    try {
      const res = await fetch(inst, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, videoQuality: '720', downloadMode: 'audio', audioFormat: 'mp3' }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      }
    } catch {}
  }

  // 2. Parallel race Piped instances
  const pipedPromises = PIPED_INSTANCES.slice(0, 4).map(async (inst) => {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json();
      return (data.audioStreams || []).sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.url || null;
    } catch { return null; }
  });

  // 3. Parallel race Invidious instances
  const invidiousPromises = INVIDIOUS_INSTANCES.slice(0, 3).map(async (inst) => {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json();
      const format = (data.adaptiveFormats || []).find((f: any) => f.type?.startsWith('audio/'));
      return format?.url || null;
    } catch { return null; }
  });

  const results = await Promise.all([...pipedPromises, ...invidiousPromises]);
  const found = results.find(url => !!url);
  if (found) return found;

  // 4. Last resort: Direct Piped Proxy Redirect
  // Some instances can proxy directly even if the API metadata fails
  return `${PIPED_INSTANCES[0]}/proxy/otfp?url=https://www.youtube.com/watch?v=${videoId}`;
}

async function proxyStream(req: Request, url: string, download: boolean, title: string) {
  try {
    const range = req.headers.get('range');
    const upstreamHeaders: HeadersInit = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 
      'Referer': 'https://www.youtube.com/', 
      'Accept': '*/*' 
    };
    if (range) upstreamHeaders['Range'] = range;

    const res = await fetch(url, { headers: upstreamHeaders });
    if (!res.ok && res.status !== 206) return null;

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', res.headers.get('content-type') || 'audio/mpeg');
    if (download) responseHeaders.set('Content-Disposition', `attachment; filename="${title.replace(/[^\w\s-]/g, '')}.mp3"`);
    ['content-length', 'content-range', 'accept-ranges'].forEach(h => { const v = res.headers.get(h); if (v) responseHeaders.set(h, v); });
    responseHeaders.set('Cache-Control', 'no-cache');

    return new Response(res.body, { status: res.status, headers: responseHeaders });
  } catch (e) { return null; }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let videoId = url.searchParams.get('videoId') || url.searchParams.get('id');
    const shouldStream = url.searchParams.get('stream') === '1';
    const shouldDownload = url.searchParams.get('download') === '1';
    const title = url.searchParams.get('title') || 'audio';

    if (!videoId) return new Response(JSON.stringify({ error: 'Video ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
    const match = videoId.match(/(?:v=|\/|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
    if (match) videoId = match[1];
    videoId = videoId.trim().substring(0, 11);

    const audioUrl = await fetchStream(videoId);

    if (audioUrl) {
      if (shouldStream || shouldDownload) {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': audioUrl
          }
        });
      } else {
        return new Response(JSON.stringify({ audioUrl, audioUrl1: audioUrl, success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Audio stream unavailable', videoId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
