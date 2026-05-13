import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
};

// Cache discovered instances for 10 minutes
let cachedInstances: string[] = [];
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getWorkingPipedInstances(): Promise<string[]> {
  // Return cached if fresh
  if (cachedInstances.length > 0 && Date.now() - cacheTime < CACHE_TTL) {
    return cachedInstances;
  }

  try {
    const response = await fetch('https://piped-instances.kavin.rocks/', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);

    const instances = await response.json();
    
    // Filter for instances with good uptime and API access, sort by uptime
    const working = instances
      .filter((i: any) => i.api_url && i.uptime_24h >= 90)
      .sort((a: any, b: any) => (b.uptime_24h || 0) - (a.uptime_24h || 0))
      .map((i: any) => i.api_url)
      .slice(0, 8);

    if (working.length > 0) {
      cachedInstances = working;
      cacheTime = Date.now();
      console.log(`Discovered ${working.length} Piped instances`);
    }

    return working;
  } catch (error) {
    console.log('Failed to fetch Piped instances list:', error.message);
    // Fallback to known reliable instances
    return [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.private.coffee',
      'https://piped-api.hostux.net',
      'https://pipedapi.cl7.it',
      'https://api-piped.mha.fi',
      'https://pipedapi.astreapp.it',
      'https://pipedapi.adminforge.de',
    ];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoId = url.searchParams.get('videoId');
    const shouldStream = url.searchParams.get('stream') === '1';
    const shouldDownload = url.searchParams.get('download') === '1';
    const title = url.searchParams.get('title') || 'audio';

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let audioUrl = null;
    let lastError = null;

    // Get working Piped instances dynamically
    const pipedInstances = await getWorkingPipedInstances();

    for (const instance of pipedInstances) {
      try {
        const apiUrl = `${instance}/streams/${videoId}`;
        console.log(`Trying Piped: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          console.log(`Piped ${instance} returned ${response.status}`);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.log(`Piped ${instance} returned non-JSON: ${contentType}`);
          continue;
        }

        const data = await response.json();

        if (data.audioStreams && data.audioStreams.length > 0) {
          // Sort by bitrate descending, prefer mp4
          const sorted = data.audioStreams
            .filter((s: any) => s.url)
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

          const mp4Stream = sorted.find((s: any) =>
            s.mimeType?.includes('audio/mp4') || s.format === 'M4A'
          );
          audioUrl = mp4Stream?.url || sorted[0]?.url;

          if (audioUrl) {
            console.log(`Got audio URL from Piped: ${instance}`);
            break;
          }
        }
      } catch (error) {
        lastError = error;
        console.log(`Piped ${instance} failed:`, error.message || error);
        continue;
      }
    }

    // Fallback to Invidious if Piped fails
    if (!audioUrl) {
      const invidiousInstances = [
        'https://inv.nadeko.net',
        'https://invidious.nerdvpn.de',
        'https://invidious.flokinet.to',
        'https://yewtu.be',
        'https://invidious.io.lol',
        'https://iv.melmac.space',
        'https://invidious.lunar.icu',
      ];

      for (const instance of invidiousInstances) {
        try {
          const apiUrl = `${instance}/api/v1/videos/${videoId}`;
          const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
          });

          if (!response.ok) continue;

          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('json')) {
            console.log(`Invidious ${instance} returned non-JSON: ${contentType}`);
            continue;
          }

          const data = await response.json();

          if (data.adaptiveFormats) {
            const audioFormats = data.adaptiveFormats
              .filter((f: any) => f.type?.startsWith('audio/'))
              .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

            if (audioFormats.length > 0) {
              const mp4Audio = audioFormats.find((f: any) => f.type?.includes('mp4'));
              audioUrl = mp4Audio?.url || audioFormats[0].url;
              if (audioUrl) {
                console.log(`Got audio URL from Invidious: ${instance}`);
                break;
              }
            }
          }
        } catch (error) {
          lastError = error;
          console.log(`Invidious ${instance} failed:`, error.message || error);
          continue;
        }
      }
    }

    if (!audioUrl) {
      console.error('Failed to get audio URL from all instances:', lastError?.message || lastError);
      return new Response(
        JSON.stringify({ error: 'Could not retrieve audio URL', fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (shouldStream || shouldDownload || url.searchParams.has('download')) {
      const upstreamHeaders: HeadersInit = {};
      const range = req.headers.get('range');
      if (range) upstreamHeaders.Range = range;

      const audioResponse = await fetch(audioUrl, {
        headers: upstreamHeaders,
        signal: AbortSignal.timeout(25000),
      });

      if (!audioResponse.ok && audioResponse.status !== 206) {
        return new Response(
          JSON.stringify({ error: 'Audio stream unavailable', fallback: true }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', audioResponse.headers.get('content-type') || 'audio/mp4');
      
      if (shouldDownload || url.searchParams.has('download')) {
        const safeTitle = title.replace(/[<>:"/\\|?*]/g, '').trim();
        headers.set('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
        headers.set('Content-Type', 'audio/mpeg');
      }

      for (const header of ['content-length', 'content-range', 'accept-ranges']) {
        const value = audioResponse.headers.get(header);
        if (value) headers.set(header, value);
      }

      return new Response(audioResponse.body, {
        status: audioResponse.status,
        headers,
      });
    }

    return new Response(
      JSON.stringify({ audioUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', fallback: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
