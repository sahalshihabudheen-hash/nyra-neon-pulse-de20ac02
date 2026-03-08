import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const keys = getYouTubeApiKeys();
    console.log(`Checking ${keys.length} YouTube API keys`);

    const results = await Promise.all(
      keys.map(async (key, index) => {
        const label = index === 0 ? "YOUTUBE_API_KEY" : `YOUTUBE_API_KEY_${index + 1}`;
        try {
          // Use videos.list with a known video ID - costs only 1 quota unit
          const url = `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${key}`;
          const response = await fetch(url);
          const data = await response.json();

          if (response.ok && !data.error) {
            return { key: label, status: "active", message: "Working", quotaUsed: false };
          }

          const errorMsg = data?.error?.message || `Error ${response.status}`;
          const isQuota = /quota|limit|rate/i.test(errorMsg);
          const isExpired = /expired|invalid/i.test(errorMsg);

          return {
            key: label,
            status: isQuota ? "quota_exceeded" : isExpired ? "expired" : "error",
            message: isQuota ? "Quota exceeded" : isExpired ? "Key expired/invalid" : errorMsg,
          };
        } catch (err) {
          return {
            key: label,
            status: "error",
            message: err instanceof Error ? err.message : "Network error",
          };
        }
      })
    );

    return new Response(JSON.stringify({ keys: results, total: keys.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check keys error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
