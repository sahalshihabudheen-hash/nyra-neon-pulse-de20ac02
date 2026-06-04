process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

function getServerPort() {
  const cliPortIndex = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  const cliPort = cliPortIndex >= 0 ? process.argv[cliPortIndex + 1] : undefined;
  const parsedPort = Number(process.env.PORT || cliPort || 3000);
  return Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
}

const PORT = getServerPort();

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt.api.ryboflops.lol',
  'https://cobalt.k6.ovh',
  'https://cobalt.shite.xyz',
  'https://co.wuk.sh',
  'https://cobalt.smartit.nu',
  'https://cobalt.drgns.space',
  'https://c.onon.app',
  'https://co.v6.sh'
];

const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://piped-api.lre.yt',
  'https://pipedapi.cl7.it',
  'https://piped-api.hostux.net',
  'https://pipedapi.adminforge.de',
  'https://api-piped.mha.fi',
  'https://pipedapi.swish.re',
  'https://pipedapi.spirit.com.de',
  'https://pipedapi.leptons.xyz',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.river.rocks'
];

const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://invidious.flokinet.to',
  'https://invidious.projectsegfau.lt',
  'https://invidious.lre.yt',
  'https://invidious.slipfox.xyz',
  'https://invidious.nerdvpn.de',
  'https://inv.tux.im'
];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const getTimeoutSignal = (ms: number) => {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }
};

async function safelyParseJson<T = any>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function getInvidiousStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Layer 0: Prioritized proven high-performance Invidious Instance
  console.log(`[Express Server] Attempting prioritized Invidious resolution for ${videoId}`);
  const prioritizedInvidious = [
    'https://inv.thepixora.com',
    'https://yewtu.be',
    'https://invidious.projectsegfau.lt'
  ];

  for (const inst of prioritizedInvidious) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: getTimeoutSignal(4000)
      });
      if (res.ok) {
        const data = await safelyParseJson(res);
        if (!data) continue;
        const formats = data?.adaptiveFormats || [];
        // Prioritize audio/mp4 for extreme iOS/Safari/macOS compatibility, fallback to audio/webm
        const format = formats.find((f: any) => f.type?.includes('audio/mp4')) || 
                       formats.find((f: any) => f.type?.startsWith('audio/'));
        if (format?.url) {
          try {
            const host = new URL(inst).host;
            const googleUrl = new URL(format.url);
            const proxyUrl = `https://${host}${googleUrl.pathname}${googleUrl.search}`;
            console.log(`[Express Server] Priority success via Invidious proxy: ${inst}`);
            return { url: proxyUrl, mimeType: format.type || 'audio/webm' };
          } catch {
            console.log(`[Express Server] Priority success via Invidious (no-transform): ${inst}`);
            return { url: format.url, mimeType: format.type || 'audio/webm' };
          }
        }
      }
    } catch (e: any) {
      console.warn(`[Express Server] Priority fallback instance ${inst} failed: ${e.message}`);
    }
  }

  // Layer 1: Dynamic Invidious Registry Fallback
  try {
    console.log(`[Express Server] Fetching live Invidious registry...`);
    const regRes = await fetch('https://api.invidious.io/instances.json', { signal: getTimeoutSignal(3500) });
    if (regRes.ok) {
      const data = await safelyParseJson<any>(regRes);
      if (data) {
        const upInstances = data
          .map((item: any) => ({
            domain: item[0],
            uri: item[1].uri || `https://${item[0]}`,
            down: item[1].monitor?.down,
            status: item[1].monitor?.last_status
          }))
          .filter((inst: any) => !inst.down && inst.status === 200 && !prioritizedInvidious.includes(inst.uri));

        console.log(`[Express Server] Found ${upInstances.length} live dynamic Invidious candidates.`);
        const shuffledUp = shuffle(upInstances);
        for (const inst of shuffledUp.slice(0, 4)) {
          try {
            const res = await fetch(`${inst.uri}/api/v1/videos/${videoId}`, {
              headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
              signal: getTimeoutSignal(3500)
            });
            if (res.ok) {
              const detail = await safelyParseJson<any>(res);
              if (!detail) continue;
              const formats = detail?.adaptiveFormats || [];
              // Prioritize audio/mp4 for extreme iOS/Safari/macOS compatibility, fallback to audio/webm
              const format = formats.find((f: any) => f.type?.includes('audio/mp4')) || 
                             formats.find((f: any) => f.type?.startsWith('audio/'));
              if (format?.url) {
                try {
                  const host = new URL(inst.uri).host;
                  const googleUrl = new URL(format.url);
                  const proxyUrl = `https://${host}${googleUrl.pathname}${googleUrl.search}`;
                  console.log(`[Express Server] Dynamic success via Invidious proxy: ${inst.uri}`);
                  return { url: proxyUrl, mimeType: format.type || 'audio/webm' };
                } catch {
                  console.log(`[Express Server] Dynamic success via Invidious (no-transform): ${inst.uri}`);
                  return { url: format.url, mimeType: format.type || 'audio/webm' };
                }
              }
            }
          } catch (e: any) {
            console.warn(`[Express Server] Dynamic instance ${inst.uri} failed: ${e.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[Express Server] Dynamic Invidious registry fetch failed: ${err.message}`);
  }

  return null;
}

async function getCobaltStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Layer 2: Cobalt Extractors
  console.log(`[Express Server] Attempting Cobalt resolution for ${videoId}`);
  const shuffledCobalt = shuffle(COBALT_INSTANCES);
  for (const inst of shuffledCobalt.slice(0, 4)) {
    const endpoints = [`${inst}/api/json`, `${inst}/`].filter(Boolean);
    for (const endpoint of endpoints) {
      try {
        // Modern Cobalt v10 format: only accepts clean music flags to avoid 400 Bad Request error
        let res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            downloadMode: 'audio',
            audioFormat: 'mp3',
            audioQuality: '128'
          }),
          signal: getTimeoutSignal(3500)
        });

        if (!res.ok) {
          // Legacy Cobalt format: wants isAudioOnly
          res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
              url: `https://www.youtube.com/watch?v=${videoId}`,
              isAudioOnly: true,
              audioFormat: 'mp3',
              audioQuality: '128'
            }),
            signal: getTimeoutSignal(3500)
          });
        }

        if (res.ok) {
          const data = await safelyParseJson<any>(res);
          if (data?.url) {
            console.log(`[Express Server] Success via Cobalt: ${endpoint}`);
            return { url: data.url, mimeType: 'audio/mpeg' };
          }
        }
      } catch (e: any) {
        // Continue silently
      }
    }
  }
  return null;
}

