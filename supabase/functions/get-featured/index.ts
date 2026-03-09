import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchYouTubeWithBackupFailover, getYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check if manual mode is set
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: modeRow } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "featured_mode")
      .maybeSingle();

    const mode = modeRow?.value;

    if (mode === "manual") {
      const { data: trackRow } = await sb
        .from("app_settings")
        .select("value")
        .eq("key", "featured_manual_track")
        .maybeSingle();

      const track = trackRow?.value as any;
      if (track && track.id) {
        return new Response(JSON.stringify(track), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Auto mode — fetch from YouTube
    const keys = await getYouTubeApiKeys();

    const now = new Date();
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

    console.log(`Fetching featured track with query: ${searchQuery} using ${keys.length} API keys`);

    const result = await fetchYouTubeWithBackupFailover(
      keys,
      (apiKey) => `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`,
    );

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result.data.items || result.data.items.length === 0) {
      return new Response(JSON.stringify(null), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemIndex = dayOfYear % result.data.items.length;
    const item = result.data.items[itemIndex];

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
