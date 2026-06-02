process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

async function testCobaltv10(inst: string, videoId: string) {
  try {
    const res = await fetch(`${inst}/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioQuality: '128'
      }),
      signal: AbortSignal.timeout(3500)
    });
    console.log(`[v10] ${inst} -> Status: ${res.status}`);
    const text = await res.text();
    if (res.ok) {
      const data = JSON.parse(text);
      if (data?.url) {
        console.log(`  🎉 SUCCESS v10 on ${inst}! Stream: ${data.url.substring(0, 100)}...`);
        return data.url;
      } else {
        console.log(`  Failed v10 on ${inst}:`, data);
      }
    } else {
      console.log(`  Error body v10 on ${inst}:`, text.substring(0, 400));
    }
  } catch (e: any) {
    if (!e.message.includes('fetch failed')) {
      console.log(`[v10] ${inst} -> Error: ${e.message}`);
    }
  }
  return null;
}

async function testCobaltv7(inst: string, videoId: string) {
  try {
    const res = await fetch(`${inst}/api/json`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true
      }),
      signal: AbortSignal.timeout(3500)
    });
    console.log(`[v7] ${inst} -> Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.url) {
        console.log(`  🎉 SUCCESS v7 on ${inst}! Stream: ${data.url.substring(0, 100)}...`);
        return data.url;
      } else {
        console.log(`  Failed v7 on ${inst}:`, data);
      }
    }
  } catch (e: any) {
    if (!e.message.includes('fetch failed')) {
      console.log(`[v7] ${inst} -> Error: ${e.message}`);
    }
  }
  return null;
}

async function run() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  console.log('--- Testing Cobalt Instances (v10 & v7) ---');
  for (const m of COBALT_INSTANCES) {
    await testCobaltv10(m, videoId);
    await testCobaltv7(m, videoId);
  }
}

run();
