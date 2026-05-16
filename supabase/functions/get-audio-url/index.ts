import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-client-id',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
  'Access-Control-Max-Age': '86400',
};

let cachedInstances: string[] = [];
let cacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000;

async function getWorkingPipedInstances(): Promise<string[]> {
  if (cachedInstances.length > 0 && Date.now() - cacheTime < CACHE_TTL) return cachedInstances;
  try {
    const res = await fetch('https://piped-instances.kavin.rocks/', { 
      headers: { 'Accept': 'application/json' }, 
      signal: AbortSignal.timeout(5000) 
    });
    if (res.ok) {
      const instances = await res.json();
      const working = instances
        .filter((i: any) => i.api_url && i.uptime_24h >= 0.8)
        .sort((a: any, b: any) => (b.uptime_24h || 0) - (a.uptime_24h || 0))
        .map((i: any) => i.api_url)
        .slice(0, 40);
      if (working.length > 0) { 
        cachedInstances = working; 
        cacheTime = Date.now(); 
        return working; 
      }
    }
  } catch (e) {
    console.error('Failed to fetch piped instances:', e.message);
  }
  return [
    'https://pipedapi.kavin.rocks', 'https://api.piped.private.coffee', 'https://piped-api.hostux.net',
    'https://pipedapi.cl7.it', 'https://api-piped.mha.fi', 'https://pipedapi.astreapp.it',
    'https://pipedapi.adminforge.de', 'https://pipedapi.qdi.fi', 'https://pipedapi.re-re.moe',
    'https://pipedapi.rivo.re', 'https://pipedapi.tokyo.ovh', 'https://pipedapi.mobi.casa',
    'https://piped.mha.fi', 'https://pipedapi.in.projectsegfau.lt', 'https://pipedapi.us.projectsegfau.lt',
    'https://pipedapi.leptons.xyz', 'https://pipedapi.r4fo.com', 'https://pipedapi.mha.fi'
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let lastError = "Initial state";
  try {
    const url = new URL(req.url);
    let videoId = url.searchParams.get('videoId');
    const shouldStream = url.searchParams.get('stream') === '1';
    const shouldDownload = url.searchParams.get('download') === '1';
    const title = url.searchParams.get('title') || 'audio';

    if (!videoId) return new Response(JSON.stringify({ error: 'Video ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
    if (videoId.length > 11 || videoId.includes('?') || videoId.includes('/')) {
      const match = videoId.match(/(?:v=|\/|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})(?:[?&/|$]|$)/);
      if (match) videoId = match[1];
    }
    videoId = videoId.trim().substring(0, 11);

    const pipedInstances = await getWorkingPipedInstances();
    const cobaltInstances = ['https://api.cobalt.tools', 'https://cobalt.api.unblockvideos.com', 'https://api.v0.cobalt.tools', 'https://cobalt.instavids.net/api', 'https://cobalt.shun.codes/api'];
    
    // Attempt extraction from multiple sources
    const sources = [...pipedInstances.map(i => ({ type: 'piped', url: `${i}/streams/${videoId}` })), ...cobaltInstances.map(i => ({ type: 'cobalt', url: i }))];

    for (const source of sources) {
      try {
        let streamUrl = null;
        if (source.type === 'piped') {
          const res = await fetch(source.url, { signal: AbortSignal.timeout(6000) });
          if (!res.ok) continue;
          const data = await res.json();
          streamUrl = (data.audioStreams || []).sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.url;
        } else {
          const res = await fetch(source.url, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, videoQuality: '720', downloadMode: 'audio', audioFormat: 'mp3' }),
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) continue;
          streamUrl = (await res.json()).url;
        }

        if (streamUrl) {
          if (shouldStream || shouldDownload) {
            const proxyRes = await proxyStream(req, streamUrl, shouldDownload, title);
            if (proxyRes) return proxyRes;
          } else {
            return returnJson(streamUrl);
          }
        }
      } catch (e) { lastError = e.message; continue; }
    }

    return new Response(JSON.stringify({ error: 'All sources failed', details: lastError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

async function proxyStream(req: Request, url: string, download: boolean, title: string) {
  try {
    const range = req.headers.get('range');
    const upstreamHeaders: HeadersInit = { 'User-Agent': 'Mozilla/5.0...', 'Referer': 'https://www.youtube.com/', 'Accept': '*/*' };
    if (range) upstreamHeaders['Range'] = range;

    const res = await fetch(url, { headers: upstreamHeaders, signal: AbortSignal.timeout(20000) });
    if (!res.ok && res.status !== 206) return null;

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', res.headers.get('content-type') || 'audio/mpeg');
    if (download) responseHeaders.set('Content-Disposition', `attachment; filename="${title.replace(/[^\w\s-]/g, '')}.mp3"`);
    ['content-length', 'content-range', 'accept-ranges'].forEach(h => { const v = res.headers.get(h); if (v) responseHeaders.set(h, v); });
    responseHeaders.set('Cache-Control', 'no-cache');

    return new Response(res.body, { status: res.status, headers: responseHeaders });
  } catch (e) { return null; }
}

function returnJson(url: string) {
  return new Response(JSON.stringify({ audioUrl: url, audioUrl1: url, success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
