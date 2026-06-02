process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testV7(inst: string) {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  const url = `${inst}/api/json`;
  console.log(`Testing Cobalt v7 [${url}] with SSL bypass...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true
      })
    });
    console.log(`[V7] ${url} -> Status ${res.status}`);
    const data: any = await res.json().catch(() => null);
    if (res.ok && data?.url) {
      console.log(`  🌟 SUCCESS! Direct Stream:`, data.url.substring(0, 100));
      return true;
    } else {
      console.log(`  Failed:`, data);
    }
  } catch (e: any) {
    console.log(`[V7] ${url} -> Error: ${e.message}`);
  }
  return false;
}

async function run() {
  await testV7('https://cobalt.drgns.space');
  await testV7('https://c.onon.app');
}

run();
