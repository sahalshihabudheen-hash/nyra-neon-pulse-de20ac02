import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchYouTubeWithBackupFailover, getYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";
import { getRequestUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractPlaylistId(input: string): string | null {
  const raw = input.trim();
  // Direct playlist ID (PL..., UU..., OL..., RD..., FL..., LL...)
  if (/^[A-Za-z0-9_-]{12,}$/.test(raw) && /^(PL|UU|OL|RD|FL|LL|EC)/.test(raw)) {
    return raw;
  }
  // URL with ?list=...
  const match = raw.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  // Fallback: treat whole string as an id if it looks like one
  if (/^[A-Za-z0-9_-]{12,}$/.test(raw)) return raw;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require an authenticated user to prevent anonymous YouTube quota abuse.
  const user = await getRequestUser(req);
  if (!user) return unauthorized(corsHeaders);

  try {
    const url = new URL(req.url);
    const input = url.searchParams.get('url') || url.searchParams.get('id') || '';
    const playlistId = extractPlaylistId(input);

    if (!playlistId) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing YouTube playlist URL/ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const keys = await getYouTubeApiKeys();

    // Page through playlist items (max 100 tracks).
    const items: any[] = [];
    let pageToken = '';
    let playlistName = '';

    for (let page = 0; page < 2; page++) {
      const result = await fetchYouTubeWithBackupFailover(
        keys,
        (apiKey) =>
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey}`,
      );

      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: result.error || 'Failed to fetch playlist' }),
          { status: result.status || 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = result.data;
      for (const item of data.items || []) {
        const sn = item.snippet || {};
        const videoId = sn.resourceId?.videoId;
        if (!videoId) continue;
        // Skip deleted/private videos.
        if (sn.title === 'Deleted video' || sn.title === 'Private video') continue;
        if (!playlistName && sn.channelTitle) playlistName = sn.channelTitle;
        items.push({
          id: videoId,
          title: sn.title,
          thumbnail:
            sn.thumbnails?.high?.url ||
            sn.thumbnails?.medium?.url ||
            sn.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          channel: sn.videoOwnerChannelTitle || sn.channelTitle || 'Unknown',
        });
      }

      pageToken = data.nextPageToken || '';
      if (!pageToken) break;
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No playable videos found in this playlist (it may be private).' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ playlistId, name: playlistName || 'Imported Playlist', tracks: items }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
