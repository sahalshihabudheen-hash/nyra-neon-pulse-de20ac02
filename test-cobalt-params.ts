async function testParam(payload: any, label: string, endpoint: string = 'https://api.cobalt.tools/') {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(payload)
    });
    console.log(`[${label}] URL: ${endpoint} -> Status: ${res.status}`);
    const data = await res.json().catch(() => null);
    if (res.ok) {
      console.log(`  SUCCESS! URL:`, data?.url?.substring(0, 100));
    } else {
      console.log(`  Error:`, data);
    }
  } catch (e: any) {
    console.log(`[${label}] Error: ${e.message}`);
  }
}

async function run() {
  const url = 'https://www.youtube.com/watch?v=kJQP7kiw5Fk'; // Despacito

  console.log('--- Cobalt API Schema Exploration ---');

  // Option A: Cobalt v10 standard schema at POST / (unified endpoint)
  await testParam({
    url: url,
    downloadMode: 'audio',
    audioFormat: 'mp3',
    audioQuality: '128'
  }, 'V10 Base URL, Audio Mode');

  // Option B: Cobalt v7 legacy schema at POST /api/json (or with legacy keys)
  await testParam({
    url: url,
    isAudioOnly: true,
    audioFormat: 'mp3'
  }, 'V10 Base URL, Legacy isAudioOnly');

  // Option C: Cobalt v10 at POST /api/json
  await testParam({
    url: url,
    downloadMode: 'audio',
    audioFormat: 'mp3',
    audioQuality: '128'
  }, 'V10 /api/json, Audio Mode', 'https://api.cobalt.tools/api/json');

  // Option D: Minimal payload
  await testParam({
    url: url,
    downloadMode: 'audio'
  }, 'Minimal payload');
}

run();
