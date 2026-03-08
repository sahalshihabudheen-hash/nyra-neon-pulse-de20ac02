import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchYouTubeWithBackupFailover, getYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";

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

  return fetchYouTubeWithFailover(
    keys,
    (apiKey) => `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const result = await fetchTrendingTracks();

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result.data.items || result.data.items.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tracks = result.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channel: item.snippet.channelTitle,
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
