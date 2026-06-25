async function testPiped(url: string) {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  try {
    const res = await fetch(`${url}/streams/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      signal: AbortSignal.timeout(3000)
    });
    console.log(`[Piped] ${url} -> Status ${res.status}`);
    if (res.ok) {
      const data: any = await res.json();
      const count = (data.audioStreams || []).length;
      if (count > 0) {
        console.log(`  🌟 SUCCESS! ${url} returned ${count} audio streams!`);
        console.log(`  Sample Stream URL:`, data.audioStreams[0].url.substring(0, 100));
        return url;
      }
    }
  } catch (e: any) {
    // Silently log failure to keep list clean
    if (!e.message.includes('fetch failed')) {
      console.log(`[Piped] ${url} -> ${e.message}`);
    }
  }
  return null;
}

async function run() {
  const candidates = [
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
    'https://pipedapi.moomoo.me',
    'https://pipedapi.river.rocks',
    'https://pipedapi.sillyside.me',
    'https://pipedapi.tokyo'
  ];

  console.log('--- Scanning Piped API Candidates Grid ---');
  const results = await Promise.all(candidates.map(testPiped));
  const successful = results.filter(Boolean);
  console.log('\n--- SCAN COMPLETE ---');
  console.log('Verified Working Piped Instances:', successful);
}

run();
