const COBALT_MIRRORS = [
  'https://cobalt.mom',
  'https://co.swg.rocks',
  'https://api.cobalt.best',
  'https://cobalt.q69.de',
  'https://cobalt.colby.cafe',
  'https://cobalt.nyx.re',
  'https://cobalt.api.g9.cz',
  'https://cobalt.mclg.ru',
  'https://cobalt.hypernot.com',
  'https://cobalt.gamer-inside.space',
  'https://co.disroot.org',
  'https://co.wuk.sh',
  'https://cobalt.shite.xyz',
  'https://cobalt.k6.ovh',
  'https://cobalt.api.ryboflops.lol',
  'https://co.v6.sh',
  'https://c.onon.app'
];

async function testMirror(inst: string) {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  try {
    const res = await fetch(`${inst}/`, {
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
      })
    });
    console.log(`[Mirror] ${inst} -> Status ${res.status}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.url) {
      console.log(`  SUCCESS! Direct Stream:`, data.url.substring(0, 100));
    } else {
      console.log(`  Failed:`, data);
    }
  } catch (e: any) {
    console.log(`[Mirror] ${inst} -> Error: ${e.message}`);
  }
}

async function run() {
  console.log('--- Testing v10 Cobalt Mirror API Root ---');
  await Promise.all(COBALT_MIRRORS.map(testMirror));
}

run();
