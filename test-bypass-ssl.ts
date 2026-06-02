process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testMirror(inst: string) {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  console.log(`Testing v10 Cobalt Mirror [${inst}] with SSL bypass...`);
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
    const data: any = await res.json().catch(() => null);
    if (res.ok && data?.url) {
      console.log(`  SUCCESS! Direct Stream:`, data.url.substring(0, 100));
      return true;
    } else {
      console.log(`  Failed:`, data);
    }
  } catch (e: any) {
    console.log(`[Mirror] ${inst} -> Error: ${e.message}`);
  }
  return false;
}

async function run() {
  const mirrors = [
    'https://cobalt.smartit.nu',
    'https://cobalt.drgns.space',
    'https://c.onon.app'
  ];
  for (const m of mirrors) {
    const ok = await testMirror(m);
    if (ok) {
      console.log('--- WE HAVE AT LEAST ONE WORKING INSTANCE! ---');
    }
  }
}

run();
