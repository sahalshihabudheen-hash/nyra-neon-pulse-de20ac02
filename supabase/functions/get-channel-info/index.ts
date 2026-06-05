import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAllYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";
import { getRequestUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require an authenticated user to prevent anonymous YouTube quota abuse.
  const user = await getRequestUser(req);
  if (!user) return unauthorized(corsHeaders);

  try {
    const url = new URL(req.url);
    const channelId = url.searchParams.get("channelId");

    if (!channelId) {
      return new Response(JSON.stringify({ error: "channelId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keys = await getAllYouTubeApiKeys();

    for (const { value: apiKey } of keys) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
        const res = await fetch(apiUrl);

        if (!res.ok) continue;

        const data = await res.json();
        if (data.error) continue;

        const channel = data.items?.[0];
        if (!channel) continue;

        const snippet = channel.snippet || {};
        const stats = channel.statistics || {};

        const photo =
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          null;

        const subCount = parseInt(stats.subscriberCount || "0", 10);
        let subscribers = "";
        if (subCount >= 1_000_000) subscribers = `${(subCount / 1_000_000).toFixed(1)}M`;
        else if (subCount >= 1_000) subscribers = `${(subCount / 1_000).toFixed(1)}K`;
        else subscribers = subCount.toString();

        return new Response(
          JSON.stringify({
            photo,
            subscribers,
            name: snippet.title || "",
            description: snippet.description || "",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch {
        continue;
      }
    }

    return new Response(JSON.stringify({ photo: null, subscribers: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