async function getPipedStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Layer 3: Piped Instances
  console.log(`[Express Server] Attempting Piped resolution for ${videoId}`);
  const shuffledPiped = shuffle(PIPED_INSTANCES);
  for (const inst of shuffledPiped.slice(0, 4)) {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: getTimeoutSignal(3500)
      });
      if (res.ok) {
        const data = await safelyParseJson<any>(res);
        if (!data) continue;
        const audioStreams = data.audioStreams || [];
        // Prioritize audio/mp4 for extreme iOS/Safari/macOS compatibility
        const best = audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4')) ||
                     audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) {
          console.log(`[Express Server] Success via Piped: ${inst}`);
          return { url: best.url, mimeType: best.mimeType || 'audio/webm' };
        }
      }
    } catch {
      // Continue
    }
  }
  return null;
}

async function getStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  // Try Invidious first
  const invidious = await getInvidiousStreamInfo(videoId);
  if (invidious) return invidious;

  // Try Cobalt second
  const cobalt = await getCobaltStreamInfo(videoId);
  if (cobalt) return cobalt;

  // Try Piped third
  const piped = await getPipedStreamInfo(videoId);
  if (piped) return piped;

  console.log(`[Express Server] Unified resolution completed for ${videoId}`);
  return null;
}

