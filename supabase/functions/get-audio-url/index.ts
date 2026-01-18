import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoId = url.searchParams.get('videoId');

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Invidious API to get audio stream URL (privacy-focused YouTube frontend)
    // This provides direct audio URLs that work for background playback
    const invidiousInstances = [
      'https://inv.nadeko.net',
      'https://invidious.nerdvpn.de',
      'https://invidious.privacyredirect.com',
      'https://vid.puffyan.us',
      'https://invidious.snopyta.org',
    ];

    let audioUrl = null;
    let lastError = null;

    for (const instance of invidiousInstances) {
      try {
        const apiUrl = `${instance}/api/v1/videos/${videoId}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        
        // Find the best audio format
        if (data.adaptiveFormats) {
          // Sort by audio quality (bitrate)
          const audioFormats = data.adaptiveFormats
            .filter((f: any) => f.type?.startsWith('audio/'))
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

          if (audioFormats.length > 0) {
            // Prefer mp4 audio for better compatibility
            const mp4Audio = audioFormats.find((f: any) => f.type?.includes('mp4'));
            audioUrl = mp4Audio?.url || audioFormats[0].url;
            break;
          }
        }
      } catch (error) {
        lastError = error;
        console.log(`Instance ${instance} failed:`, error);
        continue;
      }
    }

    if (!audioUrl) {
      console.error('Failed to get audio URL from all instances:', lastError);
      return new Response(
        JSON.stringify({ 
          error: 'Could not retrieve audio URL',
          fallback: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
