import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseUserAgent(ua: string, hints?: { hasBattery?: boolean; hasTouchScreen?: boolean; screenWidth?: number; screenHeight?: number }): { deviceType: string; deviceInfo: string } {
  if (!ua) return { deviceType: "Unknown", deviceInfo: "Unknown" };

  let deviceType = "Desktop PC";
  let deviceInfo = "";

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
  // Match Android device: "Android X.X; MODEL" or "Android X.X; xx-xx; MODEL"
  const androidMatch = ua.match(/Android\s[\d.]+;\s*(?:[a-z]{2}-[a-z]{2};\s*)?([^;)]+)/i);
  const macMatch = ua.match(/Macintosh/);
  const windowsMatch = ua.match(/Windows NT ([\d.]+)/);
  const linuxMatch = ua.match(/Linux/);
  const chromeOsMatch = ua.match(/CrOS/);

  if (iphoneMatch) {
    // Try to get iOS version for rough model mapping
    const iosVersion = ua.match(/iPhone OS (\d+)/);
    deviceInfo = "iPhone";
    if (iosVersion) {
      const ver = parseInt(iosVersion[1]);
      if (ver >= 18) deviceInfo = "iPhone (iOS 18+)";
      else if (ver >= 17) deviceInfo = "iPhone (iOS 17)";
      else if (ver >= 16) deviceInfo = "iPhone (iOS 16)";
      else deviceInfo = `iPhone (iOS ${ver})`;
    }
  } else if (ipadMatch) {
    deviceInfo = "iPad";
  } else if (androidMatch) {
    let model = androidMatch[1].trim();
    // Remove "Build/" suffix if present
    model = model.replace(/\s*Build\/.*$/i, "").trim();
    
    // Map common manufacturer codes to friendly names
    const brandMap: [RegExp, string][] = [
      [/^SM-[A-Z]\d/i, "Samsung"],
      [/^Galaxy/i, "Samsung"],
      [/^Pixel/i, "Google Pixel"],
      [/^M\d{4}/i, "Xiaomi"],
      [/^Redmi/i, "Xiaomi Redmi"],
      [/^POCO/i, "Xiaomi POCO"],
      [/^Mi\s/i, "Xiaomi"],
      [/^2\d{3}[A-Z]/i, "Xiaomi"],
      [/^V\d{4}/i, "Vivo"],
      [/^vivo/i, "Vivo"],
      [/^CPH\d/i, "Oppo"],
      [/^OPPO/i, "Oppo"],
      [/^RMX\d/i, "Realme"],
      [/^realme/i, "Realme"],
      [/^IN\d{4}/i, "Micromax"],
      [/^LE\d/i, "Lenovo"],
      [/^Lenovo/i, "Lenovo"],
      [/^moto/i, "Motorola"],
      [/^Nokia/i, "Nokia"],
      [/^ASUS/i, "Asus"],
      [/^OnePlus/i, "OnePlus"],
      [/^KB\d/i, "OnePlus"],
      [/^LM-/i, "LG"],
      [/^Infinix/i, "Infinix"],
      [/^TECNO/i, "Tecno"],
      [/^itel/i, "Itel"],
      [/^HUAWEI/i, "Huawei"],
      [/^Honor/i, "Honor"],
      [/^Nothing/i, "Nothing"],
    ];

    let brand = "";
    for (const [pattern, name] of brandMap) {
      if (pattern.test(model)) {
        brand = name;
        break;
      }
    }

    // Samsung model name mapping for common codes
    if (brand === "Samsung" && /^SM-/i.test(model)) {
      const samsungModels: Record<string, string> = {
        "SM-A546": "Galaxy A54", "SM-A556": "Galaxy A55", "SM-A356": "Galaxy A35",
        "SM-A256": "Galaxy A25", "SM-A156": "Galaxy A15", "SM-A057": "Galaxy A05s",
        "SM-S928": "Galaxy S24 Ultra", "SM-S926": "Galaxy S24+", "SM-S921": "Galaxy S24",
        "SM-S918": "Galaxy S23 Ultra", "SM-S916": "Galaxy S23+", "SM-S911": "Galaxy S23",
        "SM-S908": "Galaxy S22 Ultra", "SM-S906": "Galaxy S22+", "SM-S901": "Galaxy S22",
        "SM-G991": "Galaxy S21", "SM-G996": "Galaxy S21+", "SM-G998": "Galaxy S21 Ultra",
        "SM-F946": "Galaxy Z Fold5", "SM-F731": "Galaxy Z Flip5",
        "SM-F956": "Galaxy Z Fold6", "SM-F741": "Galaxy Z Flip6",
        "SM-M346": "Galaxy M34", "SM-M546": "Galaxy M54", "SM-M156": "Galaxy M15",
        "SM-A155": "Galaxy A15", "SM-A346": "Galaxy A34", "SM-A536": "Galaxy A53",
      };
      const prefix = model.substring(0, 6).toUpperCase();
      const friendly = samsungModels[prefix];
      if (friendly) {
        deviceInfo = `Samsung ${friendly}`;
      } else {
        deviceInfo = `Samsung ${model}`;
      }
    } else if (brand) {
      // For known brands, show "Brand Model"
      if (model.toLowerCase().startsWith(brand.toLowerCase().split(" ")[0].toLowerCase())) {
        deviceInfo = model; // Already has brand name
      } else {
        deviceInfo = `${brand} ${model}`;
      }
    } else {
      deviceInfo = model || "Android Device";
    }
  } else if (macMatch) {
    // Use battery hint to distinguish laptop vs desktop
    if (hints?.hasBattery) {
      deviceType = "Laptop";
      deviceInfo = "MacBook";
    } else {
      deviceType = "Desktop PC";
      deviceInfo = "Mac (iMac/Mac Mini/Studio)";
    }
  } else if (windowsMatch) {
    const versions: Record<string, string> = {
      "10.0": "Windows 10/11", "6.3": "Windows 8.1", "6.2": "Windows 8", "6.1": "Windows 7"
    };
    const winVersion = versions[windowsMatch[1]] || `Windows NT ${windowsMatch[1]}`;
    if (hints?.hasBattery) {
      deviceType = "Laptop";
      deviceInfo = `${winVersion} Laptop`;
    } else {
      deviceType = "Desktop PC";
      deviceInfo = `${winVersion} Desktop`;
    }
  } else if (chromeOsMatch) {
    deviceType = hints?.hasBattery ? "Laptop" : "Desktop PC";
    deviceInfo = "Chromebook";
  } else if (linuxMatch) {
    deviceType = hints?.hasBattery ? "Laptop" : "Desktop PC";
    deviceInfo = "Linux PC";
  }

  // Extract browser
  const braveMatch = ua.match(/Brave/);
  const edgeMatch = ua.match(/Edg\/([\d.]+)/);
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
  const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
  const safariMatch = ua.match(/Safari\/([\d.]+)/) && !chromeMatch;
  const operaMatch = ua.match(/OPR\//);
  const samsungBrowser = ua.match(/SamsungBrowser/);
  const ucBrowser = ua.match(/UCBrowser/);
  const miBrowser = ua.match(/MiuiBrowser/);

  let browser = "";
  if (samsungBrowser) browser = "Samsung Browser";
  else if (ucBrowser) browser = "UC Browser";
  else if (miBrowser) browser = "Mi Browser";
  else if (operaMatch) browser = "Opera";
  else if (braveMatch) browser = "Brave";
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

    // Parse request body for user agent
    let clientUserAgent = "";

    try {
      const body = await req.json();
      clientUserAgent = body.userAgent || "";
    } catch {
      // No body
    }

    if (!clientUserAgent) {
      clientUserAgent = req.headers.get("user-agent") || "";
    }

    const { deviceType, deviceInfo } = parseUserAgent(clientUserAgent);
    console.log(`Device: ${deviceType} - ${deviceInfo}`);

    // Get IP
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfIp = req.headers.get("cf-connecting-ip");
    const userIp = cfIp || (forwarded ? forwarded.split(",")[0].trim() : realIp) || "unknown";
    console.log(`Detected IP: ${userIp}`);

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
