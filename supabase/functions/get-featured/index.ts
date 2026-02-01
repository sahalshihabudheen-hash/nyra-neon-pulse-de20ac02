import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      console.error("YouTube API key not configured");
      return new Response(
        JSON.stringify({ error: "YouTube API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use current date to seed randomness for daily rotation
    const now = new Date();
    const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    
    // Different featured categories that rotate daily
    const featuredCategories = [
      "viral music video today",
      "new music release this week",
      "top chart song today",
      "popular music video new",
      "hit song trending now",
      "music video premiere",
      "new single release today",
    ];
    
    // Use date to pick category (simple hash)
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const categoryIndex = dayOfYear % featuredCategories.length;
    const searchQuery = featuredCategories[categoryIndex];
    
    console.log(`Fetching featured track with query: ${searchQuery} (date: ${dateString})`);

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_API_KEY}`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API error:", data);
      return new Response(
        JSON.stringify({ error: data.error?.message || "Failed to fetch featured" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data.items || data.items.length === 0) {
      return new Response(
        JSON.stringify(null),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick one based on day
    const itemIndex = dayOfYear % data.items.length;
    const item = data.items[itemIndex];

    const featured = {
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.medium?.url,
      channel: item.snippet.channelTitle,
    };

    return new Response(
      JSON.stringify(featured),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Featured fetch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
