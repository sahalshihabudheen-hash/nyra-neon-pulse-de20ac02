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
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
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

const getTimeoutSignal = (ms: number) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

async function testCobalt(inst: string) {
  const videoId = 'kJQP7kiw5Fk';
  try {
    const res = await fetch(`${inst}/api/json`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioQuality: '128'
      }),
      signal: getTimeoutSignal(3000)
    });
    if (res.ok) {
      const d = await res.json();
      console.log(`[Cobalt] ${inst} -> SUCCESS!`, d.url ? 'Yes' : 'No');
    } else {
      console.log(`[Cobalt] ${inst} -> Failed (Status ${res.status})`);
    }
  } catch (e: any) {
    console.log(`[Cobalt] ${inst} -> Error: ${e.message}`);
  }
}

async function testPiped(inst: string) {
  const videoId = 'kJQP7kiw5Fk';
  try {
    const res = await fetch(`${inst}/streams/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      signal: getTimeoutSignal(3000)
    });
    if (res.ok) {
      const d: any = await res.json();
      const count = (d.audioStreams || []).length;
      console.log(`[Piped] ${inst} -> SUCCESS (Streams: ${count})`);
    } else {
      console.log(`[Piped] ${inst} -> Failed (Status ${res.status})`);
    }
  } catch (e: any) {
    console.log(`[Piped] ${inst} -> Error: ${e.message}`);
  }
}

async function run() {
  console.log('Testing Cobalt...');
  await Promise.all(COBALT_INSTANCES.map(testCobalt));
  console.log('\nTesting Piped...');
  await Promise.all(PIPED_INSTANCES.map(testPiped));
}

run();
