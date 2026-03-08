import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getAllYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";

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
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      // Add a new API key
      if (action === "add_key") {
        const { keyName, keyValue } = body;
        if (!keyName || !keyValue) {
          return new Response(JSON.stringify({ error: "keyName and keyValue required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get existing extra keys
        const { data: setting } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "extra_youtube_keys")
          .single();

        const extraKeys: { label: string; value: string }[] = (setting?.value as any[]) || [];
        
        // Check for duplicate name
        if (extraKeys.some(k => k.label === keyName)) {
          return new Response(JSON.stringify({ error: "Key with that name already exists" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        extraKeys.push({ label: keyName, value: keyValue });

        await supabase
          .from("app_settings")
          .upsert({ key: "extra_youtube_keys", value: extraKeys as any }, { onConflict: "key" });

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete an extra key
      if (action === "delete_key") {
        const { keyName } = body;
        const { data: setting } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "extra_youtube_keys")
          .single();

        let extraKeys: { label: string; value: string }[] = (setting?.value as any[]) || [];
        extraKeys = extraKeys.filter(k => k.label !== keyName);

        await supabase
          .from("app_settings")
          .upsert({ key: "extra_youtube_keys", value: extraKeys as any }, { onConflict: "key" });

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Toggle key enabled/disabled
      const { keyLabel, enabled } = body;
      const { data: disabledSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "disabled_youtube_keys")
        .single();

      let disabledKeys: string[] = (disabledSetting?.value as string[]) || [];

      if (enabled) {
        disabledKeys = disabledKeys.filter((k: string) => k !== keyLabel);
      } else {
        if (!disabledKeys.includes(keyLabel)) disabledKeys.push(keyLabel);
      }

      await supabase
        .from("app_settings")
        .upsert({ key: "disabled_youtube_keys", value: disabledKeys as any }, { onConflict: "key" });

      return new Response(JSON.stringify({ success: true, disabledKeys }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: check all keys
    const allKeys = await getAllYouTubeApiKeys();
    console.log(`Checking ${allKeys.length} YouTube API keys`);

    const { data: disabledSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "disabled_youtube_keys")
      .single();

    const disabledKeys: string[] = (disabledSetting?.value as string[]) || [];

    const results = await Promise.all(
      allKeys.map(async ({ label, value: apiKey }) => {
        const isDisabled = disabledKeys.includes(label);

        if (isDisabled) {
          return { key: label, status: "disabled", message: "Disabled", enabled: false, isCurrentlyUsed: false };
        }

        try {
          const url = `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${apiKey}`;
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

    // Mark the first active key as currently in use
    const startIndex = allKeys.length > 0 ? Math.floor(Date.now() / 60_000) % allKeys.length : 0;
    for (let i = 0; i < results.length; i++) {
      const idx = (startIndex + i) % results.length;
      if (results[idx].status === "active" && results[idx].enabled) {
        results[idx].isCurrentlyUsed = true;
        break;
      }
    }

    return new Response(JSON.stringify({ keys: results, total: allKeys.length }), {
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
