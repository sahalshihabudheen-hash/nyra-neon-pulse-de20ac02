import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Tracking location for user: ${user.id} (${user.email})`);

    // Get user's IP from request headers
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfIp = req.headers.get("cf-connecting-ip");
    const userIp = cfIp || (forwarded ? forwarded.split(",")[0].trim() : realIp) || "unknown";
    
    console.log(`Detected IP: ${userIp}`);

    // Call free IP geolocation API
    let locationData = {
      country: "Unknown",
      state: "Unknown",
      city: "Unknown",
      latitude: 0,
      longitude: 0,
      timezone: "",
      isp: "",
    };

    try {
      // ip-api.com is free for non-commercial use, 45 req/min
      const geoResponse = await fetch(`http://ip-api.com/json/${userIp}?fields=status,message,country,regionName,city,lat,lon,timezone,isp`);
      const geoData = await geoResponse.json();
      
      console.log(`Geo API response:`, JSON.stringify(geoData));

      if (geoData.status === "success") {
        locationData = {
          country: geoData.country || "Unknown",
          state: geoData.regionName || "Unknown",
          city: geoData.city || "Unknown",
          latitude: geoData.lat || 0,
          longitude: geoData.lon || 0,
          timezone: geoData.timezone || "",
          isp: geoData.isp || "",
        };
      } else {
        console.warn(`Geo API failed: ${geoData.message}`);
      }
    } catch (geoError) {
      console.error("Geolocation API error:", geoError);
    }

    // Upsert location using service role (to bypass RLS for upsert)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error: upsertError } = await supabaseAdmin
      .from("user_locations")
      .upsert(
        {
          user_id: user.id,
          country: locationData.country,
          state: locationData.state,
          city: locationData.city,
          ip_address: userIp,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timezone: locationData.timezone,
          isp: locationData.isp,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Location saved: ${locationData.city}, ${locationData.state}, ${locationData.country}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        location: {
          country: locationData.country,
          state: locationData.state,
          city: locationData.city,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Track location error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
