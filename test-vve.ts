async function testUrl(url: string, payload: any) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000)
    });
    console.log(`URL: ${url} -> Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      console.log('  SUCCESS!', data);
    }
  } catch (e: any) {
    console.log(`URL: ${url} -> Error: ${e.message}`);
  }
}

async function run() {
  const payload = {
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    downloadMode: 'audio',
    audioFormat: 'mp3'
  };
  console.log('--- Testing vve.best endpoints ---');
  await testUrl('https://api.vve.best/', payload);
  await testUrl('https://cobalt.vve.best/', payload);
  await testUrl('https://co.vve.best/', payload);
  await testUrl('https://dl.vve.best/', payload);
}

run();
