import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function searchWithKey(apiKey: string, query: string) {
  const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${apiKey}`;
  const response = await fetch(youtubeUrl);
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "YouTube API error");
  }
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing query parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const keys = [
      Deno.env.get('YOUTUBE_API_KEY'),
      Deno.env.get('YOUTUBE_API_KEY_2'),
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching YouTube for: ${query}`);

    let data;
    let lastError;
    for (const key of keys) {
      try {
        data = await searchWithKey(key, query);
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Key failed, trying next: ${err.message}`);
      }
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: lastError?.message || 'All API keys exhausted' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      channel: item.snippet.channelTitle,
    }));

    console.log(`Found ${results.length} results`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in youtube-search function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
