import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const trackId = url.searchParams.get('id');
  const trackTitle = url.searchParams.get('title') || 'Unknown Track';
  const trackChannel = url.searchParams.get('channel') || 'NYRA';
  const trackThumbnail = url.searchParams.get('thumbnail') || '';

  // Fetch app settings for branding
  let appName = 'NYRA';
  let appLogo = '';
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['app_name', 'app_logo_url']);
    
    data?.forEach((row: any) => {
      if (row.key === 'app_name' && typeof row.value === 'string') appName = row.value;
      if (row.key === 'app_logo_url' && typeof row.value === 'string') appLogo = row.value;
    });
  } catch {}

  // HTML-encode every value before embedding to prevent reflected XSS.
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Only allow plausible YouTube video ids in the redirect / fallback image.
  const safeTrackId = /^[A-Za-z0-9_-]{1,20}$/.test(trackId || "") ? trackId : "";
  const rawThumbnail = trackThumbnail || (safeTrackId ? `https://img.youtube.com/vi/${safeTrackId}/hqdefault.jpg` : "");
  // Only allow http(s) image URLs to avoid javascript:/data: injection.
  const safeThumbnail = /^https?:\/\//i.test(rawThumbnail) ? esc(rawThumbnail) : "";
  const safeTitle = esc(trackTitle);
  const safeChannel = esc(trackChannel);
  const safeAppName = esc(appName);
  const redirectBase = url.origin.replace("/functions/v1/og-embed", "");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeChannel} · Playing on ${safeAppName}" />
  <meta property="og:image" content="${safeThumbnail}" />
  <meta property="og:type" content="music.song" />
  <meta property="og:site_name" content="${safeAppName}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeChannel} · ${safeAppName}" />
  <meta name="twitter:image" content="${safeThumbnail}" />
  <meta name="theme-color" content="#ffd300" />
  <meta http-equiv="refresh" content="0;url=${esc(redirectBase)}/?play=${esc(safeTrackId)}" />
</head>
<body>
  <p>Redirecting to ${safeAppName}...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
