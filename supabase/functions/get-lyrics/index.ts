import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackId, trackTitle, trackChannel } = await req.json();

    if (!trackId || !trackTitle) {
      return new Response(JSON.stringify({ error: "Missing trackId or trackTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache/manual override first
    const { data: cached } = await supabase
      .from("lyrics")
      .select("lyrics_text, source")
      .eq("track_id", trackId)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({ lyrics: cached.lyrics_text, source: cached.source }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate with AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a lyrics assistant. When given a song title and artist, provide the full lyrics of the song. 
If you know the actual lyrics, provide them exactly. If you don't know the exact lyrics, provide your best approximation and note it.
Format the lyrics with proper line breaks. Include section markers like [Verse 1], [Chorus], [Bridge] etc.
Only return the lyrics text, nothing else.`,
          },
          {
            role: "user",
            content: `Provide the lyrics for "${trackTitle}" by ${trackChannel || "Unknown Artist"}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const lyricsText = aiData.choices?.[0]?.message?.content?.trim();

    if (!lyricsText) {
      return new Response(JSON.stringify({ error: "Could not generate lyrics" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache in DB (fire and forget)
    supabase
      .from("lyrics")
      .insert({
        track_id: trackId,
        track_title: trackTitle,
        track_channel: trackChannel || "Unknown",
        lyrics_text: lyricsText,
        source: "ai",
      })
      .then(() => {});

    return new Response(
      JSON.stringify({ lyrics: lyricsText, source: "ai" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-lyrics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
