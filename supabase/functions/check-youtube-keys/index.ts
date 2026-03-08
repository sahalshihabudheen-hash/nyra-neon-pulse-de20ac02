import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Handle POST for toggling key enabled/disabled
    if (req.method === "POST") {
      const { keyLabel, enabled } = await req.json();
      
      // Get current disabled keys
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "disabled_youtube_keys")
        .single();

      let disabledKeys: string[] = (setting?.value as string[]) || [];

      if (enabled) {
        disabledKeys = disabledKeys.filter((k: string) => k !== keyLabel);
      } else {
        if (!disabledKeys.includes(keyLabel)) disabledKeys.push(keyLabel);
      }

      await supabase
        .from("app_settings")
        .upsert({ key: "disabled_youtube_keys", value: disabledKeys as any }, { onConflict: "key" });

      return new Response(JSON.stringify({ success: true, disabledKeys }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: check all keys
    const keys = getYouTubeApiKeys();
    console.log(`Checking ${keys.length} YouTube API keys`);

    // Get disabled keys from app_settings
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "disabled_youtube_keys")
      .single();

    const disabledKeys: string[] = (setting?.value as string[]) || [];

    const results = await Promise.all(
      keys.map(async (key, index) => {
        const label = index === 0 ? "YOUTUBE_API_KEY" : `YOUTUBE_API_KEY_${index + 1}`;
        const isDisabled = disabledKeys.includes(label);

        if (isDisabled) {
          return { key: label, status: "disabled", message: "Disabled", enabled: false, isCurrentlyUsed: false };
        }

        try {
          const url = `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${key}`;
          const response = await fetch(url);
          const data = await response.json();

          if (response.ok && !data.error) {
            return { key: label, status: "active", message: "Working", enabled: true, isCurrentlyUsed: false };
          }

          const errorMsg = data?.error?.message || `Error ${response.status}`;
          const isQuota = /quota|limit|rate/i.test(errorMsg);
          const isExpired = /expired|invalid/i.test(errorMsg);

          return {
            key: label,
            status: isQuota ? "quota_exceeded" : isExpired ? "expired" : "error",
            message: isQuota ? "Quota exceeded" : isExpired ? "Key expired/invalid" : errorMsg,
            enabled: true,
            isCurrentlyUsed: false,
          };
        } catch (err) {
          return {
            key: label,
            status: "error",
            message: err instanceof Error ? err.message : "Network error",
            enabled: true,
            isCurrentlyUsed: false,
          };
        }
      })
    );

    // Mark the first active (working + enabled) key as "currently in use"
    // This mirrors the failover logic: rotation start + first working key
    const startIndex = keys.length > 0 ? Math.floor(Date.now() / 60_000) % keys.length : 0;
    for (let i = 0; i < results.length; i++) {
      const idx = (startIndex + i) % results.length;
      if (results[idx].status === "active" && results[idx].enabled) {
        results[idx].isCurrentlyUsed = true;
        break;
      }
    }

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
