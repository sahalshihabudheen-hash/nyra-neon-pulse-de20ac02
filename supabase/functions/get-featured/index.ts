import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithKey(apiKey: string, searchQuery: string) {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
  const response = await fetch(searchUrl);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "YouTube API error");
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const keys = [
      Deno.env.get("YOUTUBE_API_KEY"),
      Deno.env.get("YOUTUBE_API_KEY_2"),
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      return new Response(
        JSON.stringify({ error: "YouTube API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    const featuredCategories = [
      "viral music video today",
      "new music release this week",
      "top chart song today",
      "popular music video new",
      "hit song trending now",
      "music video premiere",
      "new single release today",
    ];

    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const categoryIndex = dayOfYear % featuredCategories.length;
    const searchQuery = featuredCategories[categoryIndex];

    console.log(`Fetching featured track with query: ${searchQuery} (date: ${dateString})`);

    let data;
    let lastError;
    for (const key of keys) {
      try {
        data = await fetchWithKey(key, searchQuery);
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Key failed, trying next: ${err.message}`);
      }
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: lastError?.message || "All API keys exhausted" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data.items || data.items.length === 0) {
      return new Response(JSON.stringify(null), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemIndex = dayOfYear % data.items.length;
    const item = data.items[itemIndex];

    const featured = {
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.medium?.url,
      channel: item.snippet.channelTitle,
    };

    return new Response(JSON.stringify(featured), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Featured fetch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
