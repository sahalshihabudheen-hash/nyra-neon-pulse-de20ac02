import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseUserAgent(ua: string): { deviceType: string; deviceInfo: string } {
  if (!ua) return { deviceType: "Unknown", deviceInfo: "Unknown" };

  let deviceType = "Desktop";
  let deviceInfo = "";

  // Detect mobile devices
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);

  if (isTablet) {
    deviceType = "Tablet";
  } else if (isMobile) {
    deviceType = "Phone";
  }

  // Extract device model
  const iphoneMatch = ua.match(/iPhone/);
  const ipadMatch = ua.match(/iPad/);
  const androidMatch = ua.match(/Android\s[\d.]+;\s*([^;)]+)/);
  const macMatch = ua.match(/Macintosh/);
  const windowsMatch = ua.match(/Windows NT ([\d.]+)/);
  const linuxMatch = ua.match(/Linux/);
  const chromeOsMatch = ua.match(/CrOS/);

  if (iphoneMatch) {
    deviceInfo = "iPhone";
  } else if (ipadMatch) {
    deviceInfo = "iPad";
  } else if (androidMatch) {
    deviceInfo = androidMatch[1].trim();
  } else if (macMatch) {
    deviceInfo = "Mac";
  } else if (windowsMatch) {
    const versions: Record<string, string> = {
      "10.0": "Windows 10/11", "6.3": "Windows 8.1", "6.2": "Windows 8", "6.1": "Windows 7"
    };
    deviceInfo = versions[windowsMatch[1]] || `Windows NT ${windowsMatch[1]}`;
  } else if (chromeOsMatch) {
    deviceInfo = "Chromebook";
  } else if (linuxMatch) {
    deviceInfo = "Linux PC";
  }

  // Extract browser
  const braveMatch = ua.match(/Brave/);
  const edgeMatch = ua.match(/Edg\/([\d.]+)/);
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
  const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
  const safariMatch = ua.match(/Safari\/([\d.]+)/) && !chromeMatch;

  let browser = "";
  if (braveMatch) browser = "Brave";
  else if (edgeMatch) browser = "Edge";
  else if (firefoxMatch) browser = "Firefox";
  else if (chromeMatch) browser = "Chrome";
  else if (safariMatch) browser = "Safari";

  if (browser) {
    deviceInfo = deviceInfo ? `${deviceInfo} • ${browser}` : browser;
  }

  return { deviceType, deviceInfo };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Tracking location for user: ${user.id} (${user.email})`);

    // Parse request body for GPS coordinates and user agent
    let gpsLat: number | null = null;
    let gpsLon: number | null = null;
    let clientUserAgent = "";

    try {
      const body = await req.json();
      gpsLat = body.latitude ?? null;
      gpsLon = body.longitude ?? null;
      clientUserAgent = body.userAgent || "";
    } catch {
      // No body or invalid JSON
    }

    // Fallback to request header user agent
    if (!clientUserAgent) {
      clientUserAgent = req.headers.get("user-agent") || "";
    }

    // Parse device info from user agent
    const { deviceType, deviceInfo } = parseUserAgent(clientUserAgent);
    console.log(`Device: ${deviceType} - ${deviceInfo}`);

    // Get IP for fallback
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfIp = req.headers.get("cf-connecting-ip");
    const userIp = cfIp || (forwarded ? forwarded.split(",")[0].trim() : realIp) || "unknown";

    let locationData = {
      country: "Unknown",
      state: "Unknown",
      city: "Unknown",
      latitude: 0,
      longitude: 0,
      timezone: "",
      isp: "",
    };

    if (gpsLat !== null && gpsLon !== null) {
      // Use GPS coordinates - reverse geocode with BigDataCloud (free, no key needed)
      console.log(`Using GPS coordinates: ${gpsLat}, ${gpsLon}`);
      try {
        const geoResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${gpsLat}&longitude=${gpsLon}&localityLanguage=en`
        );
        const geoData = await geoResponse.json();
        console.log(`Reverse geocode response:`, JSON.stringify(geoData));

        locationData = {
          country: geoData.countryName || "Unknown",
          state: geoData.principalSubdivision || "Unknown",
          city: geoData.city || geoData.locality || "Unknown",
          latitude: gpsLat,
          longitude: gpsLon,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
          isp: "",
        };
      } catch (geoError) {
        console.error("Reverse geocode error:", geoError);
        locationData.latitude = gpsLat;
        locationData.longitude = gpsLon;
      }
    } else {
      // Fallback to IP-based geolocation
      console.log(`Using IP-based geolocation: ${userIp}`);
      try {
        const geoResponse = await fetch(
          `http://ip-api.com/json/${userIp}?fields=status,message,country,regionName,city,lat,lon,timezone,isp`
        );
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
        }
      } catch (geoError) {
        console.error("Geolocation API error:", geoError);
      }
    }

    // Upsert location
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
          device_type: deviceType,
          device_info: deviceInfo,
          user_agent: clientUserAgent,
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

    console.log(`Location saved: ${locationData.city}, ${locationData.state}, ${locationData.country} (${deviceType})`);

    return new Response(
      JSON.stringify({
        success: true,
        location: {
          country: locationData.country,
          state: locationData.state,
          city: locationData.city,
        },
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
