import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isTest = process.env.VITEST;

const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://inv.nadeko.net',
  'https://invidious.flokinet.to',
  'https://yewtu.be',
  'https://iv.melmac.space',
];

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt.perennialte.ch',
  'https://cobalt.me.uk',
  'https://cobalt.phrenic.club',
  'https://api.cobalt.sp-codes.de',
];

const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://piped-api.hostux.net',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.cl7.it',
  'https://api-piped.mha.fi',
];

// ── Layer 1: Invidious Video API ─────────────────────────────────────────────
async function fetchViaInvidious(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${videoId}?local=true`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const formats = data.adaptiveFormats || [];
      
      let bestFormat = formats.find((f: any) => 
        f.type?.startsWith('audio/mp4') || 
        f.type?.includes('codecs="mp4') || 
        f.type?.includes('m4a')
      );
      
      if (!bestFormat) {
        bestFormat = formats.find((f: any) => f.type?.startsWith('audio/'));
      }
      
      if (bestFormat?.url) {
        const streamUrl = String(bestFormat.url).replace(/^http:\/\//, 'https://');
        return { url: streamUrl, mimeType: bestFormat.type || 'audio/mp4' };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Layer 2: Cobalt Instance Pooling ─────────────────────────────────────────
async function fetchViaCobalt(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  for (const inst of COBALT_INSTANCES) {
    try {
      let res = await fetch(inst, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({
          url,
          downloadMode: 'audio',
          audioFormat: 'mp3',
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        res = await fetch(inst, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          body: JSON.stringify({
            url,
            isAudioOnly: true,
          }),
          signal: AbortSignal.timeout(6000),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          return { url: data.url, mimeType: 'audio/mp3' };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Layer 3: Piped API Streams ────────────────────────────────────────────────
async function fetchViaPiped(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  for (const inst of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const audioStreams: any[] = data.audioStreams || [];
      
      const best = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (best?.url) {
        return { url: best.url, mimeType: best.mimeType || 'audio/webm' };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function getStreamInfo(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  try {
    const invidious = await fetchViaInvidious(videoId);
    if (invidious) return invidious;
  } catch {}
  try {
    const cobalt = await fetchViaCobalt(videoId);
    if (cobalt) return cobalt;
  } catch {}
  try {
    const piped = await fetchViaPiped(videoId);
    if (piped) return piped;
  } catch {}
  return null;
}

async function createServer(root = process.cwd(), isProd = process.env.NODE_ENV === 'production', hmrPort?: number) {
  const resolve = (p: string) => path.resolve(__dirname, p);
  const app = express();
  let vite: any;

  if (!isProd) {
    vite = await (await import('vite')).createServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: true,
        watch: { usePolling: true, interval: 100 },
        hmr: { port: hmrPort }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use((await import('compression')).default());
    app.use(
      (await import('serve-static')).default(resolve('dist/client'), {
        index: false
      })
    );
  }

  // Audio streaming endpoint
  app.get('/api/get-audio-url', async (req, res) => {
    try {
      const proxyUrl = req.query.proxyUrl as string;
      let videoId = (req.query.videoId || req.query.id || '') as string;
      const shouldStream = req.query.stream === '1' || proxyUrl != null;

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, range, x-client-id');
      res.setHeader('Access-Control-Expose-Headers', 'content-length, content-range, accept-ranges, content-type');
      
      let sourceUrl = '';
      let mimeType = 'audio/mp3';

      if (proxyUrl) {
        sourceUrl = decodeURIComponent(proxyUrl);
      } else if (videoId) {
        const match = videoId.match(/(?:v=|\/|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
        if (match) videoId = match[1];
        videoId = videoId.trim().substring(0, 11);

        const streamInfo = await getStreamInfo(videoId);
        if (!streamInfo) {
          res.status(500).json({ error: 'Audio stream unavailable', videoId });
          return;
        }
        sourceUrl = streamInfo.url;
        mimeType = streamInfo.mimeType;

        if (!shouldStream) {
          res.json({ audioUrl: sourceUrl, audioUrl1: sourceUrl, success: true });
          return;
        }
      } else {
        res.status(400).json({ error: 'Video ID or proxyUrl required' });
        return;
      }

      // Stream proxy
      const range = req.headers.range;
      const upstreamHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*',
      };
      if (range) upstreamHeaders['Range'] = range;

      const upstream = await fetch(sourceUrl, { headers: upstreamHeaders });

      if (!upstream.ok && upstream.status !== 206) {
        console.warn('[Proxy] Upstream failed, issuing 307 native redirect to:', sourceUrl);
        res.redirect(307, sourceUrl);
        return;
      }

      res.setHeader('Content-Type', mimeType || upstream.headers.get('content-type') || 'audio/webm');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      
      const contentLength = upstream.headers.get('content-length');
      const contentRange = upstream.headers.get('content-range');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      
      res.status(upstream.status);
      
      if (upstream.body) {
        // @ts-ignore
        const reader = upstream.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        };
        pump().catch(e => {
          console.error(e);
          res.end();
        });
      } else {
        res.end();
      }

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use('*', async (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    try {
      const url = req.originalUrl;
      let template, render;
      if (!isProd) {
        template = fs.readFileSync(resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8');
      }
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      !isProd && vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  return { app, vite };
}

if (!isTest) {
  createServer().then(({ app }) => {
    const port = process.env.PORT || 5173;
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  });
}
