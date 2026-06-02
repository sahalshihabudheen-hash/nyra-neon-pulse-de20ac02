process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
async function testSavetube() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  const urls = [
    `https://api.savetube.me/info/${videoId}`,
    `https://api.savetube.me/info?url=https://www.youtube.com/watch?v=${videoId}`,
    `https://api.savetube.me/info?id=${videoId}`,
    `https://api.savetube.me/download/audio/${videoId}`
  ];

  console.log('--- Testing Savetube Endpoints ---');
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        signal: AbortSignal.timeout(3000)
      });
      console.log(`URL: ${url} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        console.log(`  SUCCESS! Body Keys:`, data ? Object.keys(data) : 'null');
        if (data) {
          console.log(`  Sample (truncated):`, JSON.stringify(data).substring(0, 300));
        }
      }
    } catch (e: any) {
      console.log(`URL: ${url} -> Error: ${e.message}`);
    }
  }
}

testSavetube();
