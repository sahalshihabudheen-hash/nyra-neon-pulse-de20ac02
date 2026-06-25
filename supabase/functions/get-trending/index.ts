import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchYouTubeWithBackupFailover, getYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";
import { getRequestUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchTrendingTracks() {
  const keys = await getYouTubeApiKeys();

  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const searchQuery = `trending music ${month} ${year} hits`;

  console.log(`Fetching trending music with query: ${searchQuery} using ${keys.length} API keys`);

  return fetchYouTubeWithBackupFailover(
    keys,
    (apiKey) => `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require an authenticated user to prevent anonymous YouTube quota abuse.
  const user = await getRequestUser(req);
  if (!user) return unauthorized(corsHeaders);

  try {
    const result = await fetchTrendingTracks();

    if (!result.ok) {
      console.warn('YouTube Trending API failed, trying Piped fallback...');
      const now = new Date();
      const month = now.toLocaleString('en-US', { month: 'long' });
      const year = now.getFullYear();
      const searchQuery = `trending music ${month} ${year} hits`;

      const pipedInstances = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.private.coffee',
        'https://piped-api.hostux.net',
        'https://pipedapi.cl7.it',
        'https://api-piped.mha.fi',
      ];

      for (const instance of pipedInstances) {
        try {
          const pipedUrl = `${instance}/search?q=${encodeURIComponent(searchQuery)}&filter=videos`;
          const pipedResponse = await fetch(pipedUrl, { signal: AbortSignal.timeout(5000) });
          if (pipedResponse.ok) {
            const pipedData = await pipedResponse.json();
            if (pipedData.items && pipedData.items.length > 0) {
              const pipedTracks = pipedData.items.map((item: any) => ({
                id: item.url?.split('v=')[1] || item.url?.split('/').pop() || item.id,
                title: item.title,
                thumbnail: item.thumbnail,
                channel: item.uploaderName || item.channelName,
                channelId: item.uploaderUrl?.split('/').pop() || item.uploaderUrl || item.channelId,
              }));
              console.log(`Found trending results via Piped fallback (${instance})`);
              return new Response(JSON.stringify(pipedTracks), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        } catch (e) {
          console.error(`Piped fallback trending failed for ${instance}:`, e.message);
        }
      }

      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tracks = result.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
    }));


    return new Response(JSON.stringify(tracks), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Trending fetch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
