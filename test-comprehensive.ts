import https from 'https';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://invidious.flokinet.to',
  'https://invidious.projectsegfau.lt',
  'https://invidious.lre.yt',
  'https://invidious.slipfox.xyz',
  'https://invidious.nerdvpn.de',
  'https://inv.tux.im',
  'https://inv.nadeko.net',
  'https://invidious.f5.si',
  'https://yt.chocolatemoo53.com',
  'https://inv.thepixora.com',
  'https://invidious.no-logs.com',
  'https://invidious.privacydev.net',
  'https://iv.melmac.space',
  'https://invidious.perennialte.ch',
  'https://invidious.esmailelbob.xyz'
];

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.video',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.moomoo.me',
  'https://api.piped.private.coffee',
  'https://api-piped.mha.fi',
  'https://piped-api.lre.yt',
  'https://pipedapi.cl7.it',
  'https://piped-api.hostux.net',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.swish.re',
  'https://pipedapi.spirit.com.de',
  'https://pipedapi.river.rocks',
  'https://pipedapi.sillyside.me',
  'https://pipedapi.tokyo'
];

async function testInvidious(uri: string, videoId: string) {
  try {
    const res = await fetch(`${uri}/api/v1/videos/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const d: any = await res.json();
      const formats = d.adaptiveFormats || [];
      const audio = formats.find((f: any) => f.type?.startsWith('audio/'));
      if (audio?.url) {
        return audio.url;
      }
    }
  } catch {}
  return null;
}

async function testPiped(uri: string, videoId: string) {
  try {
    const res = await fetch(`${uri}/streams/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const d: any = await res.json();
      const streams = d.audioStreams || [];
      if (streams.length > 0) {
        // Sort highest bitrate
        const best = streams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) return best.url;
      }
    }
  } catch {}
  return null;
}

async function run() {
  const rickroll = 'dQw4w9WgXcQ';
  const despacito = 'kJQP7kiw5Fk';

  console.log('--- Testing Invidious ---');
  for (const inst of INVIDIOUS_INSTANCES) {
    const rickOk = await testInvidious(inst, rickroll);
    const despOk = await testInvidious(inst, despacito);
    console.log(`[Invidious] ${inst} -> Rickroll: ${rickOk ? 'YES' : 'NO'}, Despacito: ${despOk ? 'YES' : 'NO'}`);
  }

  console.log('--- Testing Piped ---');
  for (const inst of PIPED_INSTANCES) {
    const rickOk = await testPiped(inst, rickroll);
    const despOk = await testPiped(inst, despacito);
    console.log(`[Piped] ${inst} -> Rickroll: ${rickOk ? 'YES' : 'NO'}, Despacito: ${despOk ? 'YES' : 'NO'}`);
  }
}

run();
