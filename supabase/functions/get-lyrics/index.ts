import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LrcLibEntry = {
  plainLyrics?: string;
  syncedLyrics?: string;
};

const cleanArtist = (value?: string) =>
  (value || "")
    .replace(/\s*-\s*topic$/i, "")
    .replace(/\s*VEVO$/i, "")
    .trim();

const cleanTitle = (value: string) =>
  value
    .replace(/\s*\([^)]*(official|video|lyrics|audio|live|hd)[^)]*\)/gi, "")
    .replace(/\s*\[[^\]]*(official|video|lyrics|audio|live|hd)[^\]]*\]/gi, "")
    .replace(/\s*\|\s*.*/g, "")
    .trim();

const parseTrackInfo = (trackTitle: string, trackChannel?: string) => {
  const artist = cleanArtist(trackChannel) || "Unknown Artist";
  let title = cleanTitle(trackTitle);

  const artistPrefix = `${artist.toLowerCase()} - `;
  if (title.toLowerCase().startsWith(artistPrefix)) {
    title = title.slice(artist.length + 3).trim();
  }

  return {
    artist,
    titleVariants: Array.from(new Set([title, trackTitle, cleanTitle(trackTitle)].filter(Boolean))),
  };
};

const stripSyncedTimestamps = (syncedLyrics?: string) =>
  (syncedLyrics || "")
    .replace(/^\[\d{2}:\d{2}(?:\.\d{1,2})?\]\s?/gm, "")
    .trim();

const extractLrcLibLyrics = (entry?: LrcLibEntry | null) => {
  if (!entry) return null;
  const plain = entry.plainLyrics?.trim();
  if (plain) return plain;
  const synced = stripSyncedTimestamps(entry.syncedLyrics);
  return synced || null;
};

const parseVttCaptions = (vtt: string) => {
  const lines = vtt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("WEBVTT"))
    .filter((line) => !/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/.test(line))
    .filter((line) => !/^\d+$/.test(line))
    .map((line) => line.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);

  const uniqueLines: string[] = [];
  for (const line of lines) {
    if (uniqueLines[uniqueLines.length - 1] !== line) uniqueLines.push(line);
  }

  const joined = uniqueLines.join("\n").trim();
  return joined.length > 20 ? joined : null;
};

const fetchYouTubeCaptions = async (videoId: string) => {
  const listRes = await fetch(`https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`);
  if (!listRes.ok) return null;

  const listXml = await listRes.text();
  if (!listXml.includes("<track")) return null;

  const langMatches = Array.from(listXml.matchAll(/lang_code="([^"]+)"/g)).map((m) => m[1]);
  if (!langMatches.length) return null;

  const preferred = ["ml", "en", "en-US", "a.ml", "a.en"];
  const lang = preferred.find((code) => langMatches.includes(code)) || langMatches[0];

  const vttRes = await fetch(
    `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}&fmt=vtt`
  );
  if (!vttRes.ok) return null;

  const vtt = await vttRes.text();
  return parseVttCaptions(vtt);
};

const fetchFromLrcLib = async (title: string, artist: string) => {
  const exactUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  const exactRes = await fetch(exactUrl);

  if (exactRes.ok) {
    const exactData = (await exactRes.json()) as LrcLibEntry;
    const lyrics = extractLrcLibLyrics(exactData);
    if (lyrics) return lyrics;
  }

  const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return null;

  const rows = (await searchRes.json()) as LrcLibEntry[];
  for (const row of rows || []) {
    const lyrics = extractLrcLibLyrics(row);
    if (lyrics) return lyrics;
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackId, trackTitle, trackChannel } = await req.json();

    if (!trackId || !trackTitle) {
      return new Response(JSON.stringify({ error: "Missing trackId or trackTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: cached } = await supabase
      .from("lyrics")
      .select("lyrics_text, source")
      .eq("track_id", trackId)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({ lyrics: cached.lyrics_text, source: cached.source }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const captionLyrics = await fetchYouTubeCaptions(trackId);
    if (captionLyrics) {
      supabase
        .from("lyrics")
        .upsert(
          {
            track_id: trackId,
            track_title: trackTitle,
            track_channel: trackChannel || "Unknown",
            lyrics_text: captionLyrics,
            source: "youtube_captions",
          },
          { onConflict: "track_id" }
        )
        .then(() => {});

      return new Response(
        JSON.stringify({ lyrics: captionLyrics, source: "youtube_captions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { artist, titleVariants } = parseTrackInfo(trackTitle, trackChannel);
    for (const candidateTitle of titleVariants) {
      const officialLyrics = await fetchFromLrcLib(candidateTitle, artist);
      if (!officialLyrics) continue;

      supabase
        .from("lyrics")
        .upsert(
          {
            track_id: trackId,
            track_title: trackTitle,
            track_channel: trackChannel || "Unknown",
            lyrics_text: officialLyrics,
            source: "lrclib",
          },
          { onConflict: "track_id" }
        )
        .then(() => {});

      return new Response(
        JSON.stringify({ lyrics: officialLyrics, source: "lrclib" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        lyrics: null,
        source: "unavailable",
        message: "Official lyrics not available for this track yet",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-lyrics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