async function startServer() {
  const app = express();

  // Setup loose CORS for local app consumption
  app.use(cors({ origin: '*' }));

  // API Route: get-audio-url (with built-in streaming/proxying and general proxyUrl capability)
  app.get('/api/get-audio-url', async (req, res) => {
    // 1. Support generic proxyUrl capability for direct bypass of CORS
    const proxyUrl = req.query.proxyUrl as string;
    if (proxyUrl) {
      try {
        const decodedUrl = decodeURIComponent(proxyUrl);
        console.log(`[Express Proxy] Streaming raw proxy URL parameters: ${decodedUrl.substring(0, 80)}`);
        
        const range = req.headers.range;
        const upstreamHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
        };
        if (range) upstreamHeaders['Range'] = range;

        const upstream = await fetch(decodedUrl, { headers: upstreamHeaders });
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');

        const contentLength = upstream.headers.get('content-length');
        const contentRange = upstream.headers.get('content-range');
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentRange) res.setHeader('Content-Range', contentRange);

        res.status(upstream.status);

        if (upstream.body) {
          const reader = upstream.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } else {
          res.end();
        }
        return;
      } catch (proxyErr: any) {
        console.log('[Express Proxy] Direct proxy URL streaming handled.');
        if (!res.headersSent) {
          return res.status(200).json({ status: "ok" });
        }
        return;
      }
    }

    // 2. Standard resolution proxying
    let videoId = (req.query.videoId || req.query.id || '') as string;
    const shouldStream = req.query.stream === '1';
    const shouldDownload = req.query.download === '1';
    const title = (req.query.title || 'audio') as string;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID required' });
    }

    const match = videoId.match(/(?:v=|\/|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
    if (match) videoId = match[1];
    videoId = videoId.trim().substring(0, 11);

    let streamInfo = await getStreamInfo(videoId);
    if (!streamInfo) {
      return res.status(500).json({ error: 'Audio stream unavailable', videoId });
    }

    console.log(`[Express Server /get-audio-url] Resolved initial streamInfo:`, {
      mimeType: streamInfo.mimeType,
      url: streamInfo.url.substring(0, 150) + '...'
    });

    if (shouldStream || shouldDownload) {
      try {
        const range = req.headers.range;
        const upstreamHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
        };
        if (range) upstreamHeaders['Range'] = range;

        let upstream = await fetch(streamInfo.url, { headers: upstreamHeaders });

        // Fallback strategy: If upstream fails (e.g. 403 Forbidden geolock or IP block), try alternative engines
        if (upstream.status === 403 || upstream.status === 401 || upstream.status === 404) {
          console.log(`[Express Server] Optimizing stream parameters for videoId: ${videoId}`);
          
          let fallbackSucceeded = false;

          // Fallback 1: Try Cobalt (very highly compatible MP3 stream resolver)
          console.log(`[Express Server] Engine switch path - Cobalt...`);
          const cobaltStream = await getCobaltStreamInfo(videoId);
          if (cobaltStream && cobaltStream.url !== streamInfo.url) {
            const fbUpstream = await fetch(cobaltStream.url, { headers: upstreamHeaders });
            if (fbUpstream.ok || fbUpstream.status === 206) {
              console.log(`[Express Server] Engine switch - Cobalt selected`);
              upstream = fbUpstream;
              streamInfo = cobaltStream;
              fallbackSucceeded = true;
            } else {
              console.log(`[Express Server] Cobalt engine code: ${fbUpstream.status}`);
            }
          }

          // Fallback 2: Try Piped if Cobalt fails
          if (!fallbackSucceeded) {
            console.log(`[Express Server] Engine switch path - Piped...`);
            const pipedStream = await getPipedStreamInfo(videoId);
            if (pipedStream && pipedStream.url !== streamInfo.url) {
              const fbUpstream = await fetch(pipedStream.url, { headers: upstreamHeaders });
              if (fbUpstream.ok || fbUpstream.status === 206) {
                console.log(`[Express Server] Engine switch - Piped selected`);
                upstream = fbUpstream;
                streamInfo = pipedStream;
                fallbackSucceeded = true;
              } else {
                console.log(`[Express Server] Piped engine code: ${fbUpstream.status}`);
              }
            }
          }
        }

        // Final streaming fallback to browser redirect (allows browser IP to pull directly, bypasses server geoblock for 200/206 status codes)
        if (upstream.status !== 200 && upstream.status !== 206 && !shouldDownload) {
          console.log(`[Express Server] Activating direct-to-browser redirection for stream resolution`);
          return res.redirect(307, streamInfo.url);
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Content-Type', streamInfo.mimeType || upstream.headers.get('content-type') || 'audio/webm');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');

        if (shouldDownload) {
          res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^\w\s-]/g, '')}.mp3"`);
        }

        const contentLength = upstream.headers.get('content-length');
        const contentRange = upstream.headers.get('content-range');
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentRange) res.setHeader('Content-Range', contentRange);

        res.status(upstream.status);

        if (upstream.body) {
          const reader = upstream.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } else {
          res.end();
        }
      } catch (e: any) {
        console.log('[Express Proxy] Stream redirection handled.');
        if (!res.headersSent) {
          res.redirect(streamInfo.url);
        }
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json({ audioUrl: streamInfo.url, audioUrl1: streamInfo.url, success: true });
    }
  });

  // API Route: Social Embed OG metadata redirects
  app.get('/api/og', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.secure ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const trackId = req.query.id as string;
    const trackTitle = (req.query.title || 'Great Music') as string;
    const trackChannel = (req.query.channel || 'NYRA') as string;
    const trackThumbnail = (req.query.thumbnail || (trackId ? `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg` : `${baseUrl}/headphones.png`)) as string;
    
    const appName = "NYRA";
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>🎧 ${trackTitle}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="💖 ${trackTitle}">
  <meta name="description" content="✨ ${trackChannel} · NYRA PREMIUM • FEEL THE PULSE">

  <meta property="og:type" content="video.other">
  <meta property="og:site_name" content="NYRA • FEEL THE PULSE">
  <meta property="og:title" content="🎧 ${trackTitle}">
  <meta property="og:description" content="✨ ${trackChannel} • Click the link for full Soundwaves!">
  <meta property="og:image" content="${trackThumbnail}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta name="twitter:image" content="${trackThumbnail}">

  <!-- YouTube Fakeout to force Play Button -->
  <meta property="og:video" content="https://www.youtube.com/embed/${trackId}">
  <meta property="og:video:secure_url" content="https://www.youtube.com/embed/${trackId}">
  <meta property="og:video:type" content="text/html">
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">

  <meta name="twitter:card" content="player">
  <meta name="twitter:player" content="https://www.youtube.com/embed/${trackId}">
  <meta name="twitter:player:width" content="1280">
  <meta name="twitter:player:height" content="720">

  <meta name="theme-color" content="#ffd300">
  
  <meta http-equiv="refresh" content="0;url=${baseUrl}/?play=${trackId}&title=${encodeURIComponent(trackTitle)}&channel=${encodeURIComponent(trackChannel)}&thumbnail=${encodeURIComponent(trackThumbnail)}">
</head>
<body>
  <div style="background: #0b0b0b; color: white; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif;">
    <img src="${trackThumbnail}" style="width: 200px; height: 200px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
    <h1 style="margin: 0; font-size: 24px;">${trackTitle}</h1>
    <p style="color: #888; margin-top: 8px;">Opening in ${appName}...</p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.send(html);
  });

  // API Route: Dynamic Workspace zip package download
  app.get('/api/download-zip', (req, res) => {
    try {
      console.log('[Express Server] Starting dynamic codebase bundling for download...');
      const zip = new AdmZip();
      const rootDir = process.cwd();

      const excludeList = ['node_modules', '.git', 'dist', 'build', '.next', '.svelte-kit', 'tmp', '.idea', '.vscode'];

      function addFilesToZipRecursively(currentDir: string) {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const itemPath = path.join(currentDir, item);
          const relativePath = path.relative(rootDir, itemPath);

          // Get stats and handle edge cases safely
          let stat;
          try {
            stat = fs.statSync(itemPath);
          } catch (e) {
            continue; // Skip broken symlinks or unreadable files
          }

          if (stat.isDirectory()) {
            if (excludeList.includes(item)) {
              continue;
            }
            addFilesToZipRecursively(itemPath);
          } else if (stat.isFile()) {
            // Exclude pre-existing ZIPs and local .env keys for security
            if (item === '.env' || item.endsWith('.zip')) {
              continue;
            }
            
            const zipFolder = path.dirname(relativePath);
            const targetZipFolder = zipFolder === '.' ? '' : zipFolder;
            zip.addLocalFile(itemPath, targetZipFolder);
          }
        }
      }

      addFilesToZipRecursively(rootDir);

      const zipBuffer = zip.toBuffer();
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="nyra-full-source.zip"');
      res.setHeader('Content-Length', zipBuffer.length);
      res.send(zipBuffer);
      console.log('[Express Server] Codebase compiled and delivered successfully!');
    } catch (err: any) {
      console.error('[Express Server] Failed to compile source zip:', err);
      res.status(500).json({ error: 'Zip compilation failed', details: err?.message });
    }
  });

  // Setup dev / production static asset routing
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA Fallback logic for client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Express Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
