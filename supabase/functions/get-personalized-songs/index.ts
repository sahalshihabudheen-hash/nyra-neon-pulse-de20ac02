import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchYouTubeWithFailover, getYouTubeApiKeys } from "../_shared/youtube-key-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map regions/states to local music search queries
const regionMusicMap: Record<string, string[]> = {
  // India states
  "Kerala": ["latest Malayalam movie songs", "Malayalam hit songs new"],
  "Tamil Nadu": ["latest Tamil movie songs", "Tamil hit songs new"],
  "Karnataka": ["latest Kannada movie songs", "Kannada hit songs new"],
  "Andhra Pradesh": ["latest Telugu movie songs", "Telugu hit songs new"],
  "Telangana": ["latest Telugu movie songs", "Telugu hit songs new"],
  "Maharashtra": ["latest Marathi movie songs", "Marathi hit songs new"],
  "West Bengal": ["latest Bengali movie songs", "Bengali hit songs new"],
  "Gujarat": ["latest Gujarati songs hits", "Gujarati movie songs new"],
  "Punjab": ["latest Punjabi songs hits", "Punjabi music new"],
  "Rajasthan": ["Rajasthani folk songs popular", "Rajasthani music hits"],
  "Bihar": ["Bhojpuri hit songs new", "Bhojpuri movie songs latest"],
  "Uttar Pradesh": ["latest Hindi movie songs", "Bollywood hits new"],
  "Assam": ["Assamese hit songs new", "Assamese movie songs latest"],
  "Odisha": ["Odia hit songs new", "Odia movie songs latest"],
  "Goa": ["Konkani songs hits", "Goa music popular"],
  // Countries
  "United States": ["Billboard Hot 100 hits", "top pop songs America new"],
  "United Kingdom": ["UK top chart songs new", "British pop hits latest"],
  "South Korea": ["K-pop new songs hits", "Korean music latest"],
  "Japan": ["J-pop new songs hits", "Japanese music latest"],
  "Brazil": ["Brazilian music hits new", "sertanejo funk hits"],
  "Nigeria": ["Afrobeats new songs hits", "Nigerian music latest"],
  "France": ["French pop music hits new", "chanson française nouvelle"],
  "Germany": ["German pop music hits new", "Deutsche Musik neue"],
  "Spain": ["Spanish pop music hits new", "reggaeton new hits"],
  "Mexico": ["Mexican music hits new", "regional mexicano new"],
  "Colombia": ["Colombian music hits new", "reggaeton vallenato new"],
  "Argentina": ["Argentine music hits new", "cumbia trap Argentina"],
  "Egypt": ["Arabic music hits new", "Egyptian pop songs"],
  "Turkey": ["Turkish pop music hits new", "Türkçe pop yeni"],
  "Russia": ["Russian pop music hits new", "русская музыка новая"],
  "Indonesia": ["Indonesian pop songs new", "lagu Indonesia terbaru"],
  "Philippines": ["OPM songs new hits", "Filipino music latest"],
  "Thailand": ["Thai pop songs new hits", "เพลงไทยใหม่"],
  "Vietnam": ["Vietnamese music new hits", "nhạc Việt mới"],
  "Pakistan": ["Pakistani songs new hits", "Coke Studio Pakistan latest"],
  "Bangladesh": ["Bangla songs new hits", "Bengali music Bangladesh"],
  "Sri Lanka": ["Sinhala songs new hits", "Sri Lankan music latest"],
  "Nepal": ["Nepali songs new hits", "Nepali music latest"],
  "Australia": ["Australian music hits new", "Aussie pop new songs"],
  "Canada": ["Canadian music hits new", "Drake Canadian artists new"],
  "Italy": ["Italian music hits new", "musica italiana nuova"],
  "China": ["Chinese pop songs new C-pop", "华语音乐新歌"],
};

const genreSearchMap: Record<string, string> = {
  "Pop": "top pop songs hits new",
  "Hip-Hop": "hip hop rap songs new hits",
  "Rock": "rock songs hits new",
  "R&B": "R&B soul songs new hits",
  "Electronic": "EDM electronic dance music new hits",
  "Classical": "classical music popular beautiful",
  "Bollywood": "Bollywood songs latest hits new",
  "K-Pop": "K-pop new songs hits latest",
  "Jazz": "jazz music popular smooth",
  "Country": "country music new songs hits",
  "Latin": "reggaeton latin pop new hits",
  "Afrobeats": "Afrobeats new songs hits latest",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const keys = getYouTubeApiKeys();

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "regional";
    const state = url.searchParams.get("state") || "";
    const country = url.searchParams.get("country") || "";
    const genre = url.searchParams.get("genre") || "";

    let searchQuery = "";

    if (type === "regional") {
      const queries = regionMusicMap[state] || regionMusicMap[country] || null;
      if (queries) {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        searchQuery = queries[dayOfYear % queries.length];
      } else {
        searchQuery = `popular music songs ${country || "worldwide"} new hits`;
      }
    } else if (type === "genre") {
      searchQuery = genreSearchMap[genre] || `${genre} music songs new hits`;
    }

    console.log(`Fetching personalized songs: type=${type}, query=${searchQuery} using ${keys.length} API keys`);

    const result = await fetchYouTubeWithFailover(
      keys,
      (apiKey) => `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=12&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`,
    );

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tracks = (result.data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channel: item.snippet.channelTitle,
    }));

    return new Response(JSON.stringify(tracks), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Personalized songs error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
