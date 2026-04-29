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

  const thumbnail = trackThumbnail || `https://img.youtube.com/vi/${trackId}/hqdefault.jpg`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${trackTitle.replace(/"/g, '&quot;')}</title>
  <meta property="og:title" content="${trackTitle.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${trackChannel.replace(/"/g, '&quot;')} · Playing on ${appName}" />
  <meta property="og:image" content="${thumbnail}" />
  <meta property="og:type" content="music.song" />
  <meta property="og:site_name" content="${appName}" />
  
  <meta property="og:url" content="${url.href}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${trackTitle.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${trackChannel.replace(/"/g, '&quot;')} · ${appName}" />
  <meta name="twitter:image" content="${thumbnail}" />
  
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="theme-color" content="#ffd300" />
  
  <meta http-equiv="refresh" content="0;url=https://nyra-neon-pulse-23e4f39d.vercel.app/?play=${trackId}&title=${encodeURIComponent(trackTitle)}&channel=${encodeURIComponent(trackChannel)}&thumbnail=${encodeURIComponent(trackThumbnail)}" />
</head>
<body>
  <p>Redirecting to ${appName}...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
});
